const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db;
let win;

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
    `;
    db.exec(schema);

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
  if (db && db.open) {
    console.log('Closing current database connection...');
    db.close();
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
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;

  // Simple print implementation
  const printers = await window.webContents.getPrintersAsync();
  if (printers.length > 0) {
    window.webContents.print({ silent: false, printBackground: true });
    return 'printed';
  } else {
    // PDF Fallback logic omitted for brevity, adding if requested
    return 'no_printers';
  }
});

app.whenReady().then(() => {
  // Database is NOT initialized automatically anymore. 
  // Frontend will trigger it based on selection.
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
