const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = 'paint-erp-static-salt';
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const { generate1000Colors } = require('../paint-erp/backend/seed/kenyan_master_fandecks');

console.log('Generating official Kenyan Master Fandecks & Accessories catalog...');
const colors = generate1000Colors();
console.log(`Generated ${colors.length} authentic paint shades.`);

let sql = `-- =====================================================================
-- KENYAN PAINT & HARDWARE ENTERPRISE ERP - SUPABASE SEED DATA
-- Auto-generated: ${new Date().toISOString()}
-- Total Shades: ${colors.length}
-- =====================================================================

-- 1. STORE USERS (Owner: 254700000000 / owner123, Staff: 254711111111 / staff123)
INSERT INTO store_users (user_id, full_name, phone_number, system_role, password_hash, is_active)
VALUES 
  (1, 'Store Owner', '254700000000', 'Owner', '${hashPassword('owner123')}', TRUE),
  (2, 'Attendant Mwangi', '254711111111', 'Staff', '${hashPassword('staff123')}', TRUE)
ON CONFLICT (phone_number) DO NOTHING;

SELECT setval(pg_get_serial_sequence('store_users', 'user_id'), coalesce(max(user_id), 1) + 1, false) FROM store_users;

-- 2. STOCK BASE TINS
INSERT INTO stock_base_tins (manufacturer, base_name, tin_size_litres, quantity_in_stock, low_stock_threshold, unit_cost_kes)
VALUES
  ('Crown', 'Vinyl Matt Pastel Base', 4, 25, 10, 1800),
  ('Crown', 'Vinyl Matt Deep Base', 4, 15, 8, 1900),
  ('Crown', 'Covermatt Plus Base', 4, 20, 8, 1400),
  ('Crown', 'Ruff Top Textured Base', 20, 10, 4, 7500),
  ('Plascon', 'Wall & All Pastel Base', 4, 20, 10, 1750),
  ('Plascon', 'Wall & All Deep Base', 4, 12, 8, 1850),
  ('Plascon', 'Cashmere Velvet Matt Base', 4, 15, 8, 1950),
  ('Plascon', 'Micatex Textured Exterior Base', 20, 8, 3, 7800),
  ('Duracoat', 'Superwash Pastel Base', 4, 18, 10, 1700),
  ('Duracoat', 'Superwash Deep Base', 4, 14, 8, 1800),
  ('Duracoat', 'Vinyl Matt Base', 4, 22, 10, 1650),
  ('Duracoat', 'Classic Flat Emulsion Base', 20, 12, 5, 6900),
  ('Sadolin', 'Classic Matt Base', 4, 16, 8, 1750),
  ('Sadolin', 'Supercote Silk Base', 4, 14, 8, 1850)
ON CONFLICT (manufacturer, base_name, tin_size_litres) DO NOTHING;

-- 3. STOCK PIGMENTS
INSERT INTO stock_pigments (pigment_code, pigment_name, quantity_ml, low_stock_threshold_ml, unit_cost_per_ml_kes)
VALUES
  ('BK', 'Black Oxide', 5000, 500, 4.50),
  ('YO', 'Yellow Oxide', 5000, 500, 4.00),
  ('RE', 'Red Oxide', 5000, 500, 4.20),
  ('RO', 'Raw Oxide', 5000, 500, 4.10),
  ('BL', 'Blue Tint Concentrate', 3000, 300, 5.00),
  ('GR', 'Green Tint Concentrate', 3000, 300, 5.00)
ON CONFLICT (pigment_code) DO UPDATE SET
  quantity_ml = EXCLUDED.quantity_ml,
  unit_cost_per_ml_kes = EXCLUDED.unit_cost_per_ml_kes;

-- 4. HARDWARE ACCESSORIES & PRODUCTS
INSERT INTO products (product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold)
VALUES
  ('Crown Silk 20L Brilliant White', 'CRN-SILK-20L', 14500, 11000, 8, 3),
  ('Crown Covermatt 20L White', 'CRN-COV-20L', 8900, 6800, 12, 4),
  ('Plascon Super Gloss 4L White', 'PLS-GLOSS-4L', 2600, 1950, 15, 5),
  ('Duracoat Universal Undercoat 4L', 'DUR-UND-4L', 2100, 1550, 18, 5),
  ('Paint Brush 3-inch Harris Classic', 'BRUSH-3IN', 250, 120, 50, 10),
  ('Paint Brush 4-inch Harris Classic', 'BRUSH-4IN', 380, 190, 40, 10),
  ('Paint Brush 2-inch Trim Master', 'BRUSH-2IN', 160, 75, 45, 10),
  ('Masking Tape 48mm High Tack', 'TAPE-48MM', 180, 90, 40, 10),
  ('Masking Tape 24mm Standard', 'TAPE-24MM', 110, 55, 60, 15),
  ('Sandpaper Pack 10-Sheet (P80/P120)', 'SAND-10PK', 300, 150, 30, 10),
  ('Paint Roller 9-inch Pro Microfibre', 'ROL-9IN', 450, 220, 25, 5),
  ('Roller Refill 9-inch Pro (2-Pack)', 'ROL-REF-2PK', 320, 150, 35, 8),
  ('Paint Thinner 5L Pure Standard', 'THIN-5L', 1200, 750, 18, 4),
  ('Paint Thinner 1L Metal Can', 'THIN-1L', 300, 180, 30, 8),
  ('Roller Tray Heavy Duty Plastic', 'TRAY-HD', 220, 110, 30, 8),
  ('Steel Wire Brush with Scraper', 'W-BRUSH', 180, 85, 15, 4),
  ('Putty Knife 4-inch Flexible Blade', 'PUTTY-4', 150, 70, 20, 5),
  ('Zinc Metal Sanding Sheets (P80)', 'ZINC-P80', 80, 35, 60, 15),
  ('Gypsum Joint Filler Powder 25Kg', 'GYP-FILL-25', 1650, 1250, 20, 5),
  ('Wall Putty Acrylic Ready Mix 20Kg', 'WALL-PUT-20', 2400, 1750, 14, 4)
ON CONFLICT (sku) DO NOTHING;

-- 5. CASHFLOW & TREASURY ACCOUNTS
INSERT INTO cashflow_accounts (account_id, account_type, account_name, account_number, balance_kes)
VALUES
  (1, 'Cash Drawer', 'Main Counter Cash Till', 'TILL-01', 45000),
  (2, 'M-Pesa Till', 'Safaricom M-Pesa Buy Goods Till', '849201', 128450),
  (3, 'Bank Account', 'Equity Bank Business Operational', '011029384756', 340000)
ON CONFLICT (account_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('cashflow_accounts', 'account_id'), coalesce(max(account_id), 1) + 1, false) FROM cashflow_accounts;

-- 6. FUNDI / CONTRACTOR CREDIT ACCOUNTS
INSERT INTO credit_accounts (account_id, fundi_name, phone_number, credit_limit_kes, current_balance_kes, approved_by)
VALUES
  (1, 'John the Painter (Contractor)', '254722222222', 50000, 4500, 1),
  (2, 'Fundi Waweru Decorators', '254733333333', 35000, 0, 1),
  (3, 'Otieno Finishing Works', '254744444444', 40000, 12800, 1)
ON CONFLICT (phone_number) DO NOTHING;

SELECT setval(pg_get_serial_sequence('credit_accounts', 'account_id'), coalesce(max(account_id), 1) + 1, false) FROM credit_accounts;

-- 7. SUPPLIERS & PROCUREMENT
INSERT INTO suppliers (supplier_id, name, contact_person, phone, email, location, lead_time_days, current_balance_kes)
VALUES
  (1, 'Crown Paints Kenya PLC', 'James Mwenda (Accounts)', '0720100200', 'orders@crownpaints.co.ke', 'Likoni Rd, Industrial Area, Nairobi', 2, 85000),
  (2, 'Basco Paints (Duracoat) Ltd', 'Alice Nderitu', '0733500600', 'sales@duracoat.co.ke', 'Airport North Rd, Embakasi', 3, 42000),
  (3, 'Kansai Plascon Kenya', 'David Kimani', '0711900800', 'supply@plascon.co.ke', 'Jomvu / Nairobi Logistics Depot', 2, 28500),
  (4, 'Harris Brushes & Hardware Wholesalers', 'Samson Githinji', '0722334455', 'sales@harrisbrushes.co.ke', 'Kirinyaga Road, Nairobi', 1, 19400)
ON CONFLICT (supplier_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('suppliers', 'supplier_id'), coalesce(max(supplier_id), 1) + 1, false) FROM suppliers;

-- 8. OPERATIONAL EXPENSES
INSERT INTO expenses (category, amount_kes, recipient, payment_method, account_id, notes, recorded_by)
VALUES
  ('Shop Rent', 35000, 'CBD Hardware Plaza Properties', 'Bank Transfer', 3, 'Monthly store premise lease settlement', 1),
  ('Machine Calibration', 4500, 'FastTint Tech Services Ltd', 'M-Pesa', 2, 'Bi-monthly tinting nozzle precision servicing', 1),
  ('Transport & Fuel', 6200, 'TotalEnergies Nairobi', 'Cash', 1, 'Delivery canter diesel fuel for site dispatches', 1),
  ('Utilities', 3800, 'Kenya Power & Lighting', 'M-Pesa', 2, 'Commercial 3-phase electricity token refill', 1);

-- 9. SUPPLIER TRANSACTIONS
INSERT INTO supplier_transactions (supplier_id, amount_kes, tx_type, account_id, notes, recorded_by)
VALUES
  (1, 120000, 'Purchase', NULL, 'Bulk tint bases delivery (Invoice #CP-9821)', 1),
  (1, 35000, 'Payment', 3, 'Bank Transfer settlement payment', 1),
  (2, 60000, 'Purchase', NULL, 'Duracoat primers & accessories delivery', 1),
  (2, 18000, 'Payment', 2, 'M-Pesa payment towards balance', 1);

-- 10. PURCHASE ORDERS
INSERT INTO purchase_orders (po_number, supplier_id, total_amount_kes, status, items_json, notes, created_by)
VALUES
  ('PO-2026-081', 1, 55000, 'In-Transit', '[{"item":"Vinyl Matt Pastel Base 4L","qty":20,"unit_cost":1800,"total":36000},{"item":"Vinyl Matt Deep Base 4L","qty":10,"unit_cost":1900,"total":19000}]'::jsonb, 'Dispatched from Likoni Plant. ETA tomorrow morning.', 1)
ON CONFLICT (po_number) DO NOTHING;

-- 11. PRO-FORMA QUOTATIONS (14-Day Price Lock)
INSERT INTO quotations (quote_number, customer_name, customer_phone, site_location, total_amount_kes, validity_days, expires_at, status, items_json, notes, created_by)
VALUES
  ('PRQ-2026-0089', 'Eng. Otieno', '254712999888', 'Westlands Residential Villa Phase 2', 35900, 14, NOW() + INTERVAL '14 days', 'Active', '[{"description":"Mixed Paint: Verona Gold (Crown Vinyl Matt, 20L Drum)","quantity":2,"unit_price_kes":14500},{"description":"Paint Roller 9-inch Pro","quantity":6,"unit_price_kes":450},{"description":"Masking Tape 48mm","quantity":10,"unit_price_kes":180},{"description":"Paint Thinner 5L Pure","quantity":2,"unit_price_kes":1200}]'::jsonb, '14-day price lock guaranteed for contractor mobilization.', 1)
ON CONFLICT (quote_number) DO NOTHING;

-- 12. STORE SETTINGS
INSERT INTO store_settings (setting_key, setting_val)
VALUES ('master_security_pin', '7788')
ON CONFLICT (setting_key) DO UPDATE SET setting_val = EXCLUDED.setting_val;

-- 13. MASTER MANUFACTURER COLOR SHADES (${colors.length} SHADES)
`;

