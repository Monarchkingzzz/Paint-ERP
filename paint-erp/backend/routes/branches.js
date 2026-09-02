const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logAction } = require('../audit');
const { getSupabaseClient, syncToSupabase } = require('../supabaseSync');

const DEFAULT_BRANCHES = [
  { branch_id: 1, branch_code: 'MAIN-CBD', branch_name: 'Main Store & Tinting Depot', location: 'Nairobi CBD, River Road', phone_number: '254700000000', is_active: 1 },
  { branch_id: 2, branch_code: 'WESTLANDS-02', branch_name: 'Westlands Hardware & Paint Branch', location: 'Westlands, Mpaka Road', phone_number: '254711000000', is_active: 1 },
  { branch_id: 3, branch_code: 'MOMBASA-RD-03', branch_name: 'Mombasa Road Depot & Warehouse', location: 'Mombasa Road Industrial Area', phone_number: '254722000000', is_active: 1 }
];

// GET /api/branches - List all active branches for store multi-branch management
router.get('/', requireAuth, async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('store_branches')
          .select('*')
          .eq('is_active', 1)
          .order('branch_id', { ascending: true });

        if (!error && data && data.length) {
          return res.json(data);
        }
      } catch (e) {
        // Fallback to SQLite / defaults
      }
    }

    try {
      const rows = db.prepare('SELECT * FROM store_branches WHERE is_active = 1 ORDER BY branch_id ASC').all();
      if (rows && rows.length) return res.json(rows);
    } catch (e) {
      // Table might not have records yet
    }

    res.json(DEFAULT_BRANCHES);
  } catch (err) {
    res.json(DEFAULT_BRANCHES);
  }
});

// POST /api/branches - Add a new business branch (Owner only)
router.post('/', requireAuth, requireOwner, async (req, res) => {
  const { branch_name, branch_code, location, phone_number } = req.body;
  if (!branch_name || !location) {
    return res.status(400).json({ error: 'Branch name and location are required.' });
  }

  const code = (branch_code || branch_name.replace(/[^A-Za-z0-9]/g, '-').toUpperCase().slice(0, 10)).trim();
  const phone = (phone_number || '').trim();

  try {
    const branchPayload = {
      branch_code: code,
      branch_name: branch_name.trim(),
      location: location.trim(),
      phone_number: phone,
      is_active: 1
    };

    try {
      db.prepare(`
        INSERT INTO store_branches (branch_code, branch_name, location, phone_number, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(code, branch_name.trim(), location.trim(), phone);
    } catch (e) {
      // Handled in Supabase
    }

    await syncToSupabase('store_branches', branchPayload);

    await logAction({
      userId: req.user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
      action: 'BRANCH_CREATED',
      details: `New store branch opened: ${branch_name} (${code}) at ${location}`,
      status: 'ALLOWED'
    });

    res.json({ ok: true, message: `Branch "${branch_name}" added successfully!`, branch: branchPayload });
 } catch (err) {
 res.status(500).json({ error: err.message });
 }
});

module.exports = router;
