const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../audit');
const { getSupabaseClient, syncToSupabase, updateSupabase } = require('../supabaseSync');

function generatePin() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return 'PIN-' + year + '-' + random;
}

// Parse " BK:0.25,YO:1.20,RE:0.05\ or {\BK\:0.25} into [{code:'BK', ml:0.25}, ...]
function parsePigmentFormula(formula) {
 if (typeof formula === 'object' && formula !== null) {
 return Object.entries(formula).map(([code, ml]) => ({ code: code.trim(), ml: parseFloat(ml) || 0 }));
 }
 if (typeof formula === 'string' && formula.trim().startsWith('{')) {
 try {
 const obj = JSON.parse(formula);
 return Object.entries(obj).map(([code, ml]) => ({ code: code.trim(), ml: parseFloat(ml) || 0 }));
 } catch (e) {}
 }
 return String(formula || '').split(',').map((part) => {
 const [code, ml] = part.split(':');
 return { code: (code || '').trim(), ml: parseFloat(ml) || 0 };
 }).filter((p) => p.code && p.ml > 0);
}

// POST /api/paintpin/mix - Dispense standard/single color mix & issue Paint PIN
router.post('/mix', requireAuth, async (req, res) => {
 const { color_id, color_name, manufacturer, pigment_formula, hex_code, customer_phone, painter_phone, tin_size_litres, quantity_mixed, base_id } = req.body;

 if ((!color_id && !color_name) || !customer_phone || !tin_size_litres) {
 return res.status(400).json({ error: 'Color identifier, customer_phone, and tin_size_litres are required.' });
 }

 const qty = Number(quantity_mixed) || 1;
 const tinSize = Number(tin_size_litres);
 const client = getSupabaseClient();

 try {
 // 1. Resolve Color Record
 let color = null;
 if (client && color_id) {
 const { data: cData } = await client.from('manufacturer_colors').select('*').eq('color_id', color_id).single();
 if (cData) color = cData;
 }
 if (!color && color_id) {
 try {
 color = db.prepare('SELECT * FROM manufacturer_colors WHERE color_id = ?').get(color_id);
 } catch (e) {}
 }
 if (!color && (color_name || color_id)) {
 if (client) {
 const { data: cSearch } = await client.from('manufacturer_colors').select('*').ilike('color_name', color_name || '').limit(1);
 if (cSearch && cSearch.length) color = cSearch[0];
 }
 }
 // Fallback if bespoke/custom color
 if (!color) {
 color = {
 color_id: color_id || 1,
 color_name: color_name || 'Custom Mix',
 manufacturer: manufacturer || 'Crown',
 color_code: 'BESPOKE-' + Date.now().toString().slice(-4),
 required_base: 'Deep',
 pigment_formula: pigment_formula || 'YO:1.20,BK:0.25',
 hex_code: hex_code || '#D97706'
 };
 }

 // 2. Resolve Base Tin Record
 let base = null;
 let allBases = [];
 if (client) {
 const { data: bList } = await client.from('stock_base_tins').select('*');
 if (bList && bList.length) allBases = bList;
 }
 if (!allBases.length) {
 try {
 allBases = db.prepare('SELECT * FROM stock_base_tins').all();
 } catch (e) {}
 }

 if (base_id) {
 base = allBases.find(b => Number(b.base_id) === Number(base_id));
 }
 if (!base) {
 const mfrLower = (color.manufacturer || '').toLowerCase();
 const reqBaseLower = (color.required_base || 'Pastel').toLowerCase();
 base = allBases.find(b => 
 (b.manufacturer.toLowerCase().includes(mfrLower) || mfrLower.includes(b.manufacturer.toLowerCase())) &&
 (b.base_name.toLowerCase().includes(reqBaseLower) || reqBaseLower.includes(b.base_name.toLowerCase())) &&
 Number(b.tin_size_litres) === tinSize &&
 Number(b.quantity_in_stock) >= qty
 );
 }
 if (!base) {
 base = allBases.find(b => Number(b.tin_size_litres) === tinSize && Number(b.quantity_in_stock) >= qty);
 }
 if (!base && allBases.length > 0) {
 base = allBases[0];
 }

 if (!base) {
 base = {
 base_id: 1,
 base_name: 'Standard Paint Base',
 manufacturer: color.manufacturer || 'Crown',
 tin_size_litres: tinSize,
 unit_cost_kes: 1800,
 quantity_in_stock: 50
 };
 }

 // 3. Resolve Pigments & Deductions
 const pigments = parsePigmentFormula(color.pigment_formula || 'YO:1.20,BK:0.25');
 let totalPigmentCost = 0;

 let allPigments = [];
 if (client) {
 const { data: pigData } = await client.from('stock_pigments').select('*');
 if (pigData && pigData.length) allPigments = pigData;
 }
 if (!allPigments.length) {
 try {
 allPigments = db.prepare('SELECT * FROM stock_pigments').all();
 } catch (e) {}
 }

 for (const p of pigments) {
 const pigRow = allPigments.find(pig => pig.pigment_code === p.code);
 const costPerMl = Number(pigRow ? pigRow.unit_cost_per_ml_kes : 4.5);
 totalPigmentCost += costPerMl * (p.ml * qty);

 // Deduct pigment stock in Supabase
 if (pigRow) {
 const newMl = Math.max(0, (Number(pigRow.quantity_ml) || 5000) - (p.ml * qty));
 await updateSupabase('stock_pigments', { pigment_id: pigRow.pigment_id }, { quantity_ml: newMl });
 }
 }

 // Deduct base tin stock in Supabase
 const currentBaseStock = Number(base.quantity_in_stock) || 20;
 const newBaseStock = Math.max(0, currentBaseStock - qty);
 await updateSupabase('stock_base_tins', { base_id: base.base_id }, { quantity_in_stock: newBaseStock });

 // Local SQLite mirror deduction
 try {
 db.prepare('UPDATE stock_base_tins SET quantity_in_stock = MAX(0, quantity_in_stock - ?) WHERE base_id = ?').run(qty, base.base_id);
 for (const p of pigments) {
 db.prepare('UPDATE stock_pigments SET quantity_ml = MAX(0, quantity_ml - ?) WHERE pigment_code = ?').run(p.ml * qty, p.code);
 }
 } catch (e) {}

 const baseCost = Number(base.unit_cost_kes || 1800) * qty;
 const totalCost = baseCost + totalPigmentCost;
 const unitCost = totalCost / qty;
 const pin = generatePin();

 const pinPayload = {
 paint_pin: pin,
 color_id: Number(color.color_id || 1),
 customer_phone: String(customer_phone).trim(),
 painter_phone: painter_phone ? String(painter_phone).trim() : null,
 tin_size_litres: tinSize,
 quantity_mixed: qty,
 created_by: req.user ? req.user.user_id : 1
 };

 try {
    db.prepare(`
      INSERT INTO paint_pin_ledger (paint_pin, color_id, customer_phone, painter_phone, tin_size_litres, quantity_mixed, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pinPayload.paint_pin, pinPayload.color_id, pinPayload.customer_phone, pinPayload.painter_phone, pinPayload.tin_size_litres, pinPayload.quantity_mixed, pinPayload.created_by);
 } catch (e) {}

 await syncToSupabase('paint_pin_ledger', pinPayload);

 await logAction({
 userId: req.user ? req.user.user_id : 1,
 deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
 action: 'PAINT_MIXED',
 details: pin + ' - ' + color.color_name + ' (' + color.manufacturer + ') x' + qty + ' (Cost: KES ' + Math.round(totalCost) + ')',
 status: 'ALLOWED'
 });

 res.json({
 ok: true,
 paint_pin: pin,
 color,
 base,
 tin_size_litres: tinSize,
 quantity_mixed: qty,
 unit_cost_kes: Math.round(unitCost * 100) / 100,
 total_cost_kes: Math.round(totalCost * 100) / 100
 });
 } catch (err) {
 console.error('Error in /api/paintpin/mix:', err);
 res.status(500).json({ error: err.message });
 }
});

// GET /api/paintpin/lookup?q=... or ?pin=... or ?phone=...
router.get('/lookup', requireAuth, async (req, res) => {
 try {
 const { pin, phone, q } = req.query;
 const searchTerm = (q || pin || phone || '').trim().toLowerCase();
 if (!searchTerm) {
 return res.status(400).json({ error: 'Search term (?q=, ?pin=, or ?phone=) is required.' });
 }

 const client = getSupabaseClient();
 if (client) {
 try {
 const { data, error } = await client
 .from('paint_pin_ledger')
 .select('*, manufacturer_colors(*)')
 .order('created_at', { ascending: false })
 .limit(60);

 if (!error && data && data.length) {
 const matched = data.filter(item => {
 const pPin = (item.paint_pin || '').toLowerCase();
 const pCust = (item.customer_phone || '').toLowerCase();
 const pPainter = (item.painter_phone || '').toLowerCase();
 const cName = (item.manufacturer_colors && item.manufacturer_colors.color_name || '').toLowerCase();
 const cCode = (item.manufacturer_colors && item.manufacturer_colors.color_code || '').toLowerCase();
 const mfr = (item.manufacturer_colors && item.manufacturer_colors.manufacturer || '').toLowerCase();

 return pPin.includes(searchTerm) || pCust.includes(searchTerm) || pPainter.includes(searchTerm) || cName.includes(searchTerm) || cCode.includes(searchTerm) || mfr.includes(searchTerm);
 }).map(item => ({
 paint_pin: item.paint_pin,
 color_id: item.color_id,
 customer_phone: item.customer_phone,
 painter_phone: item.painter_phone,
 tin_size_litres: item.tin_size_litres,
 quantity_mixed: item.quantity_mixed,
 created_at: item.created_at,
 color_name: item.manufacturer_colors ? item.manufacturer_colors.color_name : 'Custom Shade',
 manufacturer: item.manufacturer_colors ? item.manufacturer_colors.manufacturer : 'Crown',
 color_code: item.manufacturer_colors ? item.manufacturer_colors.color_code : 'CRN',
 hex_code: item.manufacturer_colors ? item.manufacturer_colors.hex_code : '#cbd5e1',
 pigment_formula: item.manufacturer_colors ? item.manufacturer_colors.pigment_formula : 'YO:1.20,BK:0.25',
 required_base: item.manufacturer_colors ? item.manufacturer_colors.required_base : 'Pastel',
 mixed_by_name: item.created_by === 1 ? 'Store Owner' : 'Shop Staff'
 }));

 return res.json(matched);
 }
 } catch (e) {}
 }

 const cleanTerm = searchTerm.replace(/^#/, '');
 const likeTerm = '%' + cleanTerm + '%';
 const rows = db.prepare(`
 SELECT ppl.*, 
 mc.manufacturer, mc.color_name, mc.color_code, mc.hex_code, mc.pigment_formula, mc.required_base,
 u.full_name AS mixed_by_name
 FROM paint_pin_ledger ppl
 JOIN manufacturer_colors mc ON mc.color_id = ppl.color_id
 LEFT JOIN store_users u ON u.user_id = ppl.created_by
 WHERE ppl.paint_pin = ? 
 OR ppl.paint_pin LIKE ?
 OR ppl.customer_phone = ? 
 OR ppl.customer_phone LIKE ?
 OR ppl.painter_phone = ? 
 OR ppl.painter_phone LIKE ?
 OR mc.color_name LIKE ?
 OR mc.color_code LIKE ?
 ORDER BY ppl.created_at DESC
 LIMIT 50
 `).all(cleanTerm, likeTerm, cleanTerm, likeTerm, cleanTerm, likeTerm, likeTerm, likeTerm);

 res.json(rows);
 } catch (err) {
 res.status(500).json({ error: err.message });
 }
});

// GET /api/paintpin/recent - Get latest 40 mixed PINs from Supabase Cloud
router.get('/recent', requireAuth, async (req, res) => {
 try {
 const client = getSupabaseClient();
 if (client) {
 try {
 const { data, error } = await client
 .from('paint_pin_ledger')
 .select('*, manufacturer_colors(*)')
 .order('created_at', { ascending: false })
 .limit(40);

 if (!error && data && data.length) {
 const list = data.map(item => ({
 paint_pin: item.paint_pin,
 color_id: item.color_id,
 customer_phone: item.customer_phone,
 painter_phone: item.painter_phone,
 tin_size_litres: item.tin_size_litres,
 quantity_mixed: item.quantity_mixed,
 created_at: item.created_at,
 color_name: item.manufacturer_colors ? item.manufacturer_colors.color_name : 'Custom Shade',
 manufacturer: item.manufacturer_colors ? item.manufacturer_colors.manufacturer : 'Crown',
 color_code: item.manufacturer_colors ? item.manufacturer_colors.color_code : 'CRN',
 hex_code: item.manufacturer_colors ? item.manufacturer_colors.hex_code : '#cbd5e1',
 pigment_formula: item.manufacturer_colors ? item.manufacturer_colors.pigment_formula : 'YO:1.20,BK:0.25',
 required_base: item.manufacturer_colors ? item.manufacturer_colors.required_base : 'Pastel',
 mixed_by_name: item.created_by === 1 ? 'Store Owner' : 'Shop Staff'
 }));

 return res.json(list);
 }
 } catch (e) {}
 }

 const rows = db.prepare(`
 SELECT ppl.*, 
 mc.manufacturer, mc.color_name, mc.color_code, mc.hex_code, mc.pigment_formula, mc.required_base,
 u.full_name AS mixed_by_name
 FROM paint_pin_ledger ppl
 JOIN manufacturer_colors mc ON mc.color_id = ppl.color_id
 LEFT JOIN store_users u ON u.user_id = ppl.created_by
 ORDER BY ppl.created_at DESC
 LIMIT 30
 `).all();

 res.json(rows);
 } catch (err) {
 res.status(500).json({ error: err.message });
 }
});

module.exports = router;
