const { db } = require('./db');

const insertLog = db.prepare(`
  INSERT INTO audit_log (user_id, device_fingerprint, action, details, status)
  VALUES (?, ?, ?, ?, ?)
`);

/**
 * Record an entry in the tamper-evident audit log.
 * Call this for every sensitive or denied action (price overrides,
 * manual stock adjustments, failed logins, credit approvals, etc).
 */
function logAction({ userId, deviceFingerprint, action, details, status }) {
  insertLog.run(userId || null, deviceFingerprint || 'unknown-device', action, details || '', status);
}

module.exports = { logAction };
