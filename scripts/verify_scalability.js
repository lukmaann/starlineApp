const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = 'verify_scalability.db';

// Clean up previous run
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('--- Scalability Verification Started ---');

// 1. Setup Schema (Same as main.js + Indexes)
db.exec(`
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

  CREATE INDEX IF NOT EXISTS idx_batteries_dealerId ON batteries(dealerId);
  CREATE INDEX IF NOT EXISTS idx_batteries_status ON batteries(status);
`);

// 2. Insert Mock Data (100,000 records)
console.log('Generating 100,000 records...');
const insertStmt = db.prepare(`
  INSERT INTO batteries (id, model, dealerId, status) VALUES (?, ?, ?, ?)
`);

db.exec('BEGIN TRANSACTION');
const dealers = ['DEALER_A', 'DEALER_B', 'DEALER_C', 'DEALER_D', 'DEALER_E'];
const statuses = ['Manufactured', 'ACTIVE', 'RETURNED'];

const startInsert = performance.now();
for (let i = 0; i < 100000; i++) {
    insertStmt.run(
        `BAT-${i}`,
        'MODEL-X',
        dealers[i % dealers.length],
        statuses[i % statuses.length]
    );
}
db.exec('COMMIT');
const endInsert = performance.now();
console.log(`Insertion took ${(endInsert - startInsert).toFixed(2)}ms`);

// 3. Test Query Performance with Index
console.log('Testing Indexed Query (Select by Dealer)...');
const startQuery = performance.now();
const rows = db.prepare('SELECT * FROM batteries WHERE dealerId = ?').all('DEALER_A');
const endQuery = performance.now();

console.log(`Query returned ${rows.length} rows in ${(endQuery - startQuery).toFixed(2)}ms`);

// 4. Verify Index Usage
const plan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM batteries WHERE dealerId = ?').all('DEALER_A');
console.log('Query Plan:', JSON.stringify(plan, null, 2));

if (plan.some(p => p.detail.includes('USING INDEX idx_batteries_dealerId'))) {
    console.log('SUCCESS: Index is being used!');
} else {
    console.error('FAILURE: Index NOT used.');
    process.exit(1);
}

// Cleanup
db.close();
fs.unlinkSync(DB_PATH);
console.log('--- Verification Complete ---');
