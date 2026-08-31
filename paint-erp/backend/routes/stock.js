const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner, verifySecurityPin } = require('../middleware/auth');
const { logAction } = require('../audit');
const { hardwareStockAccessories } = require('../seed/kenyan_master_fandecks');

// GET /api/stock/valuation - Real-time valuation of all hardware, bases, and pigments
router.get('/valuation', requireAuth, (req, res) => {
  try {
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

    // 4. Depleted / Low Stock items with suggested reorder quantities
    const lowBases = db.prepare(`
      SELECT base_id AS id, 'base' AS type, (manufacturer || ' ' || base_name || ' (' || tin_size_litres || 'L)') AS name,
             manufacturer AS brand, quantity_in_stock AS current_qty, low_stock_threshold,
             unit_cost_kes AS unit_cost, CAST(ROUND(unit_cost_kes * 1.45) AS INTEGER) AS retail_price, 'tin' AS unit,
             MAX(1, (low_stock_threshold * 2) - quantity_in_stock) AS suggested_reorder
      FROM stock_base_tins WHERE quantity_in_stock <= low_stock_threshold
    `).all();

    const lowProducts = db.prepare(`
      SELECT product_id AS id, 'product' AS type, product_name AS name,
             sku AS brand, quantity_in_stock AS current_qty, low_stock_threshold,
             unit_cost_kes AS unit_cost, unit_price_kes AS retail_price, 'unit' AS unit,
             MAX(1, (low_stock_threshold * 2) - quantity_in_stock) AS suggested_reorder
      FROM products WHERE quantity_in_stock <= low_stock_threshold
    `).all();

    const lowPigments = db.prepare(`
      SELECT pigment_id AS id, 'pigment' AS type, (pigment_name || ' (Code: ' || pigment_code || ')') AS name,
             'FastTint Precision' AS brand, quantity_ml AS current_qty, low_stock_threshold_ml AS low_stock_threshold,
             unit_cost_per_ml_kes AS unit_cost, CAST(ROUND(unit_cost_per_ml_kes * 1.5) AS INTEGER) AS retail_price, 'ml' AS unit,
             MAX(500, (low_stock_threshold_ml * 2) - quantity_ml) AS suggested_reorder
      FROM stock_pigments WHERE quantity_ml <= low_stock_threshold_ml
    `).all();

    const lowStockItems = [...lowBases, ...lowProducts, ...lowPigments];

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
      low_stock_count: lowStockItems.length,
      low_stock_items: lowStockItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/alerts - products & base tins at or below threshold
router.get('/alerts', requireAuth, (req, res) => {
  const lowBases = db.prepare(`
    SELECT base_id, manufacturer, base_name, tin_size_litres, quantity_in_stock, low_stock_threshold, unit_cost_kes, 'base_tin' AS item_type
    FROM stock_base_tins WHERE quantity_in_stock <= low_stock_threshold
  `).all();

  const lowPigments = db.prepare(`
    SELECT pigment_id, pigment_code, pigment_name, quantity_ml, low_stock_threshold_ml, unit_cost_per_ml_kes, 'pigment' AS item_type
    FROM stock_pigments WHERE quantity_ml <= low_stock_threshold_ml
  `).all();

  const lowProducts = db.prepare(`
    SELECT product_id, product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold, 'hardware_product' AS item_type
    FROM products WHERE quantity_in_stock <= low_stock_threshold
  `).all();

  res.json({
    low_bases: lowBases,
    low_pigments: lowPigments,
    low_products: lowProducts,
    total_alerts: lowBases.length + lowPigments.length + lowProducts.length
  });
});

// GET /api/stock/bases
router.get('/bases', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM stock_base_tins ORDER BY manufacturer, base_name').all();
  res.json(rows);
});

// GET /api/stock/pigments
router.get('/pigments', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM stock_pigments ORDER BY pigment_code').all();
  res.json(rows);
});

// GET /api/stock/products
router.get('/products', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY product_name ASC').all();
  res.json(rows);
});

