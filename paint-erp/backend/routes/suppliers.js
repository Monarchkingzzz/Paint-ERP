const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logAction } = require('../audit');
const { syncToSupabase, updateSupabase, deleteFromSupabase } = require('../supabaseSync');

// 1. GET ALL SUPPLIERS & OVERVIEW
router.get('/', requireAuth, (req, res) => {
  try {
    const suppliers = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM supplier_transactions st WHERE st.supplier_id = s.supplier_id) AS transaction_count,
        (SELECT MAX(created_at) FROM supplier_transactions st WHERE st.supplier_id = s.supplier_id) AS last_activity_at
      FROM suppliers s
      ORDER BY s.current_balance_kes DESC, s.name ASC
    `).all();

    const totalBalanceOwed = suppliers.reduce((sum, s) => sum + (s.current_balance_kes || 0), 0);

    const recentTransactions = db.prepare(`
      SELECT st.*, s.name AS supplier_name, u.full_name AS recorded_by_name, ca.account_name
      FROM supplier_transactions st
      JOIN suppliers s ON s.supplier_id = st.supplier_id
      LEFT JOIN store_users u ON u.user_id = st.recorded_by
      LEFT JOIN cashflow_accounts ca ON ca.account_id = st.account_id
      ORDER BY st.created_at DESC LIMIT 20
    `).all();

    res.json({
      suppliers,
      total_balance_owed_kes: totalBalanceOwed,
      recent_transactions: recentTransactions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD NEW SUPPLIER
router.post('/', requireAuth, requireOwner, (req, res) => {
  const { name, contact_person, phone, email, location, lead_time_days = 3, initial_balance_kes = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });

  try {
    const initBal = Number(initial_balance_kes) || 0;
    const stmt = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, location, lead_time_days, current_balance_kes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name.trim(),
      contact_person ? contact_person.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      location ? location.trim() : null,
      Number(lead_time_days) || 3,
      initBal
    );

    const supplierId = Number(info.lastInsertRowid);

    syncToSupabase('suppliers', {
      supplier_id: supplierId,
      name: name.trim(),
      contact_person: contact_person ? contact_person.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      location: location ? location.trim() : null,
      lead_time_days: Number(lead_time_days) || 3,
      current_balance_kes: initBal
    });

    if (initBal > 0) {
      db.prepare(`
        INSERT INTO supplier_transactions (supplier_id, amount_kes, tx_type, notes, recorded_by)
        VALUES (?, ?, 'Purchase', 'Opening supplier balance', ?)
      `).run(supplierId, initBal, req.user.user_id);
    }

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'SUPPLIER_CREATED',
      details: `Added supplier: ${name} (Initial Balance: KES ${initBal})`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, supplier_id: supplierId, message: `Supplier ${name} created successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. RECORD SUPPLIER PAYMENT (Full Max Balance or Custom Top-Up Amount)
router.post('/payment', requireAuth, requireOwner, (req, res) => {
  const { supplier_id, amount_kes, account_id, payment_method = 'Cash', notes } = req.body;
  if (!supplier_id || !amount_kes || Number(amount_kes) <= 0) {
    return res.status(400).json({ error: 'Supplier ID and a valid positive payment amount are required.' });
  }

  const supplier = db.prepare('SELECT * FROM suppliers WHERE supplier_id = ?').get(supplier_id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

  const payAmt = Number(amount_kes);
  const currentBal = Number(supplier.current_balance_kes || 0);
  const newBal = Math.max(0, currentBal - payAmt);

  const accId = account_id ? Number(account_id) : 1; // Default to 1 (Cash Drawer)
  const account = db.prepare('SELECT * FROM cashflow_accounts WHERE account_id = ?').get(accId);

  const runPayment = db.transaction(() => {
    // 1. Update Supplier Balance
    db.prepare('UPDATE suppliers SET current_balance_kes = ? WHERE supplier_id = ?').run(newBal, supplier_id);

    // 2. Insert Supplier Transaction
    db.prepare(`
      INSERT INTO supplier_transactions (supplier_id, amount_kes, tx_type, account_id, notes, recorded_by)
      VALUES (?, ?, 'Payment', ?, ?, ?)
    `).run(supplier_id, payAmt, accId, notes || `Payment to ${supplier.name} via ${payment_method}`, req.user.user_id);

    // 3. Deduct from Cashflow Account
    if (account) {
      db.prepare(`
        UPDATE cashflow_accounts
        SET balance_kes = balance_kes - ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `).run(payAmt, accId);
    }

    // 4. Log in Audit
    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'SUPPLIER_PAYMENT_RECORDED',
      details: `Paid KES ${payAmt} to ${supplier.name} from ${account ? account.account_name : payment_method}. Prev Balance: KES ${currentBal}, New Balance: KES ${newBal}`,
      status: 'ALLOWED'
    });
  });

  try {
    runPayment();
    res.json({
      ok: true,
      supplier_id,
      supplier_name: supplier.name,
      amount_paid_kes: payAmt,
      previous_balance_kes: currentBal,
      new_balance_kes: newBal,
      message: `Successfully recorded KES ${payAmt.toLocaleString()} payment to ${supplier.name}. Remaining balance: KES ${newBal.toLocaleString()}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. RECORD SUPPLIER BILL / GOODS RECEIVED ON CREDIT
router.post('/bill', requireAuth, requireOwner, (req, res) => {
  const { supplier_id, amount_kes, invoice_reference, notes } = req.body;
  if (!supplier_id || !amount_kes || Number(amount_kes) <= 0) {
    return res.status(400).json({ error: 'Supplier ID and a valid positive bill amount are required.' });
  }

  const supplier = db.prepare('SELECT * FROM suppliers WHERE supplier_id = ?').get(supplier_id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

  const billAmt = Number(amount_kes);
  const currentBal = Number(supplier.current_balance_kes || 0);
  const newBal = currentBal + billAmt;

  const runBill = db.transaction(() => {
    db.prepare('UPDATE suppliers SET current_balance_kes = ? WHERE supplier_id = ?').run(newBal, supplier_id);

    db.prepare(`
      INSERT INTO supplier_transactions (supplier_id, amount_kes, tx_type, notes, recorded_by)
      VALUES (?, ?, 'Purchase', ?, ?)
    `).run(supplier_id, billAmt, notes || (invoice_reference ? `Invoice Ref: ${invoice_reference}` : 'Stock delivery purchase on credit'), req.user.user_id);

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'SUPPLIER_BILL_RECORDED',
      details: `Recorded purchase/bill of KES ${billAmt} from ${supplier.name}. New Balance: KES ${newBal}`,
      status: 'ALLOWED'
    });
  });

  try {
    runBill();
    res.json({
      ok: true,
      supplier_id,
      amount_added_kes: billAmt,
      previous_balance_kes: currentBal,
      new_balance_kes: newBal,
      message: `Recorded KES ${billAmt.toLocaleString()} purchase from ${supplier.name}. Total balance owed: KES ${newBal.toLocaleString()}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET SUPPLIER TRANSACTION LEDGER
router.get('/:id/ledger', requireAuth, (req, res) => {
  const supplierId = Number(req.params.id);
  const supplier = db.prepare('SELECT * FROM suppliers WHERE supplier_id = ?').get(supplierId);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

  const transactions = db.prepare(`
    SELECT st.*, u.full_name AS recorded_by_name, ca.account_name
    FROM supplier_transactions st
    LEFT JOIN store_users u ON u.user_id = st.recorded_by
    LEFT JOIN cashflow_accounts ca ON ca.account_id = st.account_id
    WHERE st.supplier_id = ?
    ORDER BY st.created_at DESC
  `).all(supplierId);

  res.json({
    supplier,
    transactions
  });
});


// 6. DELETE /api/suppliers/:id - Delete single supplier with PIN
router.delete('/:id', requireAuth, (req, res) => {
  const supplierId = Number(req.params.id);
  const { pin, reason } = req.body || {};
  const { verifySecurityPin } = require('../middleware/auth');

  const authCheck = verifySecurityPin(pin, 'DELETE_SUPPLIER', req.user);
  if (!authCheck.valid) {
    return res.status(403).json({ error: authCheck.error || 'Invalid Security PIN' });
  }

  const supplier = db.prepare('SELECT * FROM suppliers WHERE supplier_id = ?').get(supplierId);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

  try {
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM supplier_transactions WHERE supplier_id = ?').run(supplierId);
      db.prepare('DELETE FROM suppliers WHERE supplier_id = ?').run(supplierId);
    });
    deleteTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'SUPPLIER_DELETED',
      details: `Deleted supplier ${supplier.name} (ID: ${supplierId}, Balance: KES ${supplier.current_balance_kes}) by ${authCheck.authorizedBy}. Reason: ${reason || 'Manual removal'}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Supplier "${supplier.name}" removed successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. POST /api/suppliers/clear-all - Delete all suppliers with PIN
router.post('/clear-all', requireAuth, (req, res) => {
  const { pin, reason } = req.body || {};
  const { verifySecurityPin } = require('../middleware/auth');

  const authCheck = verifySecurityPin(pin, 'CLEAR_SUPPLIERS', req.user);
  if (!authCheck.valid) {
    return res.status(403).json({ error: authCheck.error || 'Invalid Security PIN' });
  }

  try {
    const count = db.prepare('SELECT COUNT(*) AS count FROM suppliers').get().count;
    const clearTx = db.transaction(() => {
      db.prepare('DELETE FROM supplier_transactions').run();
      db.prepare('DELETE FROM suppliers').run();
    });
    clearTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'ALL_SUPPLIERS_CLEARED',
      details: `Cleared all ${count} supplier records and ledgers by ${authCheck.authorizedBy}. Reason: ${reason || 'Bulk reset'}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Successfully cleared all ${count} supplier records.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
