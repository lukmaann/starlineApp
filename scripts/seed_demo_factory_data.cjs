const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Usage: node scripts/seed_demo_factory_data.cjs <db-path>');
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const seedModels = [
  { id: 'SEED-MOD-SL35', name: 'SL35', defaultCapacity: '35AH', defaultWarrantyMonths: 18 },
  { id: 'SEED-MOD-SL60', name: 'SL60', defaultCapacity: '60AH', defaultWarrantyMonths: 24 },
  { id: 'SEED-MOD-SL80', name: 'SL80', defaultCapacity: '80AH', defaultWarrantyMonths: 24 },
  { id: 'SEED-MOD-SL100', name: 'SL100', defaultCapacity: '100AH', defaultWarrantyMonths: 30 },
  { id: 'SEED-MOD-SL150', name: 'SL150', defaultCapacity: '150AH', defaultWarrantyMonths: 30 },
  { id: 'SEED-MOD-B23', name: 'B23', defaultCapacity: '23AH', defaultWarrantyMonths: 18 },
];

const modelFormulas = {
  SL35: { positivePlates: 18, negativePlates: 24, pvcSeparator: 18, acidLiters: 2, packingJali: 12, caps: 2, containerCostHint: 188, packingCostHint: 18, charging: 100, screening: 10 },
  SL60: { positivePlates: 24, negativePlates: 30, pvcSeparator: 24, acidLiters: 3, packingJali: 12, caps: 2, containerCostHint: 306, packingCostHint: 18, charging: 100, screening: 10 },
  SL80: { positivePlates: 36, negativePlates: 42, pvcSeparator: 36, acidLiters: 4, packingJali: 0, caps: 2, containerCostHint: 319, packingCostHint: 20, charging: 150, screening: 10 },
  SL100: { positivePlates: 42, negativePlates: 48, pvcSeparator: 42, acidLiters: 6, packingJali: 12, caps: 2, containerCostHint: 410, packingCostHint: 25, charging: 200, screening: 25 },
  SL150: { positivePlates: 60, negativePlates: 66, pvcSeparator: 60, acidLiters: 12, packingJali: 12, caps: 2, containerCostHint: 585, packingCostHint: 50, charging: 300, screening: 50 },
  B23: { positivePlates: 30, negativePlates: 36, pvcSeparator: 30, acidLiters: 3, packingJali: 0, caps: 2, containerCostHint: 306, packingCostHint: 18, charging: 100, screening: 10 },
};

const months = [
  { year: 2025, month: 12, factor: 0.88 },
  { year: 2026, month: 1, factor: 0.96 },
  { year: 2026, month: 2, factor: 1.04 },
  { year: 2026, month: 3, factor: 1.12 },
];

const materialTemplates = [
  { name: 'Raw Lead', unit: 'kg', alert: 500 },
  { name: 'Grey Oxide', unit: 'kg', alert: 200 },
  { name: 'Dinal Fiber', unit: 'kg', alert: 100 },
  { name: 'DM Water', unit: 'liters', alert: 200 },
  { name: 'Acid', unit: 'liters', alert: 200 },
  { name: 'Lignin (Lugnin)', unit: 'kg', alert: 100 },
  { name: 'Carbon Black', unit: 'kg', alert: 100 },
  { name: 'Graphite Powder', unit: 'kg', alert: 100 },
  { name: 'Barium Sulfate', unit: 'kg', alert: 100 },
  { name: 'PVC Separator', unit: 'pieces', alert: 500 },
  { name: 'Battery Packing', unit: 'pieces', alert: 200 },
  { name: 'Lead', unit: 'kg', alert: 100 },
  { name: 'Packing Jali', unit: 'pieces', alert: 100 },
  { name: 'Plus Minus Caps', unit: 'pairs', alert: 200 },
  { name: 'Container - SL35', unit: 'pieces', alert: 50 },
  { name: 'Container - SL60', unit: 'pieces', alert: 50 },
  { name: 'Container - SL80', unit: 'pieces', alert: 50 },
  { name: 'Container - SL100', unit: 'pieces', alert: 50 },
  { name: 'Container - SL150', unit: 'pieces', alert: 50 },
  { name: 'Container - B23', unit: 'pieces', alert: 50 },
];

