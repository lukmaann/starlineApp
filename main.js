const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');

// HARDEN CONSOLE (Prevents crash if stdout/stderr pipe is broken, especially on Mac)
const wrapConsole = (method) => {
    const original = console[method];
    console[method] = (...args) => {
        try {
            if (original) original.apply(console, args);
        } catch (e) {
            if (e && e.code === 'EPIPE') return;
            // For other errors, we don't want to swallow them unless they are stream related
        }
    };
};
['log', 'error', 'warn', 'info'].forEach(wrapConsole);

// Supplemental event-based listeners
process.stdout.on('error', (err) => { if (err && err.code === 'EPIPE') return; });
process.stderr.on('error', (err) => { if (err && err.code === 'EPIPE') return; });

let db;
let win;
let updaterConfigured = false;
let updateStatus = {
  status: 'disabled',
  message: 'Auto-updates are unavailable right now.'
};

// DATABASE CONFIGURATION
const isWin = process.platform === 'win32';
let DATA_DIR;
let DB_PATH;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function initDatabase(config) {
  // Default Internal Path
  const INTERNAL_DATA_DIR = isWin ? 'C:\\starline\\data' : path.join(app.getPath('home'), 'starline', 'data');
  DATA_DIR = INTERNAL_DATA_DIR;
  DB_PATH = path.join(DATA_DIR, 'starline_master.db');

  if (config && config.type === 'EXTERNAL') {
    if (!config.path) throw new Error("External path not provided");
    // Ensure we are in a 'starline/data' structure or create it
    // Logic: User selects a drive/folder. We create/expect 'starline/data' inside it.
    // Actually, user requirement says: "app should create starline/data folder if its not present"
    // So if user selects "D:/", we use "D:/starline/data".

    DATA_DIR = path.join(config.path, 'starline', 'data');
    DB_PATH = path.join(DATA_DIR, 'starline_master.db');
  }

  console.log(`Initializing Database at: ${DB_PATH} (${config ? config.type : 'DEFAULT'})`);

  ensureDataDirectory();
  try {
    db = new Database(DB_PATH, { verbose: null }); // Set verbose: console.log for debugging
    db.pragma('journal_mode = WAL');

    // Create Schema immediately if fresh
    const schema = `
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT,
        defaultCapacity TEXT,
        defaultWarrantyMonths INTEGER
      );

      CREATE TABLE IF NOT EXISTS dealers (
        id TEXT PRIMARY KEY,
        name TEXT,
        ownerName TEXT,
        address TEXT,
        contact TEXT,
        location TEXT
      );

      CREATE TABLE IF NOT EXISTS batteries (
        id TEXT PRIMARY KEY,
        model TEXT,
        capacity TEXT,
        manufactureDate TEXT,
        activationDate TEXT,
        warrantyExpiry TEXT,
        customerName TEXT,
        customerPhone TEXT,
        dealerId TEXT,
        status TEXT,
        replacementCount INTEGER,
        warrantyMonths INTEGER,
        originalBatteryId TEXT,
        previousBatteryId TEXT,
        nextBatteryId TEXT,
        warrantyCardStatus TEXT,
        inspectionStatus TEXT DEFAULT 'PENDING',
        inspectionDate TEXT,
        inspectionReturnDate TEXT,
        inspectionNotes TEXT,
        inspectionReason TEXT
      );

      CREATE TABLE IF NOT EXISTS replacements (
        id TEXT PRIMARY KEY,
        oldBatteryId TEXT,
        newBatteryId TEXT,
        dealerId TEXT,
        replacementDate TEXT,
        reason TEXT,
        problemDescription TEXT,
        warrantyCardStatus TEXT,
        replenishmentBatteryId TEXT,
        paidInAccount INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        batteryId TEXT,
        batteryType TEXT,
        dealerId TEXT,
        saleDate TEXT,
        salePrice REAL,
        gstAmount REAL,
        totalAmount REAL,
        isBilled INTEGER,
        customerName TEXT,
        customerPhone TEXT,
        guaranteeCardReturned INTEGER,
        paidInAccount INTEGER,
        warrantyStartDate TEXT,
        warrantyExpiry TEXT
      );

      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS model_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelId TEXT,
        price REAL,
        effectiveDate TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(modelId) REFERENCES models(id)
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staged_batches (
        id TEXT PRIMARY KEY,
        createdBy TEXT,
        dealerId TEXT,
        modelId TEXT,
        date TEXT,
        status TEXT DEFAULT 'PENDING',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staged_batch_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batchId TEXT,
        serialNumber TEXT,
        FOREIGN KEY(batchId) REFERENCES staged_batches(id)
      );

      /* MANUFACTURING & INVENTORY ERP TABLES */
      CREATE TABLE IF NOT EXISTS raw_materials (
        id TEXT PRIMARY KEY,
        name TEXT,
        unit TEXT,
        alert_threshold REAL
      );

      CREATE TABLE IF NOT EXISTS material_purchases (
        id TEXT PRIMARY KEY,
        material_id TEXT,
        date TEXT,
        quantity REAL,
        unit_price REAL,
        transport_cost REAL,
        total_cost REAL,
        supplier_name TEXT,
        FOREIGN KEY(material_id) REFERENCES raw_materials(id)
      );

      CREATE TABLE IF NOT EXISTS production_logs (
        id TEXT PRIMARY KEY,
        date TEXT,
        stage TEXT DEFAULT 'ASSEMBLY',
        stage_detail TEXT,
        battery_model TEXT,
        quantity_produced INTEGER,
        labour_cost_total REAL,
        material_name TEXT,
        material_quantity REAL,
        unit_weight REAL,
        average_unit_price REAL,
        price_per_grid REAL,
        total_process_cost REAL,
        process_data TEXT
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date TEXT,
        category TEXT,
        amount REAL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS factory_workers (
        id TEXT PRIMARY KEY,
        enrollment_no TEXT UNIQUE,
        full_name TEXT,
        gender TEXT,
        phone TEXT,
        join_date TEXT,
        date_of_birth TEXT,
        base_salary REAL,
        emergency_contact TEXT,
        status TEXT DEFAULT 'ACTIVE',
        salary_paid_month TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS factory_worker_salaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT,
        amount REAL,
        payment_date TEXT,
        type TEXT DEFAULT 'BASE',
        notes TEXT,
        FOREIGN KEY(worker_id) REFERENCES factory_workers(id)
      );

      /* Seed Default Admin if no users exist */
      INSERT OR IGNORE INTO users (id, username, password, role) 
      VALUES ('admin-001', 'admin', 'starline@2025', 'ADMIN');

      /* Seed Default Credentials */
      INSERT OR IGNORE INTO app_config (key, value) VALUES ('starline_admin_user', 'admin');
      INSERT OR IGNORE INTO app_config (key, value) VALUES ('starline_admin_pass', 'starline@2025');

      /* IDENTIFIED MISSING INDEXES FOR SCALABILITY */
      CREATE INDEX IF NOT EXISTS idx_sales_batteryId ON sales(batteryId);
      CREATE INDEX IF NOT EXISTS idx_sales_dealerId ON sales(dealerId);
      CREATE INDEX IF NOT EXISTS idx_sales_warrantyExpiry ON sales(warrantyExpiry);
      CREATE INDEX IF NOT EXISTS idx_replacements_oldBatteryId ON replacements(oldBatteryId);
      CREATE INDEX IF NOT EXISTS idx_replacements_newBatteryId ON replacements(newBatteryId);
      CREATE INDEX IF NOT EXISTS idx_replacements_dealerId ON replacements(dealerId);
      CREATE INDEX IF NOT EXISTS idx_batteries_dealerId ON batteries(dealerId);
      CREATE INDEX IF NOT EXISTS idx_batteries_status ON batteries(status);
      CREATE INDEX IF NOT EXISTS idx_batteries_dealerId_status ON batteries(dealerId, status);
      CREATE INDEX IF NOT EXISTS idx_batteries_originalBatteryId ON batteries(originalBatteryId);
      CREATE INDEX IF NOT EXISTS idx_dealers_name ON dealers(name);
      
      /* ✅ Bug #2: Prevent duplicate battery serial numbers */
      CREATE UNIQUE INDEX IF NOT EXISTS idx_batteries_id_unique ON batteries(id);

      /* ERP Indexes */
      CREATE INDEX IF NOT EXISTS idx_material_purchases_date ON material_purchases(date);
      CREATE INDEX IF NOT EXISTS idx_production_logs_date ON production_logs(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_factory_workers_enrollment ON factory_workers(enrollment_no);
      CREATE INDEX IF NOT EXISTS idx_factory_workers_name ON factory_workers(full_name);
      CREATE INDEX IF NOT EXISTS idx_factory_workers_salary_month ON factory_workers(salary_paid_month);
      CREATE INDEX IF NOT EXISTS idx_factory_worker_salaries_worker ON factory_worker_salaries(worker_id);
    `;
    db.exec(schema);

    // Migration: Add stage column to production_logs
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN stage TEXT DEFAULT 'ASSEMBLY'`);
      console.log('Migration: Added stage column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN stage_detail TEXT`);
      console.log('Migration: Added stage_detail column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN material_name TEXT`);
      console.log('Migration: Added material_name column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN material_quantity REAL`);
      console.log('Migration: Added material_quantity column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN unit_weight REAL`);
      console.log('Migration: Added unit_weight column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN average_unit_price REAL`);
      console.log('Migration: Added average_unit_price column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN price_per_grid REAL`);
      console.log('Migration: Added price_per_grid column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN total_process_cost REAL`);
      console.log('Migration: Added total_process_cost column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`ALTER TABLE production_logs ADD COLUMN process_data TEXT`);
      console.log('Migration: Added process_data column to production_logs table');
    } catch (_) { }
    try {
      db.exec(`UPDATE production_logs SET stage = 'ASSEMBLY' WHERE stage IS NULL OR TRIM(stage) = ''`);
      console.log('Migration: Ensured production log stages are populated');
    } catch (_) { }

    // Migration: Add date_of_birth column to factory_workers
    try {
      db.exec(`ALTER TABLE factory_workers ADD COLUMN date_of_birth TEXT`);
      console.log('Migration: Added date_of_birth column to factory_workers table');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('Migration warning for factory_workers date_of_birth:', err.message);
      }
    }

    // Migration: Remove legacy code column from raw_materials (if present)
    try {
      const rawMaterialCols = db.prepare(`PRAGMA table_info(raw_materials)`).all();
      const hasCodeCol = rawMaterialCols.some((c) => c.name === 'code');
      if (hasCodeCol) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS raw_materials_new (
            id TEXT PRIMARY KEY,
            name TEXT,
            unit TEXT,
            alert_threshold REAL
          );
          INSERT INTO raw_materials_new (id, name, unit, alert_threshold)
          SELECT id, name, unit, alert_threshold FROM raw_materials;
          DROP TABLE raw_materials;
          ALTER TABLE raw_materials_new RENAME TO raw_materials;
        `);
        console.log('Migration: Removed code column from raw_materials');
      }
    } catch (err) {
      console.error('Migration warning for raw_materials code removal:', err.message);
    }

    // Migration: Create model_prices table if it doesn't exist
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS model_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          modelId TEXT,
          price REAL,
          effectiveDate TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(modelId) REFERENCES models(id)
        )
      `);
      console.log('Migration: Ensured model_prices table exists');
    } catch (err) {
      console.error('Migration warning for model_prices:', err.message);
    }

    // Migration: Add paidInAccount column if it doesn't exist
    try {
      db.exec(`ALTER TABLE replacements ADD COLUMN paidInAccount INTEGER DEFAULT 0`);
      console.log('Migration: Added paidInAccount column to replacements table');
    } catch (err) {
      // Column might already exist, ignore error
      if (!err.message.includes('duplicate column')) {
        console.error('Migration warning:', err.message);
      }
    }

    // Migration: Add replenishmentBatteryId column
    try {
      db.exec(`ALTER TABLE replacements ADD COLUMN replenishmentBatteryId TEXT`);
      console.log('Migration: Added replenishmentBatteryId column to replacements table');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('Migration warning for replenishmentBatteryId:', err.message);
      }
    }

    // Migration: Add settlementType column
    try {
      db.exec(`ALTER TABLE replacements ADD COLUMN settlementType TEXT`);
      console.log('Migration: Added settlementType column to replacements table');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('Migration warning for settlementType:', err.message);
      }
    }

    // Migration: Add settlementDate column
    try {
      db.exec(`ALTER TABLE replacements ADD COLUMN settlementDate TEXT`);
      console.log('Migration: Added settlementDate column to replacements table');
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('Migration warning for settlementDate:', err.message);
      }
    }

    // Migration: Add warranty date management columns
    const warrantyDateColumns = [
      { name: 'actualSaleDate', type: 'TEXT' },
      { name: 'actualSaleDateSource', type: 'TEXT' },
      { name: 'actualSaleDateProof', type: 'TEXT' },
      { name: 'warrantyCalculationBase', type: 'TEXT' },
      { name: 'gracePeriodUsed', type: 'INTEGER DEFAULT 0' },
      { name: 'inspectionStatus', type: "TEXT DEFAULT 'PENDING'" },
      { name: 'inspectionDate', type: 'TEXT' },
      { name: 'inspectionStartDate', type: 'TEXT' },
      { name: 'inspectionReturnDate', type: 'TEXT' },
      { name: 'inspectionNotes', type: 'TEXT' },
      { name: 'inspectionReason', type: 'TEXT' }
    ];

    warrantyDateColumns.forEach(col => {
      try {
        db.exec(`ALTER TABLE batteries ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Migration: Added ${col.name} column to batteries table`);
      } catch (err) {
        // Column might already exist, ignore error
        if (!err.message.includes('duplicate column')) {
          console.error(`Migration warning for ${col.name}:`, err.message);
        }
      }
    });

    console.log('Database initialized at:', DB_PATH);
    return { success: true, path: DB_PATH };
  } catch (err) {
    console.error('Failed to initialize database:', err);
    return { success: false, error: err.message };
  }
}

