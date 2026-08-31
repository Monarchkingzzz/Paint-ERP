const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { db } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logAction } = require('../audit');
const { generate1000Colors } = require('../seed/kenyan_master_fandecks');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/colors/search?q=gold&limit=3000
router.get('/search', requireAuth, (req, res) => {
  const qStr = req.query.q ? req.query.q.trim() : '';
  const limit = Math.min(5000, parseInt(req.query.limit || '3000', 10));
  const q = `%${qStr}%`;

  // Auto-seed if database was newly created and has no colors
  let count = 0;
  try {
    count = db.prepare('SELECT COUNT(*) AS total FROM manufacturer_colors').get().total;
  } catch (e) {}

  if (count < 100) {
    try {
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
    } catch (err) {
      console.error('Error auto-seeding colors on search:', err.message);
    }
  }

  const rows = db.prepare(`
    SELECT color_id, manufacturer, color_code, color_name,
           required_base, required_base AS paint_base,
           pigment_formula, pigment_formula AS pigment_recipe,
           hex_code, hex_code AS hex_display
    FROM manufacturer_colors
    WHERE color_name LIKE ? OR color_code LIKE ? OR manufacturer LIKE ?
    ORDER BY manufacturer, color_name
    LIMIT ?
  `).all(q, q, q, limit);
  res.json(rows);
});

// GET /api/colors/count
router.get('/count', requireAuth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS total FROM manufacturer_colors').get().total;
  res.json({ total: count });
});

// POST /api/colors/bulk-import (JSON body or CSV)
router.post('/bulk-import', requireAuth, (req, res) => {
  const { colors } = req.body;
  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    return res.status(400).json({ error: 'colors array is required in request body.' });
  }

  const upsert = db.prepare(`
    INSERT INTO manufacturer_colors (manufacturer, color_code, color_name, required_base, pigment_formula, hex_code)
    VALUES (@manufacturer, @color_code, @color_name, @required_base, @pigment_formula, @hex_code)
    ON CONFLICT(color_code) DO UPDATE SET
      manufacturer=excluded.manufacturer,
      color_name=excluded.color_name,
      required_base=excluded.required_base,
      pigment_formula=excluded.pigment_formula,
      hex_code=excluded.hex_code
  `);

  let inserted = 0;
  const errors = [];

  const runTx = db.transaction((items) => {
    items.forEach((c, idx) => {
      try {
        const mfg = c.manufacturer || c.Brand || c.Supplier || 'Crown';
        const code = (c.color_code || c.code || c.Code || c.SKU || `C-${Date.now()}-${idx}`).trim();
        const name = (c.color_name || c.name || c.Name || c.Title || 'Custom Shade').trim();
        const base = (c.required_base || c.paint_base || c.Base || c.base || 'Pastel').trim();
        const formula = (c.pigment_formula || c.pigment_recipe || c.formula || c.Formula || 'BK:0.10,YO:0.50').trim();
        const hex = (c.hex_code || c.hex_display || c.hex || c.Hex || '#E2A03F').trim();

        upsert.run({
          manufacturer: mfg,
          color_code: code,
          color_name: name,
          required_base: base,
          pigment_formula: formula,
          hex_code: hex.startsWith('#') ? hex : '#' + hex
        });
        inserted++;
      } catch (err) {
        errors.push(`Row ${idx + 1}: ${err.message}`);
      }
    });
  });

  runTx(colors);

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
    action: 'COLORS_BULK_IMPORTED',
    details: `Imported ${inserted} colors (${errors.length} errors)`,
    status: 'ALLOWED'
  });

  const totalCount = db.prepare('SELECT COUNT(*) AS total FROM manufacturer_colors').get().total;
  res.json({ ok: true, imported: inserted, errors, total_colors: totalCount });
});

// POST /api/colors/seed-kenyan-fandecks (1-Click Sync 1,000+ Kenyan Shades)
router.post('/seed-kenyan-fandecks', requireAuth, (req, res) => {
  try {
    const allColors = generate1000Colors();

    const upsert = db.prepare(`
      INSERT INTO manufacturer_colors (manufacturer, color_code, color_name, required_base, pigment_formula, hex_code)
      VALUES (@manufacturer, @color_code, @color_name, @required_base, @pigment_formula, @hex_code)
      ON CONFLICT(color_code) DO UPDATE SET
        manufacturer=excluded.manufacturer,
        color_name=excluded.color_name,
        required_base=excluded.required_base,
        pigment_formula=excluded.pigment_formula,
        hex_code=excluded.hex_code
    `);

    let count = 0;
    const runTx = db.transaction((list) => {
      for (const c of list) {
        upsert.run({
          manufacturer: c.manufacturer,
          color_code: c.color_code,
          color_name: c.color_name,
          required_base: c.required_base,
          pigment_formula: c.pigment_formula,
          hex_code: c.hex_code
        });
        count++;
      }
    });

    runTx(allColors);

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'KENYA_FANDECK_SYNCED',
      details: `Synchronized ${count} official Kenyan paint colors (Crown, Duracoat, Plascon, Sadolin)`,
      status: 'ALLOWED'
    });

    const totalCount = db.prepare('SELECT COUNT(*) AS total FROM manufacturer_colors').get().total;
    res.json({
      ok: true,
      message: `Successfully synchronized ${count} official Kenyan fandeck shades!`,
      seeded_count: count,
      total_colors: totalCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/colors/template/csv
router.get('/template/csv', (req, res) => {
  const sampleCsv = `manufacturer,color_code,color_name,required_base,pigment_formula,hex_code
Crown,CRN-101,Verona Gold,Pastel,"BK:0.25,YO:1.20,RE:0.05",#E2A03F
Crown,CRN-102,Lamu White,Pastel,"BK:0.02,YO:0.10",#FBFBFA
Duracoat,DC-201,Ocean Breeze,Pastel,"BK:0.10,BL:1.50,GR:0.20",#6FA8DC
Duracoat,DC-202,Tsavo Ochre,Deep,"YO:2.40,RE:1.10,RO:0.80",#C37341
Plascon,PLAS-301,Coffee Shop,Deep,"BK:1.10,RO:0.80,YO:2.40",#4B3621
Plascon,PLAS-302,Forest Canopy,Deep,"GR:2.00,BK:0.60,YO:0.10",#2E4F2E
Sadolin,SAD-401,Kilimanjaro Mist,Pastel,"BK:0.05,BL:0.20,YO:0.05",#E8EEF5
`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="kenyan_paint_colors_template.csv"');
  res.send(sampleCsv);
});

module.exports = router;
