require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');

const os = require('os');

let DB_PATH = path.join(__dirname, 'paint_erp.db');

// In Vercel / serverless environment, filesystem is read-only except os.tmpdir()
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, 'paint_erp.db');
  try {
    if (!fs.existsSync(tmpPath)) {
      if (fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, tmpPath);
      }
    }
  } catch (e) {
    console.error('Error preparing DB in tmpdir:', e);
  }
  DB_PATH = tmpPath;
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Provide transaction helper compatible with better-sqlite3
db.transaction = function (fn) {
  return function (...args) {
    db.exec('BEGIN TRANSACTION;');
    try {
      const res = fn(...args);
      db.exec('COMMIT;');
      return res;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  };
};

// Provide pragma helper
db.pragma = function (cmd) {
  db.exec(`PRAGMA ${cmd};`);
};

// Load schema (idempotent - CREATE TABLE IF NOT EXISTS)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);
db.exec(`
  CREATE TABLE IF NOT EXISTS store_settings (
    setting_key TEXT PRIMARY KEY,
    setting_val TEXT
  );
  INSERT OR IGNORE INTO store_settings (setting_key, setting_val) VALUES ('master_security_pin', '7788');

  CREATE TABLE IF NOT EXISTS mpesa_config (
    config_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    env             TEXT NOT NULL DEFAULT 'sandbox',
    consumer_key    TEXT,
    consumer_secret TEXT,
    passkey         TEXT,
    shortcode       TEXT NOT NULL DEFAULT '174379',
    till_number     TEXT,
    callback_url    TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO mpesa_config (config_id, env, consumer_key, consumer_secret, passkey, shortcode, is_active)
  VALUES (1, 'sandbox', 'm09sAAL7GZ4cE1V2sK7w80N08XhZ1P9j', 'L74J99Q8Wv12x0Pq', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', '174379', 1);
`);

// Safely ensure mpesa_payments columns exist
try {
  const mpesaCols = db.prepare("PRAGMA table_info(mpesa_payments)").all().map(c => c.name);
  if (!mpesaCols.includes('merchant_request_id')) db.exec("ALTER TABLE mpesa_payments ADD COLUMN merchant_request_id TEXT;");
  if (!mpesaCols.includes('transaction_type')) db.exec("ALTER TABLE mpesa_payments ADD COLUMN transaction_type TEXT DEFAULT 'STK_PUSH';");
  if (!mpesaCols.includes('result_code')) db.exec("ALTER TABLE mpesa_payments ADD COLUMN result_code INTEGER;");
  if (!mpesaCols.includes('result_desc')) db.exec("ALTER TABLE mpesa_payments ADD COLUMN result_desc TEXT;");
  if (!mpesaCols.includes('raw_payload')) db.exec("ALTER TABLE mpesa_payments ADD COLUMN raw_payload TEXT;");
} catch (e) {
  // Ignored if columns already present
}

function hashPassword(password) {
  const salt = 'paint-erp-static-salt';
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

// Seed starter data if empty
function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM store_users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO store_users (full_name, phone_number, system_role, password_hash, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);
    insertUser.run('Store Owner', '254700000000', 'Owner', hashPassword('owner123'));
    insertUser.run('Attendant Mwangi', '254711111111', 'Staff', hashPassword('staff123'));

    console.log('----------------------------------------------------');
    console.log('Seeded two demo accounts:');
    console.log('  Owner -> phone 254700000000 / password owner123');
    console.log('  Staff -> phone 254711111111 / password staff123');
    console.log('----------------------------------------------------');
  }

  const baseCount = db.prepare('SELECT COUNT(*) AS count FROM stock_base_tins').get().count;
  if (baseCount === 0) {
    const insertBase = db.prepare(`
      INSERT OR IGNORE INTO stock_base_tins (manufacturer, base_name, tin_size_litres, quantity_in_stock, low_stock_threshold, unit_cost_kes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertBase.run('Crown', 'Vinyl Matt Pastel Base', 4, 25, 10, 1800);
    insertBase.run('Crown', 'Vinyl Matt Deep Base', 4, 15, 8, 1900);
    insertBase.run('Plascon', 'Wall & All Pastel Base', 4, 20, 10, 1750);
    insertBase.run('Plascon', 'Wall & All Deep Base', 4, 12, 8, 1850);
    insertBase.run('Duracoat', 'Superwash Pastel Base', 4, 18, 10, 1700);
    insertBase.run('Duracoat', 'Superwash Deep Base', 4, 14, 8, 1800);
    insertBase.run('Sadolin', 'Classic Matt Base', 4, 16, 8, 1750);

    const insertPigment = db.prepare(`
      INSERT OR IGNORE INTO stock_pigments (pigment_code, pigment_name, quantity_ml, low_stock_threshold_ml, unit_cost_per_ml_kes)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertPigment.run('BK', 'Black Oxide', 5000, 500, 4.5);
    insertPigment.run('YO', 'Yellow Oxide', 5000, 500, 4.0);
    insertPigment.run('RE', 'Red Oxide', 5000, 500, 4.2);
    insertPigment.run('RO', 'Raw Oxide', 5000, 500, 4.1);
    insertPigment.run('BL', 'Blue Tint', 3000, 300, 5.0);
    insertPigment.run('GR', 'Green Tint', 3000, 300, 5.0);

    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products (product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertProduct.run('Crown Silk 20L', 'CRN-SILK-20', 14500, 11000, 8, 3);
    insertProduct.run('Paint Brush 3-inch', 'BRUSH-3IN', 250, 120, 50, 10);
    insertProduct.run('Masking Tape 48mm', 'TAPE-48MM', 180, 90, 40, 10);
    insertProduct.run('Sandpaper Pack (10)', 'SAND-10PK', 300, 150, 30, 10);
    insertProduct.run('Paint Roller 9-inch Pro', 'ROL-9IN', 450, 220, 25, 5);
    insertProduct.run('Paint Thinner 5L Pure', 'THIN-5L', 1200, 750, 18, 4);
    insertProduct.run('Roller Tray Heavy Duty', 'TRAY-HD', 220, 110, 30, 8);
    insertProduct.run('Steel Wire Brush w/ Scraper', 'W-BRUSH', 180, 85, 15, 4);
    insertProduct.run('Putty Knife 4-inch Flexible', 'PUTTY-4', 150, 70, 20, 5);
    insertProduct.run('Zinc Metal Sanding Sheets (P80)', 'ZINC-P80', 80, 35, 60, 15);

    // Sample fundi credit account
    const creditCount = db.prepare('SELECT COUNT(*) AS count FROM credit_accounts').get().count;
    if (creditCount === 0) {
      db.prepare(`
        INSERT OR IGNORE INTO credit_accounts (fundi_name, phone_number, credit_limit_kes, current_balance_kes, approved_by)
        VALUES ('John the Painter', '254722222222', 20000, 4500, 1)
      `).run();
    }

    // Full Official Kenyan Digital Fandecks Seed (2,263+ Verified Manufacturer Shades)
    const colorCount = db.prepare('SELECT COUNT(*) AS count FROM manufacturer_colors').get().count;
    if (colorCount < 100) {
      try {
        const { generate1000Colors } = require('./seed/kenyan_master_fandecks');
        const colors = generate1000Colors();
        const upsertColor = db.prepare(`
          INSERT INTO manufacturer_colors (manufacturer, color_code, color_name, required_base, pigment_formula, hex_code)
          VALUES (@manufacturer, @color_code, @color_name, @required_base, @pigment_formula, @hex_code)
          ON CONFLICT(color_code) DO NOTHING
        `);
        const runColorTx = db.transaction((list) => {
          list.forEach(c => upsertColor.run(c));
        });
        runColorTx(colors);
        console.log(`Successfully auto-seeded ${colors.length} official Kenyan manufacturer shades!`);
      } catch (err) {
        console.error('Error seeding Kenyan master fandecks:', err.message);
      }
    }
  }

  // 3. CASHFLOW ACCOUNTS SEED
  const accountCount = db.prepare('SELECT COUNT(*) AS count FROM cashflow_accounts').get().count;
  if (accountCount === 0) {
    const insertAccount = db.prepare(`
      INSERT OR IGNORE INTO cashflow_accounts (account_type, account_name, account_number, balance_kes)
      VALUES (?, ?, ?, ?)
    `);
    insertAccount.run('Cash Drawer', 'Main Counter Cash Till', 'TILL-01', 45000);
    insertAccount.run('M-Pesa Till', 'Safaricom M-Pesa Buy Goods', '849201', 128450);
    insertAccount.run('Bank Account', 'Equity Bank Business Operational', '011029384756', 340000);
  }

  // 4. OPERATIONAL EXPENSES SEED
  const expenseCount = db.prepare('SELECT COUNT(*) AS count FROM expenses').get().count;
  if (expenseCount === 0) {
    const insertExpense = db.prepare(`
      INSERT OR IGNORE INTO expenses (category, amount_kes, recipient, payment_method, account_id, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertExpense.run('Shop Rent', 35000, 'CBD Hardware Plaza Properties', 'Bank Transfer', 3, 'Monthly store premise lease settlement');
    insertExpense.run('Machine Calibration', 4500, 'FastTint Tech Services Ltd', 'M-Pesa', 2, 'Bi-monthly tinting nozzle precision servicing');
    insertExpense.run('Transport & Fuel', 6200, 'TotalEnergies Nairobi', 'Cash', 1, 'Delivery canter diesel fuel for site dispatches');
    insertExpense.run('Utilities', 3800, 'Kenya Power & Lighting', 'M-Pesa', 2, 'Commercial 3-phase electricity token refill');
  }

  // 5. SUPPLIERS SEED
  // Safely ensure column exists if DB was already created
  try {
    const columns = db.prepare('PRAGMA table_info(suppliers)').all();
    const hasBalance = columns.some(c => c.name === 'current_balance_kes');
    if (!hasBalance) {
      db.exec('ALTER TABLE suppliers ADD COLUMN current_balance_kes REAL NOT NULL DEFAULT 0;');
    }
  } catch (err) {
    console.log('Supplier column check:', err.message);
  }

  const supplierCount = db.prepare('SELECT COUNT(*) AS count FROM suppliers').get().count;
  if (supplierCount === 0) {
    const insertSupplier = db.prepare(`
      INSERT OR IGNORE INTO suppliers (name, contact_person, phone, email, location, lead_time_days, current_balance_kes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertSupplier.run('Crown Paints Kenya PLC', 'James Mwenda (Accounts)', '0720100200', 'orders@crownpaints.co.ke', 'Likoni Rd, Industrial Area, Nairobi', 2, 85000);
    insertSupplier.run('Basco Paints (Duracoat) Ltd', 'Alice Nderitu', '0733500600', 'sales@duracoat.co.ke', 'Airport North Rd, Embakasi', 3, 42000);
    insertSupplier.run('Kansai Plascon Kenya', 'David Kimani', '0711900800', 'supply@plascon.co.ke', 'Jomvu / Nairobi Logistics Depot', 2, 28500);
    insertSupplier.run('Harris Brushes & Hardware Wholesalers', 'Samson Githinji', '0722334455', 'sales@harrisbrushes.co.ke', 'Kirinyaga Road, Nairobi', 1, 19400);
  } else {
    // Ensure suppliers have realistic balances for demonstration if balance is 0
    db.prepare("UPDATE suppliers SET current_balance_kes = 85000 WHERE name LIKE '%Crown%' AND current_balance_kes = 0").run();
    db.prepare("UPDATE suppliers SET current_balance_kes = 42000 WHERE name LIKE '%Basco%' AND current_balance_kes = 0").run();
    db.prepare("UPDATE suppliers SET current_balance_kes = 28500 WHERE name LIKE '%Plascon%' AND current_balance_kes = 0").run();
  }

  // Seed sample supplier transactions
  const supTxCount = db.prepare('SELECT COUNT(*) AS count FROM supplier_transactions').get().count;
  if (supTxCount === 0) {
    const insertSupTx = db.prepare(`
      INSERT INTO supplier_transactions (supplier_id, amount_kes, tx_type, account_id, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertSupTx.run(1, 120000, 'Purchase', null, 'Bulk tint bases delivery (Invoice #CP-9821)');
    insertSupTx.run(1, 35000, 'Payment', 3, 'Bank Transfer settlement payment');
    insertSupTx.run(2, 60000, 'Purchase', null, 'Duracoat primers & accessories delivery');
    insertSupTx.run(2, 18000, 'Payment', 2, 'M-Pesa payment towards balance');
  }

  // 6. PURCHASE ORDERS SEED
  const poCount = db.prepare('SELECT COUNT(*) AS count FROM purchase_orders').get().count;
  if (poCount === 0) {
    const poItems = JSON.stringify([
      { item: 'Vinyl Matt Pastel Base 4L', qty: 20, unit_cost: 1800, total: 36000 },
      { item: 'Vinyl Matt Deep Base 4L', qty: 10, unit_cost: 1900, total: 19000 }
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO purchase_orders (po_number, supplier_id, total_amount_kes, status, items_json, notes, created_by)
      VALUES ('PO-2026-081', 1, 55000, 'In-Transit', ?, 'Dispatched from Likoni Plant. ETA tomorrow morning.', 1)
    `).run(poItems);
  }

  // 7. PRO-FORMA QUOTATIONS SEED
  const quoteCount = db.prepare('SELECT COUNT(*) AS count FROM quotations').get().count;
  if (quoteCount === 0) {
    const quoteItems = JSON.stringify([
      { description: 'Mixed Paint: Verona Gold (Crown Vinyl Matt, 20L Drum)', quantity: 2, unit_price_kes: 14500 },
      { description: 'Paint Roller 9-inch Pro', quantity: 6, unit_price_kes: 450 },
      { description: 'Masking Tape 48mm', quantity: 10, unit_price_kes: 180 },
      { description: 'Paint Thinner 5L Pure', quantity: 2, unit_price_kes: 1200 }
    ]);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO quotations (quote_number, customer_name, customer_phone, site_location, total_amount_kes, validity_days, expires_at, status, items_json, notes, created_by)
      VALUES ('PRQ-2026-0089', 'Eng. Otieno', '254712999888', 'Westlands Residential Villa Phase 2', 35900, 14, ?, 'Active', ?, '14-day price lock guaranteed for contractor mobilization.', 1)
    `).run(expiresAt, quoteItems);
  }

  console.log('Database initialized with complete inventory, financial treasury, suppliers, quotations, and expenses.');
}

seedIfEmpty();

module.exports = { db, hashPassword, seedIfEmpty };



