const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../audit');

// Helper to handle invoice/checkout logic
function processCheckout(req, res) {
  let { customer_phone, payment_method, items, lines } = req.body;
  const rawItems = items || lines;
  if (!payment_method || !Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ error: 'payment_method and a non-empty items[] are required.' });
  }

  // Normalize payment method to DB CHECK constraint values ('Mpesa', 'Cash', 'Credit')
  let dbPaymentMethod = payment_method;
  if (payment_method.toLowerCase().includes('mpesa') || payment_method.toLowerCase().includes('m-pesa')) {
    dbPaymentMethod = 'Mpesa';
  } else if (payment_method.toLowerCase().includes('credit')) {
    dbPaymentMethod = 'Credit';
  } else {
    dbPaymentMethod = 'Cash';
  }

  const total = rawItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price_kes) || 0), 0);

  let creditAccount = null;
  if (dbPaymentMethod === 'Credit') {
    if (!customer_phone) {
      return res.status(400).json({ error: 'Customer phone number is required for Fundi Credit payment.' });
    }
    creditAccount = db.prepare('SELECT * FROM credit_accounts WHERE phone_number = ?').get(customer_phone.trim());
    if (!creditAccount) {
      return res.status(400).json({
        error: `No approved credit account found for phone ${customer_phone}. Register account first under Owner P&L/Credit tab.`
      });
    }
    const newBalance = creditAccount.current_balance_kes + total;
    if (newBalance > creditAccount.credit_limit_kes) {
      return res.status(400).json({
        error: `Credit limit exceeded for ${creditAccount.fundi_name}. Limit: KES ${creditAccount.credit_limit_kes.toLocaleString()}, Current Balance: KES ${creditAccount.current_balance_kes.toLocaleString()}, Invoice Total: KES ${total.toLocaleString()}.`
      });
    }
  }

  const initialStatus = (dbPaymentMethod === 'Cash' || dbPaymentMethod === 'Credit') ? 'Paid' : 'Pending';

  const createInvoice = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO invoices (created_by, customer_phone, payment_method, total_kes, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.user_id, customer_phone || null, dbPaymentMethod, total, initialStatus);

    const invoiceId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, description, paint_pin, product_id, quantity, unit_price_kes, line_cost_kes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of rawItems) {
      let cost = Number(item.line_cost_kes) || 0;

      // Deduct hardware product stock & populate cost if missing
      if (item.product_id) {
        const prod = db.prepare('SELECT * FROM products WHERE product_id = ?').get(item.product_id);
        if (prod) {
          if (!cost) cost = prod.unit_cost_kes;
          db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?')
            .run(item.quantity, item.product_id);
        }
      }

      insertItem.run(
        invoiceId,
        item.description || 'Item',
        item.paint_pin || null,
        item.product_id || null,
        item.quantity,
        item.unit_price_kes,
        cost
      );
    }

    // If Cash payment, credit cash drawer
    if (dbPaymentMethod === 'Cash') {
      db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'Cash Drawer'").run(total);
    }

    // If Credit account, post charge transaction and update balance
    if (dbPaymentMethod === 'Credit' && creditAccount) {
      db.prepare(`
        INSERT INTO credit_transactions (account_id, invoice_id, amount_kes, tx_type)
        VALUES (?, ?, ?, 'Charge')
      `).run(creditAccount.account_id, invoiceId, total);

      db.prepare('UPDATE credit_accounts SET current_balance_kes = current_balance_kes + ? WHERE account_id = ?')
        .run(total, creditAccount.account_id);
    }

    return invoiceId;
  });

  const invoiceId = createInvoice();

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.deviceFingerprint,
    action: 'INVOICE_CREATED',
    details: `Invoice #${invoiceId} - KES ${total} via ${dbPaymentMethod}${creditAccount ? ` (Fundi: ${creditAccount.fundi_name})` : ''}`,
    status: 'ALLOWED'
  });

  res.json({
    ok: true,
    invoice_id: invoiceId,
    invoice_number: `INV-2026-${String(invoiceId).padStart(4, '0')}`,
    total_kes: total,
    total_amount_kes: total,
    payment_method: dbPaymentMethod,
    payment_status: initialStatus,
    status: initialStatus,
    credit_account: creditAccount ? { fundi_name: creditAccount.fundi_name, new_balance_kes: creditAccount.current_balance_kes + total } : null
  });
}