// Batch insert colors in chunks of 250 rows for optimal SQL execution
const CHUNK_SIZE = 250;
for (let i = 0; i < colors.length; i += CHUNK_SIZE) {
  const chunk = colors.slice(i, i + CHUNK_SIZE);
  sql += `\nINSERT INTO manufacturer_colors (manufacturer, color_code, color_name, required_base, pigment_formula, hex_code)\nVALUES\n`;
  const rows = chunk.map(c => 
    `  (${escapeSql(c.manufacturer)}, ${escapeSql(c.color_code)}, ${escapeSql(c.color_name)}, ${escapeSql(c.required_base)}, ${escapeSql(c.pigment_formula)}, ${escapeSql(c.hex_code)})`
  );
  sql += rows.join(',\n') + '\nON CONFLICT (color_code) DO NOTHING;\n';
}

sql += `\nSELECT setval(pg_get_serial_sequence('manufacturer_colors', 'color_id'), coalesce(max(color_id), 1) + 1, false) FROM manufacturer_colors;\n`;

const outSeedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
fs.writeFileSync(outSeedPath, sql, 'utf8');
console.log(`Saved seed SQL to: ${outSeedPath}`);

// Also create a combined complete_setup.sql file (Schema + Seed together for 1-click in Supabase SQL Editor)
const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const completeSetup = `${schemaContent}\n\n${sql}`;

const outCompletePath = path.join(__dirname, '..', 'supabase', 'complete_setup.sql');
fs.writeFileSync(outCompletePath, completeSetup, 'utf8');
console.log(`Saved complete 1-click setup SQL to: ${outCompletePath} (${Math.round(completeSetup.length / 1024)} KB)`);