const purchaseTemplates = [
  { name: 'Raw Lead', qty: 3200, unitPrice: 196, transport: 12000, supplier: 'Metal One Smelters' },
  { name: 'Grey Oxide', qty: 2100, unitPrice: 178, transport: 8000, supplier: 'Oxide Works' },
  { name: 'Acid', qty: 1000, unitPrice: 42, transport: 3000, supplier: 'Acidchem' },
  { name: 'DM Water', qty: 1600, unitPrice: 7, transport: 800, supplier: 'Pure Flow' },
  { name: 'Dinal Fiber', qty: 120, unitPrice: 240, transport: 600, supplier: 'Fiber Tech' },
  { name: 'Lignin (Lugnin)', qty: 150, unitPrice: 145, transport: 500, supplier: 'Ligno Core' },
  { name: 'Carbon Black', qty: 130, unitPrice: 132, transport: 500, supplier: 'Carbon Source' },
  { name: 'Graphite Powder', qty: 90, unitPrice: 188, transport: 450, supplier: 'Graphix Minerals' },
  { name: 'Barium Sulfate', qty: 300, unitPrice: 48, transport: 500, supplier: 'Baritech' },
  { name: 'PVC Separator', qty: 18000, unitPrice: 3.3, transport: 1500, supplier: 'Polysep' },
  { name: 'Battery Packing', qty: 2500, unitPrice: 24, transport: 1800, supplier: 'Packwell' },
  { name: 'Packing Jali', qty: 2200, unitPrice: 8.5, transport: 900, supplier: 'Meshpack' },
  { name: 'Plus Minus Caps', qty: 3200, unitPrice: 2.8, transport: 600, supplier: 'Electro Plast' },
  { name: 'Container - SL35', qty: 450, unitPrice: 188, transport: 1200, supplier: 'Container Works' },
  { name: 'Container - SL60', qty: 350, unitPrice: 306, transport: 1400, supplier: 'Container Works' },
  { name: 'Container - SL80', qty: 300, unitPrice: 319, transport: 1400, supplier: 'Container Works' },
  { name: 'Container - SL100', qty: 240, unitPrice: 410, transport: 1500, supplier: 'Container Works' },
  { name: 'Container - SL150', qty: 180, unitPrice: 585, transport: 1800, supplier: 'Container Works' },
  { name: 'Container - B23', qty: 200, unitPrice: 306, transport: 1100, supplier: 'Container Works' },
];

const workers = [
  { id: 'SEED-WRK-01', enrollment_no: 'WRK1001', full_name: 'Rakesh Patil', gender: 'Male', phone: '9876543201', join_date: '2025-02-10', date_of_birth: '1992-04-11', base_salary: 24000, emergency_contact: '9876543001', status: 'ACTIVE' },
  { id: 'SEED-WRK-02', enrollment_no: 'WRK1002', full_name: 'Sunil Jadhav', gender: 'Male', phone: '9876543202', join_date: '2025-03-15', date_of_birth: '1990-08-08', base_salary: 22500, emergency_contact: '9876543002', status: 'ACTIVE' },
  { id: 'SEED-WRK-03', enrollment_no: 'WRK1003', full_name: 'Mahesh Naik', gender: 'Male', phone: '9876543203', join_date: '2025-01-18', date_of_birth: '1988-03-22', base_salary: 26000, emergency_contact: '9876543003', status: 'ACTIVE' },
  { id: 'SEED-WRK-04', enrollment_no: 'WRK1004', full_name: 'Sagar More', gender: 'Male', phone: '9876543204', join_date: '2025-05-02', date_of_birth: '1995-12-01', base_salary: 21000, emergency_contact: '9876543004', status: 'ACTIVE' },
  { id: 'SEED-WRK-05', enrollment_no: 'WRK1005', full_name: 'Anita Khot', gender: 'Female', phone: '9876543205', join_date: '2025-06-12', date_of_birth: '1993-07-14', base_salary: 23500, emergency_contact: '9876543005', status: 'ACTIVE' },
  { id: 'SEED-WRK-06', enrollment_no: 'WRK1006', full_name: 'Pravin Salunkhe', gender: 'Male', phone: '9876543206', join_date: '2025-04-21', date_of_birth: '1991-09-09', base_salary: 24500, emergency_contact: '9876543006', status: 'ACTIVE' },
];

