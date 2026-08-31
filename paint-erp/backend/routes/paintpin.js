const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../audit');

function generatePin() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `PIN-${year}-${random}`;
}

// Parse "BK:0.25,YO:1.20,RE:0.05" or {"BK":0.25} into [{code:'BK', ml:0.25}, ...]
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

// POST /api/paintpin/mix
// body: { color_id, customer_phone, painter_phone, tin_size_litres, quantity_mixed, base_id }
router.post('/mix', requireAuth, (req, res) => {
  const { color_id, customer_phone, painter_phone, tin_size_litres, quantity_mixed, base_id } = req.body;

  if (!color_id || !customer_phone || !tin_size_litres || !base_id) {
    return res.status(400).json({ error: 'color_id, customer_phone, tin_size_litres and base_id are required.' });
  }
  const qty = quantity_mixed || 1;

  const color = db.prepare('SELECT * FROM manufacturer_colors WHERE color_id = ?').get(color_id);
  if (!color) return res.status(404).json({ error: 'Color not found.' });

  const base = db.prepare('SELECT * FROM stock_base_tins WHERE base_id = ?').get(base_id);
  if (!base) return res.status(404).json({ error: 'Base tin not found in stock.' });
  if (base.quantity_in_stock < qty) {
    return res.status(409).json({ error: `Not enough ${base.base_name} in stock (have ${base.quantity_in_stock}, need ${qty}).` });
  }

  const pigments = parsePigmentFormula(color.pigment_formula);

  let totalPigmentCost = 0;
  // Check pigment stock is sufficient before committing anything
  for (const p of pigments) {
    const stockRow = db.prepare('SELECT * FROM stock_pigments WHERE pigment_code = ?').get(p.code);
    if (!stockRow || stockRow.quantity_ml < p.ml * qty) {
      return res.status(409).json({ error: `Not enough pigment ${p.code} in stock for this mix (need ${p.ml * qty}ml).` });
    }
    totalPigmentCost += (stockRow.unit_cost_per_ml_kes || 0) * (p.ml * qty);
  }

  const baseCost = (base.unit_cost_kes || 0) * qty;
  const totalCost = baseCost + totalPigmentCost;
  const unitCost = totalCost / qty;

  const pin = generatePin();

  const mixTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO paint_pin_ledger (paint_pin, color_id, customer_phone, painter_phone, tin_size_litres, quantity_mixed, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pin, color_id, customer_phone, painter_phone || null, tin_size_litres, qty, req.user.user_id);

    db.prepare('UPDATE stock_base_tins SET quantity_in_stock = quantity_in_stock - ? WHERE base_id = ?')
      .run(qty, base_id);

    for (const p of pigments) {
      db.prepare('UPDATE stock_pigments SET quantity_ml = quantity_ml - ? WHERE pigment_code = ?')
        .run(p.ml * qty, p.code);
    }
  });
  mixTransaction();

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.deviceFingerprint,
    action: 'PAINT_MIXED',
    details: `${pin} - ${color.color_name} (${color.manufacturer}) x${qty} (Cost: KES ${Math.round(totalCost)})`,
    status: 'ALLOWED'
  });

  // Check for low stock after the deduction and flag it in the response
  const lowBase = db.prepare('SELECT * FROM stock_base_tins WHERE base_id = ? AND quantity_in_stock <= low_stock_threshold').get(base_id);

  res.json({
    paint_pin: pin,
    color,
    base,
    tin_size_litres,
    quantity_mixed: qty,
    unit_cost_kes: Math.round(unitCost * 100) / 100,
    total_cost_kes: Math.round(totalCost * 100) / 100,
    low_stock_warning: lowBase ? `${lowBase.base_name} is now at or below its low-stock threshold (${lowBase.quantity_in_stock} left).` : null
  });
});

