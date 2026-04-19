import { Battery, Dealer, Replacement, BatteryModel, Sale, WarrantyCardStatus, BatteryStatus, PriceRecord, User, UserRole, StagedBatch, RawMaterial, MaterialPurchase, ProductionLog, Expense, FactoryWorker } from './types';
import { validateName, validatePhone } from './utils/validation';
import { getLocalDate } from './utils';

declare global {
  interface ElectronUpdaterBridge {
    getStatus: () => Promise<any>;
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
    quitAndInstall: () => Promise<{ success: boolean; message?: string }>;
  }

  interface ElectronDatabaseBridge {
    query: (sql: string, params?: any[]) => Promise<any[]>;
    run: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
    exec: (sql: string) => Promise<void>;
    updateBatteryDetails: (currentId: string, newId: string, dealerId: string, model?: string) => Promise<void>;
    backup: () => Promise<{ success: boolean; path: string; error?: string }>;
    selectBackupFolder: () => Promise<string | null>;
    backupCustom: (path: string) => Promise<{ success: boolean; path: string; error?: string }>;
    selectRestoreFile: () => Promise<string | null>;
    restoreDatabase: (path: string) => Promise<{ success: boolean; error?: string }>;
    optimizeDatabase: () => Promise<{ success: boolean; error?: string }>;
    initDatabase: (config?: { type: 'INTERNAL' | 'EXTERNAL', path?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
    selectExternalDrive: () => Promise<string | null>;
  }

  interface ElectronAPI {
    printOrPdf: () => Promise<string>;
    updater?: ElectronUpdaterBridge;
    db: ElectronDatabaseBridge;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Enterprise Async Database Client
export class Database {
  private static STORAGE_KEY = 'starline_warranty_db';
  private static BASE_REQUIRED_RAW_MATERIALS: Array<{ name: string; unit: string; alert_threshold: number }> = [
    { name: 'Raw Lead', unit: 'kg', alert_threshold: 500 },
    { name: 'Grey Oxide', unit: 'kg', alert_threshold: 200 },
    { name: 'Dinal Fiber', unit: 'kg', alert_threshold: 100 },
    { name: 'DM Water', unit: 'liters', alert_threshold: 200 },
    { name: 'Acid', unit: 'liters', alert_threshold: 200 },
    { name: 'Lignin (Lugnin)', unit: 'kg', alert_threshold: 100 },
    { name: 'Carbon Black', unit: 'kg', alert_threshold: 100 },
    { name: 'Graphite Powder', unit: 'kg', alert_threshold: 100 },
    { name: 'Barium Sulfate', unit: 'kg', alert_threshold: 100 },
    { name: 'PVC Separator', unit: 'pieces', alert_threshold: 500 },
    { name: 'Battery Packing', unit: 'pieces', alert_threshold: 200 },
    { name: 'Lead', unit: 'kg', alert_threshold: 100 },
    { name: 'Packing Jali', unit: 'pieces', alert_threshold: 100 },
    { name: 'Plus Minus Caps', unit: 'pairs', alert_threshold: 200 },
  ];

  private static normalizeMaterialName(name: string): string {
    return (name || '').trim().toLowerCase();
  }

  private static async getRequiredRawMaterials(): Promise<Array<{ name: string; unit: string; alert_threshold: number }>> {
    const models = await this.query<{ name: string }>(`SELECT DISTINCT name FROM models WHERE name IS NOT NULL AND TRIM(name) != ''`);
    const modelContainers = models.map((m) => ({
      name: `Container - ${String(m.name).trim()}`,
      unit: 'pieces',
      alert_threshold: 50,
    }));
    return [...this.BASE_REQUIRED_RAW_MATERIALS, ...modelContainers];
  }

  static async init(): Promise<void> {
    console.log('Database Client Initialized [Mode: Enterprise IPC]');
    try {
      // Ensure a unique index exists on material names to prevent duplicates at the DB level
      await this.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_materials_name_unique ON raw_materials (LOWER(name))`
      );
    } catch (e) {
      console.warn('Could not create unique index on raw_materials.name:', e);
    }
    try {
      await this.seedDefaultRawMaterials();
    } catch (e) {
      console.warn('Silent: Database not fully migrated or ready for raw materials yet.');
    }
  }

  static async seedDefaultRawMaterials(): Promise<void> {
    const required = await this.getRequiredRawMaterials();

    const existing = await this.query<RawMaterial>('SELECT id, name, unit, alert_threshold FROM raw_materials ORDER BY rowid ASC');
    const seenByName = new Map<string, RawMaterial>();
    for (const m of existing) {
      const key = this.normalizeMaterialName(m.name);
      const keeper = seenByName.get(key);
      if (!keeper) {
        seenByName.set(key, m);
        continue;
      }
      await this.run(`UPDATE material_purchases SET material_id = ? WHERE material_id = ?`, [keeper.id, m.id]);
      await this.run(`DELETE FROM raw_materials WHERE id = ?`, [m.id]);
    }

    const latest = await this.query<RawMaterial>('SELECT id, name, unit, alert_threshold FROM raw_materials ORDER BY rowid ASC');
    const latestByName = new Map(latest.map((m) => [this.normalizeMaterialName(m.name), m]));
    const allowedNames = new Set(required.map((r) => this.normalizeMaterialName(r.name)));

    for (const rm of required) {
      const key = this.normalizeMaterialName(rm.name);
      if (latestByName.has(key)) continue;
      await this.run(
        `INSERT OR IGNORE INTO raw_materials (id, name, unit, alert_threshold) VALUES (?, ?, ?, ?)`,
        [`RM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, rm.name, rm.unit, rm.alert_threshold]
      );
    }

    const finalMaterials = await this.query<RawMaterial>('SELECT id, name FROM raw_materials');
    for (const m of finalMaterials) {
      if (allowedNames.has(this.normalizeMaterialName(m.name))) continue;
      await this.run(`DELETE FROM material_purchases WHERE material_id = ?`, [m.id]);
      await this.run(`DELETE FROM raw_materials WHERE id = ?`, [m.id]);
    }

    console.log('Synchronized raw materials catalogue.');
  }

  // --- GENERIC HELPERS ---

  private static async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (window.electronAPI?.db) {
      // Map undefined to null for sqlite compatibility
      const safeParams = params.map(p => p === undefined ? null : p);
      return await window.electronAPI.db.query(sql, safeParams);
    }
    console.error('IPC Bridge not available');
    return [];
  }

  public static async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    if (window.electronAPI?.db) {
      // Map undefined to null for sqlite compatibility
      const safeParams = params.map(p => p === undefined ? null : p);
      return await window.electronAPI.db.run(sql, safeParams);
    }
    throw new Error('Database disconnected');
  }

  // --- ENTITIES ---

  static async getPaginated<T>(
    table: string,
    page: number = 1,
    limit: number = 50,
    where: string = '',
    params: any[] = [],
    orderBy: string = 'rowid DESC'
  ): Promise<{ data: T[], total: number }> {
    const offset = (page - 1) * limit;
    const whereClause = where ? `WHERE ${where}` : '';

    const dataSql = `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;

    const [data, countResult] = await Promise.all([
      this.query<T>(dataSql, [...params, limit, offset]),
      this.query<{ count: number }>(countSql, params)
    ]);

    return {
      data,
      total: countResult[0]?.count || 0
    };
  }

  static async getAll<T>(table: string): Promise<T[]> {
    // SECURITY WARNING: In a real 10M record scenario, we must essentially ban 'getAll'
    // But for dropdowns (Dealers/Models), it's fine.
    // For Batteries, we will rely on searchBattery and paginate methods instead.
    if (table === 'batteries') {
      console.warn('getAll(batteries) called - returning empty to prevent crash. Use searchBattery instead.');
      return [] as unknown as T[];
    }
    return await this.query<T>(`SELECT * FROM ${table} ORDER BY rowid DESC`);
  }

  static async getCount(table: string): Promise<number> {
    const result = await this.query<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
    return result[0]?.count || 0;
  }

  static async addBattery(battery: Battery): Promise<void> {
    // ✅ Bug #8: Validate warranty months
    if (battery.warrantyMonths < 1 || battery.warrantyMonths > 120) {
      throw new Error('Warranty months must be between 1 and 120');
    }

    try {
      await this.run(
        `INSERT INTO batteries (
          id, model, capacity, manufactureDate, status, 
          replacementCount, warrantyMonths, dealerId,
          activationDate, customerName, customerPhone, warrantyExpiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          battery.id, battery.model, battery.capacity, battery.manufactureDate,
          battery.status, battery.replacementCount, battery.warrantyMonths, battery.dealerId || null,
          battery.activationDate || null, battery.customerName || null,
          battery.customerPhone || null, battery.warrantyExpiry || null
        ]
      );
    } catch (err: any) {
      // ✅ Bug #2: Handle duplicate battery ID gracefully
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Battery ${battery.id} already exists in the system`);
      }
      throw err;
    }
  }

  static async getBattery(id: string): Promise<Battery | undefined> {
    const results = await this.query<Battery>(
      `SELECT 
         b.*,
         COALESCE(m.name, b.model) AS model,
         COALESCE(m.defaultCapacity, b.capacity) AS capacity
       FROM batteries b
       LEFT JOIN models m ON b.model = m.id OR b.model = m.name
       WHERE b.id = ?`,
      [id]
    );
    return results[0];
  }

  static async searchBattery(term: string): Promise<{
    battery: Battery;
    sale?: Sale;
    originalSale?: Sale;
    lineage: Battery[];
    lineageSales: Sale[];
    replacements: Replacement[];
    activityLogs?: any[];
  } | null> {
    const battery = await this.getBattery(term);
    if (!battery) return null;

    // ✅ STEP 1: Find the ORIGINAL battery (trace backwards to start of chain)
    let original = battery;
    while (original.previousBatteryId) {
      const prev = await this.getBattery(original.previousBatteryId);
      if (prev) {
        original = prev;
      } else {
        break;
      }
    }

    // ✅ STEP 2: Build COMPLETE chain from original forward through ALL replacements
    let lineage: Battery[] = [original];
    let current = original;

    while (current.nextBatteryId) {
      const next = await this.getBattery(current.nextBatteryId);
      if (next) {
        lineage.push(next);
        current = next;
      } else {
        break;
      }
    }

    // ✅ STEP 3: Fetch ALL sales and replacements for entire chain
    const lineageIds = lineage.map(b => b.id);
    const placeholders = lineageIds.map(() => '?').join(',');

    const [allSales, allReplacements, allLogs] = await Promise.all([
      lineageIds.length > 0
        ? this.query<Sale>(
          `SELECT * FROM sales WHERE batteryId IN (${placeholders})`,
          lineageIds
        )
        : Promise.resolve([]),
      lineageIds.length > 0
        ? this.query<Replacement>(
          `SELECT * FROM replacements WHERE oldBatteryId IN (${placeholders}) OR newBatteryId IN (${placeholders}) ORDER BY replacementDate ASC`,
          [...lineageIds, ...lineageIds]
        )
        : Promise.resolve([]),
      lineageIds.length > 0
        ? this.query<any>(
          `SELECT * FROM activity_logs 
           WHERE (type = 'BATTERY_INSPECTION_START' OR type = 'BATTERY_INSPECTION_COMPLETE')
           AND (${lineageIds.map(() => 'metadata LIKE ?').join(' OR ')})`,
          lineageIds.map(id => `%${id}%`)
        )
        : Promise.resolve([])
    ]);

    // Better log filtering: ensure the log belongs to one of our lineage batteries
    const filteredLogs = allLogs.filter((log: any) => {
      try {
        const meta = JSON.parse(log.metadata);
        return lineageIds.includes(meta.id);
      } catch (e) { return false; }
    });

    // Find the original sale (first sale in chain)
    const originalSale = allSales.find(s => s.batteryId === original.id);
    const currentSale = allSales.find(s => s.batteryId === battery.id);

    return {
      battery,
      sale: currentSale,
      originalSale,
      lineage,
      lineageSales: allSales,
      replacements: allReplacements,
      activityLogs: filteredLogs
    };
  }



  static async searchStock(term: string, model?: string): Promise<Battery[]> {
    let sql = `SELECT * FROM batteries WHERE status = 'Manufactured' AND id LIKE ? ORDER BY rowid DESC`;
    const params: any[] = [`%${term}%`];

    if (model) {
      sql += ` AND model = ?`;
      params.push(model);
    }

    sql += ` LIMIT 10`;
    return await this.query<Battery>(sql, params);
  }

  static async getDealerStock(dealerId: string): Promise<Battery[]> {
    return await this.query<Battery>(
      'SELECT * FROM batteries WHERE dealerId = ? AND (status = ? OR status = ?) ORDER BY rowid DESC',
      [dealerId, 'Manufactured', 'ACTIVE']
    );
  }

  static async getDealerBatteries(dealerId: string): Promise<Battery[]> {
    return await this.query<Battery>('SELECT * FROM batteries WHERE dealerId = ? ORDER BY rowid DESC', [dealerId]);
  }

  static async getDealerReplacements(dealerId: string): Promise<Replacement[]> {
    return await this.query<Replacement>('SELECT * FROM replacements WHERE dealerId = ? ORDER BY rowid DESC', [dealerId]);
  }

  static async searchDealers(term: string): Promise<Dealer[]> {
    return await this.query<Dealer>(
      `SELECT * FROM dealers WHERE (name LIKE ? OR id LIKE ?) ORDER BY rowid DESC LIMIT 10`,
      [`%${term}%`, `%${term}%`]
    );
  }

  static async getAnalytics(): Promise<any> {
    // 1. Network Stats (Aggregated)
    const stats = await this.query<{ totalSales: number, totalRevenue: number }>(`
      SELECT 
        COUNT(*) as totalSales, 
        SUM(
          COALESCE(
            (SELECT price FROM model_prices mp 
             JOIN models m ON mp.modelId = m.id 
             WHERE m.name = s.batteryType AND mp.effectiveDate <= s.saleDate 
             ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
            s.salePrice,
            0
          )
        ) as totalRevenue 
      FROM sales s`
    );

    const activeCount = await this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM batteries WHERE status = 'ACTIVE'`
    );

    // 2. Dealer Leaderboard (Top 50 Only)
    const dealerStats = await this.query<{
      id: string, name: string, location: string,
      sales: number, revenue: number
    }>(`
      SELECT 
        d.id, d.name, d.location,
        COUNT(s.id) as sales,
        SUM(
          COALESCE(
            (SELECT price FROM model_prices mp 
             JOIN models m ON mp.modelId = m.id 
             WHERE m.name = s.batteryType AND mp.effectiveDate <= s.saleDate 
             ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
            s.salePrice,
            0
          )
        ) as revenue
      FROM dealers d
      LEFT JOIN sales s ON d.id = s.dealerId
      GROUP BY d.id
      ORDER BY sales DESC
      LIMIT 50
    `);

    // 3. Calculate Market Share
    const totalSales = stats[0]?.totalSales || 1; // Avoid divide by zero
    const finalDealerStats = dealerStats.map(d => ({
      ...d,
      marketShare: ((d.sales || 0) / totalSales) * 100,
      x: Math.random() * 100, // Visual mock
      y: Math.random() * 100  // Visual mock
    }));

    // 4. Expiring Soon (Optimized Date Query)
    const today = getLocalDate();
    const next3Months = new Date();
    next3Months.setMonth(next3Months.getMonth() + 3);
    const futureDate = next3Months.toISOString().split('T')[0];

    const expiring = await this.query<any>(
      `SELECT * FROM sales WHERE warrantyExpiry > ? AND warrantyExpiry <= ? ORDER BY warrantyExpiry ASC LIMIT 50`,
      [today, futureDate]
    );

    return {
      networkStats: {
        totalSales: stats[0]?.totalSales || 0,
        totalRevenue: stats[0]?.totalRevenue || 0,
        totalActive: activeCount[0]?.count || 0
      },
      dealerStats: finalDealerStats,
      expiringSoon: expiring
    };
  }

  static async getDashboardStats(): Promise<any> {
    const [statusCounts, totalDealers, recentReplacements] = await Promise.all([
      this.query<{ status: string, count: number }>(
        'SELECT status, COUNT(*) as count FROM batteries GROUP BY status'
      ),
      this.getCount('dealers'),
      this.query<any>(
        'SELECT * FROM replacements ORDER BY rowid DESC LIMIT 5'
      )
    ]);

    const activeCount = statusCounts.filter(s => s.status === BatteryStatus.ACTIVE || s.status === BatteryStatus.REPLACEMENT).reduce((a, b) => a + b.count, 0);
    const claimedCount = statusCounts.filter(s => s.status === BatteryStatus.RETURNED || s.status === BatteryStatus.REPLACEMENT).reduce((a, b) => a + b.count, 0);

    return {
      activeWarranties: activeCount,
      claimedUnits: claimedCount,
      totalDealers,
      statusDistribution: statusCounts.map(s => ({ name: s.status, value: s.count })),
      recentClaims: recentReplacements
    };
  }

  static async getDealerAnalytics(dealerId: string, year?: number, month?: number): Promise<any> {
    const today = getLocalDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    const filters: string[] = ["dealerId = ?"];
    const params: any[] = [dealerId];

    if (year) {
      filters.push("strftime('%Y', saleDate) = ?");
      params.push(year.toString());
    }
    if (month) {
      filters.push("strftime('%m', saleDate) = ?");
      params.push(month.toString().padStart(2, '0'));
    }

    const filterClause = `WHERE ${filters.join(' AND ')}`;
    const replacementFilterClause = `WHERE ${filters.join(' AND ').replace(/saleDate/g, 'replacementDate')}`;

    const [stats, activeCount, trend] = await Promise.all([
      this.query<any>(`
        SELECT 
          COUNT(*) as totalSales,
          (SELECT COUNT(*) FROM replacements ${replacementFilterClause}) as totalClaims
        FROM sales ${filterClause}`, [...params, ...params]
      ),
      this.query<any>(`SELECT COUNT(*) as count FROM batteries WHERE dealerId = ? AND(status = 'ACTIVE' OR status = 'REPLACEMENT') AND datetime(warrantyExpiry) >= datetime('now')`, [dealerId]),
      this.query<any>(`
        SELECT 
          strftime('%Y-%m', saleDate) as month,
      COUNT(*) as count
        FROM sales 
        WHERE dealerId = ? AND saleDate >= date('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC`, [dealerId]
      )
    ]);

    const totalSales = stats[0]?.totalSales || 0;
    const totalClaims = stats[0]?.totalClaims || 0;
    const claimRatio = totalSales > 0 ? (totalClaims / totalSales) * 100 : 0;

    // Last 30 days sales
    const last30 = await this.query<any>(`SELECT COUNT(*) as count FROM sales WHERE dealerId = ? AND saleDate >= ? `, [dealerId, thirtyDaysAgo]);

    return {
      activeUnitCount: activeCount[0]?.count || 0,
      last30Sales: last30[0]?.count || 0,
      totalSales,
      totalClaims,
      claimRatio: claimRatio.toFixed(1),
      salesTrend: trend.map((t: any) => ({ name: t.month, sales: t.count })),
      availableYears: (await this.query<any>(`SELECT DISTINCT strftime('%Y', saleDate) as year FROM sales WHERE dealerId = ? ORDER BY year DESC`, [dealerId])).map(r => parseInt(r.year))
    };
  }

  static async getDetailedDealerAnalytics(dealerId: string, year?: number, month?: number): Promise<any> {
    const params: any[] = [dealerId];
    let dateFilter = '';

    if (year) {
      dateFilter += " AND strftime('%Y', saleDate) = ?";
      params.push(year.toString());
      if (month) {
        dateFilter += " AND strftime('%m', saleDate) = ?";
        params.push(month.toString().padStart(2, '0'));
      }
    }

    const [kpis, trend, models, claimsTrend, detailedSales, detailedClaims] = await Promise.all([
      // KPIs for the selected period
      this.query<any>(`
        SELECT 
          COUNT(*) as periodSales,
      SUM(
        COALESCE(
          (SELECT price FROM model_prices mp 
               JOIN models m ON mp.modelId = m.id 
               WHERE m.name = s.batteryType AND mp.effectiveDate <= s.saleDate 
               ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
        s.salePrice,
        0
      )
          ) as periodRevenue,
    (SELECT COUNT(*) FROM replacements WHERE dealerId = ? ${dateFilter.replace(/saleDate/g, 'replacementDate')}) as periodClaims
        FROM sales s
        WHERE s.dealerId = ? ${dateFilter} `, [dealerId, ...params.slice(1), dealerId, ...params.slice(1)]),

      // Monthly trend for the selected year
      this.query<any>(`
    SELECT
    strftime('%m', saleDate) as month,
      COUNT(*) as count
        FROM sales 
          WHERE dealerId = ? AND strftime('%Y', saleDate) = ?
      GROUP BY month
        ORDER BY month ASC`, [dealerId, year ? year.toString() : new Date().getFullYear().toString()]),

      // Model distribution for the selected period
      this.query<any>(`
    SELECT
    batteryType as name,
      COUNT(*) as value
        FROM sales 
        WHERE dealerId = ? ${dateFilter}
        GROUP BY batteryType
        ORDER BY value DESC`, [dealerId, ...params.slice(1)]),

      // Claims vs Sales over time
      this.query<any>(`
    SELECT
    strftime('%m', replacementDate) as month,
      COUNT(*) as count
        FROM replacements 
        WHERE dealerId = ? AND strftime('%Y', replacementDate) = ?
      GROUP BY month
        ORDER BY month ASC`, [dealerId, year ? year.toString() : new Date().getFullYear().toString()]),

      // 5. Detailed Sales Audit
      this.query<any>(`
    SELECT
    s.batteryId as id,
      s.batteryType as model,
      s.saleDate as date,
      COALESCE(
        (SELECT price FROM model_prices mp 
             JOIN models m ON mp.modelId = m.id 
             WHERE m.name = s.batteryType AND mp.effectiveDate <= s.saleDate 
             ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
      s.salePrice,
      0
          ) as price
        FROM sales s
        WHERE s.dealerId = ? ${dateFilter}
        ORDER BY s.saleDate DESC`, [dealerId, ...params.slice(1)]),

      // 6. Detailed Claims Audit
      this.query<any>(`
    SELECT
    r.oldBatteryId as id,
      b.model as model,
      r.replacementDate as date,
      COALESCE(
        (SELECT price FROM model_prices mp 
             JOIN models m ON mp.modelId = m.id 
             WHERE m.name = b.model AND mp.effectiveDate <= r.replacementDate 
             ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
      0
          ) as price
        FROM replacements r
        JOIN batteries b ON r.oldBatteryId = b.id
        WHERE r.dealerId = ? ${dateFilter.replace(/saleDate/g, 'replacementDate')}
        ORDER BY r.replacementDate DESC`, [dealerId, ...params.slice(1)])
    ]);

    const activeCount = await this.query<any>(`
      SELECT COUNT(*) as count 
      FROM batteries 
      WHERE dealerId = ? AND(status = 'ACTIVE' OR status = 'REPLACEMENT') 
      AND datetime(warrantyExpiry) >= datetime('now')`, [dealerId]
    );

    return {
      kpis: {
        totalSales: kpis[0]?.periodSales || 0,
        totalRevenue: kpis[0]?.periodRevenue || 0,
        totalClaims: kpis[0]?.periodClaims || 0,
        activeUnits: activeCount[0]?.count || 0,
        claimRatio: kpis[0]?.periodSales > 0 ? ((kpis[0]?.periodClaims / kpis[0]?.periodSales) * 100).toFixed(1) : "0.0"
      },
      salesTrend: trend.map((t: any) => ({ name: t.month, sales: t.count })),
      claimsTrend: claimsTrend.map((t: any) => ({ name: t.month, claims: t.count })),
      modelDistribution: models,
      detailedSales: detailedSales,
      detailedClaims: detailedClaims,
      // Helper for the UI to know what years have data
      availableYears: (await this.query<any>(`SELECT DISTINCT strftime('%Y', saleDate) as year FROM sales WHERE dealerId = ? ORDER BY year DESC`, [dealerId])).map(r => parseInt(r.year))
    };
  }

  static async backupDatabase(): Promise<{ success: boolean; path: string; error?: string }> {
    if (window.electronAPI?.db?.backup) return await window.electronAPI.db.backup();
    return { success: false, path: '', error: 'API missing' };
  }

  // --- External DB Mapping Methods ---

  static async selectBackupFolder(): Promise<string | null> {
    if (window.electronAPI?.db?.selectBackupFolder) {
      return await window.electronAPI.db.selectBackupFolder();
    }
    return null;
  }

  static async backupCustom(path: string): Promise<{ success: boolean; path: string; error?: string }> {
    if (window.electronAPI?.db?.backupCustom) return await window.electronAPI.db.backupCustom(path);
    return { success: false, path: '', error: 'API missing' };
  }

  static async selectRestoreFile(): Promise<string | null> {
    if (window.electronAPI?.db?.selectRestoreFile) return await window.electronAPI.db.selectRestoreFile();
    return null;
  }

  static async restoreDatabase(path: string): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.db?.restoreDatabase) return await window.electronAPI.db.restoreDatabase(path);
    return { success: false, error: 'API missing' };
  }

  static async optimizeDatabase(): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.db?.optimizeDatabase) return await window.electronAPI.db.optimizeDatabase();
    return { success: false, error: 'Optimization API missing' };
  }

  static async switchDatabase(type: 'INTERNAL' | 'EXTERNAL', path?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    if (window.electronAPI?.db?.initDatabase) return await window.electronAPI.db.initDatabase({ type, path });
    return { success: false, error: 'Database API missing' };
  }

  static async selectExternalDrive(): Promise<string | null> {
    if (window.electronAPI?.db?.selectExternalDrive) return await window.electronAPI.db.selectExternalDrive();
    return null;
  }

  static async resetDatabase(): Promise<void> {
    // Re-implementing simplified reset for Factory Reset feature
    await this.run('DELETE FROM batteries');
    await this.run('DELETE FROM sales');
    await this.run('DELETE FROM replacements');
    await this.run('DELETE FROM dealers');
    // Keep models for convenience? No, full reset.
    await this.run('DELETE FROM models');
    await this.run('DELETE FROM app_config');
    // Re-seed defaults after reset if needed, but usually reset means blank. 
    // However, for login we need at least one user. Let's re-seed.
    await this.run("INSERT OR IGNORE INTO app_config (key, value) VALUES ('starline_admin_user', 'admin')");
    await this.run("INSERT OR IGNORE INTO app_config (key, value) VALUES ('starline_admin_pass', 'starline@2025')");
  }

  static async getConfig(key: string): Promise<string | null> {
    const results = await this.query<{ value: string }>('SELECT value FROM app_config WHERE key = ?', [key]);
    return results[0]?.value || null;
  }

  static async setConfig(key: string, value: string): Promise<void> {
    await this.run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', [key, value]);
  }



  // --- ACTIVITY LOG ---

  static async logActivity(type: string, description: string, metadata?: any): Promise<void> {
    try {
      await this.run(
        'INSERT INTO activity_logs (type, description, metadata) VALUES (?, ?, ?)',
        [type, description, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  }

  static async getActivityLogs(page: number = 1, limit: number = 50, typeFilter?: string): Promise<{ data: any[], total: number }> {
    let where = '';
    const params: any[] = [];

    if (typeFilter) {
      where = 'type = ?';
      params.push(typeFilter);
    }

    return await this.getPaginated<any>('activity_logs', page, limit, where, params, 'timestamp DESC');
  }

  static async deleteActivityLog(id: number): Promise<void> {
    await this.run('DELETE FROM activity_logs WHERE id = ?', [id]);
  }

  static async clearActivityLogs(): Promise<void> {
    await this.run('DELETE FROM activity_logs');
  }

  // --- USER MANAGEMENT ---

  static async getUsers(): Promise<User[]> {
    return await this.query<User>('SELECT id, username, role FROM users ORDER BY username ASC');
  }

  static async addUser(user: Partial<User> & { password?: string }): Promise<void> {
    await this.run(
      'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
      [user.id || Math.random().toString(36).substr(2, 9), user.username, user.password, user.role]
    );
  }

  static async updateUser(user: Partial<User> & { password?: string }): Promise<void> {
    if (user.password) {
      await this.run(
        'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
        [user.username, user.password, user.role, user.id]
      );
    } else {
      await this.run(
        'UPDATE users SET username = ?, role = ? WHERE id = ?',
        [user.username, user.role, user.id]
      );
    }
  }

  static async deleteUser(id: string): Promise<void> {
    await this.run('DELETE FROM users WHERE id = ?', [id]);
  }

  // --- STAGED BATCHES ---

  static async createStagedBatch(batch: Partial<StagedBatch>, itemSerials: string[]): Promise<string> {
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    await this.run(
      `INSERT INTO staged_batches (id, createdBy, dealerId, modelId, date, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [batchId, batch.createdBy, batch.dealerId, batch.modelId, batch.date || getLocalDate(), 'PENDING']
    );

    for (const serial of itemSerials) {
      await this.run(
        'INSERT INTO staged_batch_items (batchId, serialNumber) VALUES (?, ?)',
        [batchId, serial]
      );
    }

    return batchId;
  }

  static async getStagedBatch(id: string): Promise<StagedBatch | undefined> {
    const results = await this.query<StagedBatch>(`
      SELECT sb.*, u.username as creatorName, d.name as dealerName, m.name as modelName,
             (SELECT COUNT(*) FROM staged_batch_items WHERE batchId = sb.id) as itemCount
      FROM staged_batches sb
      LEFT JOIN users u ON sb.createdBy = u.id
      LEFT JOIN dealers d ON sb.dealerId = d.id
      LEFT JOIN models m ON sb.modelId = m.id
      WHERE sb.id = ?
    `, [id]);
    return results[0];
  }

  static async getStagedBatches(userId?: string): Promise<StagedBatch[]> {
    let sql = `
      SELECT sb.*, u.username as creatorName, d.name as dealerName, m.name as modelName,
             (SELECT COUNT(*) FROM staged_batch_items WHERE batchId = sb.id) as itemCount
      FROM staged_batches sb
      LEFT JOIN users u ON sb.createdBy = u.id
      LEFT JOIN dealers d ON sb.dealerId = d.id
      LEFT JOIN models m ON sb.modelId = m.id
    `;
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE sb.createdBy = ?';
      params.push(userId);
    }
    sql += ' ORDER BY sb.createdAt DESC';
    return await this.query<StagedBatch>(sql, params);
  }

  static async getNotificationCounts(): Promise<{ batches: number, settlements: number }> {
    const batchesRes = await this.query<{ count: number }>('SELECT COUNT(*) as count FROM staged_batches WHERE status = ?', ['PENDING']);
    const inspectionsRes = await this.query<{ count: number }>("SELECT COUNT(*) as count FROM batteries WHERE (status = 'RETURNED_PENDING' AND inspectionStatus = 'PENDING') OR inspectionStatus = 'IN_PROGRESS'");
    const settlementsRes = await this.query<{ count: number }>("SELECT COUNT(*) as count FROM replacements WHERE settlementType IS NULL OR (settlementType = 'CREDIT' AND paidInAccount = 0)");
    const returnsRes = await this.query<{ count: number }>("SELECT COUNT(*) as count FROM batteries WHERE status = 'RETURNED_PENDING'");
    return {
      batches: (batchesRes[0]?.count || 0) + (inspectionsRes[0]?.count || 0),
      settlements: (settlementsRes[0]?.count || 0) + (returnsRes[0]?.count || 0)
    };
  }

  static async getStagedBatchItems(batchId: string): Promise<string[]> {
    const items = await this.query<{ serialNumber: string }>('SELECT serialNumber FROM staged_batch_items WHERE batchId = ?', [batchId]);
    return items.map(i => i.serialNumber);
  }

  static async removeBatchItem(batchId: string, serialNumber: string): Promise<void> {
    await this.run(
      'DELETE FROM staged_batch_items WHERE batchId = ? AND serialNumber = ?',
      [batchId, serialNumber]
    );
    await this.logActivity(
      'BATCH_ITEM_REMOVED',
      `Unit ${serialNumber} removed from batch ${batchId}`,
      { batchId, serialNumber }
    );
  }

  static async approveStagedBatch(id: string): Promise<void> {
    const batch = await this.getStagedBatch(id);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'PENDING') throw new Error('Batch is already processed');

    const items = await this.query<{ serialNumber: string }>('SELECT serialNumber FROM staged_batch_items WHERE batchId = ?', [id]);

    // Get model details for warrantyMonths
    const model = (await this.query<BatteryModel>('SELECT * FROM models WHERE id = ?', [batch.modelId]))[0];
    if (!model) throw new Error('Model configuration missing');

    const dealer = (await this.query<Dealer>('SELECT * FROM dealers WHERE id = ?', [batch.dealerId]))[0];

    const formattedItems = items.map(item => ({
      id: item.serialNumber,
      model: model.name,
      capacity: model.defaultCapacity,
      warrantyMonths: model.defaultWarrantyMonths,
      dealerId: batch.dealerId,
      dealerName: dealer?.name || 'Unknown',
      exists: false // We assume batching is for new/unregistered units primarily
    }));

    // Check if any of these already exist - if so, we should handle them as "exists: true"
    for (const item of formattedItems) {
      const existing = await this.getBattery(item.id);
      if (existing) {
        item.exists = true;
      }
    }

    // Reuse existing batchAssign logic
    await this.batchAssign(formattedItems, batch.date);

    // Update batch status
    await this.run('UPDATE staged_batches SET status = ? WHERE id = ?', ['APPROVED', id]);

    await this.logActivity('BATCH_APPROVED', `Batch ${id} approved and processed`, { batchId: id, itemCount: items.length });
  }

  static async denyStagedBatch(id: string): Promise<void> {
    const batch = await this.getStagedBatch(id);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'PENDING') throw new Error('Batch is already processed');

    await this.run('UPDATE staged_batches SET status = ? WHERE id = ?', ['DENIED', id]);
    await this.logActivity('BATCH_DENIED', `Batch ${id} was denied`, { batchId: id });
  }

  static async authenticateUser(username: string, password: string): Promise<User | null> {
    const results = await this.query<User>(
      'SELECT id, username, role FROM users WHERE username COLLATE NOCASE = ? AND password = ?',
      [username, password]
    );
    return results[0] || null;
  }
  // --- OPERATIONS ---

  static async updateBatteryStatus(id: string, status: string, dealerId: string | null = null): Promise<void> {
    await this.run(
      `UPDATE batteries SET status = ?, dealerId = ? WHERE id = ? `,
      [status, dealerId, id]
    );
  }

  static async startInspection(id: string, notes?: string): Promise<void> {
    const today = getLocalDate();
    await this.run(
      `UPDATE batteries SET 
        inspectionStatus = 'IN_PROGRESS', 
        inspectionStartDate = ?,
        inspectionNotes = ?
      WHERE id = ?`,
      [today, notes || null, id]
    );
    await this.logActivity('BATTERY_INSPECTION_START', `Started technical inspection for battery ${id}`, { id, startDate: today, notes });
  }

  static async updateInspection(id: string, status: 'GOOD' | 'FAULTY', returnDate?: string, notes?: string, reason?: string): Promise<void> {
    const today = getLocalDate();
    await this.run(
      `UPDATE batteries SET 
        inspectionStatus = ?, 
        inspectionDate = ?, 
        inspectionReturnDate = ?,
        inspectionNotes = ?,
        inspectionReason = ?
      WHERE id = ?`,
      [status, today, returnDate || null, notes || null, reason || null, id]
    );
    await this.logActivity('BATTERY_INSPECTION_COMPLETE', `Completed inspection for battery ${id}: Result is ${status}${reason ? ' (' + reason + ')' : ''}`, { id, status, completionDate: today, returnDate, notes, reason });
  }

  static async resetInspection(id: string, reason?: string): Promise<void> {
    await this.run(
      `UPDATE batteries SET 
        inspectionStatus = 'PENDING', 
        inspectionDate = NULL, 
        inspectionStartDate = NULL,
        inspectionReturnDate = NULL,
        inspectionNotes = NULL
      WHERE id = ?`,
      [id]
    );
    await this.logActivity('BATTERY_INSPECTION_RESET', `Reset inspection for battery ${id}`, { id, reason });
  }

  static async getPendingInspections(): Promise<Battery[]> {
    return this.query<Battery>(
      `SELECT b.*, COALESCE(m.name, b.model) as modelName
       FROM batteries b
       LEFT JOIN models m ON b.model = m.id OR b.model = m.name
       WHERE (b.status = 'RETURNED_PENDING' AND b.inspectionStatus = 'PENDING') OR b.inspectionStatus = 'IN_PROGRESS'
       ORDER BY b.inspectionStartDate DESC, b.id ASC`
    );
  }

  static async markAsPendingExchange(
    id: string,
    dealerId: string,
    returnDate?: string,
    warrantyCardStatus?: string,
    actualSaleDate?: string
  ): Promise<void> {
    const battery = await this.getBattery(id);
    if (!battery) throw new Error('Battery not found');

    // Only allow marking as pending if it's currently ACTIVE or REPLACEMENT
    if (battery.status !== BatteryStatus.ACTIVE && battery.status !== BatteryStatus.REPLACEMENT) {
      throw new Error(`Cannot mark battery with status ${battery.status} as pending exchange`);
    }

    const finalReturnDate = returnDate || getLocalDate();

    await this.run(
      `UPDATE batteries SET
    status = ?,
      dealerId = ?,
      activationDate = ?,
      warrantyCardStatus = ?,
      actualSaleDate = ?
        WHERE id = ? `,
      [
        BatteryStatus.RETURNED_PENDING,
        dealerId,
        finalReturnDate,
        warrantyCardStatus || null,
        actualSaleDate || null,
        id
      ]
    );
  }

  static async updateBatteryDetails(
    currentId: string,
    newId: string,
    dealerId: string,
    model?: string
  ): Promise<void> {
    if (window.electronAPI?.db?.updateBatteryDetails) {
      await window.electronAPI.db.updateBatteryDetails(currentId, newId, dealerId, model);
    } else {
      console.error('IPC Bridge updateBatteryDetails not available');
      throw new Error('Database bridge update failed');
    }
  }

  static async updateBatterySentToShopDate(id: string, sentToShopDate: string): Promise<void> {
    const battery = await this.getBattery(id);
    if (!battery) throw new Error('Battery not found');

    const params: any[] = [sentToShopDate];
    let sql = `UPDATE batteries SET activationDate = ?`;

    // ✅ VALIDATE: activationDate must be >= manufactureDate
    if (battery.manufactureDate && sentToShopDate < battery.manufactureDate) {
      throw new Error(`Invalid Date: Sent to Shop date (${sentToShopDate}) cannot be before Manufactured date (${battery.manufactureDate})`);
    }

    // ✅ FORCE CONSISTENCY: actualSaleDate must be >= activationDate
    if (battery.actualSaleDate && battery.actualSaleDate < sentToShopDate) {
      sql += `, actualSaleDate = ?`;
      params.push(sentToShopDate);
      
      // Recalculate expiry since actualSaleDate changed
      sql += `, warrantyExpiry = date(?, '+' || warrantyMonths || ' months')`;
      params.push(sentToShopDate);
    } else if (!battery.actualSaleDate) {
      // Normal activation expiry calculation
      sql += `, warrantyExpiry = date(?, '+' || warrantyMonths || ' months')`;
      params.push(sentToShopDate);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    await this.run(sql, params);

    // ✅ SYNC STOCK SALES: Update associated auto-generated stock sales to match
    await this.run(
      `UPDATE sales SET saleDate = ?, warrantyStartDate = ?, 
       warrantyExpiry = date(?, '+' || (SELECT warrantyMonths FROM batteries WHERE id = sales.batteryId) || ' months')
       WHERE batteryId = ? AND customerPhone = 'STOCK'`,
      [sentToShopDate, sentToShopDate, sentToShopDate, id]
    );

    // ✅ SYNC REPLACEMENTS: If this battery is a replacement unit, update the audit trail date
    await this.run(
      `UPDATE replacements SET replacementDate = ? WHERE newBatteryId = ?`,
      [sentToShopDate, id]
    );
  }

  static async moveBatteryToDealer(id: string, dealerId: string, sentToShopDate: string): Promise<void> {
    const battery = await this.getBattery(id);
    if (!battery) throw new Error('Battery not found');

    const hasLifecycleLinks = !!battery.previousBatteryId || !!battery.nextBatteryId;

    // Allow move even if actualSaleDate exists (to fix dealer assignment mistakes)
    // but still block if it's already part of a replacement chain
    if (
      battery.status === BatteryStatus.RETURNED ||
      battery.status === BatteryStatus.RETURNED_PENDING ||
      hasLifecycleLinks ||
      (battery.status !== BatteryStatus.MANUFACTURED && battery.status !== BatteryStatus.ACTIVE)
    ) {
      throw new Error('This battery is not eligible to move to another dealer.');
    }

    const params: any[] = [dealerId, sentToShopDate];
    let sql = `UPDATE batteries SET dealerId = ?, activationDate = ?`;

    // ✅ VALIDATE: activationDate must be >= manufactureDate
    if (battery.manufactureDate && sentToShopDate < battery.manufactureDate) {
      throw new Error(`Invalid Date: Sent to Shop date (${sentToShopDate}) cannot be before Manufactured date (${battery.manufactureDate})`);
    }

    // ✅ FORCE CONSISTENCY: actualSaleDate must be >= activationDate
    if (battery.actualSaleDate && battery.actualSaleDate < sentToShopDate) {
      sql += `, actualSaleDate = ?`;
      params.push(sentToShopDate);
    }

    // Always reset expiry based on the new activation/sale date when moving dealers
    sql += `, warrantyExpiry = date(?, '+' || warrantyMonths || ' months')`;
    params.push(sentToShopDate);

    sql += ` WHERE id = ?`;
    params.push(id);

    await this.run(sql, params);

    // ✅ SYNC STOCK SALES: Update associated auto-generated stock sales to match
    await this.run(
      `UPDATE sales SET dealerId = ?, saleDate = ?, warrantyStartDate = ?, 
       warrantyExpiry = date(?, '+' || (SELECT warrantyMonths FROM batteries WHERE id = sales.batteryId) || ' months')
       WHERE batteryId = ? AND customerPhone = 'STOCK'`,
      [dealerId, sentToShopDate, sentToShopDate, sentToShopDate, id]
    );

    // ✅ SYNC REPLACEMENTS: Keep the audit trail in sync if this unit was a replacement
    await this.run(
      `UPDATE replacements SET replacementDate = ?, dealerId = ? WHERE newBatteryId = ?`,
      [sentToShopDate, dealerId, id]
    );
  }

  static async registerSale(id: string, date: string, customerName: string, customerPhone: string): Promise<void> {
    // ✅ Bug #9: Validate customer data
    const nameValidation = validateName(customerName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error || 'Invalid customer name');
    }

    const phoneValidation = validatePhone(customerPhone);
    if (!phoneValidation.valid) {
      throw new Error(phoneValidation.error || 'Invalid phone number');
    }

    const battery = await this.getBattery(id);
    if (!battery) throw new Error('Battery not found');

    // ✅ VALIDATE: Sale date cannot be before Manufactured Date
    if (battery.manufactureDate && date < battery.manufactureDate) {
      throw new Error(`Invalid Date: Sale date (${date}) cannot be before Manufactured date (${battery.manufactureDate})`);
    }

    // ✅ VALIDATE: Sale date cannot be before Dispatch Date
    if (battery.activationDate && date < battery.activationDate) {
      throw new Error(`Invalid Date: Sale date (${date}) cannot be before Sent to Shop date (${battery.activationDate})`);
    }

    const expiryDate = new Date(date);
    expiryDate.setMonth(expiryDate.getMonth() + (battery.warrantyMonths || 0));

    await this.run(
      `UPDATE batteries SET
    status = 'ACTIVE',
      activationDate = NULL,
      actualSaleDate = ?,
      actualSaleDateSource = 'MANUAL_OVERRIDE',
      warrantyCalculationBase = 'ACTUAL_SALE',
      customerName = ?,
      customerPhone = ?,
      warrantyExpiry = ?
        WHERE id = ? `,
      [date, customerName, customerPhone, expiryDate.toISOString().split('T')[0], id]
    );
  }

  static async addSale(sale: Sale): Promise<void> {
    // ✅ Bug #14: Check for existing sale
    const existing = await this.query<Sale>(
      'SELECT * FROM sales WHERE batteryId = ? AND isBilled = 1',
      [sale.batteryId]
    );

    if (existing.length > 0) {
      throw new Error(`Battery ${sale.batteryId} already has an active sale record`);
    }

    // 1. Insert Sale Record
    await this.run(
      `INSERT INTO sales(
          id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount,
          isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount,
          warrantyStartDate, warrantyExpiry
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sale.id, sale.batteryId, sale.batteryType, sale.dealerId, sale.saleDate,
        sale.salePrice, sale.gstAmount, sale.totalAmount, sale.isBilled ? 1 : 0,
        sale.customerName, sale.customerPhone, sale.guaranteeCardReturned ? 1 : 0,
        sale.paidInAccount ? 1 : 0, sale.warrantyStartDate, sale.warrantyExpiry
      ]
    );

    // 2. Update Battery Status
    await this.registerSale(sale.batteryId, sale.saleDate, sale.customerName, sale.customerPhone);
  }

  static async addReplacement(
    rep: Replacement,
    meta?: { customerName: string; customerPhone: string; warrantyExpiry: string; correctedOriginalSaleDate?: string }
  ): Promise<void> {
    // ✅ Bug #13: Check for circular reference
    let checkId = rep.newBatteryId;
    const visited = new Set<string>();

    while (checkId) {
      if (visited.has(checkId)) {
        throw new Error('Circular reference detected in battery chain');
      }
      visited.add(checkId);

      const battery = await this.getBattery(checkId);
      if (!battery) break;
      checkId = battery.previousBatteryId || '';

      if (checkId === rep.oldBatteryId) {
        throw new Error('Invalid replacement: new battery already references old battery in its chain');
      }
    }

    // Transaction-like sequence PROTECTED
    try {
      await this.run('BEGIN TRANSACTION');

      // 1. Insert Replacement Record
      await this.run(
        `INSERT INTO replacements(
          id, oldBatteryId, newBatteryId, dealerId, replacementDate,
          reason, problemDescription, warrantyCardStatus, paidInAccount, replenishmentBatteryId, settlementType
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rep.id, rep.oldBatteryId, rep.newBatteryId, rep.dealerId,
          rep.replacementDate, rep.reason, rep.problemDescription, rep.warrantyCardStatus,
          rep.paidInAccount ? 1 : 0, rep.replenishmentBatteryId || null, rep.settlementType || null
        ]
      );

      // 1b. If Replenishment Unit Provided -> Activate & Assign to Dealer (Stock Replenishment)
      if (rep.replenishmentBatteryId) {
        // It's a "Zero Cost" assignment essentially replacing the stock loss
        // We set it to ACTIVE assigned to the dealer
        const today = getLocalDate();
        const replUnit = await this.getBattery(rep.replenishmentBatteryId);

        if (replUnit) {
          // Calculate default expiry from activation
          const expiryDate = new Date(today);
          expiryDate.setMonth(expiryDate.getMonth() + (replUnit.warrantyMonths || 24));
          const expiryStr = expiryDate.toISOString().split('T')[0];

          await this.run(
            `UPDATE batteries SET
    status = 'ACTIVE',
      dealerId = ?,
      activationDate = ?,
      warrantyExpiry = ?,
      customerName = 'DEALER STOCK',
      replacementCount = 0
          WHERE id = ? `,
            [rep.dealerId, today, expiryStr, rep.replenishmentBatteryId]
          );
        }
      }

      // 2. Mark Old Battery as RETURNED
      // If correctedOriginalSaleDate is provided, we also fix the old battery's records for historical accuracy
      if (meta?.correctedOriginalSaleDate) {
        // Fetch battery to get warranty months for recalculation
        const oldBatt = await this.getBattery(rep.oldBatteryId);
        const months = oldBatt?.warrantyMonths || 24;
        const newExpiry = new Date(meta.correctedOriginalSaleDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);
        const newExpiryStr = newExpiry.toISOString().split('T')[0];

        // ✅ FIX: Use actualSaleDate for customer sales to avoid overwriting dispatch (activationDate)
        await this.run(
          `UPDATE batteries SET status = 'RETURNED', nextBatteryId = ?, actualSaleDate = ?, warrantyExpiry = ? WHERE id = ? `,
          [rep.newBatteryId, meta.correctedOriginalSaleDate, newExpiryStr, rep.oldBatteryId]
        );
      } else {
        await this.run(
          `UPDATE batteries SET status = 'RETURNED', nextBatteryId = ? WHERE id = ? `,
          [rep.newBatteryId, rep.oldBatteryId]
        );
      }

      // 3. Activate New Battery (REPLACEMENT status)
      // If correctedOriginalSaleDate is provided, use it for activation. Else use replacementDate.
      const activationDate = meta?.correctedOriginalSaleDate || rep.replacementDate;

      await this.run(
        `UPDATE batteries SET
    status = 'REPLACEMENT',
      previousBatteryId = ?,
      activationDate = ?,
      dealerId = ?,
      customerName = ?,
      customerPhone = ?,
      warrantyExpiry = ?
        WHERE id = ? `,
        [
          rep.oldBatteryId, activationDate, rep.dealerId || 'CENTRAL',
          meta?.customerName || null, meta?.customerPhone || null, meta?.warrantyExpiry || null,
          rep.newBatteryId
        ]
      );

      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK');
      console.error('Transaction Failed: addReplacement', error);
      throw error; // Re-throw to alert UI
    }
  }

  static async addDealer(dealer: Dealer): Promise<void> {
    await this.run(
      `INSERT INTO dealers(id, name, ownerName, address, contact, location) VALUES(?, ?, ?, ?, ?, ?)`,
      [dealer.id, dealer.name, dealer.ownerName, dealer.address, dealer.contact, dealer.location]
    );
  }

  static async updateDealer(dealer: Dealer): Promise<void> {
    await this.run(
      `UPDATE dealers SET name = ?, ownerName = ?, address = ?, contact = ?, location = ? WHERE id = ? `,
      [dealer.name, dealer.ownerName, dealer.address, dealer.contact, dealer.location, dealer.id]
    );
  }

  static async deleteDealer(id: string): Promise<void> {
    await this.run('DELETE FROM dealers WHERE id = ?', [id]);
  }

  static async updateReplacementPaidStatus(replacementId: string, paidInAccount: boolean): Promise<void> {
    await this.run(
      `UPDATE replacements SET paidInAccount = ? WHERE id = ? `,
      [paidInAccount ? 1 : 0, replacementId]
    );
    window.dispatchEvent(new CustomEvent('db-synced'));
  }

  static async resolveSettlement(
    replacementId: string,
    method: 'CREDIT' | 'STOCK',
    date: string,
    replenishmentBatteryId?: string
  ): Promise<void> {
    const replacement = (await this.query<{ dealerId: string, oldBatteryId: string }>('SELECT dealerId, oldBatteryId FROM replacements WHERE id = ?', [replacementId]))[0];
    if (!replacement) throw new Error('Replacement record not found');

    try {
      if (method === 'STOCK') {
        if (!replenishmentBatteryId) throw new Error('Replenishment Battery ID is required for Stock settlement');
        const replId = replenishmentBatteryId.toUpperCase().trim();

        // 1. Validate Stock Unit
        const stockUnit = await this.getBattery(replId);
        if (stockUnit) {
          // It exists - ensure it allows assignment (MANUFACTURED or Dealer's own active stock)
          const isDealerStock = stockUnit.dealerId === replacement.dealerId;
          const allowedStatus = ['MANUFACTURED', 'ACTIVE'];
          if (!allowedStatus.includes(stockUnit.status) || (stockUnit.status === 'ACTIVE' && !isDealerStock)) {
            throw new Error(`Stock Unit ${replId} is ${stockUnit.status}. Expected FRESH STOCK.`);
          }
        } else {
          // If it doesn't exist, we'll create it on the fly (assume fresh scan)
        }

        await this.run('BEGIN TRANSACTION');

        // 2. Activate/Assign Stock Unit
        if (stockUnit) {
          const today = getLocalDate();
          const expiryDate = new Date(today);
          expiryDate.setMonth(expiryDate.getMonth() + (stockUnit.warrantyMonths || 24));

          await this.run(
            `UPDATE batteries SET
    status = 'ACTIVE',
      dealerId = ?,
      activationDate = ?,
      warrantyExpiry = ?,
      customerName = 'DEALER STOCK',
      replacementCount = 0
            WHERE id = ? `,
            [replacement.dealerId, date, expiryDate.toISOString().split('T')[0], replId]
          );
        } else {
          // Create new unit
          // 1. Get Old Battery Model to determine warranty
          const oldBattery = (await this.query<{ model: string }>('SELECT model FROM batteries WHERE id = ?', [replacement.oldBatteryId]))[0];
          const modelName = oldBattery ? oldBattery.model : 'UNKNOWN';

          // 2. Get Warranty Duration for this model
          const modelConfig = (await this.query<{ defaultWarrantyMonths: number, defaultCapacity: string }>('SELECT defaultWarrantyMonths, defaultCapacity FROM models WHERE name = ?', [modelName]))[0];
          const warrantyMonths = modelConfig ? modelConfig.defaultWarrantyMonths : 24;
          const capacity = modelConfig ? modelConfig.defaultCapacity : 'UNKNOWN';

          const expiryDate = new Date(date);
          expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);

          await this.addBattery({
            id: replId,
            model: modelName,
            capacity: capacity,
            manufactureDate: getLocalDate(),
            status: BatteryStatus.ACTIVE,
            replacementCount: 0,
            warrantyMonths: warrantyMonths,
            dealerId: replacement.dealerId,
            activationDate: date,
            customerName: 'DEALER STOCK',
            warrantyExpiry: expiryDate.toISOString().split('T')[0] // ✅ FIX: Dynamic Expiry
          });
        }

        // 3. Update Replacement Record
        await this.run(
          `UPDATE replacements SET
    settlementType = 'STOCK',
      replenishmentBatteryId = ?,
      paidInAccount = 0,
      settlementDate = ?
        WHERE id = ? `,
          [replId, date, replacementId]
        );

        await this.run('COMMIT');

      } else {
        // CREDIT Settlement
        await this.run(
          `UPDATE replacements SET
    settlementType = 'CREDIT',
      paidInAccount = 1,
      replenishmentBatteryId = NULL,
      settlementDate = ?
        WHERE id = ? `,
          [date, replacementId]
        );
      }
      window.dispatchEvent(new CustomEvent('db-synced'));
    } catch (err) {
      if (method === 'STOCK') await this.run('ROLLBACK');
      console.error('Settlement Failed:', err);
      throw err;
    }
  }

  static async getSettlementLedger(): Promise<any[]> {
    const sql = `
      --1. Finalized Replacements awaiting settlement
    SELECT
    r.id,
      r.dealerId,
      r.oldBatteryId,
      r.newBatteryId,
      r.replacementDate,
      'EXCHANGED' as type,
      d.name as dealerName,
      d.location as dealerLocation,
      ob.model as oldModel,
      nb.model as newModel,
      s.salePrice as originalPrice
      FROM replacements r
      JOIN dealers d ON r.dealerId = d.id
      JOIN batteries ob ON r.oldBatteryId = ob.id
      LEFT JOIN batteries nb ON r.newBatteryId = nb.id
      LEFT JOIN sales s ON r.oldBatteryId = s.batteryId
      WHERE r.settlementType IS NULL OR(r.settlementType = 'CREDIT' AND r.paidInAccount = 0)

      UNION ALL

    --2. Pending Returns awaiting swap
    SELECT
    b.id as id,
      b.dealerId,
      b.id as oldBatteryId,
      NULL as newBatteryId,
      b.activationDate as replacementDate,
      'PENDING_SWAP' as type,
      d.name as dealerName,
      d.location as dealerLocation,
      b.model as oldModel,
      NULL as newModel,
      s.salePrice as originalPrice
      FROM batteries b
      JOIN dealers d ON b.dealerId = d.id
      LEFT JOIN sales s ON b.id = s.batteryId
      WHERE b.status = 'RETURNED_PENDING'

      ORDER BY replacementDate DESC
      `;
    return await this.query<any>(sql);
  }

  static async getSettlementSummary(): Promise<any[]> {
    const sql = `
    SELECT
    d.id as dealerId,
      d.name as dealerName,
      d.location as dealerLocation,
      COUNT(r.id) as pendingClaims,
      SUM(CASE WHEN(r.settlementType = 'STOCK' AND r.replenishmentBatteryId IS NULL) OR r.settlementType IS NULL OR(r.settlementType = 'CREDIT' AND r.paidInAccount = 0) THEN 1 ELSE 0 END) as pendingStock,
      SUM(CASE WHEN r.paidInAccount = 0 THEN 1 ELSE 0 END) as totalOwedItems,
      SUM(COALESCE(s.salePrice, 4200)) as totalEstimatedCredit
      FROM dealers d
      JOIN replacements r ON d.id = r.dealerId
      LEFT JOIN sales s ON r.oldBatteryId = s.batteryId
      WHERE r.settlementType IS NULL OR(r.settlementType = 'CREDIT' AND r.paidInAccount = 0)
      GROUP BY d.id
      ORDER BY pendingClaims DESC
    `;
    return await this.query<any>(sql);
  }

  static async searchReplacementByBatteryId(batteryId: string): Promise<Replacement | null> {
    const records = await this.query<Replacement>(
      'SELECT * FROM replacements WHERE oldBatteryId = ? OR newBatteryId = ? ORDER BY rowid DESC LIMIT 1',
      [batteryId, batteryId]
    );
    return records[0] || null;
  }

  static async deleteBatteryRecord(batteryId: string): Promise<void> {
    try {
      await this.run('BEGIN TRANSACTION');

      // 1. Delete Sales Records
      await this.run('DELETE FROM sales WHERE batteryId = ?', [batteryId]);

      // 1.5. UNLINK & RESET NEW BATTERY (Successor)
      // Check if this battery was an "oldBatteryId" in a replacement (meaning it was replaced by someone)
      const replacementAsOld = await this.query<{ newBatteryId: string }>(
        'SELECT newBatteryId FROM replacements WHERE oldBatteryId = ?',
        [batteryId]
      );

      if (replacementAsOld.length > 0) {
        const successorId = replacementAsOld[0].newBatteryId;
        // Reset the successor battery to be a standalone unit
        await this.run(
          `UPDATE batteries SET
    originalBatteryId = id,
      previousBatteryId = NULL,
      replacementCount = 0,
      status = 'ACTIVE' 
           WHERE id = ? `,
          [successorId]
        );
      }

      // 2. Delete Replacement Records (where it is Old, New, or Replenishment)
      // Note: We already handled the successor logic above before deleting the link
      await this.run(
        'DELETE FROM replacements WHERE oldBatteryId = ? OR newBatteryId = ? OR replenishmentBatteryId = ?',
        [batteryId, batteryId, batteryId]
      );

      // 3. Clean up Lineage Links in OTHER batteries
      // If this battery was a 'nextBatteryId' for someone, clear it
      await this.run('UPDATE batteries SET nextBatteryId = NULL WHERE nextBatteryId = ?', [batteryId]);
      // If this battery was a 'previousBatteryId' for someone, clear it
      await this.run('UPDATE batteries SET previousBatteryId = NULL WHERE previousBatteryId = ?', [batteryId]);

      // 4. Delete the Battery Record itself
      await this.run('DELETE FROM batteries WHERE id = ?', [batteryId]);

      await this.run('COMMIT');
      window.dispatchEvent(new CustomEvent('db-synced'));
    } catch (error) {
      await this.run('ROLLBACK');
      console.error('Delete Battery Record Failed:', error);
      throw error;
    }
  }

  // Keeping the old method for reference or future use if needed, but the UI will use the new one.
  static async deleteReplacement(replacementId: string): Promise<void> {
    const replacement = (await this.query<{
      id: string, oldBatteryId: string, newBatteryId: string,
      replenishmentBatteryId?: string, settlementType?: string
    }>('SELECT * FROM replacements WHERE id = ?', [replacementId]))[0];

    if (!replacement) throw new Error('Replacement record not found');

    // 1. Safety Check: End-of-Chain
    // Ensure the new battery hasn't been used in a subsequent replacement
    const newBattery = await this.getBattery(replacement.newBatteryId);
    if (newBattery && newBattery.nextBatteryId) {
      throw new Error(`Cannot delete this record because the replacement unit(${replacement.newBatteryId}) has already been replaced in a later transaction.Please delete the subsequent record first.`);
    }

    try {
      await this.run('BEGIN TRANSACTION');

      // 2. Revert Old Battery (Failed Unit)
      // It goes back to ACTIVE status (assuming it was active before failure)
      // We clear the link to the next battery
      // We DO NOT change dealer/customer as it returns to their ownership state
      await this.run(
        `UPDATE batteries SET status = 'ACTIVE', nextBatteryId = NULL, warrantyExpiry = date(activationDate, '+' || warrantyMonths || ' months') WHERE id = ? `,
        [replacement.oldBatteryId]
      );
      // Recalculate expiry based on original logic? 
      // Simplified: If it was RETURNED, we just make it ACTIVE. 
      // Ideally we should know its previous status, but ACTIVE is the only logical state for a battery that "wasn't replaced".

      // 3. Reset New Battery (The Replacement Unit)
      // This goes back to being fresh stock (MANUFACTURED)
      // We strip it of all assignment data
      await this.run(
        `UPDATE batteries SET
    status = 'MANUFACTURED',
      previousBatteryId = NULL,
      activationDate = NULL,
      dealerId = NULL,
      customerName = NULL,
      customerPhone = NULL,
      warrantyExpiry = NULL
         WHERE id = ? `,
        [replacement.newBatteryId]
      );

      // 4. Revert Settlement (If Stock)
      // If a replenishment unit was given to the dealer, we must take it back (make it Manufactured again)
      if (replacement.replenishmentBatteryId) {
        await this.run(
          `UPDATE batteries SET
    status = 'MANUFACTURED',
      dealerId = NULL,
      activationDate = NULL,
      customerName = NULL,
      warrantyExpiry = NULL 
           WHERE id = ? `,
          [replacement.replenishmentBatteryId]
        );
      }

      // 5. Delete the Transaction Record
      await this.run('DELETE FROM replacements WHERE id = ?', [replacementId]);

      await this.run('COMMIT');
      window.dispatchEvent(new CustomEvent('db-synced')); // Notify UI to refresh

    } catch (error) {
      await this.run('ROLLBACK');
      console.error('Delete Replacement Failed:', error);
      throw error;
    }
  }

  static async getPaginatedReplacements(
    dealerId: string,
    page: number,
    limit: number,
    searchQuery?: string,
    startDate?: string,
    endDate?: string,
    modelFilter?: string,
    year?: number,
    month?: number
  ): Promise<{ data: any[], total: number }> {
    const offset = (page - 1) * limit;
    let where = 'WHERE r.dealerId = ?';
    let params: any[] = [dealerId];

    if (searchQuery) {
      where += ' AND (r.oldBatteryId LIKE ? OR r.newBatteryId LIKE ?)';
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (startDate) {
      where += ' AND date(r.replacementDate) >= date(?)';
      params.push(startDate);
    }

    if (endDate) {
      where += ' AND date(r.replacementDate) <= date(?)';
      params.push(endDate);
    }

    if (year) {
      where += " AND strftime('%Y', r.replacementDate) = ?";
      params.push(year.toString());
    }

    if (month) {
      where += " AND strftime('%m', r.replacementDate) = ?";
      params.push(month.toString().padStart(2, '0'));
    }

    if (modelFilter) {
      where += ' AND b.model = ?';
      params.push(modelFilter);
    }

    const [data, countResult] = await Promise.all([
      this.query<any>(`
    SELECT
    r.*,
      COALESCE((SELECT saleDate FROM sales sd WHERE sd.batteryId = r.oldBatteryId AND sd.customerPhone != 'STOCK' LIMIT 1), b.actualSaleDate) as soldDate,
      b.manufactureDate as sentDate,
      b.model as batteryModel
        FROM replacements r
        LEFT JOIN batteries b ON b.id = r.oldBatteryId
        ${where}
        ORDER BY r.rowid DESC
    LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      this.query<{ count: number }>(`
        SELECT COUNT(*) as count 
        FROM replacements r 
        ${where}
    `, params)
    ]);

    return {
      data,
      total: countResult[0]?.count || 0
    };
  }

  static async addModel(model: BatteryModel): Promise<void> {
    console.log('Adding Model:', model);
    await this.run(
      `INSERT INTO models(id, name, defaultCapacity, defaultWarrantyMonths) VALUES(?, ?, ?, ?)`,
      [model.id, model.name, model.defaultCapacity, model.defaultWarrantyMonths]
    );
  }

  static async updateModel(model: BatteryModel): Promise<void> {
    await this.run(
      `UPDATE models SET name = ?, defaultCapacity = ?, defaultWarrantyMonths = ? WHERE id = ? `,
      [model.name, model.defaultCapacity, model.defaultWarrantyMonths, model.id]
    );
  }

  static async getBatteryCountByModel(modelName: string): Promise<number> {
    const result = await this.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM batteries WHERE model = ?',
      [modelName]
    );
    return result[0]?.count || 0;
  }

  static async deleteModel(id: string): Promise<void> {
    // Safety Check: Prevent deletion if batteries exist
    const model = (await this.query<{ name: string }>('SELECT name FROM models WHERE id = ?', [id]))[0];
    if (model) {
      const count = await this.getBatteryCountByModel(model.name);
      if (count > 0) {
        throw new Error(`Cannot delete model "${model.name}".It is used by ${count} batteries.`);
      }
    }
    await this.run('DELETE FROM models WHERE id = ?', [id]);
  }

  static async batchAssign(items: any[], dateOverride?: string): Promise<void> {
    const today = dateOverride || getLocalDate();

    for (const item of items) {
      const expiryDate = new Date(today);
      expiryDate.setMonth(expiryDate.getMonth() + (item.warrantyMonths || 0));
      const expiryStr = expiryDate.toISOString().split('T')[0];
      // Ownership is strictly the Dealer
      const customerName = item.dealerName || 'DEALER';

      if (item.exists) {
        // Update existing unit to new dealer and ACTIVATE
        await this.run(
          `UPDATE batteries SET
    dealerId = ?,
      status = ?,
      activationDate = ?,
      warrantyExpiry = ?,
      customerName = ?
        WHERE id = ? `,
          [item.dealerId, BatteryStatus.ACTIVE, today, expiryStr, customerName, item.id]
        );
      } else {
        // Create new unit assigned to dealer and ACTIVATE
        await this.addBattery({
          id: item.id,
          model: item.model,
          capacity: item.capacity,
          manufactureDate: today, // Sync manufacture date to dispatch date for new units
          status: BatteryStatus.ACTIVE,
          activationDate: today,
          warrantyExpiry: expiryStr,
          customerName: customerName,
          replacementCount: 0,
          warrantyMonths: item.warrantyMonths,
          dealerId: item.dealerId
        });
      }

      // Create Sales record for analytics and reporting
      await this.run(
        `INSERT INTO sales(
          id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount,
          isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount,
          warrantyStartDate, warrantyExpiry
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUTO - ${item.id} -${Date.now()} `,
          item.id, item.model, item.dealerId, today, 0, 0, 0,
          0, customerName, 'STOCK', 0, 0, today, expiryStr
        ]
      );
    }
  }

  static async activateWarranty(
    id: string, customerName: string, customerPhone: string,
    dealerId: string, date: string, expiryDate: string, warrantyCardStatus: string
  ): Promise<void> {
    // This maps to registerSale but with explicit dealer assignment if provided
    await this.run(
      `UPDATE batteries SET
    status = 'ACTIVE',
      activationDate = ?,
      customerName = ?,
      customerPhone = ?,
      warrantyExpiry = ?,
      dealerId = COALESCE(?, dealerId),
      warrantyCardStatus = ?
        WHERE id = ? `,
      [date, customerName, customerPhone, expiryDate, dealerId, warrantyCardStatus, id]
    );
  }

  // --- WARRANTY DATE MANAGEMENT ---

  /**
   * Correct the sale date for a battery with audit trail
   * ✅ Bug #3: Cascades changes through replacement chain
   * ✅ Bug #6: Tracks grace period usage
   */
  static async correctSaleDate(
    batteryId: string,
    actualSaleDate: string,
    source: 'WARRANTY_CARD' | 'DEALER_REPORT' | 'MANUAL_OVERRIDE',
    proofPath?: string,
    reason?: string
  ): Promise<void> {
    const battery = await this.getBattery(batteryId);
    if (!battery) throw new Error('Battery not found');

    // Calculate new expiry date
    const warrantyMonths = battery.warrantyMonths || 24;
    const newExpiry = new Date(actualSaleDate);
    newExpiry.setMonth(newExpiry.getMonth() + warrantyMonths);
    const newExpiryStr = newExpiry.toISOString().split('T')[0];

    // ✅ VALIDATE: actualSaleDate must be >= manufactureDate
    if (battery.manufactureDate && actualSaleDate < battery.manufactureDate) {
      throw new Error(`Invalid Date: Corrected sale date (${actualSaleDate}) cannot be before Manufactured date (${battery.manufactureDate})`);
    }

    // ✅ Bug #6: Check if we're in grace period
    const today = new Date();
    const originalExpiry = new Date(battery.warrantyExpiry || '');
    const gracePeriodEnd = new Date(originalExpiry);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 600);
    const isInGracePeriod = today > originalExpiry && today <= gracePeriodEnd;

    // Update current battery
    await this.run(
      `UPDATE batteries SET
    actualSaleDate = ?,
      actualSaleDateSource = ?,
      actualSaleDateProof = ?,
      warrantyCalculationBase = 'ACTUAL_SALE',
      warrantyExpiry = ?,
      gracePeriodUsed = ?
        WHERE id = ? `,
      [actualSaleDate, source, proofPath || null, newExpiryStr,
        isInGracePeriod ? 1 : 0, batteryId]
    );

    // ✅ Bug #3: CASCADE - Update all replacement batteries in the chain
    let currentBatteryId = battery.nextBatteryId;
    while (currentBatteryId) {
      const nextBattery = await this.getBattery(currentBatteryId);
      if (!nextBattery) break;

      // Get the replacement record to find when this battery was activated
      const replacementRecord = await this.query<any>(
        `SELECT replacementDate FROM replacements WHERE newBatteryId = ? `,
        [currentBatteryId]
      );

      if (replacementRecord[0]) {
        // Calculate remaining warranty from the replacement date
        // Use the corrected sale date as the base, calculate how much warranty was left
        const replacementDate = new Date(replacementRecord[0].replacementDate);
        const correctedSaleDate = new Date(actualSaleDate);
        const originalExpiryFromCorrected = new Date(correctedSaleDate);
        originalExpiryFromCorrected.setMonth(originalExpiryFromCorrected.getMonth() + warrantyMonths);

        // Calculate remaining months at time of replacement
        const monthsUsed = Math.floor((replacementDate.getTime() - correctedSaleDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const remainingMonths = Math.max(0, warrantyMonths - monthsUsed);

        // New expiry for replacement battery
        const newReplacementExpiry = new Date(replacementDate);
        newReplacementExpiry.setMonth(newReplacementExpiry.getMonth() + remainingMonths);

        await this.run(
          `UPDATE batteries SET
    warrantyExpiry = ?,
      actualSaleDate = ?,
      warrantyCalculationBase = 'ACTUAL_SALE'
        WHERE id = ? `,
          [newReplacementExpiry.toISOString().split('T')[0], actualSaleDate, currentBatteryId]
        );
      }

      currentBatteryId = nextBattery.nextBatteryId;
    }
  }

  /**
   * Get effective warranty dates for a battery (prioritizes actualSaleDate)
   */
  static async getEffectiveWarrantyDates(battery: Battery): Promise<{
    startDate: string;
    expiryDate: string;
    calculationBase: 'ACTIVATION' | 'ACTUAL_SALE';
  }> {
    const useActualSale = battery.actualSaleDate && battery.warrantyCalculationBase === 'ACTUAL_SALE';

    if (useActualSale) {
      return {
        startDate: battery.actualSaleDate!,
        expiryDate: battery.warrantyExpiry || '',
        calculationBase: 'ACTUAL_SALE'
      };
    }

    return {
      startDate: battery.activationDate || battery.manufactureDate,
      expiryDate: battery.warrantyExpiry || '',
      calculationBase: 'ACTIVATION'
    };
  }

  /**
   * Price Management System Methods
   */
  static async getModelPriceHistory(modelId: string): Promise<PriceRecord[]> {
    return this.query<PriceRecord>(
      `SELECT * FROM model_prices WHERE modelId = ? ORDER BY effectiveDate DESC, timestamp DESC`,
      [modelId]
    );
  }

  static async updateModelPrice(modelId: string, price: number, effectiveDate: string): Promise<void> {
    await this.run(
      `INSERT INTO model_prices(modelId, price, effectiveDate) VALUES(?, ?, ?)`,
      [modelId, price, effectiveDate]
    );
    await this.logActivity('PRICE_UPDATE', `Updated price for model ${modelId} to ₹${price} `, { modelId, price, effectiveDate });
  }

  static async getCurrentPrices(): Promise<Record<string, number>> {
    const rows = await this.query<any>(`
      SELECT modelId, price 
      FROM model_prices mp1
      WHERE effectiveDate = (
      SELECT MAX(effectiveDate) 
        FROM model_prices mp2 
        WHERE mp2.modelId = mp1.modelId AND mp2.effectiveDate <= date('now')
      )
      AND timestamp = (
      SELECT MAX(timestamp)
        FROM model_prices mp3
        WHERE mp3.modelId = mp1.modelId AND mp3.effectiveDate = mp1.effectiveDate
      )
    `);

    const priceMap: Record<string, number> = {};
    rows.forEach(row => {
      priceMap[row.modelId] = row.price;
    });
    return priceMap;
  }

  static async getAdvancedDealerAnalytics(dealerId: string, year?: number, month?: number): Promise<any> {
    const today = getLocalDate();
    const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0];

    // Revenue logic subquery (shared across multiple KPIs)
    const revenueCalc = `
    COALESCE(
      (SELECT price FROM model_prices mp 
         JOIN models m ON mp.modelId = m.id 
         WHERE m.name = s.batteryType AND mp.effectiveDate <= s.saleDate 
         ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
      s.salePrice,
      0
      )
    `;

    const [networkAvg, stockCount, rollingRevenue, reliabilityData] = await Promise.all([
      // 1. Network Benchmarking: Average Revenue per Dealer
      this.query<any>(`
        SELECT AVG(dealer_revenue) as avg_revenue FROM(
      SELECT SUM(${revenueCalc}) as dealer_revenue 
          FROM sales s 
          GROUP BY dealerId
    )
      `),

      // 2. Inventory Health: Current Stock at Dealer
      this.query<any>(`
        SELECT COUNT(*) as count 
        FROM batteries 
        WHERE dealerId = ? AND status = 'Manufactured'
      `, [dealerId]),

      // 3. Rolling Revenue (Last 3 Months) for Projection
      this.query<any>(`
    SELECT
    strftime('%Y-%m', saleDate) as month,
      SUM(${revenueCalc}) as revenue
        FROM sales s
        WHERE dealerId = ? AND saleDate >= ?
      GROUP BY month
        ORDER BY month ASC
      `, [dealerId, ninetyDaysAgo]),

      // 4. Reliability Curve: Claims by Age (Months since sale)
      this.query<any>(`
    SELECT
    CAST((julianday(replacementDate) - julianday(COALESCE(s.saleDate, b.activationDate))) / 30 AS INT) as month_of_failure,
      COUNT(*) as count
        FROM replacements r
        JOIN batteries b ON r.oldBatteryId = b.id
        LEFT JOIN sales s ON b.id = s.batteryId
        WHERE r.dealerId = ?
      GROUP BY month_of_failure
        HAVING month_of_failure >= 0 AND month_of_failure <= 36
        ORDER BY month_of_failure ASC
      `, [dealerId])
    ]);

    // Derived Metrics
    const dealerCurrentStock = stockCount[0]?.count || 0;
    const avgMonthlyRev = rollingRevenue.length > 0
      ? rollingRevenue.reduce((acc: number, r: any) => acc + r.revenue, 0) / rollingRevenue.length
      : 0;

    const projectedNextMonth = avgMonthlyRev * 1.05; // 5% growth factor (mock factor)

    // Unified Efficiency Score (60% Volume / 40% Quality)
    const stats = await this.getDealerAnalytics(dealerId, year, month);
    const totalSales = stats.totalSales || 0;
    const volumeScore = Math.min(100, totalSales * 2); // 50 sales = 100 score
    const qualityScore = Math.max(0, 100 - (parseFloat(stats.claimRatio) * 5)); // 20% claim rate = 0 score
    const efficiencyScore = totalSales > 0 ? Math.round((volumeScore * 0.6) + (qualityScore * 0.4)) : 0;

    return {
      benchmark: {
        dealerRevenue: avgMonthlyRev * 3, // Total for the window
        networkAvg: networkAvg[0]?.avg_revenue || 0,
      },
      inventory: {
        currentStock: dealerCurrentStock,
        turnoverRatio: dealerCurrentStock > 0 ? (stats.last30Sales / dealerCurrentStock).toFixed(2) : "0.00"
      },
      projections: {
        nextMonthRevenue: projectedNextMonth,
        confidence: avgMonthlyRev > 0 ? 85 : 0
      },
      reliabilityCurve: reliabilityData.map((d: any) => ({
        month: d.month_of_failure,
        claims: d.count
      })),
      efficiencyScore
    };
  }

  static async getGlobalAnalytics(year?: number, month?: number, location?: string): Promise<any> {
    const filters: string[] = [];
    const params: any[] = [];

    if (year) {
      filters.push("strftime('%Y', s.saleDate) = ?");
      params.push(year.toString());
    }
    if (month) {
      filters.push("strftime('%m', s.saleDate) = ?");
      params.push(month.toString().padStart(2, '0'));
    }
    if (location && location !== 'All') {
      filters.push("d.location = ?");
      params.push(location);
    }

    const filterClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const replacementFilterClause = filters.length > 0
      ? `WHERE ${filters.join(' AND ').replace(/s\.saleDate/g, 'r.replacementDate')}`
      : '';

    // Shared Revenue Logic
    const revenueCalc = `
    COALESCE(
      (SELECT price FROM model_prices mp 
         JOIN models m ON mp.modelId = m.id 
         WHERE m.name = s.batteryType AND mp.effectiveDate <= s.saleDate 
         ORDER BY mp.effectiveDate DESC, mp.timestamp DESC LIMIT 1),
      s.salePrice,
      0
      )
    `;

    const [kpis, salesTrend, claimsTrend, modelDistribution, locationDistribution, availableYears] = await Promise.all([
      // 1. Core KPIs
      this.query<any>(`
        SELECT 
          COUNT(*) as totalSales,
          SUM(${revenueCalc}) as totalRevenue,
          (SELECT COUNT(*) FROM replacements r JOIN dealers d ON r.dealerId = d.id ${replacementFilterClause}) as totalClaims,
          (SELECT COUNT(*) FROM dealers d ${location && location !== 'All' ? 'WHERE d.location = ?' : ''}) as totalDealers,
          (SELECT COUNT(*) FROM batteries) as totalInventory
        FROM sales s
        JOIN dealers d ON s.dealerId = d.id
        ${filterClause}
    `, location && location !== 'All' ? [...params, ...params, location] : [...params, ...params]),

      // 2. 12 Month Sales Trend
      this.query<any>(`
        SELECT strftime('%m', s.saleDate) as name, COUNT(*) as sales
        FROM sales s
        JOIN dealers d ON s.dealerId = d.id
        ${year
          ? `WHERE strftime('%Y', s.saleDate) = ? ${location && location !== 'All' ? ' AND d.location = ?' : ''}`
          : location && location !== 'All' ? 'WHERE d.location = ?' : `WHERE s.saleDate >= date('now', '-12 months')`}
        GROUP BY name
        ORDER BY name ASC
      `, year ? (location && location !== 'All' ? [year.toString(), location] : [year.toString()]) : (location && location !== 'All' ? [location] : [])),

      // 3. 12 Month Claims Trend
      this.query<any>(`
        SELECT strftime('%m', r.replacementDate) as name, COUNT(*) as claims
        FROM replacements r
        JOIN dealers d ON r.dealerId = d.id
        ${year
          ? `WHERE strftime('%Y', r.replacementDate) = ? ${location && location !== 'All' ? ' AND d.location = ?' : ''}`
          : location && location !== 'All' ? 'WHERE d.location = ?' : `WHERE r.replacementDate >= date('now', '-12 months')`}
        GROUP BY name
        ORDER BY name ASC
      `, year ? (location && location !== 'All' ? [year.toString(), location] : [year.toString()]) : (location && location !== 'All' ? [location] : [])),

      // 4. Model Distribution
      this.query<any>(`
        SELECT s.batteryType as name, COUNT(*) as value
        FROM sales s
        JOIN dealers d ON s.dealerId = d.id
        ${filterClause}
        GROUP BY batteryType
        ORDER BY value DESC
        LIMIT 10
      `, params),

      // 5. Location Distribution
      this.query<any>(`
        SELECT d.location as name, COUNT(*) as value
        FROM sales s
        JOIN dealers d ON s.dealerId = d.id
        ${filterClause}
        GROUP BY d.location
        ORDER BY value DESC
        LIMIT 10
      `, params),

      // 6. Available Years
      this.query<any>(`
        SELECT DISTINCT strftime('%Y', saleDate) as year FROM sales
        UNION
        SELECT DISTINCT strftime('%Y', replacementDate) as year FROM replacements
        ORDER BY year DESC
      `)
    ]);

    const totalSales = kpis[0]?.totalSales || 0;
    const totalClaims = kpis[0]?.totalClaims || 0;
    const claimRatio = totalSales > 0 ? ((totalClaims / totalSales) * 100).toFixed(1) : 0;

    return {
      kpis: {
        totalSales,
        totalRevenue: kpis[0]?.totalRevenue || 0,
        totalClaims,
        totalDealers: kpis[0]?.totalDealers || 0,
        totalInventory: kpis[0]?.totalInventory || 0,
        claimRatio
      },
      salesTrend,
      claimsTrend,
      modelDistribution,
      locationDistribution,
      availableYears: availableYears.map((y: any) => parseInt(y.year)).filter((y: any) => !isNaN(y))
    };
  }

  static async getDealerLeaderboard(year?: number, month?: number, location?: string): Promise<any[]> {
    const filters: string[] = [];
    const params: any[] = [];
    if (location && location !== 'All') {
      filters.push("location = ?");
      params.push(location);
    }
    const filterClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const dealers = await this.query<any>(`SELECT * FROM dealers ${filterClause}`, params);

    // Performance metrics for each dealer
    const leaderboard = await Promise.all(dealers.map(async (dealer: any) => {
      // Get filtered stats
      const stats = await this.getDealerAnalytics(dealer.id, year, month);

      const totalSales = stats.totalSales || 0;
      let score = 0;

      if (totalSales > 0) {
        // Unified Intelligence Rating (60% Vol / 40% Qual)
        const volumeScore = Math.min(100, totalSales * 2);
        const qualityScore = Math.max(0, 100 - (parseFloat(stats.claimRatio) * 5));
        score = Math.round((volumeScore * 0.6) + (qualityScore * 0.4));
      }

      return {
        ...dealer,
        totalSales,
        totalExchanges: stats.totalClaims || 0,
        claimRatio: stats.claimRatio,
        score
      };
    }));

    // Sort by score descending
    return leaderboard.sort((a, b) => b.score - a.score);
  }

  static async getAvailableLocations(): Promise<string[]> {
    const locations = await this.query<any>(`SELECT DISTINCT location FROM dealers WHERE location IS NOT NULL AND location != '' ORDER BY location ASC`);
    return locations.map(l => l.location);
  }

  // ============================================
  // --- MANUFACTURING ERP METHODS ---
  // ============================================

  static async getRawMaterials(): Promise<RawMaterial[]> {
    await this.seedDefaultRawMaterials();
    return await this.query<RawMaterial>('SELECT id, name, unit, alert_threshold FROM raw_materials ORDER BY name ASC');
  }

  static async addRawMaterial(material: { name: string; unit: string; alert_threshold: number }): Promise<string> {
    const name = material.name.trim();
    const unit = material.unit.trim();
    const alertThreshold = Number(material.alert_threshold);

    if (!name || !unit) throw new Error('Name and unit are required.');
    if (!Number.isFinite(alertThreshold) || alertThreshold < 0) throw new Error('Alert threshold must be 0 or more.');

    const duplicate = await this.query<{ id: string }>(
      `SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      [name]
    );
    if (duplicate.length > 0) throw new Error('Material name already exists.');

    const id = `RM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await this.run(
      `INSERT INTO raw_materials (id, name, unit, alert_threshold) VALUES (?, ?, ?, ?)`,
      [id, name, unit, alertThreshold]
    );
    return id;
  }

  static async updateRawMaterial(
    id: string,
    updates: { name: string; unit: string; alert_threshold: number }
  ): Promise<void> {
    const name = updates.name.trim();
    const unit = updates.unit.trim();
    const alertThreshold = Number(updates.alert_threshold);

    if (!id?.trim()) throw new Error('Material id is required.');
    if (!name || !unit) throw new Error('Name and unit are required.');
    if (!Number.isFinite(alertThreshold) || alertThreshold < 0) throw new Error('Alert threshold must be 0 or more.');

    const duplicate = await this.query<{ id: string }>(
      `SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1`,
      [name, id]
    );
    if (duplicate.length > 0) throw new Error('Material name already exists.');

    await this.run(
      `UPDATE raw_materials SET name = ?, unit = ?, alert_threshold = ? WHERE id = ?`,
      [name, unit, alertThreshold, id]
    );
  }

  static async deleteRawMaterial(id: string): Promise<void> {
    const linked = await this.query<{ c: number }>('SELECT COUNT(*) as c FROM material_purchases WHERE material_id = ?', [id]);
    if ((linked[0]?.c || 0) > 0) {
      throw new Error('Cannot delete material with purchase history.');
    }
    await this.run('DELETE FROM raw_materials WHERE id = ?', [id]);
  }

  static async getMissingRequiredMaterials(): Promise<Array<{ name: string; unit: string; alert_threshold: number }>> {
    const required = await this.getRequiredRawMaterials();
    const existing = await this.query<{ name: string }>('SELECT name FROM raw_materials');
    const existingNames = new Set(existing.map((e) => this.normalizeMaterialName(e.name)));
    return required.filter((m) => !existingNames.has(this.normalizeMaterialName(m.name)));
  }

  static async addMissingMaterialByName(name: string): Promise<string> {
    const normalizedName = this.normalizeMaterialName(name);
    const required = await this.getRequiredRawMaterials();
    const template = required.find((m) => this.normalizeMaterialName(m.name) === normalizedName);
    if (!template) throw new Error('Unknown required material name.');

    const existing = await this.query<{ id: string }>('SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) LIMIT 1', [template.name]);
    if (existing.length > 0) return existing[0].id;

    const generatedId = `RM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await this.run(
      `INSERT OR IGNORE INTO raw_materials (id, name, unit, alert_threshold) VALUES (?, ?, ?, ?)`,
      [generatedId, template.name, template.unit, template.alert_threshold]
    );

    const inserted = await this.query<{ id: string }>('SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) LIMIT 1', [template.name]);
    return inserted[0]?.id || generatedId;
  }

  static async addMaterialPurchase(purchase: Omit<MaterialPurchase, 'id'>): Promise<string> {
    const id = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    await this.run(
      `INSERT INTO material_purchases (id, material_id, date, quantity, unit_price, transport_cost, total_cost, supplier_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, purchase.material_id, purchase.date, purchase.quantity, purchase.unit_price, purchase.transport_cost, purchase.total_cost, purchase.supplier_name || null]
    );
    return id;
  }

  static async getMaterialPurchases(limit: number = 100): Promise<MaterialPurchase[]> {
    return await this.query<MaterialPurchase>('SELECT * FROM material_purchases ORDER BY date DESC, id DESC LIMIT ?', [limit]);
  }

  static async getAverageMaterialUnitPrice(materialId: string): Promise<number | null> {
    if (!materialId?.trim()) return null;
    const result = await this.query<{ avg_price: number | null }>(
      'SELECT AVG(unit_price) as avg_price FROM material_purchases WHERE material_id = ?',
      [materialId]
    );
    const avgPrice = result[0]?.avg_price;
    return Number.isFinite(avgPrice as number) ? Number(avgPrice) : null;
  }

  static async getAverageMaterialCostSnapshot(materialName: string): Promise<{
    material: RawMaterial | null;
    avg_unit_price: number | null;
    avg_transport_cost: number | null;
  }> {
    const normalizedName = this.normalizeMaterialName(materialName);
    await this.addMissingMaterialByName(materialName);
    const materials = await this.getRawMaterials();
    const material = materials.find((item) => this.normalizeMaterialName(item.name) === normalizedName) ?? null;
    if (!material) return { material: null, avg_unit_price: null, avg_transport_cost: null };

    const result = await this.query<{ avg_unit_price: number | null; avg_transport_cost: number | null }>(
      `SELECT AVG(unit_price) as avg_unit_price, AVG(transport_cost) as avg_transport_cost
       FROM material_purchases
       WHERE material_id = ?`,
      [material.id]
    );
    const row = result[0];
    return {
      material,
      avg_unit_price: Number.isFinite(row?.avg_unit_price as number) ? Number(row?.avg_unit_price) : null,
      avg_transport_cost: Number.isFinite(row?.avg_transport_cost as number) ? Number(row?.avg_transport_cost) : null,
    };
  }

  static async addProductionLog(log: Omit<ProductionLog, 'id'>): Promise<string> {
    const id = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    await this.run(
      `INSERT INTO production_logs (
        id, date, stage, stage_detail, battery_model, quantity_produced, labour_cost_total,
        material_name, material_quantity, unit_weight, average_unit_price, price_per_grid, total_process_cost, process_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        log.date,
        log.stage,
        log.stage_detail || null,
        log.battery_model,
        log.quantity_produced,
        log.labour_cost_total,
        log.material_name || null,
        log.material_quantity ?? null,
        log.unit_weight ?? null,
        log.average_unit_price ?? null,
        log.price_per_grid ?? null,
        log.total_process_cost ?? null,
        log.process_data ?? null,
      ]
    );
    return id;
  }

  static async getProductionLogs(limit: number = 100): Promise<ProductionLog[]> {
    return await this.query<ProductionLog>('SELECT * FROM production_logs ORDER BY date DESC, id DESC LIMIT ?', [limit]);
  }

  static async addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
    const id = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    await this.run(
      `INSERT INTO expenses (id, date, category, amount, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, expense.date, expense.category, expense.amount, expense.description]
    );
    return id;
  }

  /**
   * Deletes any Salaries expense for a specific worker in the given month (YYYY-MM).
   * Matches by enrollment_no contained in the description and date prefix.
   */
  static async deleteWorkerSalaryExpenseForMonth(enrollmentNo: string, yearMonth: string): Promise<void> {
    await this.run(
      `DELETE FROM expenses
       WHERE category = 'Salaries'
         AND description LIKE ?
         AND strftime('%Y-%m', date) = ?`,
      [`%(${enrollmentNo})%`, yearMonth]
    );
  }

  static async getExpenses(limit: number = 100): Promise<Expense[]> {
    return await this.query<Expense>('SELECT * FROM expenses ORDER BY date DESC, id DESC LIMIT ?', [limit]);
  }

  private static getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private static async generateUniqueWorkerEnrollment(): Promise<string> {
    const year = new Date().getFullYear();
    for (let i = 0; i < 20; i++) {
      const code = `FW-${year}-${Math.random().toString().slice(2, 7)}`;
      const exists = await this.query<{ id: string }>('SELECT id FROM factory_workers WHERE enrollment_no = ? LIMIT 1', [code]);
      if (exists.length === 0) return code;
    }
    return `FW-${year}-${Date.now().toString().slice(-6)}`;
  }

  static async getFactoryWorkers(search?: string): Promise<Array<FactoryWorker & { salary_paid_this_month: boolean }>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (search?.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(COALESCE(enrollment_no, \'\')) LIKE ? OR LOWER(COALESCE(full_name, \'\')) LIKE ? OR LOWER(COALESCE(phone, \'\')) LIKE ?)');
      params.push(q, q, q);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.query<FactoryWorker>(`SELECT * FROM factory_workers ${where} ORDER BY full_name ASC`, params);

    const currentMonth = this.getCurrentMonthKey();
    return rows.map((row) => ({
      ...row,
      salary_paid_this_month: row.salary_paid_month === currentMonth,
    }));
  }

  static async addFactoryWorker(worker: Omit<FactoryWorker, 'id' | 'created_at' | 'updated_at' | 'salary_paid_month'>): Promise<string> {
    const id = `WRK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const enrollment = (worker.enrollment_no || '').trim() || await this.generateUniqueWorkerEnrollment();
    const fullName = (worker.full_name || '').trim();

    if (!enrollment) throw new Error('Enrollment number is required.');
    if (!fullName) throw new Error('Worker name is required.');

    const duplicate = await this.query<{ id: string }>('SELECT id FROM factory_workers WHERE LOWER(enrollment_no) = LOWER(?) LIMIT 1', [enrollment]);
    if (duplicate.length > 0) throw new Error('Enrollment number already exists.');

    await this.run(
      `INSERT INTO factory_workers (
        id, enrollment_no, full_name, gender, phone,
        join_date, date_of_birth, base_salary, emergency_contact, status, salary_paid_month, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        enrollment,
        fullName,
        worker.gender || null,
        worker.phone || null,
        worker.join_date || null,
        worker.date_of_birth || null,
        worker.base_salary || 0,
        worker.emergency_contact || null,
        worker.status || 'ACTIVE',
        null,
      ]
    );
    return id;
  }

  static async updateFactoryWorker(id: string, worker: Partial<Omit<FactoryWorker, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const existing = await this.query<FactoryWorker>('SELECT * FROM factory_workers WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) throw new Error('Worker not found.');

    const merged = { ...existing[0], ...worker };
    const enrollment = (merged.enrollment_no || '').trim();
    const fullName = (merged.full_name || '').trim();
    if (!enrollment) throw new Error('Enrollment number is required.');
    if (!fullName) throw new Error('Worker name is required.');

    const duplicate = await this.query<{ id: string }>(
      'SELECT id FROM factory_workers WHERE LOWER(enrollment_no) = LOWER(?) AND id != ? LIMIT 1',
      [enrollment, id]
    );
    if (duplicate.length > 0) throw new Error('Enrollment number already exists.');

    await this.run(
      `UPDATE factory_workers SET
        enrollment_no = ?, full_name = ?, gender = ?, phone = ?,
        join_date = ?, date_of_birth = ?, base_salary = ?,
        emergency_contact = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        enrollment,
        fullName,
        merged.gender || null,
        merged.phone || null,
        merged.join_date || null,
        merged.date_of_birth || null,
        merged.base_salary || 0,
        merged.emergency_contact || null,
        merged.status || 'ACTIVE',
        id,
      ]
    );
  }

  static async setFactoryWorkerSalaryPaid(workerId: string, paid: boolean): Promise<void> {
    const monthKey = paid ? this.getCurrentMonthKey() : null;
    await this.run(
      'UPDATE factory_workers SET salary_paid_month = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [monthKey, workerId]
    );
  }

  static async deleteFactoryWorker(workerId: string): Promise<void> {
    await this.run('DELETE FROM factory_worker_salaries WHERE worker_id = ?', [workerId]);
    await this.run('DELETE FROM factory_workers WHERE id = ?', [workerId]);
  }

  // ─── FACTORY WORKER PHASE 2: SALARY & HISTORY ─────────────────────────────

  static async getWorkerSalaryHistory(workerId: string): Promise<any[]> {
    return await this.query<any>(
      'SELECT * FROM factory_worker_salaries WHERE worker_id = ? ORDER BY payment_date DESC, id DESC',
      [workerId]
    );
  }

  static async addWorkerSalaryPayment(data: { worker_id: string, amount: number, payment_date: string, type: string, notes?: string }): Promise<void> {
    await this.run(
      `INSERT INTO factory_worker_salaries (worker_id, amount, payment_date, type, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [data.worker_id, data.amount, data.payment_date, data.type, data.notes || null]
    );

    // If it's a base salary or increment, auto-mark salary as paid for the month
    if (data.type === 'BASE' || data.type === 'INCREMENT') {
      await this.setFactoryWorkerSalaryPaid(data.worker_id, true);
    }
  }

  static async getUpcomingWorkerBirthdays(): Promise<FactoryWorker[]> {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    // Match records where date_of_birth ends in "-MM-DD"
    const suffix = `-${mm}-${dd}`;

    return await this.query<FactoryWorker>(
      `SELECT * FROM factory_workers WHERE status = 'ACTIVE' AND date_of_birth LIKE ?`,
      [`%${suffix}`]
    );
  }

  // ─── SQL-LEVEL PAGINATION ─────────────────────────────────────────────────
  static async getPaginatedPurchases(
    page: number = 1,
    limit: number = 10,
    materialId?: string,
    dateFrom?: string,
    dateTo?: string,
    supplierSearch?: string
  ): Promise<{ data: MaterialPurchase[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (materialId) { conditions.push('material_id = ?'); params.push(materialId); }
    if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('date <= ?'); params.push(dateTo); }
    if (supplierSearch?.trim()) { conditions.push('LOWER(COALESCE(supplier_name, \'\')) LIKE ?'); params.push(`%${supplierSearch.trim().toLowerCase()}%`); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      this.query<MaterialPurchase>(`SELECT * FROM material_purchases ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      this.query<{ c: number }>(`SELECT COUNT(*) as c FROM material_purchases ${where}`, params)
    ]);
    return { data, total: countResult[0]?.c || 0 };
  }

  static async getPaginatedProduction(
    page: number = 1,
    limit: number = 10,
    batteryModel?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ data: ProductionLog[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (batteryModel) { conditions.push('battery_model = ?'); params.push(batteryModel); }
    if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('date <= ?'); params.push(dateTo); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      this.query<ProductionLog>(`SELECT * FROM production_logs ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      this.query<{ c: number }>(`SELECT COUNT(*) as c FROM production_logs ${where}`, params)
    ]);
    return { data, total: countResult[0]?.c || 0 };
  }

  static async getPaginatedExpenses(
    page: number = 1,
    limit: number = 10,
    category?: string,
    dateFrom?: string,
    dateTo?: string,
    searchText?: string
  ): Promise<{ data: Expense[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('date <= ?'); params.push(dateTo); }
    if (searchText?.trim()) {
      const q = `%${searchText.trim().toLowerCase()}%`;
      conditions.push('(LOWER(COALESCE(description, \'\')) LIKE ? OR LOWER(COALESCE(category, \'\')) LIKE ?)');
      params.push(q, q);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      this.query<Expense>(`SELECT * FROM expenses ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      this.query<{ c: number }>(`SELECT COUNT(*) as c FROM expenses ${where}`, params)
    ]);
    return { data, total: countResult[0]?.c || 0 };
  }

  // ─── MANUFACTURING DASHBOARD STATS (All backend, no frontend math) ─────────
  static async getManufacturingDashboardStats(selectedYear?: number, selectedMonth?: number): Promise<{
    availableYears: number[];
    selectedYear: number;
    selectedMonth: number;
    thisMonthProduction: number;
    lastMonthProduction: number;
    thisMonthExpenses: number;
    lastMonthExpenses: number;
    thisMonthPurchaseSpend: number;
    lastMonthPurchaseSpend: number;
    thisMonthBatteriesDelivered: number;
    lastMonthBatteriesDelivered: number;
    positiveGridTotal: number;
    negativeGridTotal: number;
    positiveGridAvgPrice: number;
    negativeGridAvgPrice: number;
    positivePlateTotal: number;
    negativePlateTotal: number;
    positivePlateAvgPrice: number;
    negativePlateAvgPrice: number;
    assemblyByModel: { model: string; units: number; avg_price: number }[];
    monthlyOverview: { month: number; label: string; production: number; dispatched: number; purchases: number; expenses: number }[];
    selectedMonthModelMix: { name: string; value: number }[];
    selectedMonthStageMix: { name: string; value: number }[];
    productionByModel: { model: string; units: number }[];
    expenseByCategory: { category: string; total: number }[];
    last30DayAvgPrices: { name: string; unit: string; avg_cost: number }[];
  }> {
    const now = new Date();
    const activeYear = selectedYear ?? now.getFullYear();
    const activeMonth = selectedMonth ?? (now.getMonth() + 1);
    const monthStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}`;
    const prevMonth = new Date(activeYear, activeMonth - 2, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    const last30 = d30.toISOString().slice(0, 10);

    const [
      availableYearRows,
      prodMonth, prodLastMonth, expMonth, expLastMonth, purMonth, purLastMonth, deliveredMonth, deliveredLastMonth,
      byModel, byCategory, purchaseCategoryTotal, last30Avg, castingTotals, pastingTotals, assemblyByModel,
      monthlyProduction, monthlyExpenses, monthlyPurchases, monthlyDispatches, selectedMonthModelMix, selectedMonthStageMix
    ] = await Promise.all([
      this.query<{ year: string }>(
        `SELECT DISTINCT year FROM (
           SELECT strftime('%Y', date) as year FROM production_logs
           UNION
           SELECT strftime('%Y', date) as year FROM expenses
           UNION
           SELECT strftime('%Y', date) as year FROM material_purchases
           UNION
           SELECT strftime('%Y', saleDate) as year FROM sales
         )
         WHERE year IS NOT NULL AND year <> ''
         ORDER BY year DESC`
      ).catch(() => [] as { year: string }[]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(quantity_produced), 0) as total FROM production_logs WHERE strftime('%Y-%m', date) = ?`, [monthStr]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(quantity_produced), 0) as total FROM production_logs WHERE strftime('%Y-%m', date) = ?`, [prevMonthStr]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`, [monthStr]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`, [prevMonthStr]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(total_cost), 0) as total FROM material_purchases WHERE strftime('%Y-%m', date) = ?`, [monthStr]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(total_cost), 0) as total FROM material_purchases WHERE strftime('%Y-%m', date) = ?`, [prevMonthStr]),
      this.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM sales WHERE strftime('%Y-%m', saleDate) = ?`, [monthStr]
      ).catch(() => [{ total: 0 }]),
      this.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM sales WHERE strftime('%Y-%m', saleDate) = ?`, [prevMonthStr]
      ).catch(() => [{ total: 0 }]),
      this.query<{ model: string; units: number }>(
        `SELECT battery_model as model, COALESCE(SUM(quantity_produced), 0) as units
         FROM production_logs WHERE strftime('%Y-%m', date) = ? GROUP BY battery_model ORDER BY units DESC`, [monthStr]),
      this.query<{ category: string; total: number }>(
        `SELECT category, COALESCE(SUM(amount), 0) as total
         FROM expenses WHERE strftime('%Y-%m', date) = ? GROUP BY category ORDER BY total DESC`, [monthStr]),
      this.query<{ total: number }>(
        `SELECT COALESCE(SUM(total_cost), 0) as total
         FROM material_purchases
         WHERE strftime('%Y-%m', date) = ?`, [monthStr]
      ).catch(() => [{ total: 0 }]),
      // Last 30 days average unit cost per material
      this.query<{ name: string; unit: string; avg_cost: number }>(
        `SELECT rm.name, rm.unit,
           COALESCE(SUM(mp.total_cost) / NULLIF(SUM(mp.quantity), 0), 0) as avg_cost
         FROM material_purchases mp
         JOIN raw_materials rm ON mp.material_id = rm.id
         WHERE mp.date >= ?
         GROUP BY rm.id ORDER BY avg_cost DESC`, [last30]
      ).catch(() => [] as { name: string; unit: string; avg_cost: number }[]),
      this.query<{ stage_detail: string | null; total_grids: number; avg_price: number }>(
        `SELECT
           stage_detail,
           COALESCE(SUM(quantity_produced), 0) as total_grids,
           COALESCE(AVG(price_per_grid), 0) as avg_price
         FROM production_logs
         WHERE stage = 'CASTING' AND stage_detail IN ('POSITIVE_CASTING', 'NEGATIVE_CASTING')
         GROUP BY stage_detail`
      ).catch(() => [] as { stage_detail: string | null; total_grids: number; avg_price: number }[]),
      this.query<{ stage_detail: string | null; total_units: number; avg_price: number }>(
        `SELECT
           stage_detail,
           COALESCE(SUM(quantity_produced), 0) as total_units,
           COALESCE(AVG(price_per_grid), 0) as avg_price
         FROM production_logs
         WHERE stage = 'PASTING' AND stage_detail IN ('POSITIVE_PASTING', 'NEGATIVE_PASTING')
         GROUP BY stage_detail`
      ).catch(() => [] as { stage_detail: string | null; total_units: number; avg_price: number }[]),
      this.query<{ model: string; units: number; avg_price: number }>(
        `SELECT
           battery_model as model,
           COALESCE(SUM(quantity_produced), 0) as units,
           COALESCE(AVG(price_per_grid), 0) as avg_price
         FROM production_logs
         WHERE stage = 'ASSEMBLY' AND COALESCE(battery_model, '') <> ''
         GROUP BY battery_model
         ORDER BY units DESC, model ASC`
      ).catch(() => [] as { model: string; units: number; avg_price: number }[]),
      this.query<{ month: string; total: number }>(
        `SELECT strftime('%m', date) as month, COALESCE(SUM(quantity_produced), 0) as total
         FROM production_logs
         WHERE strftime('%Y', date) = ?
         GROUP BY strftime('%m', date)`,
        [String(activeYear)]
      ).catch(() => [] as { month: string; total: number }[]),
      this.query<{ month: string; total: number }>(
        `SELECT strftime('%m', date) as month, COALESCE(SUM(amount), 0) as total
         FROM expenses
         WHERE strftime('%Y', date) = ?
         GROUP BY strftime('%m', date)`,
        [String(activeYear)]
      ).catch(() => [] as { month: string; total: number }[]),
      this.query<{ month: string; total: number }>(
        `SELECT strftime('%m', date) as month, COALESCE(SUM(total_cost), 0) as total
         FROM material_purchases
         WHERE strftime('%Y', date) = ?
         GROUP BY strftime('%m', date)`,
        [String(activeYear)]
      ).catch(() => [] as { month: string; total: number }[]),
      this.query<{ month: string; total: number }>(
        `SELECT strftime('%m', saleDate) as month, COUNT(*) as total
         FROM sales
         WHERE strftime('%Y', saleDate) = ?
         GROUP BY strftime('%m', saleDate)`,
        [String(activeYear)]
      ).catch(() => [] as { month: string; total: number }[]),
      this.query<{ name: string; value: number }>(
        `SELECT battery_model as name, COALESCE(SUM(quantity_produced), 0) as value
         FROM production_logs
         WHERE stage = 'ASSEMBLY' AND strftime('%Y-%m', date) = ? AND COALESCE(battery_model, '') <> ''
         GROUP BY battery_model
         ORDER BY value DESC`,
        [monthStr]
      ).catch(() => [] as { name: string; value: number }[]),
      this.query<{ name: string; value: number }>(
        `SELECT
           CASE
             WHEN stage = 'CASTING' THEN 'Casting'
             WHEN stage = 'PASTING' THEN 'Pasting'
             WHEN stage = 'ASSEMBLY' THEN 'Assembly'
             ELSE stage
           END as name,
           COALESCE(SUM(quantity_produced), 0) as value
         FROM production_logs
         WHERE strftime('%Y-%m', date) = ?
         GROUP BY stage
         ORDER BY value DESC`,
        [monthStr]
      ).catch(() => [] as { name: string; value: number }[])
    ]);

    const positiveCasting = castingTotals.find((row) => row.stage_detail === 'POSITIVE_CASTING');
    const negativeCasting = castingTotals.find((row) => row.stage_detail === 'NEGATIVE_CASTING');
    const positivePasting = pastingTotals.find((row) => row.stage_detail === 'POSITIVE_PASTING');
    const negativePasting = pastingTotals.find((row) => row.stage_detail === 'NEGATIVE_PASTING');
    const positiveFinishedPlateAvgPrice = ((positiveCasting?.avg_price || 0) / 2) + (positivePasting?.avg_price || 0);
    const negativeFinishedPlateAvgPrice = ((negativeCasting?.avg_price || 0) / 2) + (negativePasting?.avg_price || 0);
    const thisMonthOperatingExpenses = expMonth[0]?.total || 0;
    const lastMonthOperatingExpenses = expLastMonth[0]?.total || 0;
    const thisMonthPurchaseExpenses = purMonth[0]?.total || 0;
    const lastMonthPurchaseExpenses = purLastMonth[0]?.total || 0;
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthlyOverview = monthNames.map((label, index) => {
      const monthKey = String(index + 1).padStart(2, '0');
      const monthPurchase = monthlyPurchases.find((row) => row.month === monthKey)?.total || 0;
      const monthOperatingExpense = monthlyExpenses.find((row) => row.month === monthKey)?.total || 0;
      return {
        month: index + 1,
        label,
        production: monthlyProduction.find((row) => row.month === monthKey)?.total || 0,
        dispatched: monthlyDispatches.find((row) => row.month === monthKey)?.total || 0,
        purchases: monthPurchase,
        expenses: monthOperatingExpense + monthPurchase,
      };
    });
    const availableYears = Array.from(new Set([
      now.getFullYear(),
      ...availableYearRows.map((row) => Number(row.year)).filter((year) => Number.isFinite(year)),
    ])).sort((a, b) => b - a);
    const expenseByCategory = [
      { category: 'Material Purchases', total: purchaseCategoryTotal[0]?.total || 0 },
      ...byCategory,
    ].filter((row) => row.total > 0).sort((a, b) => b.total - a.total);

    return {
      availableYears,
      selectedYear: activeYear,
      selectedMonth: activeMonth,
      thisMonthProduction: prodMonth[0]?.total || 0,
      lastMonthProduction: prodLastMonth[0]?.total || 0,
      thisMonthExpenses: thisMonthOperatingExpenses + thisMonthPurchaseExpenses,
      lastMonthExpenses: lastMonthOperatingExpenses + lastMonthPurchaseExpenses,
      thisMonthPurchaseSpend: thisMonthPurchaseExpenses,
      lastMonthPurchaseSpend: lastMonthPurchaseExpenses,
      thisMonthBatteriesDelivered: deliveredMonth[0]?.total || 0,
      lastMonthBatteriesDelivered: deliveredLastMonth[0]?.total || 0,
      positiveGridTotal: positiveCasting?.total_grids || 0,
      negativeGridTotal: negativeCasting?.total_grids || 0,
      positiveGridAvgPrice: positiveCasting?.avg_price || 0,
      negativeGridAvgPrice: negativeCasting?.avg_price || 0,
      positivePlateTotal: positivePasting?.total_units || 0,
      negativePlateTotal: negativePasting?.total_units || 0,
      positivePlateAvgPrice: positiveFinishedPlateAvgPrice,
      negativePlateAvgPrice: negativeFinishedPlateAvgPrice,
      assemblyByModel,
      monthlyOverview,
      selectedMonthModelMix,
      selectedMonthStageMix,
      productionByModel: byModel,
      expenseByCategory,
      last30DayAvgPrices: last30Avg
    };
  }




  // ─── INVENTORY OVERVIEW (Backend Calculated) ─────────────────────────────
  static async getInventoryOverview(): Promise<{
    id: string; name: string; unit: string;
    alert_threshold: number; purchased: number; consumed: number;
    current_stock: number; avg_cost: number; is_low: boolean;
  }[]> {
    await this.seedDefaultRawMaterials();
    const materials = await this.query<RawMaterial>('SELECT id, name, unit, alert_threshold FROM raw_materials ORDER BY name ASC');
    const purchaseAggs = await this.query<{ material_id: string; total_qty: number; total_cost: number }>(
      `SELECT material_id, SUM(quantity) as total_qty, SUM(total_cost) as total_cost 
       FROM material_purchases GROUP BY material_id`
    );
    const prodLogs = await this.query<ProductionLog>('SELECT * FROM production_logs');

    const purchaseMap: Record<string, { total_qty: number; total_cost: number }> = {};
    purchaseAggs.forEach((p: any) => {
      purchaseMap[p.material_id] = { total_qty: p.total_qty || 0, total_cost: p.total_cost || 0 };
    });

    const modelFormulas: Record<string, { rawLead: number; acid: number; pvcSeparator: number; packingJali: number; plusMinusCaps: number; containers: number }> = {
      SL35: { rawLead: 0.6, acid: 2, pvcSeparator: 18, packingJali: 12, plusMinusCaps: 2, containers: 1 },
      SL40: { rawLead: 0.6, acid: 2, pvcSeparator: 24, packingJali: 12, plusMinusCaps: 2, containers: 1 },
      SL60: { rawLead: 0.8, acid: 3, pvcSeparator: 30, packingJali: 15, plusMinusCaps: 2, containers: 1 },
      SL75: { rawLead: 1.0, acid: 3, pvcSeparator: 36, packingJali: 15, plusMinusCaps: 2, containers: 1 },
      SL80: { rawLead: 1.2, acid: 4, pvcSeparator: 40, packingJali: 18, plusMinusCaps: 2, containers: 1 },
      SL90: { rawLead: 1.2, acid: 4, pvcSeparator: 42, packingJali: 18, plusMinusCaps: 2, containers: 1 },
      SL100: { rawLead: 1.5, acid: 5, pvcSeparator: 48, packingJali: 20, plusMinusCaps: 2, containers: 1 },
      SL120: { rawLead: 1.8, acid: 6, pvcSeparator: 56, packingJali: 22, plusMinusCaps: 2, containers: 1 },
      SL130: { rawLead: 2.0, acid: 6, pvcSeparator: 60, packingJali: 22, plusMinusCaps: 2, containers: 1 },
      SL150: { rawLead: 2.3, acid: 7, pvcSeparator: 66, packingJali: 25, plusMinusCaps: 2, containers: 1 },
      SL180: { rawLead: 2.8, acid: 8, pvcSeparator: 72, packingJali: 25, plusMinusCaps: 2, containers: 1 },
      B23: { rawLead: 0.4, acid: 1.5, pvcSeparator: 14, packingJali: 10, plusMinusCaps: 2, containers: 1 },
    };

    const consumedByName: Record<string, number> = {};
    const addConsumed = (materialName: string, quantity: number) => {
      const normalizedName = this.normalizeMaterialName(materialName);
      if (!normalizedName || !Number.isFinite(quantity) || quantity <= 0) return;
      consumedByName[normalizedName] = (consumedByName[normalizedName] || 0) + quantity;
    };
    const mapAssemblyLabelToMaterial = (label: string, modelName: string) => {
      const normalizedLabel = this.normalizeMaterialName(label);
      if (normalizedLabel === 'positive plates' || normalizedLabel === 'negative plates') return null;
      if (normalizedLabel === 'container') return `Container - ${modelName}`;
      if (normalizedLabel === 'plus minus caps') return 'Plus Minus Caps';
      if (normalizedLabel === 'battery packing') return 'Battery Packing';
      if (normalizedLabel === 'charging' || normalizedLabel === 'battery screening' || normalizedLabel === 'labour') return null;
      return label;
    };
    prodLogs.forEach((log: ProductionLog) => {
      if (log.stage === 'CASTING' && log.material_name && Number.isFinite(log.material_quantity || NaN)) {
        addConsumed(log.material_name, log.material_quantity || 0);
        return;
      }
      if (log.stage === 'PASTING' && log.process_data) {
        try {
          const processData = JSON.parse(log.process_data) as Record<string, unknown>;
          addConsumed('Grey Oxide', Number(processData.grey_oxide_qty) || 0);
          addConsumed('Dinal Fiber', Number(processData.dinal_fiber_qty) || 0);
          addConsumed('DM Water', Number(processData.dm_water_qty) || 0);
          addConsumed('Acid', Number(processData.acid_qty) || 0);
          addConsumed('Lignin (Lugnin)', Number(processData.lugnin_qty) || 0);
          addConsumed('Carbon Black', Number(processData.carbon_black_qty) || 0);
          addConsumed('Graphite Powder', Number(processData.graphite_powder_qty) || 0);
          addConsumed('Barium Sulfate', Number(processData.barium_sulfate_qty) || 0);
        } catch {
          // Ignore malformed historical process_data and fall back to old behavior below.
        }
        return;
      }
      if (log.stage === 'ASSEMBLY' && log.process_data) {
        try {
          const processData = JSON.parse(log.process_data) as { rows?: Array<{ label?: string; total_qty?: number }> };
          (processData.rows || []).forEach((row) => {
            const materialName = mapAssemblyLabelToMaterial(String(row.label || ''), log.battery_model);
            if (!materialName) return;
            addConsumed(materialName, Number(row.total_qty) || 0);
          });
        } catch {
          // Ignore malformed historical process_data and fall back to formula path below.
        }
        return;
      }
      const formula = modelFormulas[log.battery_model];
      if (!formula) return;
      addConsumed('Raw Lead', formula.rawLead * log.quantity_produced);
      addConsumed('Acid', formula.acid * log.quantity_produced);
      addConsumed('PVC Separator', formula.pvcSeparator * log.quantity_produced);
      addConsumed('Packing Jali', formula.packingJali * log.quantity_produced);
      addConsumed('Plus Minus Caps', formula.plusMinusCaps * log.quantity_produced);
      addConsumed(`Container - ${log.battery_model}`, formula.containers * log.quantity_produced);
    });

    return materials.map(m => {
      const pur = purchaseMap[m.id] || { total_qty: 0, total_cost: 0 };
      const consumed = consumedByName[this.normalizeMaterialName(m.name)] || 0;
      const current_stock = Math.max(0, pur.total_qty - consumed);
      const avg_cost = pur.total_qty > 0 ? pur.total_cost / pur.total_qty : 0;
      return {
        id: m.id, name: m.name, unit: m.unit,
        alert_threshold: m.alert_threshold,
        purchased: pur.total_qty, consumed, current_stock, avg_cost,
        is_low: current_stock <= m.alert_threshold
      };
    });
  }

  static async getLowStockMaterials(limit: number = 8): Promise<Array<{
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    alert_threshold: number;
    shortage: number;
  }>> {
    const overview = await this.getInventoryOverview();
    return overview
      .filter((item) => item.is_low)
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        current_stock: item.current_stock,
        alert_threshold: item.alert_threshold,
        shortage: Math.max(0, item.alert_threshold - item.current_stock),
      }))
      .sort((a, b) => b.shortage - a.shortage)
      .slice(0, Math.max(1, limit));
  }

  // --- Factory Operations Reset Features ---

  static async clearAllProductionLogs(): Promise<void> {
    await this.run(`DELETE FROM production_logs`);
    await this.logActivity('SYSTEM_RESET', 'Cleared all production logs', { action: 'clearAllProductionLogs' });
  }

  static async clearAllPurchases(): Promise<void> {
    await this.run(`DELETE FROM material_purchases`);
    await this.run(`UPDATE raw_materials SET stock = 0`);
    await this.logActivity('SYSTEM_RESET', 'Cleared all material purchases and reset stock to zero', { action: 'clearAllPurchases' });
  }

  static async clearAllExpenses(): Promise<void> {
    await this.run(`DELETE FROM expenses`);
    await this.logActivity('SYSTEM_RESET', 'Cleared all expenses', { action: 'clearAllExpenses' });
  }

  static async searchUniversalRecordById(id: string): Promise<{ type: 'BATTERY' | 'DEALER' | 'WORKER' | 'USER' | 'PRODUCTION' | 'PURCHASE' | 'EXPENSE', data: any } | null> {
    const idTrimmed = id.trim();

    const battery = await this.query(`SELECT * FROM batteries WHERE id = ?`, [idTrimmed]);
    if (battery.length > 0) return { type: 'BATTERY', data: battery[0] };

    const dealer = await this.query(`SELECT * FROM dealers WHERE id = ?`, [idTrimmed]);
    if (dealer.length > 0) return { type: 'DEALER', data: dealer[0] };

    const factoryWorker = await this.query(`SELECT * FROM factory_workers WHERE id = ?`, [idTrimmed]);
    if (factoryWorker.length > 0) return { type: 'WORKER', data: factoryWorker[0] };
    
    const sysUser = await this.query(`SELECT * FROM users WHERE id = ?`, [idTrimmed]);
    if (sysUser.length > 0) return { type: 'USER', data: sysUser[0] };

    const prod = await this.query(`SELECT * FROM production_logs WHERE id = ?`, [idTrimmed]);
    if (prod.length > 0) return { type: 'PRODUCTION', data: prod[0] };

    const purc = await this.query(`SELECT * FROM material_purchases WHERE id = ?`, [idTrimmed]);
    if (purc.length > 0) return { type: 'PURCHASE', data: purc[0] };

    const exp = await this.query(`SELECT * FROM expenses WHERE id = ?`, [idTrimmed]);
    if (exp.length > 0) return { type: 'EXPENSE', data: exp[0] };

    return null;
  }

  static async deleteUniversalRecord(id: string, type: string): Promise<void> {
    const idTrimmed = id.trim();

    if (type === 'BATTERY') {
        const batteryData = await this.query(`SELECT * FROM batteries WHERE id = ?`, [idTrimmed]);
        await this.run(`DELETE FROM batteries WHERE id = ?`, [idTrimmed]);
        await this.logActivity('BATTERY_DELETE', `Deleted battery record ${idTrimmed}`, { batteryId: idTrimmed, reason: 'Danger Zone universal delete' });
    } else if (type === 'DEALER') {
        const dealer = await this.query<any>(`SELECT * FROM dealers WHERE id = ?`, [idTrimmed]);
        const dealerName = dealer.length > 0 ? dealer[0].name : idTrimmed;
        await this.deleteDealer(idTrimmed);
        await this.logActivity('PARTNER_DELETE', `Deleted dealer ${dealerName}`, { dealerId: idTrimmed, name: dealerName });
    } else if (type === 'WORKER') {
        const worker = await this.query<any>(`SELECT * FROM factory_workers WHERE id = ?`, [idTrimmed]);
        const workerName = worker.length > 0 ? worker[0].full_name : idTrimmed;
        await this.deleteFactoryWorker(idTrimmed);
        await this.logActivity('WORKER_DELETE', `Deleted factory worker ${workerName}`, { workerId: idTrimmed, name: workerName });
    } else if (type === 'USER') {
        await this.deleteUser(idTrimmed);
        await this.logActivity('USER_DELETED', `Deleted system user ${idTrimmed}`, { userId: idTrimmed });
    } else if (type === 'PRODUCTION') {
        await this.run(`DELETE FROM production_logs WHERE id = ?`, [idTrimmed]);
        await this.logActivity('FACTORY_LOG_DELETED', `Deleted Production specific log manually via central Danger Zone`, { logId: idTrimmed, type });
    } else if (type === 'PURCHASE') {
        await this.run(`DELETE FROM material_purchases WHERE id = ?`, [idTrimmed]);
        await this.logActivity('FACTORY_LOG_DELETED', `Deleted Material purchase specific log manually via central Danger Zone`, { logId: idTrimmed, type });
    } else if (type === 'EXPENSE') {
        await this.run(`DELETE FROM expenses WHERE id = ?`, [idTrimmed]);
        await this.logActivity('FACTORY_LOG_DELETED', `Deleted Expense specific log manually via central Danger Zone`, { logId: idTrimmed, type });
    } else {
        throw new Error('Invalid operation type');
    }
  }
}
