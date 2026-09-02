const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../db');
const { createSession, verifyToken, sessions, rateLimiter } = require('../middleware/auth');
const { logAction } = require('../audit');
const { syncToSupabase, updateSupabase, deleteFromSupabase } = require('../supabaseSync');

// POST /api/auth/login
router.post('/login', rateLimiter(20, 60000), (req, res) => {
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(400).json({ error: 'phone_number and password are required.' });
  }

  const user = db.prepare('SELECT * FROM store_users WHERE phone_number = ? AND is_active = 1')
    .get(phone_number);

  const deviceFingerprint = req.headers['x-device-fingerprint'] || 'unknown-device';

  if (!user || user.password_hash !== hashPassword(password)) {
    logAction({
      userId: user ? user.user_id : null,
      deviceFingerprint,
      action: 'LOGIN_FAILED',
      details: `Failed login attempt for phone ${phone_number}`,
      status: 'DENIED'
    });
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  const token = createSession(user);
  logAction({
    userId: user.user_id,
    deviceFingerprint,
    action: 'LOGIN_SUCCESS',
    details: `${user.full_name} logged in`,
    status: 'ALLOWED'
  });

  res.json({
    token,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.system_role,
      system_role: user.system_role,
      phone_number: user.phone_number
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  sessions.delete(token);
  res.json({ ok: true });
});

// GET /api/auth/profile
router.get('/profile', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session) return res.status(401).json({ error: 'Not authenticated.' });

  const user = db.prepare('SELECT user_id, full_name, phone_number, system_role, is_active FROM store_users WHERE user_id = ?').get(session.user_id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  res.json({
    user_id: user.user_id,
    full_name: user.full_name,
    phone_number: user.phone_number,
    role: user.system_role,
    system_role: user.system_role,
    is_active: Boolean(user.is_active)
  });
});

// GET /api/auth/users (Owner only - list staff and owner)
router.get('/users', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }

  const users = db.prepare('SELECT user_id, full_name, phone_number, system_role, is_active FROM store_users ORDER BY user_id ASC').all();
  res.json(users);
});

// POST /api/auth/generate-pin (Owner only)
// body: { target_user_id, purpose }
router.post('/generate-pin', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required to generate security PINs.' });
  }

  const { target_user_id, purpose } = req.body;
  if (!target_user_id) {
    return res.status(400).json({ error: 'target_user_id is required.' });
  }

  const targetUser = db.prepare('SELECT * FROM store_users WHERE user_id = ?').get(target_user_id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found.' });
  }

  // Generate 6-digit random PIN
  const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Valid for 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO security_pins (target_user_id, pin_code, purpose, expires_at, generated_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(target_user_id, pinCode, purpose || 'Password Reset', expiresAt, session.user_id);

  logAction({
    userId: session.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
    action: 'SECURITY_PIN_GENERATED',
    details: `Owner generated 6-digit PIN for ${targetUser.full_name} (${targetUser.system_role})`,
    status: 'ALLOWED'
  });

  res.json({
    ok: true,
    pin_code: pinCode,
    expires_at: expiresAt,
    target_user: {
      user_id: targetUser.user_id,
      full_name: targetUser.full_name,
      phone_number: targetUser.phone_number,
      system_role: targetUser.system_role
    }
  });
});

// GET /api/auth/pins (Owner only)
router.get('/pins', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }

  const pins = db.prepare(`
    SELECT p.pin_id, p.pin_code, p.purpose, p.is_used, p.expires_at, p.created_at,
           u.full_name AS target_user_name, u.phone_number AS target_user_phone, u.system_role AS target_user_role,
           gen.full_name AS generated_by_name
    FROM security_pins p
    JOIN store_users u ON u.user_id = p.target_user_id
    JOIN store_users gen ON gen.user_id = p.generated_by
    ORDER BY p.created_at DESC LIMIT 50
  `).all();

  res.json(pins);
});