// POST /api/pos/invoice
router.post('/invoice', requireAuth, processCheckout);

// POST /api/pos/checkout
router.post('/checkout', requireAuth, processCheckout);

// GET /api/pos/invoices
router.get('/invoices', requireAuth, (req, res) => {
  try {
    let rows;
    if (req.user.system_role === 'Owner') {
      rows = db.prepare(`
        SELECT i.invoice_id, i.total_kes, i.total_kes AS total_amount_kes,
               i.payment_method, i.status, i.status AS payment_status,
               i.created_at, i.customer_phone, u.full_name AS served_by
        FROM invoices i
        JOIN store_users u ON u.user_id = i.created_by
        ORDER BY i.created_at DESC LIMIT 200
      `).all();
    } else {
      rows = db.prepare(`
        SELECT i.invoice_id, i.total_kes, i.total_kes AS total_amount_kes,
               i.payment_method, i.status, i.status AS payment_status,
               i.created_at, i.customer_phone, u.full_name AS served_by
        FROM invoices i
        JOIN store_users u ON u.user_id = i.created_by
        WHERE i.created_by = ?
        ORDER BY i.created_at DESC LIMIT 200
      `).all(req.user.user_id);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/mpesa/stk-push
// body: { invoice_id, phone_number, amount_kes }
router.post('/mpesa/stk-push', requireAuth, (req, res) => {
  const { invoice_id, phone_number, amount_kes } = req.body;
  if (!invoice_id || !phone_number || !amount_kes) {
    return res.status(400).json({ error: 'invoice_id, phone_number and amount_kes are required.' });
  }

  const checkoutRequestId = `ws_CO_${crypto.randomBytes(8).toString('hex')}`;

  db.prepare(`
    INSERT INTO mpesa_payments (checkout_request_id, phone_number, amount_kes, payment_status, invoice_id)
    VALUES (?, ?, ?, 'Pending', ?)
  `).run(checkoutRequestId, phone_number, amount_kes, invoice_id);

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.deviceFingerprint,
    action: 'MPESA_STK_PUSH_SENT',
    details: `Checkout ${checkoutRequestId} for invoice #${invoice_id}, KES ${amount_kes}`,
    status: 'ALLOWED'
  });

  res.json({
    checkout_request_id: checkoutRequestId,
    invoice_id,
    message: 'STK push sent (mocked). Awaiting customer PIN entry.'
  });
});

// POST /api/pos/mpesa/simulate-callback  - helper for UI/dev to simulate customer entering PIN
// body: { checkout_request_id, invoice_id?, success: true|false }
router.post('/mpesa/simulate-callback', (req, res) => {
  let { checkout_request_id, invoice_id, success } = req.body;
  if (success === undefined) success = true;

  let payment = null;
  if (checkout_request_id) {
    payment = db.prepare('SELECT * FROM mpesa_payments WHERE checkout_request_id = ?').get(checkout_request_id);
  } else if (invoice_id) {
    payment = db.prepare('SELECT * FROM mpesa_payments WHERE invoice_id = ? ORDER BY transaction_id DESC LIMIT 1').get(invoice_id);
  }

  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }

  const receiptCode = success ? `RSH${crypto.randomBytes(4).toString('hex').toUpperCase()}` : null;
  const newStatus = success ? 'Completed' : 'Failed';

  db.prepare(`
    UPDATE mpesa_payments SET payment_status = ?, mpesa_receipt_code = ?
    WHERE transaction_id = ?
  `).run(newStatus, receiptCode, payment.transaction_id);

  if (success && payment.invoice_id) {
    db.prepare('UPDATE invoices SET status = ? WHERE invoice_id = ?').run('Paid', payment.invoice_id);
    db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'M-Pesa Till'").run(payment.amount_kes);
  }

  logAction({
    userId: null,
    deviceFingerprint: 'mpesa-simulate',
    action: 'MPESA_CALLBACK_SIMULATED',
    details: `Invoice #${payment.invoice_id} -> ${newStatus} (Receipt: ${receiptCode || 'N/A'})`,
    status: 'ALLOWED'
  });

  res.json({
    ok: true,
    invoice_id: payment.invoice_id,
    payment_status: newStatus,
    mpesa_receipt_code: receiptCode,
    invoice_status: success ? 'Paid' : 'Failed'
  });
});

// POST /api/pos/mpesa/callback  - webhook Safaricom/Co-op Bank calls when payment clears
router.post('/mpesa/callback', (req, res) => {
  const { checkout_request_id, mpesa_receipt_code, bank_reference, success } = req.body;
  const payment = db.prepare('SELECT * FROM mpesa_payments WHERE checkout_request_id = ?').get(checkout_request_id);
  if (!payment) return res.status(404).json({ error: 'Unknown checkout_request_id.' });

  const newStatus = success ? 'Completed' : 'Failed';
  db.prepare(`
    UPDATE mpesa_payments
    SET payment_status = ?, mpesa_receipt_code = ?, bank_reference = ?
    WHERE transaction_id = ?
  `).run(newStatus, mpesa_receipt_code || null, bank_reference || null, payment.transaction_id);

  if (success && payment.invoice_id) {
    db.prepare('UPDATE invoices SET status = ? WHERE invoice_id = ?').run('Paid', payment.invoice_id);
    db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'M-Pesa Till'").run(payment.amount_kes);
  }

  logAction({
    userId: null,
    deviceFingerprint: 'mpesa-webhook',
    action: 'MPESA_CALLBACK',
    details: `Checkout ${checkout_request_id} -> ${newStatus}`,
    status: 'ALLOWED'
  });

  res.json({ ok: true, invoice_status: success ? 'Paid' : 'Failed' });
});

// GET /api/pos/invoice/:id
router.get('/invoice/:id', requireAuth, (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json({ ...invoice, items });
});


// DELETE /api/pos/invoice/:id - Single Invoice Deletion with PIN Authorization
router.delete('/invoice/:id', requireAuth, (req, res) => {
  const invoiceId = Number(req.params.id);
  const { pin, reason } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'DELETE_INVOICE', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

  try {
    const deleteTx = db.transaction(() => {
      // 1. Reconcile / restore product stock
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?')
            .run(item.quantity, item.product_id);
        }
      }

      // 2. Reverse cashflow account balance if cash/mpesa
      if (invoice.status === 'Paid') {
        if (invoice.payment_method === 'Cash') {
          db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes - ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'Cash Drawer'").run(invoice.total_kes);
        } else if (invoice.payment_method === 'Mpesa') {
          db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes - ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'M-Pesa Till'").run(invoice.total_kes);
        }
      }

      // 3. Reverse credit debt if credit sale
      if (invoice.payment_method === 'Credit' && invoice.customer_phone) {
        const creditAcc = db.prepare('SELECT * FROM credit_accounts WHERE phone_number = ?').get(invoice.customer_phone);
        if (creditAcc) {
          db.prepare('UPDATE credit_accounts SET current_balance_kes = MAX(0, current_balance_kes - ?) WHERE account_id = ?')
            .run(invoice.total_kes, creditAcc.account_id);
          db.prepare('DELETE FROM credit_transactions WHERE invoice_id = ?').run(invoiceId);
        }
      }

      // 4. Delete invoice items & invoice
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoiceId);
      db.prepare('DELETE FROM mpesa_payments WHERE invoice_id = ?').run(invoiceId);
      db.prepare('DELETE FROM invoices WHERE invoice_id = ?').run(invoiceId);
    });

    deleteTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'INVOICE_DELETED',
      details: `Invoice #INV-2026-${String(invoiceId).padStart(4, '0')} (KES ${invoice.total_kes.toLocaleString()}) deleted by ${check.authorizedBy} (${req.user.system_role}). Reason: ${reason || 'Counter correction'}`,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: `Invoice #INV-2026-${String(invoiceId).padStart(4, '0')} deleted. Stock restored and account balance reconciled.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/clear-history - Bulk Clear All Sales History with PIN Authorization
router.post('/clear-history', requireAuth, (req, res) => {
  const { pin, reason } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'CLEAR_SALES', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  try {
    const totalCount = db.prepare('SELECT COUNT(*) AS count FROM invoices').get().count;

    const clearTx = db.transaction(() => {
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM mpesa_payments').run();
      db.prepare('DELETE FROM invoices').run();
    });

    clearTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'SALES_HISTORY_CLEARED',
      details: `All ${totalCount} sales orders cleared by ${check.authorizedBy} (${req.user.system_role}). Reason: ${reason || 'System reset / Fresh start'}`,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      message: `Successfully cleared all ${totalCount} sales invoices from the system.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
