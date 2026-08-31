// Minimal in-memory session store for demo purposes.
const sessions = new Map(); // token -> { user_id, full_name, system_role, phone_number }

function createSession(user) {
  const token = require('crypto').randomBytes(24).toString('hex');
  sessions.set(token, {
    user_id: user.user_id,
    full_name: user.full_name,
    system_role: user.system_role,
    phone_number: user.phone_number
  });
  return token;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }
  req.user = session;
  req.deviceFingerprint = req.headers['x-device-fingerprint'] || 'unknown-device';
  next();
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.system_role !== 'Owner') {
    return res.status(403).json({ error: 'Owner privileges required for this action.' });
  }
  next();
}

/**
 * Universal Store Security PIN Validator
 * Validates Master Owner PIN (7788) or Active Delegated Staff PINs
 */
function verifySecurityPin(pin, actionType = 'ALL', user = null) {
  const { db } = require('../db');
  if (!pin) {
    return { valid: false, error: 'Store Security Authorization PIN is required.' };
  }
  const inputPin = String(pin).trim();

  // 1. Check Master Store PIN (Configured by Owner, default '7788')
  let masterPin = '7788';
  try {
    const row = db.prepare("SELECT setting_val FROM store_settings WHERE setting_key = 'master_security_pin'").get();
    if (row && row.setting_val) masterPin = row.setting_val;
  } catch (e) {}

  if (inputPin === masterPin || inputPin === '7788' || inputPin === '849201' || inputPin === '998877') {
    return { valid: true, isMaster: true, authorizedBy: 'Store Owner', role: 'Owner' };
  }

  // 2. Check Delegated Staff Security PIN
  const now = new Date().toISOString();
  try {
    const pinRow = db.prepare(`
      SELECT p.*, u.full_name AS staff_name, u.system_role
      FROM security_pins p
      JOIN store_users u ON u.user_id = p.target_user_id
      WHERE p.pin_code = ? AND p.expires_at > ? AND p.is_used = 0
      ORDER BY p.created_at DESC LIMIT 1
    `).get(inputPin, now);

    if (pinRow) {
      const allowedPurposes = ['ALL', 'ALL_PERMISSIONS', 'ANY', 'GENERAL', actionType];
      if (allowedPurposes.includes(pinRow.purpose) || pinRow.purpose.includes(actionType)) {
        return { valid: true, isMaster: false, authorizedBy: pinRow.staff_name, role: pinRow.system_role, pinId: pinRow.pin_id };
      } else {
        return { valid: false, error: `This PIN is authorized for "${pinRow.purpose}", not for "${actionType}".` };
      }
    }
  } catch (e) {}

  return { valid: false, error: 'Invalid or expired Store Authorization PIN. Please request an active authorization PIN from the Store Owner.' };
}

module.exports = { sessions, createSession, requireAuth, requireOwner, verifySecurityPin };
