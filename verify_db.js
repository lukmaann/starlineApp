const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

try {
    const dbPath = path.join(os.homedir(), 'test_db.sqlite');
    console.log('Opening DB at', dbPath);
    const db = new Database(dbPath);
    db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)');
    console.log('DB created successfully');
    db.close();
    // Cleanup
    fs.unlinkSync(dbPath);
} catch (error) {
    console.error('Failed to open DB:', error);
    process.exit(1);
}
