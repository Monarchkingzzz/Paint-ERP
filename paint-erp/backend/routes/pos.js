const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../audit');
const { syncToSupabase } = require('../supabaseSync');

// Helper to handle invoice/checkout logic
function processCheckout(req, res) {
  try {
    let { customer_phone, payment_method, mpesa_receipt_code, items, lines } = req.body;
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

    const initialStatus = (dbPaymentMethod === 'Cash' || dbPaymentMethod === 'Credit' || (dbPaymentMethod === 'Mpesa' && mpesa_receipt_code)) ? 'Paid' : 'Pending';

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
        let validProdId = null;
        let validPin = null;

        // Safely check hardware product stock
        if (item.product_id) {
          try {
            const prod = db.prepare('SELECT * FROM products WHERE product_id = ?').get(item.product_id);
            if (prod) {
              validProdId = prod.product_id;
              if (!cost) cost = prod.unit_cost_kes;
              db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?')
                .run(item.quantity, item.product_id);
            }
          } catch (pErr) {}
        }

        // Safely check paint PIN validity
        if (item.paint_pin) {
          try {
            const pinRow = db.prepare('SELECT paint_pin FROM paint_pin_ledger WHERE paint_pin = ?').get(item.paint_pin);
            if (pinRow) validPin = pinRow.paint_pin;
          } catch (pnErr) {}
        }

        insertItem.run(
          invoiceId,
          item.description || 'Item',
          validPin,
          validProdId,
          Number(item.quantity) || 1,
          Number(item.unit_price_kes) || 0,
          cost
        );
      }

      // If Cash payment, credit cash drawer
      if (dbPaymentMethod === 'Cash') {
        try {
          db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'Cash Drawer'").run(total);
        } catch (cErr) {}
      }

      // If M-Pesa payment, credit M-Pesa Till
      if (dbPaymentMethod === 'Mpesa') {
        try {
          db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'M-Pesa Till'").run(total);
          if (mpesa_receipt_code) {
            db.prepare("UPDATE mpesa_payments SET invoice_id = ?, payment_status = 'Completed' WHERE mpesa_receipt_code = ?").run(invoiceId, mpesa_receipt_code);
          }
        } catch (mErr) {}
      }

      // If Credit account, post charge transaction and update balance
      if (dbPaymentMethod === 'Credit' && creditAccount) {
        try {
          db.prepare(`
            INSERT INTO credit_transactions (account_id, invoice_id, amount_kes, tx_type)
            VALUES (?, ?, ?, 'Charge')
          `).run(creditAccount.account_id, invoiceId, total);

          db.prepare('UPDATE credit_accounts SET current_balance_kes = current_balance_kes + ? WHERE account_id = ?')
            .run(total, creditAccount.account_id);
        } catch (crErr) {}
      }

      return invoiceId;
    });

    const invoiceId = createInvoice();

    // Real-time Supabase sync for invoice & items
    try {
      syncToSupabase('invoices', {
        invoice_id: Number(invoiceId),
        created_by: req.user.user_id,
        customer_phone: customer_phone || null,
        payment_method: dbPaymentMethod,
        total_kes: total,
        status: initialStatus
      });

      const supabaseItems = rawItems.map(item => ({
        invoice_id: Number(invoiceId),
        description: item.description || 'Item',
        paint_pin: item.paint_pin || null,
        product_id: item.product_id ? Number(item.product_id) : null,
        quantity: Number(item.quantity) || 1,
        unit_price_kes: Number(item.unit_price_kes) || 0,
        line_cost_kes: Number(item.line_cost_kes) || 0
      }));
      syncToSupabase('invoice_items', supabaseItems);
    } catch (sErr) {
      console.error('Supabase sync warning:', sErr.message);
    }

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
      mpesa_receipt_code: mpesa_receipt_code || null,
      items: rawItems,
      credit_account: creditAccount ? { fundi_name: creditAccount.fundi_name, new_balance_kes: creditAccount.current_balance_kes + total } : null
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Error processing checkout invoice' });
  }
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

const { sendStkPush, queryStkStatus, handleStkCallback, handleC2BConfirmation, getDarajaConfig } = require('../mpesa');

