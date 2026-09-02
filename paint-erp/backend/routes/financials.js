const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logAction } = require('../audit');
const { syncToSupabase, deleteFromSupabase, updateSupabase } = require('../supabaseSync');

// 1. REAL-TIME CASHBOOK & BALANCES OVERVIEW
router.get('/cashflow', requireAuth, (req, res) => {
  try {
    const accounts = db.prepare('SELECT * FROM cashflow_accounts ORDER BY account_id ASC').all();
    const totalCashflow = accounts.reduce((sum, a) => sum + (a.balance_kes || 0), 0);

    // 1. Operational Expenses Outflow
    const recentExpenses = db.prepare(`
      SELECT e.expense_id AS id, 'Expense' AS type, e.category AS title, e.recipient AS party,
             e.amount_kes, e.payment_method, e.created_at, e.notes,
             u.full_name AS recorded_by_name, ca.account_name
      FROM expenses e
      LEFT JOIN store_users u ON e.recorded_by = u.user_id
      LEFT JOIN cashflow_accounts ca ON e.account_id = ca.account_id
      ORDER BY e.created_at DESC LIMIT 25
    `).all();

    // 2. Sales Receipts Inflow
    const recentInflows = db.prepare(`
      SELECT i.invoice_id AS id, 'Sales Inflow' AS type, 'Counter Sales Receipt' AS title,
             COALESCE(i.customer_phone, 'Walk-in Customer') AS party,
             i.total_kes AS amount_kes, i.payment_method, i.created_at, '' AS notes,
             u.full_name AS recorded_by_name,
             CASE
               WHEN i.payment_method = 'Cash' THEN 'Main Counter Cash Till'
               WHEN i.payment_method = 'Mpesa' THEN 'Safaricom M-Pesa Buy Goods'
               ELSE 'Customer Credit'
             END AS account_name
      FROM invoices i
      JOIN store_users u ON u.user_id = i.created_by
      WHERE i.status = 'Paid'
      ORDER BY i.created_at DESC LIMIT 25
    `).all();

    // 3. Customer Credit Debt Repayments Inflow
    const creditRepayments = db.prepare(`
      SELECT ct.tx_id AS id, 'Credit Repaid' AS type, 'Customer Debt Repayment' AS title,
             ca.fundi_name AS party, ct.amount_kes, 'Cash/Till' AS payment_method,
             ct.created_at, 'Debt cleared by customer' AS notes,
             'Store Owner' AS recorded_by_name, 'Cashbook Deposit' AS account_name
      FROM credit_transactions ct
      JOIN credit_accounts ca ON ct.account_id = ca.account_id
      WHERE ct.tx_type = 'Payment'
      ORDER BY ct.created_at DESC LIMIT 15
    `).all();

    // 4. Supplier Payments Outflow
    const supplierPayments = db.prepare(`
      SELECT st.tx_id AS id, 'Supplier Paid' AS type, 'Supplier Invoice Settlement' AS title,
             s.name AS party, st.amount_kes, 'Account Outflow' AS payment_method,
             st.created_at, st.notes,
             u.full_name AS recorded_by_name, ca.account_name
      FROM supplier_transactions st
      JOIN suppliers s ON st.supplier_id = s.supplier_id
      LEFT JOIN store_users u ON st.recorded_by = u.user_id
      LEFT JOIN cashflow_accounts ca ON st.account_id = ca.account_id
      WHERE st.tx_type = 'Payment'
      ORDER BY st.created_at DESC LIMIT 15
    `).all();

    // Compute Overall Totals for Easy Understanding
    const totalSalesRow = db.prepare("SELECT COALESCE(SUM(total_kes), 0) AS total FROM invoices WHERE status = 'Paid'").get();
    const totalCreditPaidRow = db.prepare("SELECT COALESCE(SUM(amount_kes), 0) AS total FROM credit_transactions WHERE tx_type = 'Payment'").get();
    const totalExpensesRow = db.prepare("SELECT COALESCE(SUM(amount_kes), 0) AS total FROM expenses").get();
    const totalSupplierPaidRow = db.prepare("SELECT COALESCE(SUM(amount_kes), 0) AS total FROM supplier_transactions WHERE tx_type = 'Payment'").get();

    const totalMoneyIn = (totalSalesRow.total || 0) + (totalCreditPaidRow.total || 0);
    const totalMoneyOut = (totalExpensesRow.total || 0) + (totalSupplierPaidRow.total || 0);

    const allMovements = [
      ...recentInflows,
      ...creditRepayments,
      ...recentExpenses,
      ...supplierPayments
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 35);

    res.json({
      accounts,
      total_cashflow_kes: totalCashflow,
      summary: {
        total_money_in_kes: totalMoneyIn,
        total_money_out_kes: totalMoneyOut,
        net_balance_kes: totalCashflow,
        total_sales_kes: totalSalesRow.total,
        total_credit_collected_kes: totalCreditPaidRow.total,
        total_expenses_kes: totalExpensesRow.total,
        total_supplier_paid_kes: totalSupplierPaidRow.total
      },
      recent_movements: allMovements
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. RECORD SHOP EXPENSE (Simple everyday expense)
router.post('/expense', requireAuth, requireOwner, async (req, res) => {
  const { category, amount_kes, recipient, payment_method = 'Cash', account_id, notes } = req.body;
  if (!category || !amount_kes || Number(amount_kes) <= 0 || !recipient) {
    return res.status(400).json({ error: 'Expense category, recipient person/store, and valid positive amount are required.' });
  }

  const amt = Number(amount_kes);
  const accId = account_id ? Number(account_id) : (payment_method === 'M-Pesa' ? 2 : (payment_method === 'Bank Transfer' ? 3 : 1));

  const execExpense = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO expenses (category, amount_kes, recipient, payment_method, account_id, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(category.trim(), amt, recipient.trim(), payment_method, accId, notes ? notes.trim() : null, req.user.user_id);

    // Deduct from chosen account
    db.prepare(`
      UPDATE cashflow_accounts
      SET balance_kes = balance_kes - ?, updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `).run(amt, accId);

    return info.lastInsertRowid;
  });

  try {
    const expenseId = execExpense();
    
    await syncToSupabase('expenses', {
      expense_id: Number(expenseId),
      category: category.trim(),
      amount_kes: amt,
      recipient: recipient.trim(),
      payment_method: payment_method,
      account_id: accId,
      notes: notes ? notes.trim() : null,
      recorded_by: req.user.user_id
    });

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'EXPENSE_LOGGED',
      details: `Logged shop expense: KES ${amt} for ${category} paid to ${recipient} via ${payment_method}`,
      status: 'ALLOWED'
    });

    res.json({
      ok: true,
      expense_id: expenseId,
      message: `Shop expense of KES ${amt.toLocaleString()} for "${category}" recorded successfully!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET EXPENSES LIST
router.get('/expenses', requireAuth, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT e.*, u.full_name AS recorded_by_name, a.account_name
      FROM expenses e
      LEFT JOIN store_users u ON e.recorded_by = u.user_id
      LEFT JOIN cashflow_accounts a ON e.account_id = a.account_id
      ORDER BY e.created_at DESC
    `).all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/financials/expenses/:id - Delete single expense with PIN & refund account balance
router.delete('/expenses/:id', requireAuth, (req, res) => {
  const expenseId = Number(req.params.id);
  const { pin } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'DELETE_EXPENSE', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  const expense = db.prepare('SELECT * FROM expenses WHERE expense_id = ?').get(expenseId);
  if (!expense) return res.status(404).json({ error: 'Expense record not found.' });

  try {
    const refundTx = db.transaction(() => {
      // Refund source account
      if (expense.account_id && expense.amount_kes > 0) {
        db.prepare('UPDATE cashflow_accounts SET balance_kes = balance_kes + ?, updated_at = CURRENT_TIMESTAMP WHERE account_id = ?')
          .run(expense.amount_kes, expense.account_id);
      }
      db.prepare('DELETE FROM expenses WHERE expense_id = ?').run(expenseId);
    });

    refundTx();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'EXPENSE_DELETED',
      details: `Expense #${expenseId} (KES ${expense.amount_kes.toLocaleString()} for ${expense.category}) deleted by ${check.authorizedBy}. Balance refunded to account.`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Expense deleted and KES ${expense.amount_kes.toLocaleString()} refunded to account balance.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financials/expenses/clear-all - Bulk Clear Expenses with PIN
router.post('/expenses/clear-all', requireAuth, (req, res) => {
  const { pin } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'CLEAR_EXPENSES', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  try {
    const count = db.prepare('SELECT COUNT(*) AS count FROM expenses').get().count;
    db.prepare('DELETE FROM expenses').run();

    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
      action: 'ALL_EXPENSES_CLEARED',
      details: `Cleared all ${count} expense records by ${check.authorizedBy} (${req.user.system_role})`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Successfully cleared ${count} expense records.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

