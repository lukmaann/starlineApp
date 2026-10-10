const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const Database = require('better-sqlite3');
const path = require('node:path');
const os = require('node:os');

const { validateReplacementStart } = require(process.env.REPLACEMENT_VALIDATION_MODULE);
const dbPath = process.env.STARLINE_REPLACEMENT_TEST_DB;
if (!dbPath) throw new Error('STARLINE_REPLACEMENT_TEST_DB is required; tests must use an isolated database.');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE dealers (id TEXT PRIMARY KEY, name TEXT, ownerName TEXT, address TEXT, contact TEXT, location TEXT);
  CREATE TABLE models (id TEXT PRIMARY KEY, name TEXT, defaultCapacity TEXT, defaultWarrantyMonths INTEGER);
  CREATE TABLE batteries (
    id TEXT PRIMARY KEY, model TEXT, capacity TEXT, manufactureDate TEXT, activationDate TEXT,
    warrantyExpiry TEXT, customerName TEXT, customerPhone TEXT, dealerId TEXT, status TEXT,
    replacementCount INTEGER, warrantyMonths INTEGER, originalBatteryId TEXT, previousBatteryId TEXT,
    nextBatteryId TEXT, warrantyCardStatus TEXT, inspectionStatus TEXT, actualSaleDate TEXT
  );
  CREATE TABLE sales (
    id TEXT PRIMARY KEY, batteryId TEXT, batteryType TEXT, dealerId TEXT, saleDate TEXT,
    salePrice REAL, gstAmount REAL, totalAmount REAL, isBilled INTEGER, customerName TEXT,
    customerPhone TEXT, guaranteeCardReturned INTEGER, paidInAccount INTEGER,
    warrantyStartDate TEXT, warrantyExpiry TEXT
  );
  CREATE TABLE replacements (
    id TEXT PRIMARY KEY, oldBatteryId TEXT, newBatteryId TEXT, dealerId TEXT,
    replacementDate TEXT, reason TEXT, problemDescription TEXT, warrantyCardStatus TEXT,
    paidInAccount INTEGER, replenishmentBatteryId TEXT, settlementType TEXT
  );
`);

const seedFixture = db.transaction(() => {
  const addDealer = db.prepare('INSERT INTO dealers (id, name, ownerName, address, contact, location) VALUES (?, ?, ?, ?, ?, ?)');
  for (let i = 1; i <= 100; i++) {
    const id = `DLR-TEST-${String(i).padStart(3, '0')}`;
    addDealer.run(id, `Test Dealer ${i}`, `Owner ${i}`, `Address ${i}`, `900000${String(i).padStart(4, '0')}`, `Test City ${i}`);
  }
  for (const [id, name, capacity, warranty] of [
    ['MOD-TEST-ER', 'ER Test', '135Ah', 12],
    ['MOD-TEST-INV', 'INV Test', '150Ah', 60],
    ['MOD-TEST-AUTO', 'AUTO Test', '40Ah', 48]
  ]) db.prepare('INSERT INTO models VALUES (?, ?, ?, ?)').run(id, name, capacity, warranty);

  const addBattery = db.prepare(`INSERT INTO batteries (
    id, model, capacity, manufactureDate, activationDate, warrantyExpiry, customerName, customerPhone,
    dealerId, status, replacementCount, warrantyMonths, originalBatteryId, previousBatteryId,
    nextBatteryId, warrantyCardStatus, inspectionStatus, actualSaleDate
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const addSale = db.prepare(`INSERT INTO sales (
    id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount, isBilled,
    customerName, customerPhone, guaranteeCardReturned, paidInAccount, warrantyStartDate, warrantyExpiry
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const addReplacement = db.prepare(`INSERT INTO replacements (
    id, oldBatteryId, newBatteryId, dealerId, replacementDate, reason, problemDescription,
    warrantyCardStatus, paidInAccount, replenishmentBatteryId, settlementType
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const today = new Date().toISOString().slice(0, 10);
  const mfg = '2025-01-01';
  const expiredDate = '2020-01-01';
  const addUnit = (serial, status, dealerId, options = {}) => {
    const saleDate = options.sold ? '2025-02-01' : null;
    addBattery.run(
      serial, 'MOD-TEST-ER', '135Ah', mfg, status === 'Manufactured' ? null : '2025-01-15',
      options.expired ? expiredDate : null, options.sold ? `Customer ${serial}` : null,
      options.sold ? `999000${serial.slice(-4)}` : (options.stock ? 'STOCK' : null), dealerId, status,
      options.previousBatteryId ? 1 : 0, 12, options.originalBatteryId || serial,
      options.previousBatteryId || null, options.nextBatteryId || null, 'RECEIVED', 'PENDING', saleDate
    );
    if (options.sold || options.stock) {
      addSale.run(
        `SALE-${serial}`, serial, 'NEW', dealerId, saleDate || '2025-01-15', 10000, 1800,
        11800, 1, options.sold ? `Customer ${serial}` : 'DEALER STOCK',
        options.sold ? `999000${serial.slice(-4)}` : 'STOCK', 1, 0, saleDate || '2025-01-15', expiredDate
      );
    }
  };

  for (let i = 1; i <= 30; i++) addUnit(`BATT-TEST-${String(i).padStart(3, '0')}`, 'Manufactured', null);
  for (let i = 31; i <= 50; i++) addUnit(`BATT-TEST-${String(i).padStart(3, '0')}`, 'ACTIVE', 'DLR-TEST-001', { sold: true });
  for (let i = 51; i <= 60; i++) addUnit(`BATT-TEST-${String(i).padStart(3, '0')}`, 'EXPIRED', 'DLR-TEST-001', { sold: true, expired: true });
  for (let i = 61; i <= 70; i++) {
    const oldId = `BATT-TEST-${String(i).padStart(3, '0')}`;
    const newId = `BATT-TEST-${String(i + 10).padStart(3, '0')}`;
    addUnit(oldId, 'FAULTY', 'DLR-TEST-001', { sold: true, nextBatteryId: newId });
    addUnit(newId, 'REPLACEMENT', 'DLR-TEST-001', { previousBatteryId: oldId, originalBatteryId: oldId });
    addReplacement.run(`REP-TEST-${String(i - 60).padStart(3, '0')}`, oldId, newId, 'DLR-TEST-001', today, 'DEAD CELL', 'Test fixture', 'RECEIVED', 0, null, 'CREDIT');
  }
  for (let i = 81; i <= 90; i++) addUnit(`BATT-TEST-${String(i).padStart(3, '0')}`, 'RETURNED', 'DLR-TEST-001', { sold: true });
  for (let i = 91; i <= 100; i++) addUnit(`BATT-TEST-${String(i).padStart(3, '0')}`, 'ACTIVE', 'DLR-TEST-001', { stock: true });
});
seedFixture();

const getBattery = id => db.prepare('SELECT * FROM batteries WHERE id = ?').get(id);
const getSale = id => db.prepare("SELECT * FROM sales WHERE batteryId = ? AND COALESCE(UPPER(TRIM(customerPhone)), '') != 'STOCK' ORDER BY saleDate DESC LIMIT 1").get(id);

after(() => db.close());

test('isolated fixture contains the seeded regression set', () => {
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM dealers WHERE id LIKE 'DLR-TEST-%'").get().n, 100);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM batteries WHERE id LIKE 'BATT-TEST-%'").get().n, 100);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM batteries WHERE id LIKE 'BATT-TEST-%' AND status = 'Manufactured'").get().n, 30);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM batteries WHERE id LIKE 'BATT-TEST-%' AND status = 'ACTIVE'").get().n, 30);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM batteries WHERE id LIKE 'BATT-TEST-%' AND status = 'EXPIRED'").get().n, 10);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM replacements WHERE id LIKE 'REP-TEST-%'").get().n, 10);
});