const batterySalesPlan = [
  { model: 'SL35', qty: 28, basePrice: 4200 },
  { model: 'SL60', qty: 22, basePrice: 6100 },
  { model: 'SL80', qty: 18, basePrice: 7600 },
  { model: 'SL100', qty: 14, basePrice: 9300 },
];

function monthString(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function dateInMonth(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function ensureModel(model) {
  const existing = db.prepare('SELECT id FROM models WHERE LOWER(name) = LOWER(?) LIMIT 1').get(model.name);
  if (!existing) {
    db.prepare('INSERT INTO models (id, name, defaultCapacity, defaultWarrantyMonths) VALUES (?, ?, ?, ?)').run(
      model.id,
      model.name,
      model.defaultCapacity,
      model.defaultWarrantyMonths,
    );
  }
}

function ensureMaterial(material) {
  const existing = db.prepare('SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) LIMIT 1').get(material.name);
  if (existing) return existing.id;
  const id = `SEED-RM-${material.name.replace(/[^A-Z0-9]+/gi, '-').toUpperCase()}`;
  db.prepare('INSERT INTO raw_materials (id, name, unit, alert_threshold) VALUES (?, ?, ?, ?)').run(id, material.name, material.unit, material.alert);
  return id;
}

function getMaterialId(name) {
  const row = db.prepare('SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) LIMIT 1').get(name);
  if (!row) throw new Error(`Missing raw material: ${name}`);
  return row.id;
}

function avgMaterialPrice(name) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(total_cost) / NULLIF(SUM(quantity), 0), 0) AS avg_cost
    FROM material_purchases mp
    JOIN raw_materials rm ON rm.id = mp.material_id
    WHERE LOWER(rm.name) = LOWER(?)
  `).get(name);
  return Number(row?.avg_cost || 0);
}

function insertPurchase(id, materialName, date, quantity, unitPrice, transportCost, supplier) {
  const materialId = getMaterialId(materialName);
  const totalCost = quantity * unitPrice + transportCost;
  db.prepare(`
    INSERT INTO material_purchases (id, material_id, date, quantity, unit_price, transport_cost, total_cost, supplier_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, materialId, date, quantity, unitPrice, transportCost, totalCost, supplier);
}

function insertExpense(id, date, category, amount, description) {
  db.prepare('INSERT INTO expenses (id, date, category, amount, description) VALUES (?, ?, ?, ?, ?)').run(id, date, category, amount, description);
}

