const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = 'verify_backup.db';
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);

console.log('--- Backup Verification Started ---');

db.exec(`CREATE TABLE test (id TEXT)`);
db.exec(`INSERT INTO test VALUES ('test-data-for-backup')`);

// Mock backup dir
const BACKUP_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
const BACKUP_FILE = path.join(BACKUP_DIR, 'backup-test.db');

(async () => {
    try {
        console.log('Starting backup to:', BACKUP_FILE);
        await db.backup(BACKUP_FILE);

        if (fs.existsSync(BACKUP_FILE)) {
            const backupDb = new Database(BACKUP_FILE);
            const row = backupDb.prepare('SELECT * FROM test').get();
            if (row && row.id === 'test-data-for-backup') {
                console.log('SUCCESS: Backup created and verified integrity.');
            } else {
                console.error('FAILURE: Backup data mismatch.');
                process.exit(1);
            }
            backupDb.close();
        } else {
            console.error('FAILURE: Backup file not found.');
            process.exit(1);
        }
    } catch (e) {
        console.error('FAILURE:', e);
        process.exit(1);
    } finally {
        db.close();
        // Cleanup
        if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
        if (fs.existsSync(BACKUP_FILE)) fs.unlinkSync(BACKUP_FILE);
        // if (fs.existsSync(BACKUP_DIR)) fs.rmdirSync(BACKUP_DIR);
    }
})();
