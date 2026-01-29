import { Battery, Dealer, Replacement, BatteryModel, Sale, WarrantyCardStatus, BatteryStatus } from './types';
import { validateName, validatePhone } from './utils/validation';

declare global {
  interface Window {
    electronAPI?: {
      printOrPdf: () => Promise<string>;
      db: {
        query: (sql: string, params?: any[]) => Promise<any[]>;
        run: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
        exec: (sql: string) => Promise<void>;
      };
      backup: () => Promise<{ success: boolean; path: string; error?: string }>;
      selectBackupFolder: () => Promise<string | null>;
      backupCustom: (path: string) => Promise<{ success: boolean; path: string; error?: string }>;
      selectRestoreFile: () => Promise<string | null>;
      restore: (path: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

// Enterprise Async Database Client
export class Database {
  private static STORAGE_KEY = 'starline_warranty_db';

  static async init(): Promise<void> {
    console.log('Database Client Initialized [Mode: Enterprise IPC]');
    // No-op for client init as Main process handles DB file
  }

  // --- GENERIC HELPERS ---

  private static async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (window.electronAPI?.db) {
      return await window.electronAPI.db.query(sql, params);
    }
    console.error('IPC Bridge not available');
    return [];
  }

  public static async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    if (window.electronAPI?.db) {
      return await window.electronAPI.db.run(sql, params);
    }
    throw new Error('Database disconnected');
  }

  // --- ENTITIES ---

  static async getPaginated<T>(
    table: string,
    page: number = 1,
    limit: number = 50,
    where: string = '',
    params: any[] = []
  ): Promise<{ data: T[], total: number }> {
    const offset = (page - 1) * limit;
    const whereClause = where ? `WHERE ${where}` : '';

    const dataSql = `SELECT * FROM ${table} ${whereClause} ORDER BY rowid DESC LIMIT ? OFFSET ?`;
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
    const results = await this.query<Battery>('SELECT * FROM batteries WHERE id = ?', [id]);
    return results[0];
  }

  static async searchBattery(term: string): Promise<{
    battery: Battery;
    sale?: Sale;
    originalSale?: Sale;
    lineage: Battery[];
    lineageSales: Sale[];
    replacements: Replacement[];
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

    const [allSales, allReplacements] = await Promise.all([
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
        : Promise.resolve([])
    ]);

    // Find the original sale (first sale in chain)
    const originalSale = allSales.find(s => s.batteryId === original.id);
    const currentSale = allSales.find(s => s.batteryId === battery.id);

    return {
      battery,
      sale: currentSale,
      originalSale,
      lineage,
      lineageSales: allSales,
      replacements: allReplacements
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
    return await this.query<Battery>('SELECT * FROM batteries WHERE dealerId = ? AND status = ? ORDER BY rowid DESC', [dealerId, 'Manufactured']);
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
    const stats = await this.query<{ totalSales: number, totalRevenue: number }>(
      `SELECT COUNT(*) as totalSales, SUM(salePrice) as totalRevenue FROM sales`
    );

    const activeCount = await this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM batteries WHERE status = 'ACTIVE'`
    );

    // 2. Dealer Leaderboard (Top 50 Only)
    // Complex aggregation query moved to server-side
    const dealerStats = await this.query<{
      id: string, name: string, location: string,
      sales: number, revenue: number
    }>(`
      SELECT 
        d.id, d.name, d.location,
        COUNT(s.id) as sales,
        SUM(s.salePrice) as revenue
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
    const today = new Date().toISOString().split('T')[0];
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

  static async getDealerAnalytics(dealerId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    const [stats, activeCount, trend] = await Promise.all([
      this.query<any>(`
        SELECT 
          COUNT(*) as totalSales,
          (SELECT COUNT(*) FROM replacements WHERE dealerId = ?) as totalClaims
        FROM sales WHERE dealerId = ?`, [dealerId, dealerId]
      ),
      this.query<any>(`SELECT COUNT(*) as count FROM batteries WHERE dealerId = ? AND (status = 'ACTIVE' OR status = 'REPLACEMENT') AND datetime(warrantyExpiry) >= datetime('now')`, [dealerId]),
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
    const last30 = await this.query<any>(`SELECT COUNT(*) as count FROM sales WHERE dealerId = ? AND saleDate >= ?`, [dealerId, thirtyDaysAgo]);

    return {
      activeUnitCount: activeCount[0]?.count || 0,
      last30Sales: last30[0]?.count || 0,
      totalSales,
      totalClaims,
      claimRatio: claimRatio.toFixed(1),
      salesTrend: trend.map((t: any) => ({ name: t.month, sales: t.count }))
    };
  }

  static async backupDatabase(): Promise<{ success: boolean; path: string; error?: string }> {
    if (window.electronAPI?.backup) {
      return await window.electronAPI.backup();
    }
    return { success: false, path: '', error: 'Backup API not available' };
  }

  static async selectBackupFolder(): Promise<string | null> {
    if (!window.electronAPI?.selectBackupFolder) {
      alert("Update Required: Please restart the app to enable SSD Backup.");
      return null;
    }
    return await window.electronAPI.selectBackupFolder();
  }

  static async backupCustom(path: string): Promise<{ success: boolean; path: string; error?: string }> {
    if (window.electronAPI?.backupCustom) return await window.electronAPI.backupCustom(path);
    return { success: false, path: '', error: 'API missing' };
  }

  static async selectRestoreFile(): Promise<string | null> {
    if (window.electronAPI?.selectRestoreFile) return await window.electronAPI.selectRestoreFile();
    return null;
  }

  static async restoreDatabase(path: string): Promise<{ success: boolean; error?: string }> {
    if (window.electronAPI?.restore) return await window.electronAPI.restore(path);
    return { success: false, error: 'API missing' };
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


  // --- OPERATIONS ---

  static async updateBatteryStatus(id: string, status: string, dealerId: string | null = null): Promise<void> {
    await this.run(
      `UPDATE batteries SET status = ?, dealerId = ? WHERE id = ?`,
      [status, dealerId, id]
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

    const expiryDate = new Date(date);
    expiryDate.setMonth(expiryDate.getMonth() + (battery.warrantyMonths || 0));

    await this.run(
      `UPDATE batteries SET 
         status = 'ACTIVE', 
         activationDate = ?, 
         customerName = ?, 
         customerPhone = ?, 
         warrantyExpiry = ? 
       WHERE id = ?`,
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
      `INSERT INTO sales (
        id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount,
        isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount,
        warrantyStartDate, warrantyExpiry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // Transaction-like sequence

    // 1. Insert Replacement Record
    await this.run(
      `INSERT INTO replacements (
        id, oldBatteryId, newBatteryId, dealerId, replacementDate, 
        reason, problemDescription, warrantyCardStatus, paidInAccount, replenishmentBatteryId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rep.id, rep.oldBatteryId, rep.newBatteryId, rep.dealerId,
        rep.replacementDate, rep.reason, rep.problemDescription, rep.warrantyCardStatus,
        rep.paidInAccount ? 1 : 0, rep.replenishmentBatteryId || null
      ]
    );

    // 1b. If Replenishment Unit Provided -> Activate & Assign to Dealer (Stock Replenishment)
    if (rep.replenishmentBatteryId) {
      // It's a "Zero Cost" assignment essentially replacing the stock loss
      // We set it to ACTIVE assigned to the dealer
      const today = new Date().toISOString().split('T')[0];
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
          WHERE id = ?`,
          [rep.dealerId, today, expiryStr, rep.replenishmentBatteryId]
        );

        // Optional: Create a zero-value sales record for tracking stock movement
        // const saleId = `REP-STOCK-${Date.now()}`;
        // await this.run(
        //   `INSERT INTO sales (id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount, isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount, warrantyStartDate, warrantyExpiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        //   [saleId, rep.replenishmentBatteryId, replUnit.model, rep.dealerId, today, 0, 0, 0, 0, 'DEALER STOCK REPLENISHMENT', 'STOCK', 0, 0, today, expiryStr]
        // );
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

      await this.run(
        `UPDATE batteries SET status = 'RETURNED', nextBatteryId = ?, activationDate = ?, warrantyExpiry = ? WHERE id = ?`,
        [rep.newBatteryId, meta.correctedOriginalSaleDate, newExpiryStr, rep.oldBatteryId]
      );
    } else {
      await this.run(
        `UPDATE batteries SET status = 'RETURNED', nextBatteryId = ? WHERE id = ?`,
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
        WHERE id = ?`,
      [
        rep.oldBatteryId, activationDate, rep.dealerId || 'CENTRAL',
        meta?.customerName || null, meta?.customerPhone || null, meta?.warrantyExpiry || null,
        rep.newBatteryId
      ]
    );
  }

  static async addDealer(dealer: Dealer): Promise<void> {
    await this.run(
      `INSERT INTO dealers (id, name, ownerName, address, contact, location) VALUES (?, ?, ?, ?, ?, ?)`,
      [dealer.id, dealer.name, dealer.ownerName, dealer.address, dealer.contact, dealer.location]
    );
  }

  static async updateDealer(dealer: Dealer): Promise<void> {
    await this.run(
      `UPDATE dealers SET name = ?, ownerName = ?, address = ?, contact = ?, location = ? WHERE id = ?`,
      [dealer.name, dealer.ownerName, dealer.address, dealer.contact, dealer.location, dealer.id]
    );
  }

  static async deleteDealer(id: string): Promise<void> {
    await this.run('DELETE FROM dealers WHERE id = ?', [id]);
  }

  static async updateReplacementPaidStatus(replacementId: string, paidInAccount: boolean): Promise<void> {
    await this.run(
      `UPDATE replacements SET paidInAccount = ? WHERE id = ?`,
      [paidInAccount ? 1 : 0, replacementId]
    );
    window.dispatchEvent(new CustomEvent('db-synced'));
  }

  static async getPaginatedReplacements(dealerId: string, page: number, limit: number, searchQuery?: string): Promise<{ data: any[], total: number }> {
    const offset = (page - 1) * limit;
    let where = 'WHERE r.dealerId = ?';
    let params: any[] = [dealerId];

    if (searchQuery) {
      where += ' AND (r.oldBatteryId LIKE ? OR r.newBatteryId LIKE ?)';
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    const [data, countResult] = await Promise.all([
      this.query<any>(`
        SELECT 
          r.*,
          s.warrantyStartDate as soldDate,
          b.model as batteryModel
        FROM replacements r
        LEFT JOIN sales s ON s.batteryId = r.oldBatteryId
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
      `INSERT INTO models (id, name, defaultCapacity, defaultWarrantyMonths) VALUES (?, ?, ?, ?)`,
      [model.id, model.name, model.defaultCapacity, model.defaultWarrantyMonths]
    );
  }

  static async updateModel(model: BatteryModel): Promise<void> {
    await this.run(
      `UPDATE models SET name = ?, defaultCapacity = ?, defaultWarrantyMonths = ? WHERE id = ?`,
      [model.name, model.defaultCapacity, model.defaultWarrantyMonths, model.id]
    );
  }

  static async deleteModel(id: string): Promise<void> {
    await this.run('DELETE FROM models WHERE id = ?', [id]);
  }

  static async batchAssign(items: any[], dateOverride?: string): Promise<void> {
    const today = dateOverride || new Date().toISOString().split('T')[0];

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
           WHERE id = ?`,
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
        `INSERT INTO sales (
          id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount,
          isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount,
          warrantyStartDate, warrantyExpiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AUTO-${item.id}-${Date.now()}`,
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
       WHERE id = ?`,
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

    // ✅ Bug #6: Check if we're in grace period
    const today = new Date();
    const originalExpiry = new Date(battery.warrantyExpiry || '');
    const gracePeriodEnd = new Date(originalExpiry);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 60);
    const isInGracePeriod = today > originalExpiry && today <= gracePeriodEnd;

    // Update current battery
    await this.run(
      `UPDATE batteries SET 
        actualSaleDate = ?,
        actualSaleDateSource = ?,
        actualSaleDateProof = ?,
        warrantyCalculationBase = 'ACTUAL_SALE',
        warrantyExpiry = ?,
        activationDate = ?,
        gracePeriodUsed = ?
      WHERE id = ?`,
      [actualSaleDate, source, proofPath || null, newExpiryStr, actualSaleDate,
        isInGracePeriod ? 1 : 0, batteryId]
    );

    // ✅ Bug #3: CASCADE - Update all replacement batteries in the chain
    let currentBatteryId = battery.nextBatteryId;
    while (currentBatteryId) {
      const nextBattery = await this.getBattery(currentBatteryId);
      if (!nextBattery) break;

      // Get the replacement record to find when this battery was activated
      const replacementRecord = await this.query<any>(
        `SELECT replacementDate FROM replacements WHERE newBatteryId = ?`,
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
            warrantyCalculationBase = 'ACTUAL_SALE',
            activationDate = ?
          WHERE id = ?`,
          [newReplacementExpiry.toISOString().split('T')[0], actualSaleDate,
          replacementRecord[0].replacementDate, currentBatteryId]
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
}

