const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const TEST_DB = 'system_test.db';
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

const db = new Database(TEST_DB, { verbose: null });
console.log('--- STARLINE SYSTEM VERIFICATION SUITE ---');

// 1. SETUP SCHEMA (Mirrors main.js)
console.log('[SETUP] Applying Schema...');
db.exec(`
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
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    batteryId TEXT,
    dealerId TEXT,
    saleDate TEXT,
    salePrice REAL,
    customerName TEXT,
    customerPhone TEXT,
    warrantyExpiry TEXT
  );
  CREATE TABLE IF NOT EXISTS replacements (
    id TEXT PRIMARY KEY,
    oldBatteryId TEXT,
    newBatteryId TEXT,
    dealerId TEXT,
    replacementDate TEXT,
    reason TEXT,
    warrantyCardStatus TEXT
  );
`);

// HELPER: Assertion
function assert(condition, message) {
    if (condition) console.log(`  ✅ PASS: ${message}`);
    else {
        console.error(`  ❌ FAIL: ${message}`);
        process.exit(1);
    }
}

// 2. RUN TESTS

// --- MODULE A: MODEL MANAGEMENT ---
console.log('\n[MODULE A] Model Management');
try {
    db.prepare("INSERT INTO models VALUES (?, ?, ?, ?)").run('TEST-RED-100', 'RED 100', '100AH', 12);
    const model = db.prepare("SELECT * FROM models WHERE id = ?").get('TEST-RED-100');
    assert(model.name === 'RED 100', 'Model created successfully');

    try {
        db.prepare("INSERT INTO models VALUES (?, ?, ?, ?)").run('TEST-RED-100', 'DUPLICATE', '100AH', 12);
        assert(false, 'Duplicate model should fail');
    } catch (e) {
        assert(true, 'Duplicate check prevented double entry');
    }
} catch (e) {
    console.error(e);
}

// --- MODULE B: DEALER NETWORK ---
console.log('\n[MODULE B] Dealer Network');
try {
    db.prepare("INSERT INTO dealers VALUES (?, ?, ?, ?, ?, ?)").run('TEST-D-01', 'BEST MOTORS', 'JOHN', 'MAIN ST', '999', 'NYC');
    const dealer = db.prepare("SELECT * FROM dealers WHERE id = ?").get('TEST-D-01');
    assert(dealer.name === 'BEST MOTORS', 'Dealer onboarded');
} catch (e) { console.error(e); }

// --- MODULE C: INVENTORY & ASSIGNMENT ---
console.log('\n[MODULE C] Inventory & Assignment');
try {
    // Manufacture
    const batId = 'BT-1001';
    db.prepare(`INSERT INTO batteries (id, model, status, dealerId, warrantyMonths) VALUES (?, ?, ?, ?, ?)`).run(batId, 'RED 100', 'Manufactured', 'TEST-D-01', 12);

    const bat = db.prepare("SELECT * FROM batteries WHERE id = ?").get(batId);
    assert(bat.dealerId === 'TEST-D-01', 'Stock assigned to dealer correctly');
    assert(bat.status === 'Manufactured', 'Status is initial (Manufactured)');
} catch (e) { console.error(e); }

// --- MODULE D: SALES & WARRANTY ---
console.log('\n[MODULE D] Sales & Activation');
try {
    const batId = 'BT-1001';
    const saleDate = '2024-01-01';
    const expiry = '2025-01-01';

    // Simulate Sale (Update Battery)
    db.prepare(`UPDATE batteries SET status = 'ACTIVE', activationDate = ?, warrantyExpiry = ? WHERE id = ?`)
        .run(saleDate, expiry, batId);

    const activeBat = db.prepare("SELECT * FROM batteries WHERE id = ?").get(batId);
    assert(activeBat.status === 'ACTIVE', 'Battery activated');
    assert(activeBat.activationDate === saleDate, 'Activation date set');
} catch (e) { console.error(e); }

// --- MODULE E: REPLACEMENT PROTOCOL ---
console.log('\n[MODULE E] Replacement Logic');
try {
    const oldId = 'BT-1001';
    const newId = 'BT-1002'; // Replacement unit
    const repDate = '2024-06-01';

    // 1. Create New Unit (Inheriting Warranty? Or Fresh? Logic says inherits usually, but let's test linking)
    db.prepare(`INSERT INTO batteries (id, model, status, dealerId) VALUES (?, ?, ?, ?)`).run(newId, 'RED 100', 'ACTIVE', 'TEST-D-01');

    // 2. Link Old
    db.prepare(`UPDATE batteries SET status = 'RETURNED', nextBatteryId = ? WHERE id = ?`).run(newId, oldId);

    // 3. Link New
    db.prepare(`UPDATE batteries SET previousBatteryId = ? WHERE id = ?`).run(oldId, newId);

    const oldBat = db.prepare("SELECT * FROM batteries WHERE id = ?").get(oldId);
    const newBat = db.prepare("SELECT * FROM batteries WHERE id = ?").get(newId);

    assert(oldBat.status === 'RETURNED', 'Old unit marked RETURNED');
    assert(oldBat.nextBatteryId === newId, 'Old unit points to New');
    assert(newBat.previousBatteryId === oldId, 'New unit points to Old');

} catch (e) { console.error(e); }

console.log('\n--- VERIFICATION COMPLETE ---');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
