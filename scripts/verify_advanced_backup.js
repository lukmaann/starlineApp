const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('--- Advanced Backup Verification ---');

// Mock Environment
const MOCK_SSD_PATH = path.join(process.cwd(), 'mock_ssd');
if (!fs.existsSync(MOCK_SSD_PATH)) fs.mkdirSync(MOCK_SSD_PATH);

const DB_PATH = 'verify_adv_backup.db';
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);
db.exec("CREATE TABLE foo (bar TEXT)");
db.exec("INSERT INTO foo VALUES ('ssd-test')");

// Simulate Logic from main.js
const now = new Date();
const folderName = `starlinebackup-${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
const fullFolderPath = path.join(MOCK_SSD_PATH, folderName);

if (!fs.existsSync(fullFolderPath)) {
    fs.mkdirSync(fullFolderPath, { recursive: true });
    console.log('Created folder:', fullFolderPath);
}

const backupPath = path.join(fullFolderPath, 'starline_master.db');

(async () => {
    try {
        console.log('Backing up to:', backupPath);
        await db.backup(backupPath);

        if (fs.existsSync(backupPath)) {
            console.log('SUCCESS: Backup file created at correct path.');
            const checkDb = new Database(backupPath);
            const row = checkDb.prepare('SELECT * FROM foo').get();
            if (row.bar === 'ssd-test') {
                console.log('SUCCESS: Data integrity verified.');
            } else {
                console.error('FAILURE: Data mismatch.');
            }
        } else {
            console.error('FAILURE: File not found.');
        }
    } catch (e) {
        console.error('FAILURE:', e);
    } finally {
        db.close();
        if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
        // Cleanup mock ssd? maybe leave for inspection if needed, but removing for clean state
        // fs.rmdirSync(MOCK_SSD_PATH, { recursive: true });
    }
})();