function closeDatabase() {
  try {
    if (db && db.open) {
      db.close();
    }
  } catch (err) {
    // Silently ignore closure errors during refresh/restart
  } finally {
    db = null;
  }
}

// WRAPPER for init to handle closing old connection
function switchDatabase(config) {
  closeDatabase();
  return initDatabase(config);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:3100');
  } else {
    win.loadFile(path.join(__dirname, 'out', 'index.html'));
  }

  win.webContents.on('did-finish-load', () => {
    sendUpdateStatus();
    if (updaterConfigured) {
      checkForAppUpdates();
    }
  });
}

function sendUpdateStatus() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:status', updateStatus);
  }
}

function setUpdateStatus(nextStatus) {
  updateStatus = {
    ...updateStatus,
    ...nextStatus,
    updatedAt: new Date().toISOString()
  };
  sendUpdateStatus();
}

function isUpdaterAvailable() {
  if (!app.isPackaged) {
    setUpdateStatus({
      status: 'disabled',
      message: 'Auto-updates are disabled while running in development mode.'
    });
    return false;
  }

  const appUpdateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
  if (!fs.existsSync(appUpdateConfigPath)) {
    setUpdateStatus({
      status: 'disabled',
      message: 'This build does not have a GitHub update feed configured yet.'
    });
    return false;
  }

  return true;
}

