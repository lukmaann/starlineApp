const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DATA_DIR = process.platform === 'win32'
    ? 'C:\\starline\\data'
    : path.join(os.homedir(), 'starline', 'data');

const DB_PATH = path.join(DATA_DIR, 'starline_master.db');

if (!fs.existsSync(DB_PATH)) {
    console.error("Database not found at", DB_PATH);
    process.exit(1);
}

console.log("Connecting to Database at", DB_PATH);
const db = new Database(DB_PATH);

console.log("Cleaning up previous test data if any...");
db.exec("DELETE FROM models WHERE id LIKE 'MOD-TEST-%'");
db.exec("DELETE FROM dealers WHERE id LIKE 'DLR-TEST-%'");
db.exec("DELETE FROM batteries WHERE id LIKE 'BATT-TEST-%'");
db.exec("DELETE FROM sales WHERE id LIKE 'SALE-TEST-%'");
db.exec("DELETE FROM replacements WHERE id LIKE 'REP-TEST-%'");
db.exec("DELETE FROM activity_logs WHERE description LIKE '%Test%'");

const insertModel = db.prepare('INSERT INTO models (id, name, defaultCapacity, defaultWarrantyMonths) VALUES (?, ?, ?, ?)');
const models = [
    { id: 'MOD-TEST-ER', name: 'ER-135 Test Data', defaultCapacity: '135Ah', defaultWarrantyMonths: 12 },
    { id: 'MOD-TEST-INV', name: 'INV-150 Test Data', defaultCapacity: '150Ah', defaultWarrantyMonths: 60 },
    { id: 'MOD-TEST-AUTO', name: 'AUTO-40 Test Data', defaultCapacity: '40Ah', defaultWarrantyMonths: 48 },
];