test('manufactured unassigned battery can be selected', () => {
  const oldBattery = getBattery('BATT-TEST-031');
  const newBattery = getBattery('BATT-TEST-001');
  assert.equal(validateReplacementStart({ oldBattery, oldSale: getSale(oldBattery.id), oldHasExchange: false, newBattery }).allowed, true);
});

test('customer-sold replacement candidate is blocked', () => {
  const oldBattery = getBattery('BATT-TEST-031');
  const newBattery = getBattery('BATT-TEST-032');
  const result = validateReplacementStart({
    oldBattery,
    oldSale: getSale(oldBattery.id),
    oldHasExchange: false,
    newBattery,
    newSale: getSale(newBattery.id)
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'NEW_ALREADY_SOLD');
});

test('already exchanged old battery is blocked and reports its successor', () => {
  const oldBattery = getBattery('BATT-TEST-061');
  const exchange = db.prepare('SELECT newBatteryId FROM replacements WHERE oldBatteryId = ?').get(oldBattery.id);
  const result = validateReplacementStart({ oldBattery, oldSale: getSale(oldBattery.id), oldHasExchange: true });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'OLD_ALREADY_EXCHANGED');
  assert.equal(result.linkedBatteryId, oldBattery.nextBatteryId || exchange.newBatteryId);
});

test('replacement battery from a prior exchange cannot be reused as stock', () => {
  const oldBattery = getBattery('BATT-TEST-031');
  const newBattery = getBattery('BATT-TEST-071');
  const result = validateReplacementStart({ oldBattery, oldSale: getSale(oldBattery.id), oldHasExchange: false, newBattery });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'NEW_ALREADY_EXCHANGED');
});

test('old battery sale recorded under a different dealer is blocked', () => {
  const oldBattery = { ...getBattery('BATT-TEST-031'), dealerId: 'DLR-TEST-001' };
  const sale = { ...getSale(oldBattery.id), dealerId: 'DLR-TEST-002' };
  const result = validateReplacementStart({ oldBattery, oldSale: sale, oldHasExchange: false });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'OLD_DEALER_MISMATCH');
});

test('replacement stock belonging to another dealer is blocked', () => {
  const oldBattery = { ...getBattery('BATT-TEST-031'), dealerId: 'DLR-TEST-001' };
  const newBattery = { ...getBattery('BATT-TEST-091'), id: 'BATT-TEST-LOCAL-STOCK', status: 'ACTIVE', dealerId: 'DLR-TEST-002', actualSaleDate: null, customerPhone: 'STOCK' };
  const oldSale = { ...getSale(oldBattery.id), dealerId: 'DLR-TEST-001' };
  const result = validateReplacementStart({ oldBattery, oldSale, oldHasExchange: false, newBattery });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'NEW_DEALER_MISMATCH');
});

test('dealer stock history marked STOCK is not mistaken for a customer sale', () => {
  const oldBattery = getBattery('BATT-TEST-031');
  const newBattery = { ...getBattery('BATT-TEST-091'), id: 'BATT-TEST-LOCAL-STOCK', status: 'ACTIVE', dealerId: 'DLR-TEST-001', customerPhone: 'STOCK', actualSaleDate: null };
  const stockSale = { ...getSale(oldBattery.id), batteryId: newBattery.id, customerPhone: 'STOCK' };
  assert.equal(validateReplacementStart({ oldBattery, oldSale: getSale(oldBattery.id), oldHasExchange: false, newBattery, newSale: stockSale }).allowed, true);
});