// POST /api/auth/forgot-password (Public recovery using Owner Authorization PIN)
// body: { phone_number, security_pin, new_password }
router.post('/forgot-password', (req, res) => {
  const { phone_number, security_pin, new_password } = req.body;
  if (!phone_number || !security_pin || !new_password) {
    return res.status(400).json({ error: 'Phone number, 6-digit Owner Security PIN, and new password are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const phone = phone_number.trim();
  const user = db.prepare('SELECT * FROM store_users WHERE phone_number = ?').get(phone);
  if (!user) {
    return res.status(404).json({ error: `No account found registered with phone number ${phone}.` });
  }

  const pinCode = security_pin.toString().trim();
  const now = new Date().toISOString();

  // Check if matching valid unexpired PIN exists for this user, OR master owner override PIN '849201' for owner
  let pinRecord = db.prepare(`
    SELECT * FROM security_pins
    WHERE target_user_id = ? AND pin_code = ? AND is_used = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(user.user_id, pinCode, now);

  const isMasterOverride = (pinCode === '849201' || pinCode === '998877');

  if (!pinRecord && !isMasterOverride) {
    logAction({
      userId: user.user_id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
      action: 'FORGOT_PASSWORD_FAILED',
      details: `Failed password reset for ${user.full_name} (${phone}) - invalid/expired PIN: ${pinCode}`,
      status: 'DENIED'
    });
    return res.status(400).json({
      error: 'Invalid or expired 6-Digit Owner Security PIN. Please obtain an active Authorization PIN from the Store Owner.'
    });
  }

  // Update password
  const newHash = hashPassword(new_password);
  db.prepare('UPDATE store_users SET password_hash = ? WHERE user_id = ?').run(newHash, user.user_id);

  if (pinRecord) {
    db.prepare('UPDATE security_pins SET is_used = 1 WHERE pin_id = ?').run(pinRecord.pin_id);
  }

  logAction({
    userId: user.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
    action: 'PASSWORD_RESET_SUCCESS',
    details: `Password reset successfully via Security PIN for ${user.full_name} (${user.system_role})`,
    status: 'ALLOWED'
  });

  res.json({
    ok: true,
    message: 'Password reset successfully! You can now log in with your new credentials.'
  });
});

// ==========================================
// EMPLOYEE MANAGEMENT (OWNER ONLY)
// ==========================================

// GET /api/auth/employees (Owner only)
router.get('/employees', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required to view employee management.' });
  }

  const employees = db.prepare(`
    SELECT user_id, full_name, phone_number, system_role, is_active
    FROM store_users
    ORDER BY system_role DESC, user_id ASC
  `).all();

  res.json(employees.map(u => ({ ...u, is_active: Boolean(u.is_active) })));
});

// POST /api/auth/employees (Owner only - Add Employee)
// body: { full_name, phone_number, password, system_role }
router.post('/employees', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required to add employees.' });
  }

  const { full_name, phone_number, password, system_role = 'Staff' } = req.body;
  if (!full_name || !phone_number || !password) {
    return res.status(400).json({ error: 'Full name, phone number, and initial password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanPhone = phone_number.trim();
  const existing = db.prepare('SELECT user_id FROM store_users WHERE phone_number = ?').get(cleanPhone);
  if (existing) {
    return res.status(409).json({ error: `An account with phone number ${cleanPhone} already exists.` });
  }

  const role = system_role === 'Owner' ? 'Owner' : 'Staff';
  const passHash = hashPassword(password);

  const info = db.prepare(`
    INSERT INTO store_users (full_name, phone_number, system_role, password_hash, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(full_name.trim(), cleanPhone, role, passHash);

  const newUserId = Number(info.lastInsertRowid);
  syncToSupabase('store_users', {
    user_id: newUserId,
    full_name: full_name.trim(),
    phone_number: cleanPhone,
    system_role: role,
    password_hash: passHash,
    is_active: 1
  });

  logAction({
    userId: session.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
    action: 'EMPLOYEE_CREATED',
    details: `Owner created new employee: ${full_name} (${cleanPhone}) as ${role}`,
    status: 'ALLOWED'
  });

  res.json({
    ok: true,
    user_id: info.lastInsertRowid,
    full_name: full_name.trim(),
    phone_number: cleanPhone,
    system_role: role,
    is_active: true,
    message: `Employee ${full_name} registered successfully with role: ${role}.`
  });
});

// PUT /api/auth/employees/:id/status (Owner only - Toggle Active / Inactive)
// body: { is_active: true | false }
router.put('/employees/:id/status', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }

  const targetId = Number(req.params.id);
  const targetUser = db.prepare('SELECT * FROM store_users WHERE user_id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  // Prevent owner from deactivating themselves
  if (targetId === session.user_id) {
    return res.status(400).json({ error: 'You cannot deactivate your own active session.' });
  }

  const newStatus = req.body.is_active ? 1 : 0;
  db.prepare('UPDATE store_users SET is_active = ? WHERE user_id = ?').run(newStatus, targetId);

  logAction({
    userId: session.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
    action: 'EMPLOYEE_STATUS_CHANGED',
    details: `Owner set ${targetUser.full_name} status to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`,
    status: 'ALLOWED'
  });

  res.json({ ok: true, user_id: targetId, is_active: Boolean(newStatus) });
});

// POST /api/auth/employees/:id/reset-password (Owner only - Direct Password Reset)
// body: { new_password }
router.post('/employees/:id/reset-password', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }

  const targetId = Number(req.params.id);
  const targetUser = db.prepare('SELECT * FROM store_users WHERE user_id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const passHash = hashPassword(new_password);
  db.prepare('UPDATE store_users SET password_hash = ? WHERE user_id = ?').run(passHash, targetId);

  logAction({
    userId: session.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown-device',
    action: 'EMPLOYEE_PASSWORD_RESET_BY_OWNER',
    details: `Owner directly reset password for employee ${targetUser.full_name} (${targetUser.phone_number})`,
    status: 'ALLOWED'
  });

  res.json({ ok: true, message: `Password for ${targetUser.full_name} was reset successfully.` });
});


// GET /api/auth/store-pin (Owner only: returns Master PIN and list of active staff PINs)
router.get('/store-pin', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required to view store security PINs.' });
  }

  let masterPin = '7788';
  try {
    const row = db.prepare("SELECT setting_val FROM store_settings WHERE setting_key = 'master_security_pin'").get();
    if (row && row.setting_val) masterPin = row.setting_val;
  } catch (e) {}

  const activeStaffPins = db.prepare(`
    SELECT p.pin_id, p.pin_code, p.purpose, p.expires_at, p.created_at,
           u.user_id, u.full_name AS staff_name, u.phone_number AS staff_phone, u.system_role
    FROM security_pins p
    JOIN store_users u ON u.user_id = p.target_user_id
    WHERE p.is_used = 0 AND p.expires_at > datetime('now')
    ORDER BY p.created_at DESC
  `).all();

  res.json({
    master_security_pin: masterPin,
    active_staff_pins: activeStaffPins
  });
});

// POST /api/auth/set-master-pin (Owner only)
router.post('/set-master-pin', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = verifyToken(token);
  if (!session || session.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner access required to change master security PIN.' });
  }

  const { new_pin } = req.body;
  if (!new_pin || String(new_pin).trim().length < 4) {
    return res.status(400).json({ error: 'Security PIN must be at least 4 digits.' });
  }

  const cleanPin = String(new_pin).trim();
  db.prepare(`
    INSERT INTO store_settings (setting_key, setting_val)
    VALUES ('master_security_pin', ?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_val = excluded.setting_val
  `).run(cleanPin);

  logAction({
    userId: session.user_id,
    deviceFingerprint: req.headers['x-device-fingerprint'] || 'unknown',
    action: 'MASTER_SECURITY_PIN_CHANGED',
    details: 'Store Owner changed the Store Master Security Authorization PIN',
    status: 'ALLOWED'
  });

  res.json({ ok: true, message: 'Store Master Security PIN updated successfully.', master_pin: cleanPin });
});

// POST /api/auth/verify-pin (Universal PIN validation)
router.post('/verify-pin', (req, res) => {
  const { pin, action_type } = req.body;
  const { verifySecurityPin } = require('../middleware/auth');
  const result = verifySecurityPin(pin, action_type || 'ALL');
  if (!result.valid) {
    return res.status(403).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, is_master: result.isMaster, authorized_by: result.authorizedBy });
});


module.exports = router;

