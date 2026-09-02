const { db } = require('./db');
const { syncToSupabase } = require('./supabaseSync');

const insertLog = db.prepare(`
  INSERT INTO audit_log (user_id, device_fingerprint, action, details, status)
  VALUES (?, ?, ?, ?, ?)
`);

/**
 * Record an entry in the tamper-evident audit log.
 * Writes to local ledger and syncs in real-time to Supabase cloud.
 */
function logAction({ userId, deviceFingerprint, action, details, status }) {
  try {
    const info = insertLog.run(userId || null, deviceFingerprint || 'unknown-device', action, details || '', status);
    const logId = info && info.lastInsertRowid ? Number(info.lastInsertRowid) : undefined;
    
    // Non-blocking real-time push to Supabase
    syncToSupabase('audit_log', {
      ...(logId ? { log_id: logId } : {}),
      user_id: userId || null,
      device_fingerprint: deviceFingerprint || 'unknown-device',
      action: action,
      details: details || '',
      status: status
    });
  } catch (err) {
    console.error('Audit logging error:', err.message);
  }
}

module.exports = { logAction };