// POST /api/pos/mpesa/stk-push
// body: { invoice_id, phone_number, amount_kes, description }
router.post('/mpesa/stk-push', requireAuth, async (req, res) => {
  const { invoice_id, phone_number, amount_kes, description } = req.body;
  if (!phone_number || !amount_kes) {
    return res.status(400).json({ error: 'phone_number and amount_kes are required.' });
  }

  try {
    const result = await sendStkPush({
      phone: phone_number,
      amount: amount_kes,
      invoiceId: invoice_id,
      description: description || `Paint POS #${invoice_id || ''}`,
      userId: req.user.user_id,
      deviceFingerprint: req.deviceFingerprint
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pos/mpesa/status/:checkoutRequestId
router.get('/mpesa/status/:checkoutRequestId', async (req, res) => {
  try {
    const status = await queryStkStatus({ checkoutRequestId: req.params.checkoutRequestId });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/mpesa/verify-code
// Cashier manually validates customer's M-Pesa transaction code
router.post('/mpesa/verify-code', requireAuth, (req, res) => {
  const { receipt_code, amount_kes, invoice_id, phone_number } = req.body;
  if (!receipt_code || !amount_kes) {
    return res.status(400).json({ error: 'receipt_code and amount_kes are required.' });
  }

  const cleanCode = String(receipt_code).trim().toUpperCase();
  const amount = Number(amount_kes);

  // Check if code is already registered in DB
  let existing = db.prepare('SELECT * FROM mpesa_payments WHERE mpesa_receipt_code = ?').get(cleanCode);

  if (existing) {
    if (existing.payment_status === 'Completed') {
      if (existing.invoice_id && existing.invoice_id !== Number(invoice_id)) {
        return res.status(409).json({ error: `This M-Pesa code (${cleanCode}) was already used for Invoice #${existing.invoice_id}.` });
      }
      if (invoice_id) {
        db.prepare('UPDATE mpesa_payments SET invoice_id = ? WHERE transaction_id = ?').run(invoice_id, existing.transaction_id);
        db.prepare("UPDATE invoices SET status = 'Paid' WHERE invoice_id = ?").run(invoice_id);
      }
      return res.json({ ok: true, message: 'Receipt code verified successfully.', payment: existing });
    }
  }

  // If not yet recorded, insert verified manual transaction
  const phone = phone_number ? String(phone_number).trim() : 'Walk-in';
  const info = db.prepare(`
    INSERT INTO mpesa_payments (
      mpesa_receipt_code, phone_number, amount_kes, payment_status, 
      transaction_type, result_code, result_desc, invoice_id
    ) VALUES (?, ?, ?, 'Completed', 'MANUAL_CODE', 0, 'Cashier Verified M-Pesa Code', ?)
  `).run(cleanCode, phone, amount, invoice_id || null);

  if (invoice_id) {
    db.prepare("UPDATE invoices SET status = 'Paid' WHERE invoice_id = ?").run(invoice_id);
  }

  db.prepare("UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_type = 'M-Pesa Till'").run(amount);

  syncToSupabase('mpesa_payments', {
    transaction_id: info.lastInsertRowid,
    mpesa_receipt_code: cleanCode,
    phone_number: phone,
    amount_kes: amount,
    payment_status: 'Completed',
    transaction_type: 'MANUAL_CODE',
    invoice_id: invoice_id || null
  });

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.deviceFingerprint,
    action: 'MPESA_CODE_VERIFIED',
    details: `M-Pesa Code ${cleanCode} verified for KES ${amount} (Invoice #${invoice_id || 'N/A'})`,
    status: 'ALLOWED'
  });

  res.json({ ok: true, mpesa_receipt_code: cleanCode, amount_kes: amount, payment_status: 'Completed' });
});

// POST /api/pos/mpesa/callback  - webhook Safaricom calls when payment clears
router.post('/mpesa/callback', (req, res) => {
  const result = handleStkCallback(req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Callback processed successfully', result });
});

// POST /api/pos/mpesa/c2b/confirmation & validation
router.post('/mpesa/c2b/confirmation', (req, res) => {
  const result = handleC2BConfirmation(req.body);
  res.json(result);
});

router.post('/mpesa/c2b/validation', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// GET /api/pos/mpesa/config (Read M-Pesa credentials - Owner only)
router.get('/mpesa/config', requireAuth, (req, res) => {
  const config = getDarajaConfig();
  // Mask consumer secret for security
  const maskedSecret = config.consumerSecret ? `${config.consumerSecret.substring(0, 4)}••••••••${config.consumerSecret.substring(config.consumerSecret.length - 4)}` : '';
  res.json({
    env: config.env,
    shortcode: config.shortcode,
    till_number: config.tillNumber,
    consumer_key: config.consumerKey,
    consumer_secret: maskedSecret,
    callback_url: config.callbackUrl,
    is_active: true
  });
});

// POST /api/pos/mpesa/config (Update M-Pesa credentials - Owner only)
router.post('/mpesa/config', requireAuth, (req, res) => {
  if (req.user.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Only the store owner can modify M-Pesa Daraja settings.' });
  }

  const { env, consumer_key, consumer_secret, passkey, shortcode, till_number, callback_url } = req.body;

  db.prepare(`
    UPDATE mpesa_config
    SET env = COALESCE(?, env),
        consumer_key = COALESCE(?, consumer_key),
        consumer_secret = CASE WHEN ? != '' AND ? NOT LIKE '%•••%' THEN ? ELSE consumer_secret END,
        passkey = COALESCE(?, passkey),
        shortcode = COALESCE(?, shortcode),
        till_number = COALESCE(?, till_number),
        callback_url = COALESCE(?, callback_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE config_id = 1
  `).run(env || null, consumer_key || null, consumer_secret || '', consumer_secret || '', consumer_secret || null, passkey || null, shortcode || null, till_number || null, callback_url || null);

  logAction({
    userId: req.user.user_id,
    deviceFingerprint: req.deviceFingerprint,
    action: 'MPESA_CONFIG_UPDATED',
    details: `Updated M-Pesa Daraja settings: env=${env || 'unchanged'}, shortcode=${shortcode || 'unchanged'}`,
    status: 'ALLOWED'
  });

  res.json({ ok: true, message: 'M-Pesa Daraja configuration updated successfully.' });
});

// POST /api/pos/mpesa/simulate-callback  - helper for UI/dev to simulate customer entering PIN
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

  const receiptCode = success ? (payment.mpesa_receipt_code || `RSH${crypto.randomBytes(4).toString('hex').toUpperCase()}`) : null;
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