// Helper to blend array of { hex, ratio } into a single hex
function blendHexColors(components) {
  let r = 0, g = 0, b = 0, totalRatio = 0;
  for (const c of components) {
    const hex = (c.hex_code || '#FFFFFF').replace('#', '');
    const cr = parseInt(hex.substring(0, 2), 16) || 255;
    const cg = parseInt(hex.substring(2, 4), 16) || 255;
    const cb = parseInt(hex.substring(4, 6), 16) || 255;
    const ratio = parseFloat(c.ratio) || 0;
    r += cr * ratio;
    g += cg * ratio;
    b += cb * ratio;
    totalRatio += ratio;
  }
  if (totalRatio === 0) totalRatio = 1;
  const finalR = Math.min(255, Math.max(0, Math.round(r / totalRatio)));
  const finalG = Math.min(255, Math.max(0, Math.round(g / totalRatio)));
  const finalB = Math.min(255, Math.max(0, Math.round(b / totalRatio)));
  return '#' + [finalR, finalG, finalB].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// POST /api/paintpin/mix-multi
// body: { blend_name, customer_phone, painter_phone, tin_size_litres, quantity_mixed, base_id, components: [ { color_id, ratio } ] }
router.post('/mix-multi', requireAuth, (req, res) => {
  const { blend_name, customer_phone, painter_phone, tin_size_litres, quantity_mixed, base_id, components } = req.body;

  if (!components || !components.length || !customer_phone || !tin_size_litres || !base_id) {
    return res.status(400).json({ error: 'components (array), customer_phone, tin_size_litres, and base_id are required.' });
  }

  const qty = quantity_mixed || 1;
  const base = db.prepare('SELECT * FROM stock_base_tins WHERE base_id = ?').get(base_id);
  if (!base) return res.status(404).json({ error: 'Base paint not found in stock.' });
  if (base.quantity_in_stock < qty) {
    return res.status(409).json({ error: `Not enough ${base.base_name} in stock (have ${base.quantity_in_stock}, need ${qty}).` });
  }

  // Load each component color and compute weighted pigment demands
  const totalRatio = components.reduce((sum, c) => sum + (parseFloat(c.ratio) || 0), 0);
  if (totalRatio <= 0) return res.status(400).json({ error: 'Total ratio of blended components must be greater than 0.' });

  const resolvedComponents = [];
  const combinedPigmentMap = {}; // { 'BK': totalMl, 'YO': totalMl }

  for (const c of components) {
    let color = db.prepare('SELECT * FROM manufacturer_colors WHERE color_id = ?').get(c.color_id);
    if (!color) {
      const hex = c.hex_code || '#D97706';
      const insertRes = db.prepare(`
        INSERT INTO manufacturer_colors (manufacturer, color_name, color_code, hex_code, pigment_formula, hex_display)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('Custom Bespoke', c.color_name || 'Bespoke Custom Shade', hex, hex, 'YO:18.5,BK:3.2', hex);
      color = db.prepare('SELECT * FROM manufacturer_colors WHERE color_id = ?').get(insertRes.lastInsertRowid);
    }
    const normRatio = (parseFloat(c.ratio) || 0) / totalRatio;
    resolvedComponents.push({ ...color, ratio: normRatio });

    const pigments = parsePigmentFormula(color.pigment_formula || 'YO:18.5,BK:3.2');
    for (const p of pigments) {
      const mlContribution = p.ml * normRatio;
      combinedPigmentMap[p.code] = (combinedPigmentMap[p.code] || 0) + mlContribution;
    }
  }

  // Check pigment stocks
  let totalPigmentCost = 0;
  const finalPigmentList = [];
  for (const [code, mlPerUnit] of Object.entries(combinedPigmentMap)) {
    const roundedMl = Math.round(mlPerUnit * 100) / 100;
    if (roundedMl <= 0) continue;
    const stockRow = db.prepare('SELECT * FROM stock_pigments WHERE pigment_code = ?').get(code);
    if (!stockRow || stockRow.quantity_ml < roundedMl * qty) {
      return res.status(409).json({ error: `Not enough pigment ${code} in stock (need ${(roundedMl * qty).toFixed(2)}ml, have ${stockRow ? stockRow.quantity_ml : 0}ml).` });
    }
    totalPigmentCost += (stockRow.unit_cost_per_ml_kes || 0) * (roundedMl * qty);
    finalPigmentList.push({ code, ml: roundedMl });
  }

  const blendedHex = blendHexColors(resolvedComponents);
  const baseCost = (base.unit_cost_kes || 0) * qty;
  const totalCost = baseCost + totalPigmentCost;
  const unitCost = totalCost / qty;

  const pin = generatePin();
  const formulaStr = finalPigmentList.map(p => `${p.code}:${p.ml.toFixed(2)}`).join(',');
  const blendTitle = blend_name || `Custom Multi-Blend (${resolvedComponents.map(c => c.color_name).join(' + ')})`;

  // Save custom blend in manufacturer_colors if needed, or use primary component's color_id
  const primaryColorId = resolvedComponents[0].color_id;

  const mixTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO paint_pin_ledger (paint_pin, color_id, customer_phone, painter_phone, tin_size_litres, quantity_mixed, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pin, primaryColorId, customer_phone, painter_phone || null, tin_size_litres, qty, req.user.user_id);

    db.prepare('UPDATE stock_base_tins SET quantity_in_stock = quantity_in_stock - ? WHERE base_id = ?')
      .run(qty, base_id);

    for (const p of finalPigmentList) {
      db.prepare('UPDATE stock_pigments SET quantity_ml = quantity_ml - ? WHERE pigment_code = ?')
        .run(p.ml * qty, p.code);
    }
  });
  mixTransaction();

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.deviceFingerprint,
    action: 'MULTI_COLOR_MIXED',
    details: `${pin} - ${blendTitle} x${qty} (Cost: KES ${Math.round(totalCost)})`,
    status: 'ALLOWED'
  });

  res.json({
    paint_pin: pin,
    blend_name: blendTitle,
    hex_code: blendedHex,
    pigment_formula: formulaStr,
    pigments: finalPigmentList,
    components: resolvedComponents.map(c => ({ color_name: c.color_name, manufacturer: c.manufacturer, ratio: Math.round(c.ratio * 100) + '%' })),
    base,
    tin_size_litres,
    quantity_mixed: qty,
    unit_cost_kes: Math.round(unitCost * 100) / 100,
    total_cost_kes: Math.round(totalCost * 100) / 100
  });
});

// GET /api/paintpin/lookup?pin=PIN-2026-10042  OR  ?phone=2547...
router.get('/lookup', requireAuth, (req, res) => {
  const { pin, phone } = req.query;
  let rows;
  if (pin) {
    rows = db.prepare(`
      SELECT ppl.*, mc.manufacturer, mc.color_name, mc.color_code, mc.hex_code, mc.pigment_formula, mc.required_base
      FROM paint_pin_ledger ppl JOIN manufacturer_colors mc ON mc.color_id = ppl.color_id
      WHERE ppl.paint_pin = ?
    `).all(pin);
  } else if (phone) {
    rows = db.prepare(`
      SELECT ppl.*, mc.manufacturer, mc.color_name, mc.color_code, mc.hex_code, mc.pigment_formula, mc.required_base
      FROM paint_pin_ledger ppl JOIN manufacturer_colors mc ON mc.color_id = ppl.color_id
      WHERE ppl.customer_phone = ? OR ppl.painter_phone = ?
      ORDER BY ppl.created_at DESC
    `).all(phone, phone);
  } else {
    return res.status(400).json({ error: 'Provide either ?pin= or ?phone=' });
  }
  res.json(rows);
});

module.exports = router;