function insertProduction(log) {
  db.prepare(`
    INSERT INTO production_logs (
      id, date, stage, stage_detail, battery_model, quantity_produced, labour_cost_total,
      material_name, material_quantity, unit_weight, average_unit_price, price_per_grid, total_process_cost, process_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log.id,
    log.date,
    log.stage,
    log.stage_detail || null,
    log.battery_model || null,
    log.quantity_produced,
    log.labour_cost_total || 0,
    log.material_name || null,
    log.material_quantity || null,
    log.unit_weight || null,
    log.average_unit_price || null,
    log.price_per_grid || null,
    log.total_process_cost || null,
    log.process_data ? JSON.stringify(log.process_data) : null,
  );
}

function seedAssemblyLog(prefix, date, modelName, quantity, overheadPerBattery) {
  const f = modelFormulas[modelName];
  const positivePlate = avgMaterialPrice('positive plate proxy') || 0;
  const negativePlate = avgMaterialPrice('negative plate proxy') || 0;
  const posPlateCost = positivePlate > 0 ? positivePlate : 18.5;
  const negPlateCost = negativePlate > 0 ? negativePlate : 16.8;
  const container = avgMaterialPrice(`Container - ${modelName}`) || f.containerCostHint;
  const pvc = avgMaterialPrice('PVC Separator') || 3.3;
  const acid = avgMaterialPrice('Acid') || 42;
  const packingJali = avgMaterialPrice('Packing Jali') || 8.5;
  const caps = avgMaterialPrice('Plus Minus Caps') || 2.8;
  const batteryPacking = avgMaterialPrice('Battery Packing') || f.packingCostHint;
  const perBattery =
    (f.positivePlates * posPlateCost) +
    (f.negativePlates * negPlateCost) +
    (f.pvcSeparator * pvc) +
    (f.acidLiters * acid) +
    (f.packingJali * packingJali) +
    (f.caps * caps) +
    container +
    batteryPacking +
    f.charging +
    f.screening +
    overheadPerBattery;

  insertProduction({
    id: `${prefix}-${modelName}`,
    date,
    stage: 'ASSEMBLY',
    battery_model: modelName,
    quantity_produced: quantity,
    labour_cost_total: 0,
    price_per_grid: Math.round(perBattery),
    total_process_cost: Math.round(perBattery * quantity),
    process_data: {
      model: modelName,
      per_battery_cost: Math.round(perBattery),
      quantity,
      overhead_per_battery: Math.round(overheadPerBattery),
      breakdown: {
        positive_plates: f.positivePlates,
        negative_plates: f.negativePlates,
        pvc_separator: f.pvcSeparator,
        acid: f.acidLiters,
        packing_jali: f.packingJali,
        plus_minus_caps: f.caps,
        container: 1,
        battery_packing: 1,
        charging: 1,
        battery_screening: 1,
      },
    },
  });
}

const runSeed = db.transaction(() => {
  const backupPath = `${dbPath}.bak-demo-${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);

  db.prepare("DELETE FROM material_purchases WHERE id LIKE 'SEED-%'").run();
  db.prepare("DELETE FROM production_logs WHERE id LIKE 'SEED-%'").run();
  db.prepare("DELETE FROM expenses WHERE id LIKE 'SEED-%'").run();
  db.prepare("DELETE FROM factory_worker_salaries WHERE notes LIKE 'DEMO_SEED%'").run();
  db.prepare("DELETE FROM factory_workers WHERE id LIKE 'SEED-%'").run();
  db.prepare("DELETE FROM sales WHERE id LIKE 'SEED-%'").run();
  db.prepare("DELETE FROM batteries WHERE id LIKE 'SEED-%'").run();
  db.prepare("DELETE FROM models WHERE id LIKE 'SEED-%'").run();

  seedModels.forEach(ensureModel);
  materialTemplates.forEach(ensureMaterial);

  workers.forEach((worker) => {
    db.prepare(`
      INSERT INTO factory_workers (
        id, enrollment_no, full_name, gender, phone,
        join_date, date_of_birth, base_salary, emergency_contact, status, salary_paid_month, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      worker.id,
      worker.enrollment_no,
      worker.full_name,
      worker.gender,
      worker.phone,
      worker.join_date,
      worker.date_of_birth,
      worker.base_salary,
      worker.emergency_contact,
      worker.status,
      monthString(2026, 3),
    );
  });

  months.forEach(({ year, month, factor }, monthIndex) => {
    purchaseTemplates.forEach((template, idx) => {
      const qty = Math.round(template.qty * factor);
      const unitPrice = Number((template.unitPrice * (1 + (monthIndex * 0.01))).toFixed(2));
      const transport = Math.round(template.transport * (1 + (monthIndex * 0.04)));
      insertPurchase(
        `SEED-PUR-${year}${String(month).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`,
        template.name,
        dateInMonth(year, month, 5 + (idx % 12)),
        qty,
        unitPrice,
        transport,
        template.supplier,
      );
    });

    const salaryTotal = workers.reduce((sum, worker) => sum + worker.base_salary, 0);
    workers.forEach((worker, idx) => {
      db.prepare(`
        INSERT INTO factory_worker_salaries (worker_id, amount, payment_date, type, notes)
        VALUES (?, ?, ?, 'BASE', ?)
      `).run(worker.id, worker.base_salary, dateInMonth(year, month, 28), `DEMO_SEED salary ${monthString(year, month)} #${idx + 1}`);
    });

    insertExpense(`SEED-EXP-${year}${String(month).padStart(2, '0')}-SAL`, dateInMonth(year, month, 28), 'Salary', salaryTotal, `DEMO_SEED monthly salary ${monthString(year, month)}`);
    insertExpense(`SEED-EXP-${year}${String(month).padStart(2, '0')}-ELE`, dateInMonth(year, month, 24), 'Electricity', Math.round(38000 * factor), `DEMO_SEED electricity ${monthString(year, month)}`);
    insertExpense(`SEED-EXP-${year}${String(month).padStart(2, '0')}-MNT`, dateInMonth(year, month, 20), 'Maintenance', Math.round(14000 * factor), `DEMO_SEED maintenance ${monthString(year, month)}`);
    insertExpense(`SEED-EXP-${year}${String(month).padStart(2, '0')}-RNT`, dateInMonth(year, month, 3), 'Rent', 25000, `DEMO_SEED rent ${monthString(year, month)}`);
    insertExpense(`SEED-EXP-${year}${String(month).padStart(2, '0')}-OTR`, dateInMonth(year, month, 17), 'Other', Math.round(9000 * factor), `DEMO_SEED misc ${monthString(year, month)}`);

    const rawLeadAvg = avgMaterialPrice('Raw Lead') || 196;
    const greyOxideAvg = avgMaterialPrice('Grey Oxide') || 178;
    const dinalAvg = avgMaterialPrice('Dinal Fiber') || 240;
    const dmWaterAvg = avgMaterialPrice('DM Water') || 7;
    const acidAvg = avgMaterialPrice('Acid') || 42;
    const ligninAvg = avgMaterialPrice('Lignin (Lugnin)') || 145;
    const carbonAvg = avgMaterialPrice('Carbon Black') || 132;
    const graphiteAvg = avgMaterialPrice('Graphite Powder') || 188;
    const bariumAvg = avgMaterialPrice('Barium Sulfate') || 48;

    const posRawLead = Number((420 * factor).toFixed(2));
    const posGridWeight = 0.133;
    const posGridQty = Math.round(posRawLead / posGridWeight);
    const posCastingCost = Number((posRawLead * rawLeadAvg).toFixed(2));
    insertProduction({
      id: `SEED-PROD-${year}${String(month).padStart(2, '0')}-CAST-POS`,
      date: dateInMonth(year, month, 8),
      stage: 'CASTING',
      stage_detail: 'POSITIVE_CASTING',
      quantity_produced: posGridQty,
      labour_cost_total: 0,
      material_name: 'Raw Lead',
      material_quantity: posRawLead,
      unit_weight: posGridWeight,
      average_unit_price: rawLeadAvg,
      price_per_grid: Number((posCastingCost / posGridQty).toFixed(2)),
      total_process_cost: posCastingCost,
      process_data: { raw_lead_used: posRawLead, grid_weight: posGridWeight, total_grids: posGridQty, raw_lead_avg_price: rawLeadAvg },
    });

    const negRawLead = Number((390 * factor).toFixed(2));
    const negGridWeight = 0.116;
    const negGridQty = Math.round(negRawLead / negGridWeight);
    const negCastingCost = Number((negRawLead * rawLeadAvg).toFixed(2));
    insertProduction({
      id: `SEED-PROD-${year}${String(month).padStart(2, '0')}-CAST-NEG`,
      date: dateInMonth(year, month, 9),
      stage: 'CASTING',
      stage_detail: 'NEGATIVE_CASTING',
      quantity_produced: negGridQty,
      labour_cost_total: 0,
      material_name: 'Raw Lead',
      material_quantity: negRawLead,
      unit_weight: negGridWeight,
      average_unit_price: rawLeadAvg,
      price_per_grid: Number((negCastingCost / negGridQty).toFixed(2)),
      total_process_cost: negCastingCost,
      process_data: { raw_lead_used: negRawLead, grid_weight: negGridWeight, total_grids: negGridQty, raw_lead_avg_price: rawLeadAvg },
    });

    const posOxide = Number((170 * factor).toFixed(2));
    const posDinal = Number((posOxide * 0.002).toFixed(3));
    const posDm = Number((posOxide * 0.08).toFixed(3));
    const posAcid = Number((posOxide * 0.07).toFixed(3));
    const posMachine = Math.round(1800 * factor);
    const posPastingCost = Number((
      (posOxide * greyOxideAvg) +
      (posDinal * dinalAvg) +
      (posDm * dmWaterAvg) +
      (posAcid * acidAvg) +
      posMachine
    ).toFixed(2));
    const posPlateCount = Math.floor(posOxide / 0.257) * 2;
    insertProduction({
      id: `SEED-PROD-${year}${String(month).padStart(2, '0')}-PASTE-POS`,
      date: dateInMonth(year, month, 14),
      stage: 'PASTING',
      stage_detail: 'POSITIVE_PASTING',
      quantity_produced: posPlateCount,
      labour_cost_total: posMachine,
      material_name: 'Grey Oxide',
      material_quantity: Number((posOxide + posDinal + posDm + posAcid).toFixed(3)),
      unit_weight: 0.257,
      average_unit_price: greyOxideAvg,
      price_per_grid: Math.ceil(posPastingCost / 4000),
      total_process_cost: posPastingCost,
      process_data: {
        grey_oxide_qty: posOxide,
        dinal_fiber_qty: posDinal,
        dm_water_qty: posDm,
        acid_qty: posAcid,
        machine_operator: posMachine,
        grid_quantity: 4000,
        oxide_weight: 0.257,
      },
    });

    const negOxide = Number((165 * factor).toFixed(2));
    const negDinal = Number((negOxide * 0.002).toFixed(3));
    const negLignin = Number((negOxide * 0.004).toFixed(3));
    const negCarbon = Number((negOxide * 0.003).toFixed(3));
    const negGraphite = Number((negOxide * 0.001).toFixed(3));
    const negDm = Number((negOxide * 0.08).toFixed(3));
    const negAcid = Number((negOxide * 0.07).toFixed(3));
    const negBarium = Number((negOxide * 0.015).toFixed(3));
    const negMachine = Math.round(1950 * factor);
    const negPastingCost = Number((
      (negOxide * greyOxideAvg) +
      (negDinal * dinalAvg) +
      (negLignin * ligninAvg) +
      (negCarbon * carbonAvg) +
      (negGraphite * graphiteAvg) +
      (negDm * dmWaterAvg) +
      (negAcid * acidAvg) +
      (negBarium * bariumAvg) +
      negMachine
    ).toFixed(2));
    const negPlateCount = Math.floor(negOxide / 0.214) * 2;
    insertProduction({
      id: `SEED-PROD-${year}${String(month).padStart(2, '0')}-PASTE-NEG`,
      date: dateInMonth(year, month, 15),
      stage: 'PASTING',
      stage_detail: 'NEGATIVE_PASTING',
      quantity_produced: negPlateCount,
      labour_cost_total: negMachine,
      material_name: 'Grey Oxide',
      material_quantity: Number((negOxide + negDinal + negLignin + negCarbon + negGraphite + negDm + negAcid + negBarium).toFixed(3)),
      unit_weight: 0.214,
      average_unit_price: greyOxideAvg,
      price_per_grid: Math.ceil(negPastingCost / 4000),
      total_process_cost: negPastingCost,
      process_data: {
        grey_oxide_qty: negOxide,
        dinal_fiber_qty: negDinal,
        lugnin_qty: negLignin,
        carbon_black_qty: negCarbon,
        graphite_powder_qty: negGraphite,
        dm_water_qty: negDm,
        acid_qty: negAcid,
        barium_sulfate_qty: negBarium,
        machine_operator: negMachine,
        grid_quantity: 4000,
        oxide_weight: 0.214,
      },
    });

    const monthSalary = salaryTotal;
    const monthElectricity = Math.round(38000 * factor);
    const monthOther = Math.round((14000 + 25000 + 9000) * factor);
    const totalAssemblyUnits = Math.round((120 + 85 + 55 + 42) * factor);
    const overheadPerBattery = (monthSalary + monthElectricity + monthOther) / totalAssemblyUnits;
    seedAssemblyLog(`SEED-PROD-${year}${String(month).padStart(2, '0')}-ASM-01`, dateInMonth(year, month, 21), 'SL35', Math.round(120 * factor), overheadPerBattery);
    seedAssemblyLog(`SEED-PROD-${year}${String(month).padStart(2, '0')}-ASM-02`, dateInMonth(year, month, 22), 'SL60', Math.round(85 * factor), overheadPerBattery);
    seedAssemblyLog(`SEED-PROD-${year}${String(month).padStart(2, '0')}-ASM-03`, dateInMonth(year, month, 23), 'SL100', Math.round(55 * factor), overheadPerBattery);
    seedAssemblyLog(`SEED-PROD-${year}${String(month).padStart(2, '0')}-ASM-04`, dateInMonth(year, month, 24), 'B23', Math.round(42 * factor), overheadPerBattery);

    let saleCounter = 1;
    batterySalesPlan.forEach((plan) => {
      const saleQty = Math.round(plan.qty * factor);
      for (let i = 0; i < saleQty; i += 1) {
        const serial = `SEED-BAT-${year}${String(month).padStart(2, '0')}-${plan.model}-${String(i + 1).padStart(3, '0')}`;
        const saleDate = dateInMonth(year, month, 10 + ((i % 18)));
        const totalAmount = Math.round(plan.basePrice * (1 + (monthIndex * 0.03)));
        db.prepare(`
          INSERT INTO batteries (
            id, model, capacity, manufactureDate, activationDate, warrantyExpiry, customerName, customerPhone, dealerId,
            status, replacementCount, warrantyMonths
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          serial,
          plan.model,
          `${plan.model.replace(/[^0-9]/g, '') || '40'}AH`,
          saleDate,
          saleDate,
          dateInMonth(year + 1, month, 10),
          `Demo Customer ${saleCounter}`,
          `90000${String(10000 + saleCounter).slice(-5)}`,
          null,
          'ACTIVE',
          0,
          18,
        );
        db.prepare(`
          INSERT INTO sales (
            id, batteryId, batteryType, dealerId, saleDate, salePrice, gstAmount, totalAmount,
            isBilled, customerName, customerPhone, guaranteeCardReturned, paidInAccount, warrantyStartDate, warrantyExpiry
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `SEED-SALE-${year}${String(month).padStart(2, '0')}-${String(saleCounter).padStart(4, '0')}`,
          serial,
          plan.model,
          null,
          saleDate,
          totalAmount,
          0,
          totalAmount,
          1,
          `Demo Customer ${saleCounter}`,
          `90000${String(10000 + saleCounter).slice(-5)}`,
          1,
          1,
          saleDate,
          dateInMonth(year + 1, month, 10),
        );
        saleCounter += 1;
      }
    });
  });

  return { backupPath };
});

try {
  const result = runSeed();
  const counts = {
    models: db.prepare("SELECT COUNT(*) AS c FROM models WHERE id LIKE 'SEED-%'").get().c,
    purchases: db.prepare("SELECT COUNT(*) AS c FROM material_purchases WHERE id LIKE 'SEED-%'").get().c,
    productionLogs: db.prepare("SELECT COUNT(*) AS c FROM production_logs WHERE id LIKE 'SEED-%'").get().c,
    expenses: db.prepare("SELECT COUNT(*) AS c FROM expenses WHERE id LIKE 'SEED-%'").get().c,
    workers: db.prepare("SELECT COUNT(*) AS c FROM factory_workers WHERE id LIKE 'SEED-%'").get().c,
    sales: db.prepare("SELECT COUNT(*) AS c FROM sales WHERE id LIKE 'SEED-%'").get().c,
  };
  console.log(JSON.stringify({ dbPath, backupPath: result.backupPath, counts }, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
