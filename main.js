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

function initDatabase() {
  DATA_DIR = isWin ? 'C:\\starline\\data' : path.join(app.getPath('home'), 'starline', 'data');
  DB_PATH = path.join(DATA_DIR, 'starline_master.db');

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
        warrantyCardStatus TEXT
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

    // Migration: Add warranty date management columns
    const warrantyDateColumns = [
      { name: 'actualSaleDate', type: 'TEXT' },
      { name: 'actualSaleDateSource', type: 'TEXT' },
      { name: 'actualSaleDateProof', type: 'TEXT' },
      { name: 'warrantyCalculationBase', type: 'TEXT' },
      { name: 'gracePeriodUsed', type: 'INTEGER DEFAULT 0' }
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
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
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

ipcMain.handle('select-backup-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Backup Destination (SSD/External Drive)'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
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

    const backupPath = path.join(fullFolderPath, 'starline_master.db'); // Keep original name for easy restore logic or new machine transfer

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
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