const insertDealer = db.prepare('INSERT INTO dealers (id, name, ownerName, address, contact, location) VALUES (?, ?, ?, ?, ?, ?)');
const insertBat = db.prepare(`
  INSERT INTO batteries (
    id, model, capacity, manufactureDate, activationDate, warrantyExpiry, 
    customerName, customerPhone, dealerId, status, replacementCount, 
    warrantyMonths, originalBatteryId, previousBatteryId, nextBatteryId, 
    warrantyCardStatus, inspectionStatus, inspectionDate, inspectionNotes, inspectionReason
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSale = db.prepare(`
  INSERT INTO sales (
    id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount,
    isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount,
    warrantyStartDate, warrantyExpiry
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertRep = db.prepare(`
  INSERT INTO replacements (
    id, oldBatteryId, newBatteryId, dealerId, replacementDate, reason, problemDescription,
    warrantyCardStatus, paidInAccount, replenishmentBatteryId, settlementType, settlementDate
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertLog = db.prepare('INSERT INTO activity_logs (type, description, metadata, timestamp) VALUES (?, ?, ?, ?)');

const dealers = [];
const today = new Date();
const formatDate = (d) => d.toISOString().split('T')[0];
const subDays = (d, days) => { const dt = new Date(d); dt.setDate(dt.getDate() - days); return dt; };
const addMonths = (d, months) => { const dt = new Date(d); dt.setMonth(dt.getMonth() + months); return dt; };

let saleCounter = 1;
let repCounter = 1;
let logCounter = 1;

console.log("Starting bulk insertion transaction...");

db.transaction(() => {
    // 1. Generate Models
    for (const m of models) insertModel.run(m.id, m.name, m.defaultCapacity, m.defaultWarrantyMonths);

    // 2. Generate 100 Dealers
    for (let i = 1; i <= 100; i++) {
        const dId = `DLR-TEST-${i.toString().padStart(3, '0')}`;
        dealers.push(dId);
        insertDealer.run(dId, `Grand Electronics ${i}`, `Owner ${i}`, `Industrial Sector ${i}`, `9876543${i.toString().padStart(3, '0')}`, `City Zone ${i % 10}`);
    }

    let battCounter = 1;
    const nextBattId = () => `BATT-TEST-${(battCounter++).toString().padStart(6, '0')}`;
    const getDealer = () => dealers[Math.floor(Math.random() * dealers.length)];
    const getModel = () => models[Math.floor(Math.random() * models.length)];

    function logActivity(type, desc, meta, date) {
        insertLog.run(type, desc, JSON.stringify(meta), date ? date.toISOString() : new Date().toISOString());
    }

    // 1. MANUFACTURED (Generic Stock - 30k)
    for (let i = 0; i < 30000; i++) {
        const id = nextBattId();
        const model = getModel();
        const mfgDate = formatDate(subDays(today, 10 + (i % 30)));
        insertBat.run(id, model.id, model.defaultCapacity, mfgDate, null, null, null, null, null, 'Manufactured', 0, model.defaultWarrantyMonths, null, null, null, null, 'PENDING', null, null, null);
    }

    // 2. ACTIVE (Sold and Active - 40k)
    for (let i = 0; i < 40000; i++) {
        const id = nextBattId();
        const model = getModel();
        const dealerId = getDealer();
        const mfgDate = formatDate(subDays(today, 60 + (i % 100)));
        const actDate = formatDate(subDays(today, 30 + (i % 200)));
        const expDate = formatDate(addMonths(subDays(today, 30 + (i % 200)), model.defaultWarrantyMonths));
        const isBilled = Math.random() > 0.5 ? 1 : 0;

        insertBat.run(id, model.id, model.defaultCapacity, mfgDate, actDate, expDate, `Active Cust ${battCounter}`, `999888${(battCounter % 10000).toString().padStart(4, '0')}`, dealerId, 'ACTIVE', 0, model.defaultWarrantyMonths, id, null, null, 'RECEIVED', 'PENDING', null, null, null);
        insertSale.run(`SALE-TEST-${saleCounter++}`, id, 'NEW', dealerId, actDate, 12000, 2160, 14160, isBilled, `Active Cust ${battCounter}`, `999888${(battCounter % 10000).toString().padStart(4, '0')}`, 1, 0, actDate, expDate);

        if (i % 100 === 0) logActivity('SALE', `Test Sale Processed for ${id}`, { batteryId: id, dealerId }, new Date(actDate));
    }

    // 3. EXPIRED (Out of warranty - 10k)
    for (let i = 0; i < 10000; i++) {
        const id = nextBattId();
        const model = getModel();
        const dealerId = getDealer();
        const actDateObj = subDays(today, (model.defaultWarrantyMonths * 30) + 10 + (i % 50)); // completely expired
        const mfgDate = formatDate(subDays(actDateObj, 20));
        const actDate = formatDate(actDateObj);
        const expDate = formatDate(addMonths(actDateObj, model.defaultWarrantyMonths));

        insertBat.run(id, model.id, model.defaultCapacity, mfgDate, actDate, expDate, `Exp Cust ${battCounter}`, `999777${(battCounter % 10000).toString().padStart(4, '0')}`, dealerId, 'EXPIRED', 0, model.defaultWarrantyMonths, id, null, null, 'RECEIVED', 'PENDING', null, null, null);
        insertSale.run(`SALE-TEST-${saleCounter++}`, id, 'NEW', dealerId, actDate, 9000, 1620, 10620, 1, `Exp Cust ${battCounter}`, `999777${(battCounter % 10000).toString().padStart(4, '0')}`, 1, 1, actDate, expDate);
    }

    // 4. EXCHANGES/REPLACEMENTS (Yields 5k Old Faulty/Returned Pending & 5k New Replacements) (10k total batteries)
    for (let i = 0; i < 5000; i++) {
        const oldId = nextBattId();
        const newId = nextBattId();
        const model = getModel();
        const dealerId = getDealer();

        // Original Sale Timeline
        const oldActDateObj = subDays(today, 300 + (i % 100));
        const oldMfgDate = formatDate(subDays(oldActDateObj, 25));
        const oldActDate = formatDate(oldActDateObj);
        const oldExpDate = formatDate(addMonths(oldActDateObj, model.defaultWarrantyMonths));

        // Replacement transaction
        const repDateObj = subDays(today, 5 + (i % 20));
        const repDate = formatDate(repDateObj);

        // If the old one was returned pending vs already processed into faulty pool
        const statusOfOld = Math.random() > 0.5 ? 'FAULTY' : 'RETURNED_PENDING';

        // Old Battery
        insertBat.run(oldId, model.id, model.defaultCapacity, oldMfgDate, oldActDate, oldExpDate, `Exc Cust ${battCounter}`, `999666${(battCounter % 10000).toString().padStart(4, '0')}`, dealerId, statusOfOld, 1, model.defaultWarrantyMonths, oldId, null, newId, 'RECEIVED', 'PENDING', null, null, null);
        insertSale.run(`SALE-TEST-${saleCounter++}`, oldId, 'NEW', dealerId, oldActDate, 11000, 1980, 12980, 1, `Exc Cust ${battCounter}`, `999666${(battCounter % 10000).toString().padStart(4, '0')}`, 1, 1, oldActDate, oldExpDate);

        // New Battery (Replacement)
        const newMfgDate = formatDate(subDays(repDateObj, 15));
        insertBat.run(newId, model.id, model.defaultCapacity, newMfgDate, repDate, oldExpDate, `Exc Cust ${battCounter}`, `999666${(battCounter % 10000).toString().padStart(4, '0')}`, dealerId, 'REPLACEMENT', 1, model.defaultWarrantyMonths, oldId, oldId, null, 'RECEIVED', 'PENDING', null, null, null);

        insertRep.run(`REP-TEST-${repCounter++}`, oldId, newId, dealerId, repDate, 'Dead Cell / Terminal melt', 'Voltage severely dropping', 'RECEIVED', i % 3 === 0 ? 1 : 0, null, i % 3 === 0 ? 'READY' : 'PENDING', null);

        logActivity('REPLACEMENT', `Approved replacement for ${oldId} towards ${newId}`, { oldBatteryId: oldId, newBatteryId: newId, dealerId }, repDateObj);
    }

    // 5. INSPECTION FLOW (Returned batteries being inspected or resolved) (10k total)
    for (let i = 0; i < 10000; i++) {
        const id = nextBattId();
        const model = getModel();
        const dealerId = getDealer();
        const actDateObj = subDays(today, 200 + (i % 100));
        const mfgDate = formatDate(subDays(actDateObj, 30));
        const actDate = formatDate(actDateObj);
        const expDate = formatDate(addMonths(actDateObj, model.defaultWarrantyMonths));

        const inspStatuses = ['PENDING', 'IN_PROGRESS', 'GOOD', 'FAULTY'];
        const insp = inspStatuses[Math.floor(Math.random() * inspStatuses.length)];

        // We treat them as RETURNED
        insertBat.run(id, model.id, model.defaultCapacity, mfgDate, actDate, expDate, `Insp Cust ${battCounter}`, `999555${(battCounter % 10000).toString().padStart(4, '0')}`, dealerId, 'RETURNED', 0, model.defaultWarrantyMonths, id, null, null, 'RECEIVED', insp, formatDate(subDays(today, 2)), 'Checked gravity levels', 'Load fails entirely under 400W');
        insertSale.run(`SALE-TEST-${saleCounter++}`, id, 'NEW', dealerId, actDate, 10500, 1890, 12390, 1, `Insp Cust ${battCounter}`, `999555${(battCounter % 10000).toString().padStart(4, '0')}`, 1, 1, actDate, expDate);
    }

})();

console.log("Seeding complete! Successfully injected 100 dealers and 100,000 batteries into the test database.");
