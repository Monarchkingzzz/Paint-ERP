const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner, verifySecurityPin } = require('../middleware/auth');
const { logAction } = require('../audit');
const { getSupabaseClient, syncToSupabase, updateSupabase, deleteFromSupabase } = require('../supabaseSync');
const { hardwareStockAccessories } = require('../seed/kenyan_master_fandecks');

// GET /api/stock/valuation - Real-time valuation of all hardware, bases, and pigments from Supabase Cloud
router.get('/valuation', requireAuth, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      try {
        const [bRes, pRes, prRes] = await Promise.all([
          client.from('stock_base_tins').select('*'),
          client.from('stock_pigments').select('*'),
          client.from('products').select('*')
        ]);

        if (!bRes.error && !pRes.error && !prRes.error) {
          const bases = bRes.data || [];
          const pigments = pRes.data || [];
          const products = prRes.data || [];

          let totalCost = 0;
          let totalRetail = 0;
          const lowItems = [];

          let pCost = 0;
          let pRetail = 0;
          let pUnits = 0;

          products.forEach(p => {
            const qty = Number(p.quantity_in_stock) || 0;
            const cost = Number(p.unit_cost_kes) || 0;
            const price = Number(p.unit_price_kes) || 0;
            pUnits += qty;
            pCost += cost * qty;
            pRetail += price * qty;
            totalCost += cost * qty;
            totalRetail += price * qty;
            if (qty <= (Number(p.low_stock_threshold) || 5)) {
              lowItems.push({
                id: p.product_id,
                type: 'product',
                name: p.product_name,
                brand: p.sku || 'Store SKU',
                current_qty: qty,
                low_stock_threshold: p.low_stock_threshold || 5,
                unit_cost: cost,
                retail_price: price,
                unit: 'piece',
                suggested_reorder: Math.max(1, ((p.low_stock_threshold || 5) * 2) - qty)
              });
            }
          });

          let bCost = 0;
          let bRetail = 0;
          let bTins = 0;

          bases.forEach(b => {
            const qty = Number(b.quantity_in_stock) || 0;
            const cost = Number(b.unit_cost_kes) || 0;
            const price = Math.round(cost * 1.45);
            bTins += qty;
            bCost += cost * qty;
            bRetail += price * qty;
            totalCost += cost * qty;
            totalRetail += price * qty;
            if (qty <= (Number(b.low_stock_threshold) || 5)) {
              lowItems.push({
                id: b.base_id,
                type: 'base',
                name: b.manufacturer + ' ' + b.base_name + ' (' + b.tin_size_litres + 'L)',
                brand: b.manufacturer,
                current_qty: qty,
                low_stock_threshold: b.low_stock_threshold || 5,
                unit_cost: cost,
                retail_price: price,
                unit: 'tin',
                suggested_reorder: Math.max(1, ((b.low_stock_threshold || 5) * 2) - qty)
              });
            }
          });

          let pigCost = 0;
          let pigRetail = 0;
          let pigMl = 0;

          pigments.forEach(pig => {
            const qty = Number(pig.quantity_ml) || 0;
            const cost = (Number(pig.unit_cost_per_ml_kes) || 0) * qty;
            const price = cost * 1.6;
            pigMl += qty;
            pigCost += cost;
            pigRetail += price;
            totalCost += cost;
            totalRetail += price;
            if (qty <= (Number(pig.low_stock_threshold_ml) || 500)) {
              lowItems.push({
                id: pig.pigment_id,
                type: 'pigment',
                name: pig.pigment_name + ' (' + pig.pigment_code + ')',
                brand: 'FastTint Precision',
                current_qty: qty,
                low_stock_threshold: pig.low_stock_threshold_ml || 500,
                unit_cost: Number(pig.unit_cost_per_ml_kes) || 0,
                retail_price: Math.round((Number(pig.unit_cost_per_ml_kes) || 0) * 1.5),
                unit: 'ml',
                suggested_reorder: Math.max(500, ((pig.low_stock_threshold_ml || 500) * 2) - qty)
              });
            }
          });

          const potentialProfit = Math.max(0, totalRetail - totalCost);
          const profitMarginPct = totalRetail > 0 ? Number(((potentialProfit / totalRetail) * 100).toFixed(1)) : 0;
          const totalItems = products.length + bases.length + pigments.length;

          return res.json({
            total_cost_worth_kes: Math.round(totalCost),
            total_retail_worth_kes: Math.round(totalRetail),
            potential_profit_kes: Math.round(potentialProfit),
            profit_margin_pct: profitMarginPct,
            total_skus_tracked: totalItems,
            breakdown: {
              hardware: { count: products.length, total_units: pUnits, total_cost_kes: pCost, total_retail_kes: pRetail },
              base_tins: { count: bases.length, total_tins: bTins, total_cost_kes: bCost, total_retail_kes: bRetail },
              pigments: { count: pigments.length, total_ml: pigMl, total_cost_kes: pigCost, total_retail_kes: pigRetail }
            },
            low_stock_count: lowItems.length,
            low_stock_items: lowItems
          });
        }
      } catch (e) {
        console.error('Supabase valuation fallback:', e.message);
      }
    }

    // 1. Hardware products
    const pVal = db.prepare(`
      SELECT 
        COUNT(*) AS count,
        COALESCE(SUM(quantity_in_stock), 0) AS total_units,
        COALESCE(SUM(unit_cost_kes * quantity_in_stock), 0) AS total_cost_kes,
        COALESCE(SUM(unit_price_kes * quantity_in_stock), 0) AS total_retail_kes
      FROM products
    `).get();

    // 2. Base paint tins
    const bVal = db.prepare(`
      SELECT 
        COUNT(*) AS count,
        COALESCE(SUM(quantity_in_stock), 0) AS total_tins,
        COALESCE(SUM(unit_cost_kes * quantity_in_stock), 0) AS total_cost_kes,
        COALESCE(SUM((unit_cost_kes * 1.45) * quantity_in_stock), 0) AS total_retail_kes
      FROM stock_base_tins
    `).get();

    // 3. Tinting pigments
    const pigVal = db.prepare(`
      SELECT 
        COUNT(*) AS count,
        COALESCE(SUM(quantity_ml), 0) AS total_ml,
        COALESCE(SUM(unit_cost_per_ml_kes * quantity_ml), 0) AS total_cost_kes,
        COALESCE(SUM((unit_cost_per_ml_kes * 1.5) * quantity_ml), 0) AS total_retail_kes
      FROM stock_pigments
    `).get();

    const totalCost = pVal.total_cost_kes + bVal.total_cost_kes + pigVal.total_cost_kes;
    const totalRetail = pVal.total_retail_kes + bVal.total_retail_kes + pigVal.total_retail_kes;
    const potentialProfit = Math.max(0, totalRetail - totalCost);
    const profitMarginPct = totalRetail > 0 ? Number(((potentialProfit / totalRetail) * 100).toFixed(1)) : 0;
    const totalItems = pVal.count + bVal.count + pigVal.count;

    res.json({
      total_cost_worth_kes: Math.round(totalCost),
      total_retail_worth_kes: Math.round(totalRetail),
      potential_profit_kes: Math.round(potentialProfit),
      profit_margin_pct: profitMarginPct,
      total_skus_tracked: totalItems,
      breakdown: {
        hardware: pVal,
        base_tins: bVal,
        pigments: pigVal
      },
      low_stock_count: 0,
      low_stock_items: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/bases
router.get('/bases', requireAuth, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('stock_base_tins').select('*').order('manufacturer, base_name');
      if (!error && data) return res.json(data);
    }
    const rows = db.prepare('SELECT * FROM stock_base_tins ORDER BY manufacturer, base_name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/pigments
router.get('/pigments', requireAuth, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('stock_pigments').select('*').order('pigment_code');
      if (!error && data) return res.json(data);
    }
    const rows = db.prepare('SELECT * FROM stock_pigments ORDER BY pigment_code').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/products
router.get('/products', requireAuth, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('products').select('*').order('product_name ASC');
      if (!error && data) return res.json(data);
    }
    const rows = db.prepare('SELECT * FROM products ORDER BY product_name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/restock - Quick Restock supply with automatic inventory & financial reconciliation
router.post('/restock', requireAuth, async (req, res) => {
  const { item_type, item_id, quantity_to_add, unit_cost_kes, funding_source, account_id, supplier_id, notes } = req.body;
  const qty = Number(quantity_to_add);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Please enter a valid positive restock quantity.' });

  let itemName = '';
  let newTotalStock = 0;
  const costPerUnit = Number(unit_cost_kes || 0);
  const totalCostKes = Math.round(costPerUnit * qty);

  try {
    const client = getSupabaseClient();
    if (item_type === 'product' || item_type === 'hardware') {
      let currentStock = 0;
      if (client) {
        const { data: p } = await client.from('products').select('*').eq('product_id', item_id).single();
        if (p) {
          itemName = p.product_name;
          currentStock = Number(p.quantity_in_stock) || 0;
        }
      }
      if (!itemName) {
        const pLocal = db.prepare('SELECT product_name, quantity_in_stock FROM products WHERE product_id = ?').get(item_id);
        if (pLocal) {
          itemName = pLocal.product_name;
          currentStock = pLocal.quantity_in_stock;
        }
      }
      newTotalStock = currentStock + qty;
      try {
        db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?').run(qty, item_id);
      } catch (e) {}
      await updateSupabase('products', { product_id: item_id }, { quantity_in_stock: newTotalStock, ...(costPerUnit > 0 ? { unit_cost_kes: costPerUnit } : {}) });
    } else if (item_type === 'base' || item_type === 'base_tin') {
      let currentStock = 0;
      if (client) {
        const { data: b } = await client.from('stock_base_tins').select('*').eq('base_id', item_id).single();
        if (b) {
          itemName = b.manufacturer + ' ' + b.base_name + ' (' + b.tin_size_litres + 'L)';
          currentStock = Number(b.quantity_in_stock) || 0;
        }
      }
      if (!itemName) {
        const bLocal = db.prepare('SELECT manufacturer, base_name, tin_size_litres, quantity_in_stock FROM stock_base_tins WHERE base_id = ?').get(item_id);
        if (bLocal) {
          itemName = bLocal.manufacturer + ' ' + bLocal.base_name + ' (' + bLocal.tin_size_litres + 'L)';
          currentStock = bLocal.quantity_in_stock;
        }
      }
      newTotalStock = currentStock + qty;
      try {
        db.prepare('UPDATE stock_base_tins SET quantity_in_stock = quantity_in_stock + ? WHERE base_id = ?').run(qty, item_id);
      } catch (e) {}
      await updateSupabase('stock_base_tins', { base_id: item_id }, { quantity_in_stock: newTotalStock, ...(costPerUnit > 0 ? { unit_cost_kes: costPerUnit } : {}) });
    } else if (item_type === 'pigment') {
      let currentStock = 0;
      if (client) {
        const { data: pig } = await client.from('stock_pigments').select('*').eq('pigment_id', item_id).single();
        if (pig) {
          itemName = pig.pigment_name + ' (' + pig.pigment_code + ')';
          currentStock = Number(pig.quantity_ml) || 0;
        }
      }
      if (!itemName) {
        const pigLocal = db.prepare('SELECT pigment_name, pigment_code, quantity_ml FROM stock_pigments WHERE pigment_id = ?').get(item_id);
        if (pigLocal) {
          itemName = pigLocal.pigment_name + ' (' + pigLocal.pigment_code + ')';
          currentStock = pigLocal.quantity_ml;
        }
      }
      newTotalStock = currentStock + qty;
      try {
        db.prepare('UPDATE stock_pigments SET quantity_ml = quantity_ml + ? WHERE pigment_id = ?').run(qty, item_id);
      } catch (e) {}
      await updateSupabase('stock_pigments', { pigment_id: item_id }, { quantity_ml: newTotalStock, ...(costPerUnit > 0 ? { unit_cost_per_ml_kes: costPerUnit } : {}) });
    }

    if (funding_source === 'cashbook' && totalCostKes > 0) {
      await syncToSupabase('expenses', {
        category: 'Inventory Purchase',
        amount_kes: totalCostKes,
        recipient_or_vendor: notes || 'Stock Supplier',
        paid_by_user_id: req.user.user_id,
        description: 'Restocked ' + qty + 'x ' + itemName,
        receipt_ref: 'RESTOCK-' + Date.now()
      });
    }

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'STOCK_RESTOCKED',
      details: 'Restocked ' + qty + ' of ' + itemName + '. New stock level: ' + newTotalStock + '. Cost: KES ' + totalCostKes,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: 'Successfully restocked ' + qty + ' of ' + itemName + '! Live inventory updated to ' + newTotalStock + '.',
      item_name: itemName,
      new_quantity: newTotalStock,
      total_cost_kes: totalCostKes
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/stock/adjust - Physical inventory count correction
router.post('/adjust', requireAuth, async (req, res) => {
  const { item_type, item_id, new_quantity, reason } = req.body;
  const newQty = Number(new_quantity);
  if (isNaN(newQty) || newQty < 0) return res.status(400).json({ error: 'Valid non-negative quantity is required.' });

  let itemName = '';

  try {
    if (item_type === 'product' || item_type === 'hardware') {
      try { db.prepare('UPDATE products SET quantity_in_stock = ? WHERE product_id = ?').run(newQty, item_id); } catch (e) {}
      await updateSupabase('products', { product_id: item_id }, { quantity_in_stock: newQty });
      itemName = 'Hardware Product #' + item_id;
    } else if (item_type === 'base' || item_type === 'base_tin') {
      try { db.prepare('UPDATE stock_base_tins SET quantity_in_stock = ? WHERE base_id = ?').run(newQty, item_id); } catch (e) {}
      await updateSupabase('stock_base_tins', { base_id: item_id }, { quantity_in_stock: newQty });
      itemName = 'Base Tin #' + item_id;
    } else if (item_type === 'pigment') {
      try { db.prepare('UPDATE stock_pigments SET quantity_ml = ? WHERE pigment_id = ?').run(newQty, item_id); } catch (e) {}
      await updateSupabase('stock_pigments', { pigment_id: item_id }, { quantity_ml: newQty });
      itemName = 'Pigment #' + item_id;
    }

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'STOCK_ADJUSTMENT',
      details: 'Adjusted stock for ' + itemName + ' to ' + newQty + '. Reason: ' + (reason || 'Physical inventory reconciliation'),
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: 'Stock for ' + itemName + ' corrected to ' + newQty + '.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/products - Add new retail hardware item
router.post('/products', requireAuth, async (req, res) => {
  const { product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold } = req.body;
  if (!product_name) return res.status(400).json({ error: 'Product name is required.' });

  try {
    const finalSku = sku && sku.trim() ? sku.trim() : 'SKU-' + Date.now();
    const prodPayload = {
      product_name: product_name.trim(),
      sku: finalSku,
      unit_price_kes: Number(unit_price_kes || 0),
      unit_cost_kes: Number(unit_cost_kes || 0),
      quantity_in_stock: Number(quantity_in_stock || 0),
      low_stock_threshold: Number(low_stock_threshold || 5)
    };

    try {
      db.prepare(`
        INSERT INTO products (product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(prodPayload.product_name, prodPayload.sku, prodPayload.unit_price_kes, prodPayload.unit_cost_kes, prodPayload.quantity_in_stock, prodPayload.low_stock_threshold);
    } catch (e) {}

    await syncToSupabase('products', prodPayload);

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'PRODUCT_CREATED',
      details: 'Created new product: ' + product_name + ' (SKU: ' + finalSku + ') with ' + (quantity_in_stock || 0) + ' in stock',
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: 'Product ' + product_name + ' added to inventory successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/stock/bases - Add new base tin
router.post('/bases', requireAuth, async (req, res) => {
  const { manufacturer, base_name, tin_size_litres, unit_cost_kes, quantity_in_stock, low_stock_threshold } = req.body;
  if (!manufacturer || !base_name || !tin_size_litres) {
    return res.status(400).json({ error: 'Manufacturer, Base Name, and Tin Size (Litres) are required.' });
  }

  try {
    const basePayload = {
      manufacturer: manufacturer.trim(),
      base_name: base_name.trim(),
      tin_size_litres: Number(tin_size_litres),
      unit_cost_kes: Number(unit_cost_kes || 0),
      quantity_in_stock: Number(quantity_in_stock || 0),
      low_stock_threshold: Number(low_stock_threshold || 5)
    };

    try {
      db.prepare(`
        INSERT INTO stock_base_tins (manufacturer, base_name, tin_size_litres, unit_cost_kes, quantity_in_stock, low_stock_threshold)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(basePayload.manufacturer, basePayload.base_name, basePayload.tin_size_litres, basePayload.unit_cost_kes, basePayload.quantity_in_stock, basePayload.low_stock_threshold);
    } catch (e) {}

    await syncToSupabase('stock_base_tins', basePayload);

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'BASE_TIN_CREATED',
      details: 'Added new base tin: ' + manufacturer + ' ' + base_name + ' ' + tin_size_litres + 'L with ' + (quantity_in_stock || 0) + ' tins',
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: 'Base tin ' + manufacturer + ' ' + base_name + ' (' + tin_size_litres + 'L) created successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/stock/item/:type/:id - PIN-protected single stock item deletion
router.delete('/item/:type/:id', requireAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { pin, reason } = req.body || {};

    const authCheck = verifySecurityPin(pin, 'DELETE_STOCK', req.user);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || 'Invalid Store Security PIN' });
    }

    if (type === 'base') {
      try { db.prepare('DELETE FROM stock_base_tins WHERE base_id = ?').run(id); } catch (e) {}
      await deleteFromSupabase('stock_base_tins', { base_id: id });
    } else if (type === 'product') {
      try { db.prepare('DELETE FROM products WHERE product_id = ?').run(id); } catch (e) {}
      await deleteFromSupabase('products', { product_id: id });
    } else if (type === 'pigment') {
      try { db.prepare('DELETE FROM stock_pigments WHERE pigment_id = ?').run(id); } catch (e) {}
      await deleteFromSupabase('stock_pigments', { pigment_id: id });
    }

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'STOCK_ITEM_DELETED',
      details: 'Deleted ' + type.toUpperCase() + ' (ID: ' + id + ') with Store PIN authorization. Reason: ' + (reason || 'Manual removal'),
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: 'Item removed from inventory successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/clear-all - PIN-protected bulk clear of all inventory
router.post('/clear-all', requireAuth, async (req, res) => {
  try {
    const { pin, scope = 'all', reason } = req.body || {};

    const authCheck = verifySecurityPin(pin, 'CLEAR_STOCK', req.user);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || 'Invalid Store Security PIN' });
    }

    try {
      if (scope === 'all' || scope === 'products') db.prepare('DELETE FROM products').run();
      if (scope === 'all' || scope === 'bases') db.prepare('DELETE FROM stock_base_tins').run();
      if (scope === 'all' || scope === 'pigments') db.prepare('DELETE FROM stock_pigments').run();
    } catch (e) {}

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'ALL_STOCK_CLEARED',
      details: 'Wiped inventory (scope: ' + scope + ') with Store Master PIN authorization.',
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: 'All inventory stock items have been cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