// POST /api/stock/restock - Quick Restock supply with automatic inventory & financial reconciliation
router.post('/restock', requireAuth, (req, res) => {
  const { item_type, item_id, quantity_to_add, unit_cost_kes, funding_source, account_id, supplier_id, notes } = req.body;
  const qty = Number(quantity_to_add);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Please enter a valid positive restock quantity.' });

  let itemName = '';
  let newTotalStock = 0;
  const costPerUnit = Number(unit_cost_kes || 0);
  const totalCostKes = Math.round(costPerUnit * qty);

  try {
    const restockTx = db.transaction(() => {
      if (item_type === 'product' || item_type === 'hardware') {
        const p = db.prepare('SELECT product_name, quantity_in_stock, unit_cost_kes FROM products WHERE product_id = ?').get(item_id);
        if (!p) throw new Error('Product not found in stock catalog.');
        itemName = p.product_name;
        newTotalStock = p.quantity_in_stock + qty;
        if (costPerUnit > 0) {
          db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock + ?, unit_cost_kes = ? WHERE product_id = ?').run(qty, costPerUnit, item_id);
        } else {
          db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?').run(qty, item_id);
        }
      } else if (item_type === 'base' || item_type === 'base_tin') {
        const b = db.prepare('SELECT manufacturer, base_name, tin_size_litres, quantity_in_stock, unit_cost_kes FROM stock_base_tins WHERE base_id = ?').get(item_id);
        if (!b) throw new Error('Base paint tin not found in stock catalog.');
        itemName = `${b.manufacturer} ${b.base_name} (${b.tin_size_litres}L)`;
        newTotalStock = b.quantity_in_stock + qty;
        if (costPerUnit > 0) {
          db.prepare('UPDATE stock_base_tins SET quantity_in_stock = quantity_in_stock + ?, unit_cost_kes = ? WHERE base_id = ?').run(qty, costPerUnit, item_id);
        } else {
          db.prepare('UPDATE stock_base_tins SET quantity_in_stock = quantity_in_stock + ? WHERE base_id = ?').run(qty, item_id);
        }
      } else if (item_type === 'pigment') {
        const pig = db.prepare('SELECT pigment_name, pigment_code, quantity_ml, unit_cost_per_ml_kes FROM stock_pigments WHERE pigment_id = ?').get(item_id);
        if (!pig) throw new Error('Pigment canister not found in stock catalog.');
        itemName = `${pig.pigment_name} (${pig.pigment_code})`;
        newTotalStock = pig.quantity_ml + qty;
        if (costPerUnit > 0) {
          db.prepare('UPDATE stock_pigments SET quantity_ml = quantity_ml + ?, unit_cost_per_ml_kes = ? WHERE pigment_id = ?').run(qty, costPerUnit, item_id);
        } else {
          db.prepare('UPDATE stock_pigments SET quantity_ml = quantity_ml + ? WHERE pigment_id = ?').run(qty, item_id);
        }
      } else {
        throw new Error('Unknown item type specified for restock.');
      }

      // Financial reconciliation if cost is incurred
      if (funding_source === 'cashbook' && account_id && totalCostKes > 0) {
        db.prepare('UPDATE cashflow_accounts SET balance_kes = balance_kes - ? WHERE account_id = ?').run(totalCostKes, account_id);
        db.prepare(`
          INSERT INTO expenses (category, amount_kes, recipient_or_vendor, paid_by_user_id, source_account_id, description, receipt_ref)
          VALUES ('Inventory Purchase', ?, ?, ?, ?, ?, ?)
        `).run(totalCostKes, notes || 'Stock Supplier', req.user.user_id, account_id, `Restocked ${qty}x ${itemName}`, 'RESTOCK-' + Date.now());
      } else if (funding_source === 'supplier_credit' && supplier_id && totalCostKes > 0) {
        db.prepare('UPDATE suppliers SET current_balance_kes = current_balance_kes + ? WHERE supplier_id = ?').run(totalCostKes, supplier_id);
        db.prepare(`
          INSERT INTO supplier_transactions (supplier_id, transaction_type, amount_kes, notes, created_by_user_id)
          VALUES (?, 'BILL', ?, ?, ?)
        `).run(supplier_id, totalCostKes, `Stock supply: +${qty} ${itemName}`, req.user.user_id);
      }
    });

    restockTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'STOCK_RESTOCKED',
      details: `Restocked ${qty} of ${itemName}. New stock level: ${newTotalStock}. Cost: KES ${totalCostKes}`,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: `Successfully restocked ${qty} of ${itemName}! Live inventory updated to ${newTotalStock}.`,
      item_name: itemName,
      new_quantity: newTotalStock,
      total_cost_kes: totalCostKes
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/stock/adjust - Physical inventory count correction
router.post('/adjust', requireAuth, (req, res) => {
  const { item_type, item_id, new_quantity, reason } = req.body;
  const newQty = Number(new_quantity);
  if (isNaN(newQty) || newQty < 0) return res.status(400).json({ error: 'Valid non-negative quantity is required.' });

  let itemName = '';
  let oldQty = 0;

  try {
    if (item_type === 'product' || item_type === 'hardware') {
      const p = db.prepare('SELECT product_name, quantity_in_stock FROM products WHERE product_id = ?').get(item_id);
      if (!p) return res.status(404).json({ error: 'Product not found' });
      itemName = p.product_name;
      oldQty = p.quantity_in_stock;
      db.prepare('UPDATE products SET quantity_in_stock = ? WHERE product_id = ?').run(newQty, item_id);
    } else if (item_type === 'base' || item_type === 'base_tin') {
      const b = db.prepare('SELECT manufacturer, base_name, tin_size_litres, quantity_in_stock FROM stock_base_tins WHERE base_id = ?').get(item_id);
      if (!b) return res.status(404).json({ error: 'Base tin not found' });
      itemName = `${b.manufacturer} ${b.base_name} (${b.tin_size_litres}L)`;
      oldQty = b.quantity_in_stock;
      db.prepare('UPDATE stock_base_tins SET quantity_in_stock = ? WHERE base_id = ?').run(newQty, item_id);
    } else if (item_type === 'pigment') {
      const pig = db.prepare('SELECT pigment_name, pigment_code, quantity_ml FROM stock_pigments WHERE pigment_id = ?').get(item_id);
      if (!pig) return res.status(404).json({ error: 'Pigment not found' });
      itemName = `${pig.pigment_name} (${pig.pigment_code})`;
      oldQty = pig.quantity_ml;
      db.prepare('UPDATE stock_pigments SET quantity_ml = ? WHERE pigment_id = ?').run(newQty, item_id);
    } else {
      return res.status(400).json({ error: 'Unknown item type for adjustment.' });
    }

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'STOCK_ADJUSTMENT',
      details: `Adjusted stock for ${itemName} from ${oldQty} to ${newQty}. Reason: ${reason || 'Physical inventory count reconciliation'}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Stock for ${itemName} corrected to ${newQty}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/products - Add new retail hardware item
router.post('/products', requireAuth, (req, res) => {
  const { product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold } = req.body;
  if (!product_name) return res.status(400).json({ error: 'Product name is required.' });

  try {
    const finalSku = sku && sku.trim() ? sku.trim() : `SKU-${Date.now()}`;
    const result = db.prepare(`
      INSERT INTO products (product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      product_name.trim(),
      finalSku,
      Number(unit_price_kes || 0),
      Number(unit_cost_kes || 0),
      Number(quantity_in_stock || 0),
      Number(low_stock_threshold || 5)
    );

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'PRODUCT_CREATED',
      details: `Created new product: ${product_name} (SKU: ${finalSku}) with ${quantity_in_stock || 0} in stock`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Product ${product_name} added to inventory successfully.`, product_id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/stock/bases - Add new base tin
router.post('/bases', requireAuth, (req, res) => {
  const { manufacturer, base_name, tin_size_litres, unit_cost_kes, quantity_in_stock, low_stock_threshold } = req.body;
  if (!manufacturer || !base_name || !tin_size_litres) {
    return res.status(400).json({ error: 'Manufacturer, Base Name, and Tin Size (Litres) are required.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO stock_base_tins (manufacturer, base_name, tin_size_litres, unit_cost_kes, quantity_in_stock, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      manufacturer.trim(),
      base_name.trim(),
      Number(tin_size_litres),
      Number(unit_cost_kes || 0),
      Number(quantity_in_stock || 0),
      Number(low_stock_threshold || 5)
    );

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'terminal',
      action: 'BASE_TIN_CREATED',
      details: `Added new base tin: ${manufacturer} ${base_name} ${tin_size_litres}L with ${quantity_in_stock || 0} tins`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Base tin ${manufacturer} ${base_name} (${tin_size_litres}L) created successfully.`, base_id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/stock/bulk-import-products
router.post('/bulk-import-products', requireAuth, (req, res) => {
  const { products } = req.body;
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'products array is required in request body.' });
  }

  const upsert = db.prepare(`
    INSERT INTO products (product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold)
    VALUES (@product_name, @sku, @unit_price_kes, @unit_cost_kes, @quantity_in_stock, @low_stock_threshold)
    ON CONFLICT(sku) DO UPDATE SET
      product_name=excluded.product_name,
      unit_price_kes=excluded.unit_price_kes,
      unit_cost_kes=excluded.unit_cost_kes,
      quantity_in_stock=excluded.quantity_in_stock,
      low_stock_threshold=excluded.low_stock_threshold
  `);

  let count = 0;
  const runTx = db.transaction((list) => {
    list.forEach((p, idx) => {
      const name = (p.product_name || p.name || p.Name || 'Hardware Accessory').trim();
      const sku = (p.sku || p.SKU || p.barcode || `SKU-${Date.now()}-${idx}`).trim();
      const price = Number(p.unit_price_kes || p.price || p.Price || 250);
      const cost = Number(p.unit_cost_kes || p.cost || p.Cost || price * 0.65);
      const stock = Number(p.quantity_in_stock || p.stock || p.Stock || 20);
      const minStock = Number(p.low_stock_threshold || p.min_stock || 5);

      upsert.run({
        product_name: name,
        sku,
        unit_price_kes: price,
        unit_cost_kes: cost,
        quantity_in_stock: stock,
        low_stock_threshold: minStock
      });
      count++;
    });
  });

  runTx(products);

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
    action: 'PRODUCTS_BULK_IMPORTED',
    details: `Imported ${count} hardware products & accessories`,
    status: 'ALLOWED'
  });

  const totalProducts = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;
  res.json({ ok: true, imported: count, total_products: totalProducts });
});

// POST /api/stock/seed-hardware-catalog (1-Click Sync 50+ Real Hardware Accessories)
router.post('/seed-hardware-catalog', requireAuth, (req, res) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO products (product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold)
    VALUES (@name, @sku, @price, @cost, @stock, @min)
  `);

  let count = 0;
  const runTx = db.transaction((list) => {
    list.forEach((item, idx) => {
      const sku = `HW-${item.category.slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`;
      insert.run({
        name: item.name,
        sku,
        price: item.price,
        cost: item.cost,
        stock: item.stock,
        min: item.min
      });
      count++;
    });
  });

  runTx(hardwareStockAccessories);

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
    action: 'HARDWARE_CATALOG_SYNCED',
    details: `Synchronized ${count} hardware accessories & prep products`,
    status: 'ALLOWED'
  });

  const totalProducts = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;
  res.json({
    ok: true,
    message: `Successfully populated ${count} hardware shop products (Brushes, Rollers, Thinners, Fillers, Tapes, Sandpaper)!`,
    seeded_count: count,
    total_products: totalProducts
  });
});

// GET /api/stock/template-products/csv
router.get('/template-products/csv', (req, res) => {
  const sampleCsv = `product_name,sku,unit_cost_kes,unit_price_kes,quantity_in_stock,low_stock_threshold
Harris Classic Paint Brush 2-inch,BRUSH-2IN,130,240,80,20
Hamilton Perfection 9-inch Roller Set,ROLLER-9IN-SET,420,680,40,12
Crown Standard Paint Thinner 5L,THINNER-5L,1250,1850,45,12
Crown Pro Masking Tape 2-inch,TAPE-2IN,145,250,220,50
Deerfos P120 Fine Sandpaper Sheet,SAND-P120,22,45,450,50
Decora Joint Filler Compound 25kg,FILLER-25KG,1250,1750,40,10
Basco Duracoat Red Oxide Primer 4L,PRIMER-RO-4L,1450,2150,40,10
Soudal Gap Filler White Sealant 280ml,SEAL-GAP-280,220,380,80,25
`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="hardware_inventory_template.csv"');
  res.send(sampleCsv);
});

// DELETE /api/stock/item/:type/:id - PIN-protected single stock item deletion
router.delete('/item/:type/:id', requireAuth, (req, res) => {
  try {
    const { type, id } = req.params;
    const { pin, reason } = req.body || {};

    const authCheck = verifySecurityPin(pin, 'DELETE_STOCK', req.user);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || 'Invalid Store Security PIN' });
    }

    let itemName = '';

    if (type === 'base') {
      const base = db.prepare('SELECT manufacturer, base_name, tin_size_litres FROM stock_base_tins WHERE base_id = ?').get(id);
      if (!base) return res.status(404).json({ error: 'Base tin not found.' });
      itemName = `${base.manufacturer} ${base.base_name} (${base.tin_size_litres}L)`;
      db.prepare('DELETE FROM stock_base_tins WHERE base_id = ?').run(id);
    } else if (type === 'product') {
      const product = db.prepare('SELECT product_name FROM products WHERE product_id = ?').get(id);
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      itemName = product.product_name;
      db.prepare('DELETE FROM products WHERE product_id = ?').run(id);
    } else if (type === 'pigment') {
      const pig = db.prepare('SELECT pigment_name, pigment_code FROM stock_pigments WHERE pigment_id = ?').get(id);
      if (!pig) return res.status(404).json({ error: 'Pigment not found.' });
      itemName = `${pig.pigment_name} (${pig.pigment_code})`;
      db.prepare('DELETE FROM stock_pigments WHERE pigment_id = ?').run(id);
    } else {
      return res.status(400).json({ error: 'Invalid stock item type. Must be base, product, or pigment.' });
    }

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'STOCK_ITEM_DELETED',
      details: `Deleted ${type.toUpperCase()}: ${itemName} (ID: ${id}) with Store PIN authorization. Reason: ${reason || 'Manual removal'}`,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: `${itemName} removed from inventory successfully.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/clear-all - PIN-protected bulk clear of all inventory
router.post('/clear-all', requireAuth, (req, res) => {
  try {
    const { pin, scope = 'all', reason } = req.body || {};

    const authCheck = verifySecurityPin(pin, 'CLEAR_STOCK', req.user);
    if (!authCheck.valid) {
      return res.status(403).json({ error: authCheck.error || 'Invalid Store Security PIN' });
    }

    const clearTx = db.transaction(() => {
      if (scope === 'all' || scope === 'products') {
        db.prepare('DELETE FROM products').run();
      }
      if (scope === 'all' || scope === 'bases') {
        db.prepare('DELETE FROM stock_base_tins').run();
      }
      if (scope === 'all' || scope === 'pigments') {
        db.prepare('DELETE FROM stock_pigments').run();
      }
    });

    clearTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'ALL_STOCK_CLEARED',
      details: `Wiped inventory (scope: ${scope}) with Store Master PIN authorization. Reason: ${reason || 'Inventory reset'}`,
      ledgerImpact: '0.00',
      category: 'STOCK',
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: 'All inventory stock items have been cleared successfully.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
