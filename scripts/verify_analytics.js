const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = 'verify_analytics.db';
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);

console.log('--- Analytics Verification Started ---');

// 1. Setup minimal schema
db.exec(`
  CREATE TABLE dealers (id TEXT, name TEXT);
  CREATE TABLE sales (id TEXT, dealerId TEXT, salePrice REAL, warrantyExpiry TEXT);
  CREATE TABLE batteries (id TEXT, status TEXT);
`);

// 2. Insert Mock Data
db.exec(`
  INSERT INTO dealers VALUES ('D1', 'Dealer A'), ('D2', 'Dealer B');
  INSERT INTO sales VALUES ('S1', 'D1', 1000, '2026-06-01'), ('S2', 'D1', 2000, '2025-02-01'), ('S3', 'D2', 1500, '2027-01-01');
  INSERT INTO batteries VALUES ('B1', 'ACTIVE'), ('B2', 'ACTIVE'), ('B3', 'Manufactured');
`);

// 3. Run Analytics Query (Copied from db.ts)
const stats = db.prepare(`SELECT COUNT(*) as totalSales, SUM(salePrice) as totalRevenue FROM sales`).get();
const active = db.prepare(`SELECT COUNT(*) as count FROM batteries WHERE status = 'ACTIVE'`).get();
const dealerStats = db.prepare(`
  SELECT 
    d.id, d.name,
    COUNT(s.id) as sales,
    SUM(s.salePrice) as revenue
  FROM dealers d
  LEFT JOIN sales s ON d.id = s.dealerId
  GROUP BY d.id
  ORDER BY sales DESC
  LIMIT 50
`).all();

// 4. Validate
console.log('Stats:', stats);
console.log('Active:', active);
console.log('Dealer Stats:', dealerStats);

if (stats.totalSales === 3 && stats.totalRevenue === 4500 && active.count === 2 && dealerStats.length === 2) {
    console.log('SUCCESS: Analytics Queries are correct.');
} else {
    console.error('FAILURE: Data mismatch.');
    process.exit(1);
}

db.close();
fs.unlinkSync(DB_PATH);
