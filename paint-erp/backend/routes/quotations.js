const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

// 1. GET ALL QUOTATIONS
router.get('/', requireAuth, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT q.*, u.full_name AS created_by_name
      FROM quotations q
      LEFT JOIN store_users u ON q.created_by = u.user_id
      ORDER BY q.created_at DESC
    `).all();

    const formatted = list.map((q) => ({
      ...q,
      items: JSON.parse(q.items_json || '[]')
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE PRO-FORMA QUOTATION (with 14-day price lock)
router.post('/', requireAuth, (req, res) => {
  const { customer_name, customer_phone, site_location, items, validity_days = 14, notes } = req.body;
  if (!customer_name || !customer_phone || !items || !items.length) {
    return res.status(400).json({ error: 'Customer name, phone, and item lines are required.' });
  }

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.unit_price_kes) * Number(item.quantity || 1)), 0);
  const quoteNumber = `PRQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const expiresAt = new Date(Date.now() + validity_days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO quotations (quote_number, customer_name, customer_phone, site_location, total_amount_kes, validity_days, expires_at, status, items_json, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?)
    `);
    const info = stmt.run(
      quoteNumber,
      customer_name,
      customer_phone,
      site_location || null,
      totalAmount,
      validity_days,
      expiresAt,
      JSON.stringify(items),
      notes || null,
      req.user.user_id
    );

    db.prepare(`
      INSERT INTO audit_log (user_id, device_fingerprint, action, details, status)
      VALUES (?, ?, 'QUOTATION_CREATED', ?, 'ALLOWED')
    `).run(req.user.user_id, req.headers['x-device-fingerprint'] || 'unknown', `Created quote ${quoteNumber} for ${customer_name} (KES ${totalAmount})`);

    res.json({
      ok: true,
      quote_id: info.lastInsertRowid,
      quote_number: quoteNumber,
      total_amount_kes: totalAmount,
      expires_at: expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CONVERT QUOTATION TO INVOICE
router.post('/:id/convert', requireAuth, (req, res) => {
  const quoteId = Number(req.params.id);
  const { payment_method = 'Cash' } = req.body;

  const quote = db.prepare('SELECT * FROM quotations WHERE quote_id = ?').get(quoteId);
  if (!quote) return res.status(404).json({ error: 'Quotation not found.' });
  if (quote.status === 'Converted') return res.status(400).json({ error: 'Quotation already converted to an invoice.' });

  const items = JSON.parse(quote.items_json || '[]');

  const execConvert = db.transaction(() => {
    // 1. Create Invoice
    const invStmt = db.prepare(`
      INSERT INTO invoices (created_by, customer_phone, payment_method, total_kes, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const invInfo = invStmt.run(
      req.user.user_id,
      quote.customer_phone,
      payment_method,
      quote.total_amount_kes,
      payment_method === 'Cash' ? 'Paid' : 'Pending'
    );
    const invoiceId = invInfo.lastInsertRowid;

    // 2. Insert items
    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, description, paint_pin, product_id, quantity, unit_price_kes, line_cost_kes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of items) {
      itemStmt.run(
        invoiceId,
        item.description,
        item.paint_pin || null,
        item.product_id || null,
        item.quantity || 1,
        item.unit_price_kes,
        item.line_cost_kes || (item.unit_price_kes * 0.65)
      );

      // Deduct inventory if product_id exists
      if (item.product_id) {
        db.prepare(`
          UPDATE products
          SET quantity_in_stock = MAX(0, quantity_in_stock - ?)
          WHERE product_id = ?
        `).run(item.quantity || 1, item.product_id);
      }
    }

    // 3. Mark Quote Converted
    db.prepare("UPDATE quotations SET status = 'Converted' WHERE quote_id = ?").run(quoteId);

    // 4. Update Cashflow if Paid immediately
    if (payment_method === 'Cash') {
      db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ? WHERE account_type = 'Cash Drawer'").run(quote.total_amount_kes);
    }

    // 5. Audit Log
    db.prepare(`
      INSERT INTO audit_log (user_id, device_fingerprint, action, details, status)
      VALUES (?, ?, 'QUOTATION_CONVERTED', ?, 'ALLOWED')
    `).run(req.user.user_id, req.headers['x-device-fingerprint'] || 'unknown', `Converted quote ${quote.quote_number} to Invoice #${invoiceId}`);

    return invoiceId;
  });

  try {
    const newInvoiceId = execConvert();
    res.json({ ok: true, invoice_id: newInvoiceId, message: `Quotation ${quote.quote_number} converted to Invoice #${newInvoiceId}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/quotes/:id - Delete single quotation with PIN
router.delete('/:id', requireAuth, (req, res) => {
  const quoteId = Number(req.params.id);
  const { pin } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'DELETE_QUOTE', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  const quote = db.prepare('SELECT * FROM quotations WHERE quote_id = ?').get(quoteId);
  if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

  try {
    db.prepare('DELETE FROM quotations WHERE quote_id = ?').run(quoteId);

    const { logAction } = require('../audit');
    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'QUOTATION_DELETED',
      details: `Quote ${quote.quote_number} for ${quote.customer_name} (KES ${quote.total_amount_kes.toLocaleString()}) deleted by ${check.authorizedBy}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Quotation ${quote.quote_number} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotes/clear-all - Bulk Clear Quotations with PIN
router.post('/clear-all', requireAuth, (req, res) => {
  const { pin } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'CLEAR_QUOTES', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  try {
    const count = db.prepare('SELECT COUNT(*) AS count FROM quotations').get().count;
    db.prepare('DELETE FROM quotations').run();

    const { logAction } = require('../audit');
    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'ALL_QUOTES_CLEARED',
      details: `Cleared all ${count} quotations by ${check.authorizedBy} (${req.user.system_role})`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Successfully cleared ${count} quotations.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