async function checkForAppUpdates() {
  if (!isUpdaterAvailable()) return null;

  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Auto update check failed:', error);
    setUpdateStatus({
      status: 'error',
      message: error.message || 'Failed to check for updates.'
    });
    return null;
  }
}

function configureAutoUpdates() {
  updaterConfigured = app.isPackaged;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    setUpdateStatus({
      status: 'checking',
      message: 'Checking for updates...'
    });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateStatus({
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseName: info.releaseName || null,
      message: `Version ${info.version} is available to download.`
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    setUpdateStatus({
      status: 'up-to-date',
      version: info?.version || app.getVersion(),
      message: 'You are already on the latest version.'
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdateStatus({
      status: 'downloading',
      progress: progress.percent || 0,
      bytesPerSecond: progress.bytesPerSecond || 0,
      transferred: progress.transferred || 0,
      total: progress.total || 0,
      message: `Downloading update... ${Math.round(progress.percent || 0)}%`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateStatus({
      status: 'downloaded',
      version: info.version,
      releaseDate: info.releaseDate,
      message: `Version ${info.version} is ready. Restart the app to install it.`
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto updater error:', error);
    setUpdateStatus({
      status: 'error',
      message: error == null ? 'Unknown auto-update error.' : (error.message || String(error))
    });
  });
}

// --- IPC HANDLERS (High Performance) ---

// 1. SELECT (Read)
ipcMain.handle('db-query', (event, sql, params = []) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('db-query error:', err);
    throw err;
  }
});

// 2. INSERT/UPDATE/DELETE (Write)
ipcMain.handle('db-run', (event, sql, params = []) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  } catch (err) {
    console.error('db-run error:', err);
    throw err;
  }
});

// 3. EXEC (Schema/Batch)
ipcMain.handle('db-exec', (event, sql) => {
  try {
    if (!db) throw new Error('Database not initialized');
    db.exec(sql);
    return true;
  } catch (err) {
    console.error('db-exec error:', err);
    throw err;
  }
});

// 4. COMPLEX UPDATE: Battery Details (Transaction)
ipcMain.handle('db-update-battery-details', (event, currentId, newId, dealerId, model) => {
  try {
    if (!db) throw new Error('Database not initialized');

    // Use synchronous transaction for atomicity
    const updateTransaction = db.transaction(() => {
      const currentBattery = db.prepare(`
        SELECT id, status, dealerId, previousBatteryId, nextBatteryId, actualSaleDate
        FROM batteries
        WHERE id = ?
      `).get(currentId);
      if (!currentBattery) throw new Error('Battery not found');

      const saleCount = db.prepare('SELECT COUNT(*) as count FROM sales WHERE batteryId = ?').get(currentId)?.count || 0;
      const replacementCount = db.prepare(
        'SELECT COUNT(*) as count FROM replacements WHERE oldBatteryId = ? OR newBatteryId = ?'
      ).get(currentId, currentId)?.count || 0;

      const dealerIsChanging = currentBattery.dealerId !== dealerId;
      if (dealerIsChanging) {
        const dealerLockedStatuses = ['RETURNED', 'RETURNED_PENDING'];
        const hasLifecycleLinks = !!currentBattery.previousBatteryId || !!currentBattery.nextBatteryId;
        const reflectsCustomerSale = !!currentBattery.actualSaleDate && currentBattery.actualSaleDate !== '';

        if (dealerLockedStatuses.includes(currentBattery.status) || hasLifecycleLinks || reflectsCustomerSale) {
          throw new Error('Dealer cannot be changed for replacement-linked or customer-sold units.');
        }
      }

      // 1. Check New ID
      if (newId !== currentId) {
        const check = db.prepare('SELECT id FROM batteries WHERE id = ?').get(newId);
        if (check) throw new Error(`Battery ID ${newId} already exists.`);
      }

      // 2. Update Batteries Table
      if (model) {
        db.prepare(`UPDATE batteries SET id = ?, dealerId = ?, model = ? WHERE id = ?`).run(newId, dealerId, model, currentId);
      } else {
        db.prepare(`UPDATE batteries SET id = ?, dealerId = ? WHERE id = ?`).run(newId, dealerId, currentId);
      }

      // 3. Cascade ID changes
      if (newId !== currentId) {
        // Sales
        db.prepare(`UPDATE sales SET batteryId = ? WHERE batteryId = ?`).run(newId, currentId);
        // Replacements
        db.prepare(`UPDATE replacements SET oldBatteryId = ? WHERE oldBatteryId = ?`).run(newId, currentId);
        db.prepare(`UPDATE replacements SET newBatteryId = ? WHERE newBatteryId = ?`).run(newId, currentId);
        db.prepare(`UPDATE replacements SET replenishmentBatteryId = ? WHERE replenishmentBatteryId = ?`).run(newId, currentId);
        // Linked Batteries
        db.prepare(`UPDATE batteries SET originalBatteryId = ? WHERE originalBatteryId = ?`).run(newId, currentId);
        db.prepare(`UPDATE batteries SET previousBatteryId = ? WHERE previousBatteryId = ?`).run(newId, currentId);
        db.prepare(`UPDATE batteries SET nextBatteryId = ? WHERE nextBatteryId = ?`).run(newId, currentId);
      }

      // 4. Update Dealer in Chain
      // Sales
      db.prepare(`UPDATE sales SET dealerId = ? WHERE batteryId = ?`).run(dealerId, newId);
      // Replacements associated with this battery
      db.prepare(`UPDATE replacements SET dealerId = ? WHERE oldBatteryId = ? OR newBatteryId = ?`).run(dealerId, newId, newId);
    });

    updateTransaction();
    return true;
  } catch (err) {
    console.error('db-update-battery-details error:', err);
    throw err;
  }
});

// 4. BACKUP (Hot Backup - Legacy & Custom)
ipcMain.handle('db-backup', async () => {
  try {
    const backupDir = path.join(app.getPath('documents'), 'StarlineBackups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    await db.backup(backupPath);
    return { success: true, path: backupPath };
  } catch (err) {
    console.error('Backup failed:', err);
    return { success: false, error: err.message };
  }
});

// 5. MAINTENANCE (Optimize)
ipcMain.handle('db-optimize', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    // VACUUM reconstructs the entire database file
    db.exec('VACUUM;');
    // Analyze gathers statistics about tables and indices for the query optimizer
    db.exec('ANALYZE;');
    return { success: true };
  } catch (err) {
    console.error('Database optimization failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-backup-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Backup Destination (SSD/External Drive)'
  });
  if (result.canceled) return null;
  return result.filePaths[0]; // Fix: incorrect property access in some versions, but usually filePaths is correct
});

ipcMain.handle('db-backup-custom', async (event, targetPath) => {
  try {
    if (!targetPath) throw new Error('No target path provided');

    // Create Date-Stamped Directory: starlinebackup-DD-MM-YYYY-HH-MM
    const now = new Date();
    const folderName = `starlinebackup-${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fullFolderPath = path.join(targetPath, folderName);

    if (!fs.existsSync(fullFolderPath)) {
      fs.mkdirSync(fullFolderPath, { recursive: true });
    }

    const backupPath = path.join(fullFolderPath, 'starline_master.db');

    console.log(`Starting backup to: ${backupPath}`);
    await db.backup(backupPath);

    return { success: true, path: backupPath };
  } catch (err) {
    console.error('Custom Backup failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-restore-file', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    title: 'Select Backup File to Restore'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('db-restore', async (event, sourcePath) => {
  try {
    if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error('Invalid source file');

    console.log('Restoring from:', sourcePath);

    // 1. Close current connection
    if (db) {
      db.close();
      db = null;
    }

    // 2. Overwrite Main DB
    const backupOfCurrent = DB_PATH + '.bak';
    try {
      fs.copyFileSync(DB_PATH, backupOfCurrent);
    } catch (e) { console.warn("Failed to create backup of current", e); }

    fs.copyFileSync(sourcePath, DB_PATH);

    // 3. Re-initialize Database & Reload UI
    initDatabase();
    if (win) {
      win.reload();
    }

    return { success: true };
  } catch (err) {
    console.error('Restore failed:', err);
    // Try to maintain uptime if failed
    if (!db) initDatabase();
    return { success: false, error: err.message };
  }
});

// 5. SYSTEM OPS
ipcMain.handle('init-database', async (event, config) => {
  return switchDatabase(config);
});

ipcMain.handle('select-external-drive', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select External Drive/Folder for Database'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('print-or-pdf', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin) return 'no_window';

  try {
    // 1. SAFE PRINTER ENUMERATION
    let printers = [];
    try {
      if (senderWin.webContents.getPrintersAsync) {
        printers = await senderWin.webContents.getPrintersAsync();
      } else {
        printers = senderWin.webContents.getPrinters();
      }
    } catch (enumError) {
      console.error('[Print] Printer enumeration failed:', enumError);
    }

    // 2. TRIGGER PRINT DIALOG IF PRINTERS EXIST
    if (printers && printers.length > 0) {
      senderWin.webContents.print({ silent: false, printBackground: true });
      return 'printed';
    }

    // 3. PDF FALLBACK
    const result = await dialog.showSaveDialog(senderWin, {
      title: 'Save Report as PDF',
      defaultPath: path.join(app.getPath('downloads'), `StarlineReport_${new Date().toISOString().slice(0, 10)}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!result.canceled && result.filePath) {
      const data = await senderWin.webContents.printToPDF({
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        pageSize: 'A4'
      });
      fs.writeFileSync(result.filePath, data);
      return 'downloaded';
    }

    return 'cancelled';
  } catch (err) {
    console.error('[Print] Critical Handler Error:', err);
    return 'error';
  }
});

ipcMain.handle('updater:get-status', async () => updateStatus);

ipcMain.handle('updater:check', async () => checkForAppUpdates());

ipcMain.handle('updater:download', async () => {
  if (!isUpdaterAvailable()) {
    return { success: false, message: updateStatus.message };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Update download failed:', error);
    setUpdateStatus({
      status: 'error',
      message: error.message || 'Failed to download update.'
    });
    return { success: false, message: error.message || 'Failed to download update.' };
  }
});

ipcMain.handle('updater:quit-and-install', async () => {
  if (updateStatus.status !== 'downloaded') {
    return { success: false, message: 'No downloaded update is ready yet.' };
  }

  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });

  return { success: true };
});

app.whenReady().then(() => {
  // Database is NOT initialized automatically anymore. 
  // Frontend will trigger it based on selection.
  configureAutoUpdates();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
