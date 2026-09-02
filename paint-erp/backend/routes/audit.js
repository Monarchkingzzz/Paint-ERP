const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logAction } = require('../audit');

// Helper to categorize action
function categorizeAction(action) {
  const act = (action || '').toUpperCase();
  if (act.includes('LOGIN') || act.includes('PASSWORD') || act.includes('PIN') || act.includes('AUTH') || act.includes('SECURITY') || act.includes('USER')) {
    return 'SECURITY';
  }
  if (act.includes('INVOICE') || act.includes('SALE') || act.includes('POS')) {
    if (act.includes('CREDIT')) return 'CREDIT_SALE';
    return 'CASH_SALE';
  }
  if (act.includes('STOCK') || act.includes('BASE') || act.includes('PIGMENT') || act.includes('PRODUCT') || act.includes('RECEIVE') || act.includes('PO')) {
    return 'STOCK';
  }
  if (act.includes('CREDIT_PAYMENT') || act.includes('DEBT') || act.includes('SUPPLIER_PAY')) {
    return 'PAYMENT';
  }
  if (act.includes('EXPENSE')) {
    return 'EXPENSE';
  }
  if (act.includes('PRICE') || act.includes('DISCOUNT') || act.includes('OVERRIDE')) {
    return 'PRICE_CHANGE';
  }
  if (act.includes('QUOTE')) {
    return 'QUOTE';
  }
  return 'GENERAL';
}

// GET /api/audit/summary (Owner only)
router.get('/summary', requireAuth, requireOwner, (req, res) => {
  try {
    const totalEventsRow = db.prepare('SELECT COUNT(*) AS count FROM audit_log').get();
    const totalEvents = totalEventsRow.count || 0;

    // Cash sales volume & count
    const cashSalesRow = db.prepare(`
      SELECT COALESCE(SUM(total_kes), 0) AS total_kes, COUNT(*) AS count
      FROM invoices
      WHERE status = 'Paid' AND payment_method IN ('Cash', 'Mpesa')
    `).get();

    // Credit sales volume & count
    const creditSalesRow = db.prepare(`
      SELECT COALESCE(SUM(total_kes), 0) AS total_kes, COUNT(*) AS count
      FROM invoices
      WHERE payment_method = 'Credit'
    `).get();

    // Stock movements count
    const stockRow = db.prepare(`
      SELECT COUNT(*) AS count
      FROM audit_log
      WHERE action LIKE '%STOCK%' OR action LIKE '%PRODUCT%' OR action LIKE '%BASE%' OR action LIKE '%PO%' OR action LIKE '%SUPPLIER%'
    `).get();

    // Security & auth count
    const secRow = db.prepare(`
      SELECT COUNT(*) AS count
      FROM audit_log
      WHERE action LIKE '%LOGIN%' OR action LIKE '%PASSWORD%' OR action LIKE '%PIN%' OR action LIKE '%AUTH%' OR action LIKE '%USER%'
    `).get();

    // Category counts for pills
    const allLogs = db.prepare('SELECT action FROM audit_log').all();
    const counts = {
      all: totalEvents,
      cash_sales: 0,
      credit_sales: 0,
      stock: 0,
      debt_payments: 0,
      price_changes: 0,
      quotes: 0,
      expenses: 0,
      security: 0
    };

    allLogs.forEach(r => {
      const cat = categorizeAction(r.action);
      if (cat === 'CASH_SALE') counts.cash_sales++;
      else if (cat === 'CREDIT_SALE') counts.credit_sales++;
      else if (cat === 'STOCK') counts.stock++;
      else if (cat === 'PAYMENT') counts.debt_payments++;
      else if (cat === 'PRICE_CHANGE') counts.price_changes++;
      else if (cat === 'QUOTE') counts.quotes++;
      else if (cat === 'EXPENSE') counts.expenses++;
      else if (cat === 'SECURITY') counts.security++;
    });

    res.json({
      total_events: totalEvents,
      cash_sales: {
        total_kes: cashSalesRow.total_kes,
        count: cashSalesRow.count
      },
      credit_sales: {
        total_kes: creditSalesRow.total_kes,
        count: creditSalesRow.count
      },
      stock_movements_count: stockRow.count,
      security_auth_count: secRow.count,
      counts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit/log  (Owner only)
router.get('/log', requireAuth, requireOwner, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT al.*, u.full_name, u.system_role
      FROM audit_log al
      LEFT JOIN store_users u ON u.user_id = al.user_id
      ORDER BY al.timestamp DESC
      LIMIT 300
    `).all();

    const enriched = rows.map(r => {
      const category = categorizeAction(r.action);
      
      // Extract impact from details if available
      let ledgerImpact = '-';
      const details = r.details || '';
      if (details.includes('KES') || details.includes('KSh')) {
        const match = details.match(/KES\s*([\d,]+)/i) || details.match(/KSh\s*([\d,]+)/i);
        if (match) {
          if (r.action.includes('EXPENSE') || r.action.includes('PAYMENT_TO_SUPPLIER')) {
            ledgerImpact = `- KSh ${match[1]}`;
          } else {
            ledgerImpact = `+ KSh ${match[1]}`;
          }
        }
      } else if (r.system_role) {
        ledgerImpact = r.system_role.toLowerCase();
      } else {
        ledgerImpact = 'system';
      }

      return {
        ...r,
        category,
        ledger_impact: ledgerImpact,
        operator_name: r.full_name || 'Shop Owner',
        operator_role: (r.system_role || 'owner').toLowerCase()
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit/clear (Owner only)
router.post('/clear', requireAuth, requireOwner, (req, res) => {
  try {
    db.prepare('DELETE FROM audit_log').run();
    logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
      action: 'AUDIT_LOG_CLEARED',
      details: `Audit log was cleared by ${req.user.full_name}`,
      status: 'ALLOWED'
    });
    res.json({ ok: true, message: 'Audit logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/audit/entry/:id - Single Audit Log Entry Deletion with PIN Authorization
router.delete('/entry/:id', requireAuth, (req, res) => {
  const logId = Number(req.params.id);
  const { pin } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'DELETE_AUDIT', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  try {
    db.prepare('DELETE FROM audit_log WHERE log_id = ?').run(logId);
    res.json({ ok: true, message: `Audit log entry #${logId} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit/clear-all - Bulk Clear Audit Logs with PIN Authorization
router.post('/clear-all', requireAuth, (req, res) => {
  const { pin } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');

  const check = verifySecurityPin(pin, 'CLEAR_AUDIT', req.user);
  if (!check.valid) {
    return res.status(403).json({ error: check.error });
  }

  try {
    const totalCount = db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count;
    db.prepare('DELETE FROM audit_log').run();

    // Insert 1 startup row indicating clean reset
    db.prepare(`
      INSERT INTO audit_log (user_id, device_fingerprint, action, details, status)
      VALUES (?, ?, 'AUDIT_LOGS_RESET', ?, 'ALLOWED')
    `).run(req.user.user_id, req.headers['x-device-fingerprint'] || 'unknown', `Audit trail wiped and reset by ${check.authorizedBy} (${req.user.system_role}). Cleared ${totalCount} previous events.`);

// POST /api/audit/sync-supabase (Owner only - push all local tables to Supabase cloud)
router.post('/sync-supabase', requireAuth, requireOwner, async (req, res) => {
  const { syncAllToSupabase } = require('../supabaseSync');
  try {
    const results = await syncAllToSupabase();
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
