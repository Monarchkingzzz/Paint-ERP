require('dotenv').config();
const { db } = require('../paint-erp/backend/db');
const { syncAllToSupabase } = require('../paint-erp/backend/supabaseSync');

const baseRows = [
  // Basco Duracoat
  ['Basco Duracoat', 'Superwash Pastel Base', 1, 35, 10, 520],
  ['Basco Duracoat', 'Superwash Pastel Base', 4, 30, 10, 1700],
  ['Basco Duracoat', 'Superwash Pastel Base', 20, 15, 5, 7600],
  ['Basco Duracoat', 'Superwash Deep Base', 1, 25, 8, 550],
  ['Basco Duracoat', 'Superwash Deep Base', 4, 25, 8, 1800],
  ['Basco Duracoat', 'Superwash Deep Base', 20, 12, 5, 8100],
  ['Basco Duracoat', 'Superwash Clear Base', 4, 20, 5, 1850],
  
  // Crown Paints
  ['Crown Paints', 'Vinyl Matt Pastel Base', 1, 40, 10, 550],
  ['Crown Paints', 'Vinyl Matt Pastel Base', 4, 35, 10, 1800],
  ['Crown Paints', 'Vinyl Matt Pastel Base', 20, 18, 5, 8000],
  ['Crown Paints', 'Vinyl Matt Deep Base', 1, 30, 8, 580],
  ['Crown Paints', 'Vinyl Matt Deep Base', 4, 30, 8, 1900],
  ['Crown Paints', 'Vinyl Matt Deep Base', 20, 15, 5, 8500],
  
  // Plascon
  ['Plascon', 'Wall & All Pastel Base', 1, 35, 10, 530],
  ['Plascon', 'Wall & All Pastel Base', 4, 30, 10, 1750],
  ['Plascon', 'Wall & All Pastel Base', 20, 16, 5, 7800],
  ['Plascon', 'Wall & All Deep Base', 1, 25, 8, 560],
  ['Plascon', 'Wall & All Deep Base', 4, 25, 8, 1850],
  ['Plascon', 'Wall & All Deep Base', 20, 12, 5, 8300],

  // Sadolin
  ['Sadolin', 'Classic Matt Pastel Base', 1, 25, 8, 530],
  ['Sadolin', 'Classic Matt Pastel Base', 4, 25, 8, 1750],
  ['Sadolin', 'Classic Matt Pastel Base', 20, 10, 5, 7800]
];

const insertStmt = db.prepare(`
  INSERT INTO stock_base_tins (manufacturer, base_name, tin_size_litres, quantity_in_stock, low_stock_threshold, unit_cost_kes)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const [mfr, baseName, size, qty, low, cost] of baseRows) {
  const existing = db.prepare('SELECT base_id, quantity_in_stock FROM stock_base_tins WHERE manufacturer = ? AND base_name = ? AND tin_size_litres = ?').get(mfr, baseName, size);
  if (existing) {
    if (existing.quantity_in_stock < 10) {
      db.prepare('UPDATE stock_base_tins SET quantity_in_stock = ? WHERE base_id = ?').run(qty, existing.base_id);
    }
  } else {
    insertStmt.run(mfr, baseName, size, qty, low, cost);
  }
}

console.log('Total base tins in database:', db.prepare('SELECT COUNT(*) AS count FROM stock_base_tins').get().count);

syncAllToSupabase().then(r => {
  console.log('Supabase sync complete:', r.results ? r.results.stock_base_tins : r);
  process.exit(0);
});
