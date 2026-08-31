// Run with: npm run seed
// Populates starter stock (base tins, pigments, hardware products) and
// loads the sample color catalog so you can test the full flow immediately.
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { db } = require('../db');

const insertBase = db.prepare(`
  INSERT OR IGNORE INTO stock_base_tins (manufacturer, base_name, tin_size_litres, quantity_in_stock, low_stock_threshold, unit_cost_kes)
  VALUES (?, ?, ?, ?, ?, ?)
`);
insertBase.run('Crown', 'Vinyl Matt Pastel Base', 4, 25, 10, 1800);
insertBase.run('Crown', 'Vinyl Matt Deep Base', 4, 15, 8, 1900);
insertBase.run('Plascon', 'Wall & All Pastel Base', 4, 20, 10, 1750);
insertBase.run('Plascon', 'Wall & All Deep Base', 4, 12, 8, 1850);
insertBase.run('Duracoat', 'Superwash Pastel Base', 4, 18, 10, 1700);

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

// Load sample color catalog CSV
const csvPath = path.join(__dirname, 'sample_colors.csv');
const records = parse(fs.readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
const upsertColor = db.prepare(`
  INSERT INTO manufacturer_colors (manufacturer, color_code, color_name, required_base, pigment_formula, hex_code)
  VALUES (@manufacturer, @color_code, @color_name, @required_base, @pigment_formula, @hex_code)
  ON CONFLICT(color_code) DO NOTHING
`);
records.forEach((row) => {
  upsertColor.run({
    manufacturer: row.manufacturer,
    color_code: row.color_code,
    color_name: row.color_name,
    required_base: row.paint_base,
    pigment_formula: row.pigment_recipe,
    hex_code: row.hex_display
  });
});

// Sample fundi credit account
db.prepare(`
  INSERT OR IGNORE INTO credit_accounts (fundi_name, phone_number, credit_limit_kes, current_balance_kes, approved_by)
  VALUES ('John the Painter', '254722222222', 20000, 4500, 1)
`).run();

console.log('Seed complete: stock, sample colors and a demo credit account are loaded.');
