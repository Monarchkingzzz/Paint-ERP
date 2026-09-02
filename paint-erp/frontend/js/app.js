// ==========================================================================
// KENYAN PAINT HARDWARE ERP & POS - EXECUTIVE ENTERPRISE APPLICATION
// High-End Retail, Tinting, Real-time Cashbook, Reports, Suppliers & Credit
// ==========================================================================

function localStorage_getToken() {
  try {
    return localStorage.getItem('paint_erp_token') || sessionStorage.getItem('paint_erp_token') || null;
  } catch (e) {
    return null;
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('paint_erp_user') || sessionStorage.getItem('paint_erp_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setToken(token) {
  state.token = token;
  try {
    if (token) {
      localStorage.setItem('paint_erp_token', token);
      sessionStorage.setItem('paint_erp_token', token);
    } else {
      localStorage.removeItem('paint_erp_token');
      sessionStorage.removeItem('paint_erp_token');
    }
  } catch (e) {}
}

function saveUser(user) {
  state.user = user;
  try {
    if (user) {
      localStorage.setItem('paint_erp_user', JSON.stringify(user));
      sessionStorage.setItem('paint_erp_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('paint_erp_user');
      sessionStorage.removeItem('paint_erp_user');
    }
  } catch (e) {}
}

function getInitialActiveView() {
  const hash = (window.location.hash || '').replace('#', '').trim();
  const validViews = ['dashboard', 'mix', 'pos', 'quotes', 'stock', 'sales', 'reports', 'cashbook', 'suppliers', 'credit', 'employees', 'audit'];
  if (hash && validViews.includes(hash)) return hash;
  const saved = localStorage.getItem('paint_erp_active_view') || sessionStorage.getItem('paint_erp_active_view');
  if (saved && validViews.includes(saved)) return saved;
  return 'dashboard';
}

const state = {
  token: localStorage_getToken(),
  user: getStoredUser(),
  activeView: getInitialActiveView(),
  cart: [],
  inventoryProducts: [],
  stockAlerts: { total_alerts: 0, low_bases: [], low_pigments: [], low_products: [] }
};

// SVG Icon Library including custom Paint Tin + Spanner Logo
const Icons = {
  dashboard: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  logo: `<svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>
      <linearGradient id="mGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="50%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </linearGradient>
      <linearGradient id="gDrip" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="14" fill="#090d16" stroke="#1e293b" stroke-width="1.8"/>
    <path d="M13 24 L17 51 Q17 54 21 54 L37 54 Q41 54 41 51 L45 24 Z" fill="url(#pGrad)" stroke="#38bdf8" stroke-width="1.4"/>
    <ellipse cx="29" cy="24" rx="16" ry="4" fill="#0284c7" stroke="#38bdf8" stroke-width="1.4"/>
    <ellipse cx="29" cy="24" rx="13" ry="2.8" fill="url(#gDrip)"/>
    <path d="M14 24 Q29 9 44 24" fill="none" stroke="url(#mGrad)" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M22 25 Q23 34 24 37 Q25 39 26 37 Q27 33 28 25 Z" fill="url(#gDrip)"/>
    <path d="M31 25 Q32 31 33 33 Q34 35 35 33 Q36 29 37 25 Z" fill="#38bdf8"/>
    <g transform="rotate(-38 41 33)">
      <rect x="38" y="14" width="6" height="38" rx="3" fill="url(#mGrad)" stroke="#ffffff" stroke-width="0.8"/>
      <path d="M36 17 C34 13 35 7 41 6 C45 5 48 8 50 11 L46 14 C44 13 43 13 42 14 L37 17 Z" fill="url(#mGrad)" stroke="#ffffff" stroke-width="0.8"/>
      <circle cx="41" cy="52" r="5.5" fill="url(#mGrad)" stroke="#ffffff" stroke-width="0.8"/>
      <circle cx="41" cy="52" r="2.8" fill="#090d16"/>
    </g>
  </svg>`,
  paint: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></svg>`,
  pos: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  quotes: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
  stock: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  reports: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/><circle cx="19" cy="9" r="2"/></svg>`,
  cashbook: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 10h20M7 8h10"/></svg>`,
  suppliers: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  credit: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  employees: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  sales: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  audit: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  key: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-4 4-2-2-4 4 4 4 2-2 4 4 2-2 3.5-3.5"/></svg>`,
  logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`,
  printer: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>`,
  download: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  phone: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  lock: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  bell: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  pinLookup: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6M8 11h6"/></svg>`
};

function getDeviceFingerprint() {
  let fp = localStorage.getItem('device_fp') || sessionStorage.getItem('device_fp');
  if (!fp) {
    fp = `${navigator.platform || 'device'}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem('device_fp', fp);
      sessionStorage.setItem('device_fp', fp);
    } catch (e) {}
  }
  return fp;
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json', 'X-Device-Fingerprint': getDeviceFingerprint() },
    state.token ? { Authorization: `Bearer ${state.token}` } : {},
    options.headers || {}
  );
  const res = await fetch(path, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ---------------- Toast notification ----------------
function toast(msg, isError = false) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `${isError ? '⚠️' : '✅'} <span>${msg}</span>`;
  el.className = isError ? 'toast error show' : 'toast show';
  setTimeout(() => el.classList.remove('show'), 3800);
}

// ---------------- HTML Escaping Utility ----------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------- Generic Modal Helpers ----------------
function closeModal() {
  const m = document.getElementById('modal-container');
  if (m) m.innerHTML = '';
}
window.closeModal = closeModal;

function showModal(html) {
  let m = document.getElementById('modal-container');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal-container';
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal-card" style="max-width: 680px; width: 92%;">
        ${html}
      </div>
    </div>
  `;
}
window.showModal = showModal;

// ---------------- Input Utilities (Password Eye & Clipboard) ----------------
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '🙈';
    btn.title = 'Hide Password';
  } else {
    input.type = 'password';
    btn.innerHTML = '👁️';
    btn.title = 'Show Password';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function copyJsonToClipboard(jsonStr, btn) {
  navigator.clipboard.writeText(jsonStr).then(() => {
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  }).catch(() => {
    toast('Copied to clipboard');
  });
}
window.copyJsonToClipboard = copyJsonToClipboard;

// ---------------- Authentication ----------------
async function login(phone, password) {
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phone, password })
    });
    setToken(data.token);
    saveUser(data.user);
    renderApp();
    toast(`Welcome, ${data.user.full_name}! Signed in as ${data.user.role || data.user.system_role}.`);
    checkStockAlerts();
  } catch (err) {
    toast(err.message, true);
  }
}

async function logout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
  setToken(null);
  saveUser(null);
  renderApp();
  toast('Signed out successfully.');
}

// ---------------- Real-time Stock Quantity Alert Checker ----------------
async function checkStockAlerts() {
  if (!state.token) return;
  try {
    const alerts = await apiFetch('/api/stock/alerts');
    state.stockAlerts = alerts;
    updateTopBarAlertPill();
  } catch (err) {}
}

function updateTopBarAlertPill() {
  const container = document.getElementById('stock-alert-container');
  if (!container) return;
  const count = state.stockAlerts.total_alerts || 0;
  if (count > 0) {
    container.innerHTML = `
      <div class="stock-alert-pill" onclick="showLowStockModal()" title="Click to view ${count} low stock items">
        <span class="pulse-dot-danger"></span>
        <span>⚠️ ${count} Low Stock Item${count === 1 ? '' : 's'}</span>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="stock-alert-pill ok" onclick="showLowStockModal()" title="All stock levels are optimal">
        <span class="pulse-dot-success"></span>
        <span>✅ Stock Healthy</span>
      </div>
    `;
  }
}

function showLowStockModal() {
  const modal = document.getElementById('modal-container');
  const alerts = state.stockAlerts || {};
  const lowBases = alerts.low_bases || [];
  const lowPigments = alerts.low_pigments || [];
  const lowProducts = alerts.low_products || [];
  const total = alerts.total_alerts || 0;

  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:760px;">
        <div class="modal-header-bar">
          <h3>🚨 Inventory Stock Quantity Alarms (${total})</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <p style="font-size:0.86rem; color:var(--text-muted); margin-bottom:1.2rem;">
          These items have reached or fallen below their minimum threshold and require immediate purchase or reordering.
        </p>

        ${total === 0 ? `
          <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-md); padding:1.8rem; text-align:center; color:#065f46;">
            <h4>🎉 All inventory items are well-stocked above minimum thresholds!</h4>
          </div>
        ` : `
          <div class="table-responsive" style="max-height:360px; overflow-y:auto;">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min Threshold</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${lowBases.map(b => `
                  <tr>
                    <td><strong>${b.manufacturer} ${b.base_name} (${b.tin_size_litres}L)</strong></td>
                    <td><span class="brand-pill">Paint Base</span></td>
                    <td><strong style="color:#dc2626; font-size:1.05rem;">${b.quantity_in_stock} Tins</strong></td>
                    <td>${b.low_stock_threshold} Tins</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-container').innerHTML=''; showView('stock');">
                        📦 View in Stock
                      </button>
                    </td>
                  </tr>
                `).join('')}

                ${lowPigments.map(p => `
                  <tr>
                    <td><strong>${p.pigment_name} (${p.pigment_code})</strong></td>
                    <td><span class="brand-pill" style="background:#fef3c7; color:#92400e;">Pigment Droplet</span></td>
                    <td><strong style="color:#dc2626; font-size:1.05rem;">${p.quantity_ml} ml</strong></td>
                    <td>${p.low_stock_threshold_ml} ml</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-container').innerHTML=''; showView('stock');">
                        📦 View in Stock
                      </button>
                    </td>
                  </tr>
                `).join('')}

                ${lowProducts.map(p => `
                  <tr>
                    <td><strong>${p.product_name}</strong><br/><span class="muted small">${p.sku || ''}</span></td>
                    <td><span class="brand-pill" style="background:#e0e7ff; color:#4338ca;">Hardware</span></td>
                    <td><strong style="color:#dc2626; font-size:1.05rem;">${p.quantity_in_stock} Units</strong></td>
                    <td>${p.low_stock_threshold} Units</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-container').innerHTML=''; showView('stock');">
                        📦 View in Stock
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; border-top:1px solid var(--border-light); padding-top:1rem;">
          <button class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Close</button>
          ${state.user && state.user.system_role === 'Owner' ? `
            <button class="btn btn-primary" onclick="document.getElementById('modal-container').innerHTML=''; showView('suppliers');">
              🏭 Go to Suppliers to Reorder
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ---------------- Root View Rendering ----------------
const root = document.getElementById('app-root');

function renderApp() {
  if (!state.token || !state.user) {
    renderLogin();
  } else {
    renderShell();
  }
}

function renderLogin() {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-logo-svg-wrap" style="width:68px; height:68px; margin:0 auto 1.1rem; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
            ${Icons.logo}
          </div>
          <h1 style="font-size:1.6rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.4px;">Paint &amp; Hardware ERP</h1>
          <p style="font-size:0.86rem; color:var(--text-muted); margin-top:3px;">Kenyan Enterprise POS, Tinting &amp; Real-Time Operations</p>
        </div>

        <form id="login-form">
          <div class="form-floating">
            <label>Phone Number</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.phone}</span>
              <input type="text" id="login-phone" placeholder="254700000000" value="254700000000" required />
            </div>
          </div>

          <div class="form-floating" style="margin-top:0.9rem;">
            <label>Password</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.lock}</span>
              <input type="password" id="login-password" placeholder="••••••••" value="owner123" required />
              <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('login-password', this)" title="Show/Hide Password">👁️</button>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:0.3rem;">
            <a class="forgot-password-link" id="btn-open-forgot-pass">Forgot Password?</a>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:1rem;">
            Sign In to Terminal
          </button>
        </form>

        <div class="demo-accounts-pill" style="margin-top:1.5rem;">
          <h4>⚡ Quick Demo Access</h4>
          <div class="demo-btns-grid">
            <button type="button" class="btn-demo-quick" id="quick-login-owner">
              <strong>👑 Store Owner</strong>
              <span class="role">Full Admin, Reports &amp; Cashbook</span>
            </button>
            <button type="button" class="btn-demo-quick" id="quick-login-staff">
              <strong>⚡ Staff Attendant</strong>
              <span class="role">POS &amp; Paint Mixing Only</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="modal-container"></div>
  `;

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    login(
      document.getElementById('login-phone').value.trim(),
      document.getElementById('login-password').value
    );
  });

  document.getElementById('btn-open-forgot-pass').addEventListener('click', showForgotPasswordModal);

  document.getElementById('quick-login-owner').addEventListener('click', () => {
    login('254700000000', 'owner123');
  });

  document.getElementById('quick-login-staff').addEventListener('click', () => {
    login('254711111111', 'staff123');
  });
}

function showForgotPasswordModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:480px;">
        <div class="modal-header-bar">
          <h3>🔐 Password Recovery</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:var(--radius-md); padding:0.85rem 1rem; margin-bottom:1.2rem; font-size:0.84rem; color:#92400e;">
          💡 <strong>Security Notice:</strong> To reset your password, enter your registered phone number along with the <strong>6-digit Owner Security Authorization PIN</strong> (or Master PIN <code>849201</code>).
        </div>

        <form id="forgot-password-form">
          <div class="form-group">
            <label>Registered Phone Number</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.phone}</span>
              <input type="text" id="fp-phone" placeholder="e.g. 254711111111" required />
            </div>
          </div>

          <div class="form-group">
            <label>6-Digit Owner Security Authorization PIN</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.key}</span>
              <input type="text" id="fp-pin" placeholder="e.g. 849201" maxlength="6" style="font-family:var(--font-mono); font-size:1.15rem; font-weight:800; letter-spacing:4px; text-align:center;" required />
            </div>
          </div>

          <div class="form-group">
            <label>New Password (min 6 characters)</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.lock}</span>
              <input type="password" id="fp-new-pass" placeholder="••••••••" minlength="6" required />
              <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('fp-new-pass', this)" title="Show/Hide Password">👁️</button>
            </div>
          </div>

          <div class="form-group">
            <label>Confirm New Password</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.lock}</span>
              <input type="password" id="fp-confirm-pass" placeholder="••••••••" minlength="6" required />
              <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('fp-confirm-pass', this)" title="Show/Hide Password">👁️</button>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Reset Password</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('fp-phone').value.trim();
    const pin = document.getElementById('fp-pin').value.trim();
    const newPass = document.getElementById('fp-new-pass').value;
    const confirmPass = document.getElementById('fp-confirm-pass').value;

    if (newPass !== confirmPass) {
      toast('Passwords do not match.', true);
      return;
    }

    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone, security_pin: pin, new_password: newPass })
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      const phoneInput = document.getElementById('login-phone');
      if (phoneInput) phoneInput.value = phone;
      const passInput = document.getElementById('login-password');
      if (passInput) passInput.value = newPass;
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function getPageTitle(view) {
  switch (view) {
    case 'dashboard': return '📊 Executive Store Dashboard (Real-Time)';
    case 'mix': return '🎨 Custom Paint Tinting & Formulation PINs';
    case 'pin-lookup': return '🔍 Paint PIN Customer Recall & Repeat Formulation';
    case 'pos': return '🛒 Point of Sale Terminal & Checkout';
    case 'quotes': return '📋 Pro-Forma Quotations (14-Day Price Lock)';
    case 'stock': return '📦 Smart Inventory & Stock Quantities';
    case 'sales': return '🧾 Real-Time Sales Orders & Invoices';
    case 'reports': return '📊 Business Reports Center (Owner Portal)';
    case 'cashbook': return '💵 Real-Time Cashbook & Expenses';
    case 'suppliers': return '🏭 Suppliers & Account Balances';
    case 'credit': return '👥 Customer Credit & Debt Clearances';
    case 'employees': return '👥 Employee Management & Privileges';
    case 'audit': return '🛡️ Security Audit Logs (Real-Time)';
    default: return 'Paint & Hardware ERP';
  }
}

function renderShell() {
  const userRole = (state.user && (state.user.role || state.user.system_role)) || 'Staff';
  const isOwner = userRole === 'Owner';
  const cartCount = state.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  root.innerHTML = `
    <div class="shell">
      <!-- Executive Dark Left Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header" onclick="showView('dashboard')">
          <div class="brand-logo-svg-wrap">
            ${Icons.logo}
          </div>
          <div class="brand-info">
            <div class="brand-title">Paint &amp; Hardware</div>
            <div class="brand-sub">Enterprise ERP &amp; POS</div>
          </div>
        </div>

        <div class="sidebar-nav-scroll">
          <div class="nav-section-label">OVERVIEW &amp; COUNTER</div>
          <nav class="sidebar-nav">
            <button data-view="dashboard" class="${state.activeView === 'dashboard' ? 'active' : ''}">
              <span class="nav-icon">${Icons.dashboard}</span>
              <span class="nav-label">Dashboard</span>
            </button>
            <button data-view="mix" class="${state.activeView === 'mix' ? 'active' : ''}">
              <span class="nav-icon">${Icons.paint}</span>
              <span class="nav-label">Mix Paint &amp; Tinting</span>
            </button>
            <button data-view="pin-lookup" class="${state.activeView === 'pin-lookup' ? 'active' : ''}">
              <span class="nav-icon">${Icons.pinLookup}</span>
              <span class="nav-label">Paint PIN Recall &amp; Repeat</span>
            </button>
            <button data-view="pos" class="${state.activeView === 'pos' ? 'active' : ''}">
              <span class="nav-icon">${Icons.pos}</span>
              <span class="nav-label">POS Checkout</span>
              ${cartCount > 0 ? `<span class="nav-badge" id="top-cart-badge">${cartCount}</span>` : ''}
            </button>
            <button data-view="quotes" class="${state.activeView === 'quotes' ? 'active' : ''}">
              <span class="nav-icon">${Icons.quotes}</span>
              <span class="nav-label">Pro-Forma Quotes</span>
            </button>
            <button data-view="stock" class="${state.activeView === 'stock' ? 'active' : ''}">
              <span class="nav-icon">${Icons.stock}</span>
              <span class="nav-label">Smart Inventory</span>
            </button>
            <button data-view="sales" class="${state.activeView === 'sales' ? 'active' : ''}">
              <span class="nav-icon">${Icons.sales}</span>
              <span class="nav-label">Sales Orders</span>
            </button>
          </nav>

          ${isOwner ? `
            <div class="nav-section-label" style="margin-top: 1.4rem;">OWNER MANAGEMENT &amp; FINANCE</div>
            <nav class="sidebar-nav">
              <button data-view="reports" class="${state.activeView === 'reports' ? 'active' : ''}">
                <span class="nav-icon">${Icons.reports}</span>
                <span class="nav-label">Reports Center</span>
              </button>
              <button data-view="cashbook" class="${state.activeView === 'cashbook' ? 'active' : ''}">
                <span class="nav-icon">${Icons.cashbook}</span>
                <span class="nav-label">Cashbook &amp; Expenses</span>
              </button>
              <button data-view="suppliers" class="${state.activeView === 'suppliers' ? 'active' : ''}">
                <span class="nav-icon">${Icons.suppliers}</span>
                <span class="nav-label">Suppliers</span>
              </button>
              <button data-view="credit" class="${state.activeView === 'credit' ? 'active' : ''}">
                <span class="nav-icon">${Icons.credit}</span>
                <span class="nav-label">Customer Credit</span>
              </button>
              <button data-view="employees" class="${state.activeView === 'employees' ? 'active' : ''}">
                <span class="nav-icon">${Icons.employees}</span>
                <span class="nav-label">Employees</span>
              </button>
              <button data-view="audit" class="${state.activeView === 'audit' ? 'active' : ''}">
                <span class="nav-icon">${Icons.audit}</span>
                <span class="nav-label">Security Audit Logs</span>
              </button>
            </nav>
          ` : ''}
        </div>

        <!-- Sidebar Footer User Card -->
        <div class="sidebar-footer">
          <div class="user-profile-card" id="btn-open-profile" title="View Profile & Security PINs">
            <div class="user-avatar">${(state.user.full_name || 'U').slice(0, 2).toUpperCase()}</div>
            <div class="user-details">
              <div class="user-name">${state.user.full_name}</div>
              <div class="user-role-badge">${isOwner ? '👑 STORE OWNER' : '⚡ ATTENDANT'}</div>
            </div>
          </div>
          <div class="sidebar-footer-actions">
            <button id="btn-profile-gear" class="btn-icon-sidebar" title="User Profile & Security PINs">
              ${Icons.user}
            </button>
            <button id="logout-btn" class="btn-icon-sidebar logout" title="Sign Out">
              ${Icons.logout}
            </button>
          </div>
        </div>
      </aside>

      <!-- Right Main Viewport Area -->
      <div class="main-viewport">
        <header class="topbar-header">
          <div class="page-breadcrumb" id="page-breadcrumb">
            <span class="page-title-text">${getPageTitle(state.activeView)}</span>
          </div>
          <div class="topbar-actions">
            <!-- Low Stock Real-Time Indicator -->
            <div id="stock-alert-container"></div>

            <div class="online-pill" id="network-status-pill">
              <span class="pulse-dot"></span>
              <span id="online-text">Live Sync (Port 4000)</span>
            </div>
            ${isOwner ? `
              <button class="btn btn-secondary btn-sm" onclick="showMpesaConfigModal()" style="display:inline-flex; align-items:center; gap:0.4rem; background:#ecfdf5; border-color:#a7f3d0; color:#065f46; font-weight:700;">
                📱 Daraja M-Pesa Setup
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="showBulkImportModal()" style="display:inline-flex; align-items:center; gap:0.4rem; background:#fffbeb; border-color:#fde68a; color:#92400e;">
              📥 Fandecks &amp; Catalog (1,000+)
            </button>
            <button class="btn btn-secondary btn-sm" onclick="showUserProfileModal()" style="display:inline-flex; align-items:center; gap:0.4rem;">
              ${Icons.user} Profile &amp; PINs
            </button>
          </div>
        </header>

        <main id="view-container"></main>
        <div id="modal-container"></div>
      </div>
    </div>
  `;

  document.querySelectorAll('.sidebar-nav button').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('btn-open-profile').addEventListener('click', showUserProfileModal);
  document.getElementById('btn-profile-gear').addEventListener('click', showUserProfileModal);

  updateTopBarAlertPill();
  checkStockAlerts();
  showView(state.activeView);
}

function showView(viewName) {
  state.activeView = viewName;
  sessionStorage.setItem('paint_erp_active_view', viewName);
  if (window.location.hash !== '#' + viewName) {
    window.location.hash = viewName;
  }
  document.querySelectorAll('.sidebar-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });
  const breadcrumb = document.getElementById('page-breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `<span class="page-title-text">${getPageTitle(viewName)}</span>`;
  }
  const container = document.getElementById('view-container');
  if (!container) return;

  switch (viewName) {
    case 'dashboard': renderDashboardView(container); break;
    case 'mix': renderMixView(container); break;
    case 'pin-lookup': renderPinLookupView(container); break;
    case 'pos': renderPosView(container); break;
    case 'quotes': renderQuotesView(container); break;
    case 'stock': renderStockView(container); break;
    case 'sales': renderSalesView(container); break;
    case 'reports': renderReportsCenterView(container); break;
    case 'cashbook': renderCashbookView(container); break;
    case 'suppliers': renderSuppliersView(container); break;
    case 'credit': renderCreditView(container); break;
    case 'employees': renderEmployeesView(container); break;
    case 'audit': renderAuditView(container); break;
    default: renderDashboardView(container);
  }
}
window.showView = showView;

window.addEventListener('hashchange', () => {
  const hash = (window.location.hash || '').replace('#', '').trim();
  const validViews = ['dashboard', 'mix', 'pin-lookup', 'pos', 'quotes', 'stock', 'sales', 'reports', 'cashbook', 'suppliers', 'credit', 'employees', 'audit'];
  if (hash && validViews.includes(hash) && hash !== state.activeView) {
    showView(hash);
  }
});

// ==========================================================================
// REAL-TIME EXECUTIVE DASHBOARD VIEW
// ==========================================================================
async function renderDashboardView(container) {
  container.innerHTML = `
    <div style="padding: 0.2rem 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.4rem; flex-wrap:wrap; gap:0.8rem;">
        <div>
          <h2 style="font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0; display:flex; align-items:center; gap:0.5rem;">
            📊 Store Performance Dashboard
          </h2>
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
            Live store operations, financial asset valuation, profits, debt, and cashflow.
          </p>
        </div>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <button class="btn btn-secondary btn-sm" onclick="renderDashboardView(document.getElementById('view-container'))" style="display:inline-flex; align-items:center; gap:0.4rem;">
            🔄 Refresh Live Stats
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showView('reports')" style="background:#0f172a; color:white; border-color:#0f172a; display:inline-flex; align-items:center; gap:0.4rem;">
            📈 Reports Center
          </button>
        </div>
      </div>

      <div id="dashboard-loading" style="text-align:center; padding:3.5rem 0;">
        <div class="spinner"></div>
        <p style="margin-top:1rem; font-size:0.9rem; color:#64748b;">Loading live store metrics...</p>
      </div>

      <div id="dashboard-content" style="display:none;"></div>
    </div>
  `;

  try {
    const data = await apiFetch('/api/reports/dashboard-overview');
    const loading = document.getElementById('dashboard-loading');
    const content = document.getElementById('dashboard-content');
    if (!content) return;
    if (loading) loading.style.display = 'none';
    content.style.display = 'block';

    const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

    content.innerHTML = `
      <!-- 6 Real-time Store Health Cards (2 Rows of 3 balanced cards) -->
      <div class="dashboard-6kpi-grid">
        
        <!-- 1. Sales Revenue -->
        <div class="dashboard-card" style="border-left: 4px solid #0284c7;">
          <div class="kpi-metric-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>TOTAL SALES (${data.month_label.toUpperCase()})</span>
            <span>💳</span>
          </div>
          <div class="kpi-metric-val" style="color: #0284c7; margin-bottom: 0.25rem;">
            KSh ${fmt(data.sales_this_month_kes)}
          </div>
          <div style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">
            Today: <strong style="color:#0f172a;">KSh ${fmt(data.sales_today_kes)}</strong> (${data.orders_count_today} orders)
          </div>
        </div>

        <!-- 2. Stock Valuation -->
        <div class="dashboard-card" style="border-left: 4px solid #f59e0b;">
          <div class="kpi-metric-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>STOCK INVENTORY VALUE</span>
            <span>📦</span>
          </div>
          <div class="kpi-metric-val" style="color: #0f172a; margin-bottom: 0.25rem;">
            KSh ${fmt(data.stock_valuation.total_cost_worth_kes)}
          </div>
          <div style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">
            Retail: <strong style="color:#16a34a;">KSh ${fmt(data.stock_valuation.total_retail_worth_kes)}</strong> (${data.stock_valuation.total_items_tracked} SKUs)
          </div>
        </div>

        <!-- 3. Expenses -->
        <div class="dashboard-card" style="border-left: 4px solid #ef4444;">
          <div class="kpi-metric-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>OPERATING EXPENSES</span>
            <span>🧾</span>
          </div>
          <div class="kpi-metric-val" style="color: #ef4444; margin-bottom: 0.25rem;">
            <span style="color:#0284c7;">KSh ${fmt(data.expenses_this_month_kes)}</span>
          </div>
          <div style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">
            Cost of Goods: <strong style="color:#0f172a;">KSh ${fmt(data.cogs_this_month_kes)}</strong>
          </div>
        </div>

        <!-- 4. Estimated Net Profit -->
        <div class="dashboard-card" style="border-left: 4px solid ${data.net_profit_this_month_kes >= 0 ? '#16a34a' : '#dc2626'};">
          <div class="kpi-metric-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>ESTIMATED NET PROFIT</span>
            <span>💰</span>
          </div>
          <div class="kpi-metric-val" style="color: ${data.net_profit_this_month_kes >= 0 ? '#16a34a' : '#dc2626'}; margin-bottom: 0.25rem;">
            KSh ${fmt(data.net_profit_this_month_kes)}
          </div>
          <div style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">
            Net Margin: <strong style="color:${data.net_profit_this_month_kes >= 0 ? '#16a34a' : '#dc2626'};">${data.net_margin_pct}%</strong> (Gross: KSh ${fmt(data.gross_profit_this_month_kes)})
          </div>
        </div>

        <!-- 5. Customer Credit -->
        <div class="dashboard-card" style="border-left: 4px solid #8b5cf6;">
          <div class="kpi-metric-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>CUSTOMER CREDIT OWED</span>
            <span>👥</span>
          </div>
          <div class="kpi-metric-val" style="color: #8b5cf6; margin-bottom: 0.25rem;">
            KSh ${fmt(data.customer_credit.total_debt_kes)}
          </div>
          <div style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">
            <strong style="color:#0f172a;">${data.customer_credit.debtors_count}</strong> active fundi accounts
          </div>
        </div>

        <!-- 6. Supplier Balances -->
        <div class="dashboard-card" style="border-left: 4px solid #ea580c;">
          <div class="kpi-metric-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>SUPPLIER BALANCES OWED</span>
            <span>🏭</span>
          </div>
          <div class="kpi-metric-val" style="color: #ea580c; margin-bottom: 0.25rem;">
            KSh ${fmt(data.supplier_payables.total_payable_kes)}
          </div>
          <div style="font-size: 0.78rem; color: #64748b; white-space: nowrap;">
            <strong style="color:#0f172a;">${data.supplier_payables.suppliers_count}</strong> suppliers with pending bills
          </div>
        </div>

      </div>

      <!-- Quick Action Launcher Bar -->
      <div class="dashboard-quick-ops-bar">
        <span class="quick-ops-label">⚡ Quick Operations:</span>
        <div class="quick-ops-btns">
          <button class="btn btn-secondary btn-sm" onclick="showView('mix')">🎨 Mix &amp; Tint Paint</button>
          <button class="btn btn-secondary btn-sm" onclick="showView('pos')">🛒 Point of Sale</button>
          <button class="btn btn-secondary btn-sm" onclick="showView('stock')">📦 Inventory &amp; Stock</button>
          <button class="btn btn-secondary btn-sm" onclick="showView('cashbook')">💵 Cashbook &amp; Expenses</button>
          <button class="btn btn-secondary btn-sm" onclick="showView('suppliers')">🏭 Suppliers</button>
          <button class="btn btn-secondary btn-sm" onclick="showView('credit')">👥 Customer Debt</button>
          <button class="btn btn-secondary btn-sm" onclick="showView('audit')">🛡️ Audit Logs</button>
        </div>
      </div>

      <!-- Lower 2-Column Real-time Layout -->
      <div class="reports-2col-layout">
        
        <!-- Left Column: Top Selling Products & Live Cashbook -->
        <div style="display:flex; flex-direction:column; gap:1.2rem;">
          
          <!-- Top Products Profitability -->
          <div class="report-box-card">
            <div class="report-box-header">
              <h3>🏆 Top Selling Paint &amp; Hardware Products</h3>
              <button class="btn btn-secondary btn-sm" onclick="showView('reports')" style="font-size:0.75rem; padding:0.2rem 0.6rem;">View All</button>
            </div>

            ${(!data.top_products || !data.top_products.length) ? `
              <p style="font-size:0.85rem; color:#64748b; text-align:center; padding:1.5rem 0;">No product sales recorded yet for ${data.month_label}.</p>
            ` : `
              <div>
                ${data.top_products.map((p, idx) => `
                  <div class="product-profit-row">
                    <div class="pp-left">
                      <div class="pp-name">${idx + 1}. ${escapeHtml(p.name)}</div>
                      <div class="pp-sub">${p.units_sold} units sold · Revenue: KSh ${fmt(p.revenue_kes)}</div>
                    </div>
                    <div class="pp-profit">+KSh ${fmt(p.profit_kes)}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Cashflow & Treasury Accounts -->
          <div class="report-box-card">
            <div class="report-box-header">
              <h3>💳 Live Cash &amp; Digital Accounts</h3>
              <button class="btn btn-secondary btn-sm" onclick="showView('cashbook')" style="font-size:0.75rem; padding:0.2rem 0.6rem;">Open Cashbook</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem;">
              ${(data.cash_accounts || []).map(acc => `
                <div style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; padding:0.85rem; text-align:center;">
                  <div style="font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:3px;">
                    ${acc.account_type === 'Cash' ? '💵' : acc.account_type === 'M-Pesa' ? '📱' : '🏦'} ${escapeHtml(acc.account_name)}
                  </div>
                  <div style="font-family:var(--font-mono); font-weight:800; font-size:1.1rem; color:#0f172a; white-space:nowrap;">
                    KSh ${fmt(acc.balance_kes)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Right Column: Low Stock Alarms & Recent Audit Activity -->
        <div style="display:flex; flex-direction:column; gap:1.2rem;">
          
          <!-- Low Stock Alarms -->
          <div class="report-box-card">
            <div class="report-box-header">
              <h3>🚨 Depleted Stock Alerts (${(data.low_stock_items || []).length})</h3>
              <button class="btn btn-secondary btn-sm" onclick="showView('suppliers')" style="font-size:0.75rem; padding:0.2rem 0.6rem; color:#c2410c; border-color:#fed7aa; background:#fff7ed;">
                🏭 Reorder
              </button>
            </div>

            ${(!data.low_stock_items || !data.low_stock_items.length) ? `
              <p style="font-size:0.85rem; color:#16a34a; text-align:center; padding:1.5rem 0;">✅ All paint tins, pigments &amp; hardware items are above threshold.</p>
            ` : `
              <div>
                ${data.low_stock_items.map(item => `
                  <div class="low-stock-table-row">
                    <div class="ls-left">
                      <div class="ls-name">${escapeHtml(item.name)}</div>
                      <div class="ls-sub">Reorder Threshold: ${item.low_stock_threshold} ${item.unit}</div>
                    </div>
                    <div class="ls-qty">${item.current_qty} ${item.unit}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Live Security & Audit Trail -->
          <div class="report-box-card">
            <div class="report-box-header">
              <h3>🛡️ Live Security &amp; Activity Stream</h3>
              <button class="btn btn-secondary btn-sm" onclick="showView('audit')" style="font-size:0.75rem; padding:0.2rem 0.6rem;">Full Audit Log</button>
            </div>

            ${(!data.recent_audit_logs || !data.recent_audit_logs.length) ? `
              <p style="font-size:0.85rem; color:#64748b; text-align:center; padding:1.5rem 0;">No recent audit logs.</p>
            ` : `
              <div style="display:flex; flex-direction:column; gap:0.55rem;">
                ${data.recent_audit_logs.map(log => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:#f8fafc; border-radius:8px; border:1px solid #f1f5f9; font-size:0.82rem;">
                    <div style="flex:1; margin-right:0.5rem; min-width:0;">
                      <div style="font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(log.action)}</div>
                      <div style="font-size:0.73rem; color:#64748b;">${escapeHtml(log.operator_name || 'System')} · ${new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="showView('audit')" style="padding:0.15rem 0.45rem; font-size:0.72rem; flex-shrink:0;">
                      Inspect
                    </button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  } catch (err) {
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.style.display = 'block';
      content.innerHTML = `<div class="status-pill failed" style="padding:1rem;">Failed to load dashboard: ${err.message}</div>`;
    }
  }
}



function parsePigmentFormula(formulaStr) {
  if (!formulaStr) return {};
  if (typeof formulaStr === 'object') return formulaStr;

  try {
    if (typeof formulaStr === 'string' && formulaStr.trim().startsWith('{')) {
      return JSON.parse(formulaStr);
    }
  } catch (e) {}

  const result = {};
  if (typeof formulaStr === 'string') {
    const parts = formulaStr.split(',');
    for (const part of parts) {
      const [code, val] = part.split(':');
      if (code && val !== undefined) {
        result[code.trim()] = parseFloat(val.trim()) || 0;
      }
    }
  }
  return result;
}

function blendHexColorsClient(components) {
  let r = 0, g = 0, b = 0, totalRatio = 0;
  for (const c of components) {
    const hex = (c.hex_display || c.hex_code || '#FFFFFF').replace('#', '');
    const cr = parseInt(hex.substring(0, 2), 16) || 255;
    const cg = parseInt(hex.substring(2, 4), 16) || 255;
    const cb = parseInt(hex.substring(4, 6), 16) || 255;
    const ratio = parseFloat(c.ratio) || 0;
    r += cr * ratio;
    g += cg * ratio;
    b += cb * ratio;
    totalRatio += ratio;
  }
  if (totalRatio === 0) totalRatio = 1;
  const finalR = Math.min(255, Math.max(0, Math.round(r / totalRatio)));
  const finalG = Math.min(255, Math.max(0, Math.round(g / totalRatio)));
  const finalB = Math.min(255, Math.max(0, Math.round(b / totalRatio)));
  return '#' + [finalR, finalG, finalB].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}


// ==========================================================================
// 1. MIX PAINT & COLOR FORMULATION VIEW (SINGLE SHADE + MULTI-COLOR BLEND)
// ==========================================================================
let mixMode = 'single'; // 'single' | 'multi'
let multiBlendComponents = []; // Array of { ...color, ratio: 50 }
let multiBlendInitialized = false;

async function renderMixView(container) {
  let catalogColors = [];
  let baseTins = [];
  let pigmentsStock = [];

  try {
    const [cData, bData, pData] = await Promise.all([
      apiFetch('/api/colors/search?limit=3000'),
      apiFetch('/api/stock/bases'),
      apiFetch('/api/stock/pigments')
    ]);
    catalogColors = cData;
    baseTins = bData;
    pigmentsStock = pData;
    state.catalogColors = catalogColors;
    state.baseTins = baseTins;
  } catch (err) {
    console.error('Failed loading color catalog:', err);
  }

  // Initialize default 2 colors only once on very first application load
  if (!multiBlendInitialized && catalogColors.length >= 2) {
    multiBlendComponents = [
      { ...catalogColors[0], ratio: 70 },
      { ...catalogColors[1], ratio: 30 }
    ];
    multiBlendInitialized = true;
  }

  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.paint} Custom Paint Formulation &amp; PIN Tinting</h2>
        <p>Formulate factory-precise paint recipes, blend multiple shades for unique client colors, and track pigment droplet usage.</p>
      </div>
      <div class="view-header-actions">
        <div class="blend-mode-nav">
          <button id="mode-btn-single" class="blend-mode-btn ${mixMode === 'single' ? 'active' : ''}">
            🎯 Single Catalog Tinting
          </button>
          <button id="mode-btn-multi" class="blend-mode-btn ${mixMode === 'multi' ? 'active' : ''}">
            🎨 Multi-Color Blend Studio (2+ Shades)
          </button>
          <button id="mode-btn-recall" class="blend-mode-btn" onclick="showView('pin-lookup')">
            🔍 Recall Customer PIN / Re-Mix
          </button>
        </div>
      </div>
    </div>

    ${mixMode === 'single' ? renderSingleMixHtml(catalogColors, baseTins) : renderMultiBlendHtml(catalogColors, baseTins)}
  `;

  document.getElementById('mode-btn-single').addEventListener('click', () => {
    mixMode = 'single';
    renderMixView(container);
  });
  document.getElementById('mode-btn-multi').addEventListener('click', () => {
    mixMode = 'multi';
    renderMixView(container);
  });

  if (mixMode === 'single') {
    initSingleMixEvents(catalogColors, baseTins);
  } else {
    initMultiBlendEvents(catalogColors, baseTins);
  }
}

function renderSingleMixHtml(catalogColors, baseTins) {
  return `
    <div class="grid-layout-2col">
      <!-- Left Column: Search & Catalog Swatches Grid -->
      <section class="card-panel">
        <div class="card-panel-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0;">🎨 Manufacturer Shade Library</h3>
            <span style="font-size:0.75rem; color:#64748b;">Crown · Basco Duracoat · Kansai Plascon · Sadolin</span>
          </div>
          <span class="status-pill paid" id="fandeck-count-badge" style="font-weight:800; font-size:0.72rem;">
            ${catalogColors.length} Verified Shades
          </span>
        </div>

        <div class="fandeck-search-header">
          <div class="search-input-wrapper" style="position:relative;">
            <span class="search-icon">${Icons.search}</span>
            <input 
              type="text" 
              id="color-search-input" 
              placeholder="Search by color name, code, or brand (e.g. Green, Canopy, Amber, AP154-2, DC-912)..." 
              autocomplete="off"
            />
            <button id="color-search-clear-btn" class="pos-search-clear-btn" style="display:none;" title="Clear search">✕</button>
          </div>

          <!-- Static DOM Brand Pills for Instant 1-Click Delegation -->
          <div class="fandeck-brand-pills" id="fandeck-brand-pills-container">
            <span style="font-size:0.72rem; font-weight:800; color:#64748b;">Brands:</span>
            <button type="button" class="fandeck-brand-pill active" data-brand="ALL">All Brands (${catalogColors.length})</button>
            <button type="button" class="fandeck-brand-pill" data-brand="Crown">Crown Paints</button>
            <button type="button" class="fandeck-brand-pill" data-brand="Duracoat">Basco Duracoat</button>
            <button type="button" class="fandeck-brand-pill" data-brand="Plascon">Kansai Plascon</button>
            <button type="button" class="fandeck-brand-pill" data-brand="Sadolin">Sadolin Kenya</button>
          </div>
        </div>

        <div class="fandeck-grid-container" id="fandeck-grid-container">
          <!-- Swatches rendered by initSingleMixEvents -->
        </div>
      </section>

      <!-- Right Column: Precision Droplet Recipe & Dispenser -->
      <section class="card-panel">
        <div class="card-panel-header">
          <h3>Precision Droplet Recipe &amp; Dispenser</h3>
          <span class="sub-badge">Automated Formulation</span>
        </div>

        <!-- Selected Active Shade Hero Banner -->
        <div id="selected-color-summary-box"></div>

        <form id="tint-dispense-form">
          <div class="form-row">
            <div class="form-group">
              <label>Tin Size (Volume)</label>
              <select id="dispense-tin-size" required style="font-weight:700;">
                <option value="1">1 Litre (Retail Can)</option>
                <option value="4" selected>4 Litres (Standard Gallon)</option>
                <option value="20">20 Litres (Commercial Drum)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Quantity of Tins</label>
              <input type="number" id="dispense-quantity" value="1" min="1" required style="font-weight:800;" />
            </div>
          </div>

          <div class="form-group">
            <label>Compatible Base Paint Tin</label>
            <select id="dispense-base-select" required style="font-weight:600;">
              ${baseTins.map((b) => `
                <option value="${b.base_id}">
                  ${escapeHtml(b.manufacturer)} ${escapeHtml(b.base_name)} (${b.tin_size_litres}L) - ${b.quantity_in_stock > 0 ? `${b.quantity_in_stock} in stock` : '❌ Unavailable'} (KES ${b.unit_cost_kes})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Customer Phone Number</label>
              <div class="input-with-icon">
                <span class="input-icon">${Icons.phone}</span>
                <input type="text" id="dispense-customer-phone" placeholder="254712345678" value="254712345678" required />
              </div>
            </div>
            <div class="form-group">
              <label>Painter / Fundi Phone (Optional)</label>
              <div class="input-with-icon">
                <span class="input-icon">${Icons.phone}</span>
                <input type="text" id="dispense-painter-phone" placeholder="254799887766" />
              </div>
            </div>
          </div>

          <button type="submit" id="btn-single-dispense-submit" class="btn btn-primary btn-block btn-lg" style="margin-top:1.4rem; background:#0f172a; color:#f59e0b; border-color:#0f172a; font-weight:800;">
            🚀 Dispense &amp; Generate PIN
          </button>
        </form>
      </section>
    </div>
  `;
}

function initSingleMixEvents(catalogColors, baseTins) {
  let selectedColor = catalogColors[0] || null;
  let currentBrandFilter = 'ALL';
  let searchQuery = '';

  const brandDefinitions = [
    { key: 'ALL', label: 'All Brands', matcher: () => true },
    { key: 'Crown', label: 'Crown Paints', matcher: (m) => m.includes('crown') },
    { key: 'Duracoat', label: 'Basco Duracoat', matcher: (m) => m.includes('duracoat') || m.includes('basco') },
    { key: 'Plascon', label: 'Kansai Plascon', matcher: (m) => m.includes('plascon') || m.includes('kansai') },
    { key: 'Sadolin', label: 'Sadolin Kenya', matcher: (m) => m.includes('sadolin') }
  ];

  function updateBrandPills() {
    const searchFiltered = searchQuery
      ? catalogColors.filter(c => {
          const terms = searchQuery.toLowerCase().split(/\s+/);
          const targetStr = `${c.color_name} ${c.color_code} ${c.manufacturer}`.toLowerCase();
          return terms.every(t => targetStr.includes(t));
        })
      : catalogColors;

    brandDefinitions.forEach(b => {
      let count = 0;
      if (b.key === 'ALL') {
        count = searchFiltered.length;
      } else {
        count = searchFiltered.filter(c => b.matcher((c.manufacturer || '').toLowerCase())).length;
      }

      const btn = document.querySelector(`.fandeck-brand-pill[data-brand="${b.key}"]`);
      if (btn) {
        const isAvailable = count > 0;
        const isActive = currentBrandFilter === b.key;
        btn.dataset.available = isAvailable ? 'true' : 'false';
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('unavailable', !isAvailable);
        btn.innerText = isAvailable ? `${b.label} (${count})` : `${b.label} (Unavailable)`;
        btn.title = isAvailable ? `Filter by ${b.label} (${count} shades)` : `${b.label} is unavailable for current search`;
      }
    });
  }

  function updateColorSummary() {
    const box = document.getElementById('selected-color-summary-box');
    const submitBtn = document.getElementById('btn-single-dispense-submit');
    if (!box) return;

    if (!selectedColor) {
      box.innerHTML = `
        <div style="padding:2rem 1rem; text-align:center; background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:12px; margin-bottom:1.25rem;">
          <div style="font-size:1.8rem; margin-bottom:4px;">🎨</div>
          <strong style="color:#0f172a;">No Shade Selected</strong>
          <p style="font-size:0.8rem; color:#64748b; margin:2px 0 0;">Pick an available color swatch from the library to load its droplet formulation.</p>
        </div>
      `;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.innerText = '⚠️ Select Available Shade';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.innerText = '🚀 Dispense & Generate PIN';
    }

    const formulaObj = parsePigmentFormula(selectedColor.pigment_formula || selectedColor.pigment_recipe);
    const hexColor = selectedColor.hex_display || selectedColor.hex_code || '#2B6E47';

    box.innerHTML = `
      <!-- Luxury Hero Banner for Selected Shade -->
      <div class="single-tint-hero-card">
        <div class="single-tint-hero-swatch" style="background-color: ${hexColor};"></div>
        <div class="single-tint-hero-details">
          <span class="single-tint-hero-tag">${escapeHtml(selectedColor.manufacturer || 'Premium Paint')}</span>
          <h4 class="single-tint-hero-name">${escapeHtml(selectedColor.color_name)}</h4>
          <div class="single-tint-hero-meta">
            Code: ${escapeHtml(selectedColor.color_code)} · HEX: ${hexColor}
          </div>
        </div>
      </div>

      <!-- Pigment Formulation Breakdown Panel -->
      <div class="droplet-recipe-panel">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="font-size:0.8rem; margin:0; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; font-weight:800;">
            🔬 Factory Pigment Formulation (per Litre)
          </h4>
          <span style="font-size:0.72rem; color:#059669; font-weight:700;">Precision Droplet Dispense</span>
        </div>
        <div class="droplet-recipe-chips">
          ${Object.keys(formulaObj).length ? Object.entries(formulaObj).map(([pigCode, qty]) => `
            <div class="droplet-chip">
              <span class="droplet-dot"></span>
              <span><strong>${escapeHtml(pigCode)}:</strong> ${qty} ml/L</span>
            </div>
          `).join('') : '<div style="font-size:0.8rem; color:#64748b;">Pre-mixed standard tint formula.</div>'}
        </div>
      </div>
    `;
  }

  // Render shade library grid
  function renderSwatches() {
    const grid = document.getElementById('fandeck-grid-container');
    const badge = document.getElementById('fandeck-count-badge');
    const clearBtn = document.getElementById('color-search-clear-btn');
    if (!grid) return;

    if (clearBtn) {
      clearBtn.style.display = searchQuery ? 'flex' : 'none';
    }

    const brandDef = brandDefinitions.find(b => b.key === currentBrandFilter) || brandDefinitions[0];

    const filtered = catalogColors.filter((c) => {
      // Brand filter matcher
      if (!brandDef.matcher((c.manufacturer || '').toLowerCase())) return false;

      // Search filter (multi-word support)
      if (searchQuery) {
        const terms = searchQuery.toLowerCase().split(/\s+/);
        const targetStr = `${c.color_name} ${c.color_code} ${c.manufacturer}`.toLowerCase();
        if (!terms.every(t => targetStr.includes(t))) return false;
      }
      return true;
    });

    // Update brand pills text, availability and active states without replacing DOM
    updateBrandPills();

    if (badge) {
      badge.innerText = searchQuery || currentBrandFilter !== 'ALL' 
        ? `${filtered.length} of ${catalogColors.length} Shades`
        : `${catalogColors.length} Verified Shades`;
    }

    if (!filtered.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding:3.5rem 1rem; text-align:center; background:#f8fafc; border-radius:12px; border:1.5px dashed #fca5a5;">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">⚠️</div>
          <strong style="font-size:1.05rem; color:#dc2626;">Brand Shades Unavailable</strong>
          <p style="font-size:0.85rem; color:#64748b; margin:4px 0 1.2rem;">
            No shades available for <strong>${escapeHtml(brandDef.label)}</strong> ${searchQuery ? `matching "${escapeHtml(searchQuery)}"` : ''}.
          </p>
          <button type="button" id="btn-reset-to-all-brands" class="btn btn-secondary btn-sm" style="font-weight:800; background:white;">
            🔄 Switch to All Brands
          </button>
        </div>
      `;
      selectedColor = null;
      updateColorSummary();

      const resetBtn = document.getElementById('btn-reset-to-all-brands');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          currentBrandFilter = 'ALL';
          renderSwatches();
        });
      }
      return;
    }

    // If selectedColor is not in filtered list, auto-select first match
    if (!selectedColor || !filtered.some(c => c.color_id === selectedColor.color_id)) {
      selectedColor = filtered[0];
      updateColorSummary();
    }

    grid.innerHTML = filtered.slice(0, 300).map((c) => `
      <div class="color-swatch-card ${selectedColor && selectedColor.color_id === c.color_id ? 'active' : ''}" data-id="${c.color_id}">
        <div class="paint-swatch" style="background-color: ${c.hex_display || c.hex_code}; width:42px; height:42px; border-radius:8px; border:1px solid rgba(0,0,0,0.12); flex-shrink:0;"></div>
        <div class="swatch-text-meta">
          <div class="swatch-title" title="${escapeHtml(c.color_name)}">${escapeHtml(c.color_name)}</div>
          <div class="swatch-sub">${escapeHtml(c.color_code)}</div>
          <span class="swatch-brand-tag">${escapeHtml(c.manufacturer || 'Catalog')}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.color-swatch-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = Number(card.dataset.id);
        selectedColor = catalogColors.find((x) => x.color_id === id);
        grid.querySelectorAll('.color-swatch-card').forEach((k) => k.classList.remove('active'));
        card.classList.add('active');
        updateColorSummary();
      });
    });
  }

  // 1-Tap / 1-Click Instant Event Delegation on Brand Pills
  const pillsContainer = document.getElementById('fandeck-brand-pills-container');
  if (pillsContainer) {
    let lastBrandTapTime = 0;
    const handleBrandSelection = (btn) => {
      const now = Date.now();
      if (now - lastBrandTapTime < 200) return; // Prevent double trigger from pointerdown + click
      lastBrandTapTime = now;

      const brandKey = btn.dataset.brand;
      const isAvailable = btn.dataset.available !== 'false';

      if (!isAvailable) {
        toast(`${brandKey} has no shades matching "${searchQuery}". Showing all shades.`, true);
        currentBrandFilter = 'ALL';
      } else {
        currentBrandFilter = brandKey;
      }
      renderSwatches();
    };

    // Listen on pointerdown for instant 0ms touch/touchpad tap response
    pillsContainer.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.fandeck-brand-pill');
      if (btn) handleBrandSelection(btn);
    });

    // Fallback for click
    pillsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.fandeck-brand-pill');
      if (btn) handleBrandSelection(btn);
    });
  }

  // Instant response on swatch cards
  const gridContainer = document.getElementById('fandeck-grid-container');
  if (gridContainer) {
    let lastCardTapTime = 0;
    const handleCardSelection = (card) => {
      const now = Date.now();
      if (now - lastCardTapTime < 200) return;
      lastCardTapTime = now;

      const id = Number(card.dataset.id);
      selectedColor = catalogColors.find((x) => x.color_id === id);
      gridContainer.querySelectorAll('.color-swatch-card').forEach((k) => k.classList.remove('active'));
      card.classList.add('active');
      updateColorSummary();
    };

    gridContainer.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.color-swatch-card');
      if (card) handleCardSelection(card);
    });

    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.color-swatch-card');
      if (card) handleCardSelection(card);
    });
  }

  // Attach Search Input
  const searchInput = document.getElementById('color-search-input');
  const clearBtn = document.getElementById('color-search-clear-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderSwatches();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      renderSwatches();
      if (searchInput) searchInput.focus();
    });
  }

  renderSwatches();
  updateColorSummary();

  // Handle Single Mix Form Submission
  document.getElementById('tint-dispense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedColor) {
      selectedColor = catalogColors[0] || null;
    }
    if (!selectedColor) return toast('Please select an available color from the library first.', true);

    const payload = {
      color_id: selectedColor.color_id,
      tin_size_litres: Number(document.getElementById('dispense-tin-size').value),
      quantity_mixed: Number(document.getElementById('dispense-quantity').value),
      base_id: Number(document.getElementById('dispense-base-select').value),
      customer_phone: document.getElementById('dispense-customer-phone').value.trim(),
      painter_phone: document.getElementById('dispense-painter-phone').value.trim() || null
    };

    try {
      const res = await apiFetch('/api/paintpin/mix', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast(`Tinting PIN ${res.paint_pin} generated! Stock deducted.`);

      // Add to cart
      state.cart.push({
        type: 'mixed_paint',
        description: `${selectedColor.color_name} (${selectedColor.color_code}) - ${payload.tin_size_litres}L`,
        paint_pin: res.paint_pin,
        quantity: payload.quantity_mixed,
        unit_cost_kes: res.unit_cost_kes,
        unit_price_kes: Math.round(res.unit_cost_kes * 1.35 / 50) * 50
      });

      showLidStickerModal({
        pin: res.paint_pin,
        colorName: selectedColor.color_name,
        manufacturer: selectedColor.manufacturer,
        baseName: res.base ? res.base.base_name : 'Pastel Base',
        tinSize: payload.tin_size_litres,
        formula: selectedColor.pigment_formula || selectedColor.pigment_recipe,
        phone: payload.customer_phone,
        date: new Date().toLocaleDateString('en-KE')
      });
    } catch (err) {
      toast(err.message, true);
    }
  });
}


function renderMultiBlendHtml(catalogColors, baseTins) {
  let blendedHex = '#cbd5e1';
  if (multiBlendComponents.length >= 2) {
    blendedHex = blendHexColorsClient(multiBlendComponents);
  } else if (multiBlendComponents.length === 1) {
    blendedHex = multiBlendComponents[0].hex_display || multiBlendComponents[0].hex_code || '#cbd5e1';
  }

  const isReadyToMix = multiBlendComponents.length >= 2;

  return `
    <div class="grid-layout-2col">
      <!-- Left: Blend Components Manager & Visual Search -->
      <section class="card-panel">
        <div class="card-panel-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0;">🎨 Blend Component Shades (${multiBlendComponents.length} Selected)</h3>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            ${multiBlendComponents.length > 0 ? `
              <button type="button" id="btn-clear-all-blend" class="btn btn-secondary btn-sm" style="border-color:#fca5a5; color:#dc2626; font-weight:700;" title="Remove all shades and start fresh">
                🗑️ Clear All
              </button>
            ` : ''}
            <button type="button" id="btn-add-custom-color-modal" class="btn btn-secondary btn-sm" style="font-weight:700;">
              ✨ Custom Shade
            </button>
          </div>
        </div>

        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1.2rem;">
          Combine two or more catalog shades in custom ratios to create an exclusive tailor-made color for your client.
        </p>

        <!-- Components List or Empty State -->
        <div class="blend-components-list" id="blend-components-container">
          ${multiBlendComponents.length === 0 ? `
            <div style="padding:2.5rem 1rem; text-align:center; background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:12px; margin-bottom:1.2rem;">
              <div style="font-size:2.2rem; margin-bottom:0.4rem;">🎨</div>
              <strong style="font-size:1rem; color:#0f172a;">No Shades in Blend Studio</strong>
              <p style="font-size:0.84rem; color:#64748b; margin:4px 0 1rem;">Use the visual search bar below to search or type shades with live color swatches.</p>
            </div>
          ` : multiBlendComponents.map((comp, idx) => `
            <div class="blend-component-card">
              <div style="display:flex; align-items:center; gap:0.85rem; flex:1; min-width:0;">
                <div class="paint-swatch" style="background-color:${comp.hex_display || comp.hex_code}; width:38px; height:38px; border-radius:8px; border:1.5px solid rgba(0,0,0,0.1); flex-shrink:0;"></div>
                <div style="overflow:hidden;">
                  <div style="font-weight:800; font-size:0.92rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${escapeHtml(comp.color_name)}
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">
                    ${escapeHtml(comp.manufacturer || 'Custom')} · ${escapeHtml(comp.color_code || comp.hex_code || 'CUSTOM')}
                  </div>
                </div>
              </div>

              <div class="blend-ratio-slider-box">
                <input type="range" class="blend-ratio-slider" data-idx="${idx}" min="5" max="100" step="5" value="${comp.ratio || 50}" />
                <span class="blend-ratio-val">${comp.ratio || 50}%</span>
              </div>

              <!-- Remove Single Color Button (ALWAYS VISIBLE) -->
              <button type="button" class="btn-delete-row btn-remove-blend-component" data-idx="${idx}" style="width:32px; height:32px; font-size:0.9rem; font-weight:800; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:6px; cursor:pointer;" title="Remove this color from blend">
                ✕
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Visual Color Search & Fast-Add Box -->
        <div id="add-shade-section" style="background:#f8fafc; border:1.5px solid var(--border-light); border-radius:var(--radius-md); padding:1rem 1.15rem; margin-top:1.2rem; position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <label style="font-size:0.8rem; font-weight:800; color:#0f172a; text-transform:uppercase;">
              🔍 Search Catalog Shade or Type Custom Color to Add
            </label>
            <span style="font-size:0.72rem; color:#64748b; font-weight:700;">${catalogColors.length} Verified Shades</span>
          </div>

          <div class="blend-search-box-wrap">
            <span class="blend-search-icon">🔎</span>
            <input 
              type="text" 
              id="blend-shade-search-input" 
              class="blend-search-input" 
              placeholder="Search shade by name or code with color swatches (e.g. Canopy, Amber, Crown White, DC-912)..." 
              autocomplete="off"
            />
            <button id="blend-search-clear-btn" class="pos-search-clear-btn" style="display:none;" title="Clear search">✕</button>

            <!-- Autocomplete Results Dropdown with Color Swatches -->
            <div id="blend-shade-dropdown" class="blend-search-dropdown" style="display:none;"></div>
          </div>

          <!-- Quick Brand Pills -->
          <div class="pos-quick-tags" style="margin-top:0.6rem;">
            <span style="font-size:0.72rem; font-weight:800; color:#64748b;">Quick Picks:</span>
            <button class="pos-tag-btn blend-tag-btn" data-search="Duracoat">Basco Duracoat</button>
            <button class="pos-tag-btn blend-tag-btn" data-search="Crown">Crown Paints</button>
            <button class="pos-tag-btn blend-tag-btn" data-search="Plascon">Plascon / Sadolin</button>
            <button class="pos-tag-btn blend-tag-btn" data-search="Gold">Gold &amp; Ochre</button>
            <button class="pos-tag-btn blend-tag-btn" data-search="Green">Greens &amp; Olive</button>
            <button class="pos-tag-btn blend-tag-btn" data-search="White">Whites &amp; Creams</button>
          </div>
        </div>
      </section>

      <!-- Right: Live Blend Output & Dispenser -->
      <section class="card-panel">
        <div class="card-panel-header">
          <h3>Custom Shade Live Preview &amp; Recipe</h3>
          <span class="sub-badge">Precision Droplet Fusion</span>
        </div>

        <!-- Live Blended Swatch Banner -->
        <div class="live-blend-preview-card">
          <div class="blend-swatch-large" id="live-blend-swatch" style="background-color:${blendedHex};"></div>
          <div>
            <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--brand-gold); letter-spacing:0.8px;">
              Live Precision Fusion Color
            </span>
            <div id="live-blend-title" style="font-size:1.35rem; font-weight:900; color:white; margin:0.2rem 0;">
              ${multiBlendComponents.length >= 2 ? 'Custom Multi-Shade Blend' : multiBlendComponents.length === 1 ? multiBlendComponents[0].color_name : 'No Color Formulated'}
            </div>
            <div style="font-size:0.85rem; color:#94a3b8; font-family:var(--font-mono);" id="live-blend-hex">
              ${multiBlendComponents.length >= 2 ? `HEX: ${blendedHex} · ${multiBlendComponents.map(c => `${c.color_name} (${c.ratio}%)`).join(' + ')}` : multiBlendComponents.length === 1 ? `HEX: ${blendedHex} · Single Shade (Add 1 more to complete blend)` : 'Select 2+ shades to start formulation'}
            </div>
          </div>
        </div>

        <form id="multi-blend-mix-form">
          <div class="form-group">
            <label>Custom Blend Title / Project Label</label>
            <input type="text" id="blend-custom-name" placeholder="e.g. Karen Villa Master Suite Custom Gold" value="Custom Multi-Shade Blend" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Tin Size (Volume)</label>
              <select id="blend-tin-size" required style="font-weight:700;">
                <option value="1">1 Litre (Retail Can)</option>
                <option value="4" selected>4 Litres (Standard Gallon)</option>
                <option value="20">20 Litres (Commercial Drum)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Quantity of Tins</label>
              <input type="number" id="blend-quantity" value="1" min="1" required style="font-weight:800;" />
            </div>
          </div>

          <div class="form-group">
            <label>Compatible Base Paint</label>
            <select id="blend-base-select" required style="font-weight:600;">
              ${baseTins.map((b) => `
                <option value="${b.base_id}">
                  ${escapeHtml(b.manufacturer)} ${escapeHtml(b.base_name)} (${b.tin_size_litres}L) - ${b.quantity_in_stock} in stock (KES ${b.unit_cost_kes})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Customer Phone Number</label>
              <div class="input-with-icon">
                <span class="input-icon">${Icons.phone}</span>
                <input type="text" id="blend-customer-phone" placeholder="254712345678" value="254712345678" required />
              </div>
            </div>
            <div class="form-group">
              <label>Painter / Fundi Phone (Optional)</label>
              <div class="input-with-icon">
                <span class="input-icon">${Icons.phone}</span>
                <input type="text" id="blend-painter-phone" placeholder="254799887766" />
              </div>
            </div>
          </div>

          <button type="submit" id="btn-submit-multi-blend" class="btn btn-primary btn-block btn-lg" style="margin-top:1.4rem; background:#0f172a; color:#f59e0b; border-color:#0f172a; font-weight:800;" ${!isReadyToMix ? 'disabled style="margin-top:1.4rem; opacity:0.6; cursor:not-allowed;"' : ''}>
            ${isReadyToMix ? '🚀 Dispense Multi-Blend & Generate PIN' : multiBlendComponents.length === 1 ? '⚠️ Add 1 More Shade to Blend' : '⚠️ Select At Least 2 Shades'}
          </button>
        </form>
      </section>
    </div>
  `;
}

function initMultiBlendEvents(catalogColors, baseTins) {
  function updateLiveBlendPreview() {
    let blendedHex = '#cbd5e1';
    if (multiBlendComponents.length >= 2) {
      blendedHex = blendHexColorsClient(multiBlendComponents);
    } else if (multiBlendComponents.length === 1) {
      blendedHex = multiBlendComponents[0].hex_display || multiBlendComponents[0].hex_code || '#cbd5e1';
    }

    const swatch = document.getElementById('live-blend-swatch');
    const hexText = document.getElementById('live-blend-hex');
    const titleText = document.getElementById('live-blend-title');
    const submitBtn = document.getElementById('btn-submit-multi-blend');

    if (swatch) swatch.style.backgroundColor = blendedHex;
    if (hexText) {
      if (multiBlendComponents.length >= 2) {
        hexText.innerText = `HEX: ${blendedHex} · ${multiBlendComponents.map(c => `${c.color_name} (${c.ratio}%)`).join(' + ')}`;
      } else if (multiBlendComponents.length === 1) {
        hexText.innerText = `HEX: ${blendedHex} · Single Shade (Add 1 more to complete blend)`;
      } else {
        hexText.innerText = 'Select 2+ shades to start formulation';
      }
    }
    if (titleText) {
      titleText.innerText = multiBlendComponents.length >= 2 ? 'Custom Multi-Shade Blend' : multiBlendComponents.length === 1 ? multiBlendComponents[0].color_name : 'No Color Formulated';
    }
    if (submitBtn) {
      const isReady = multiBlendComponents.length >= 2;
      submitBtn.disabled = !isReady;
      submitBtn.style.opacity = isReady ? '1' : '0.6';
      submitBtn.style.cursor = isReady ? 'pointer' : 'not-allowed';
      submitBtn.innerText = isReady ? '🚀 Dispense Multi-Blend & Generate PIN' : multiBlendComponents.length === 1 ? '⚠️ Add 1 More Shade to Blend' : '⚠️ Select At Least 2 Shades';
    }
  }

  // Ratio slider events
  document.querySelectorAll('.blend-ratio-slider').forEach((slider) => {
    slider.addEventListener('input', (e) => {
      const idx = Number(slider.dataset.idx);
      if (multiBlendComponents[idx]) {
        multiBlendComponents[idx].ratio = Number(e.target.value);
        slider.parentElement.querySelector('.blend-ratio-val').innerText = e.target.value + '%';
        updateLiveBlendPreview();
      }
    });
  });

  // Remove Single Component (ALWAYS FUNCTIONAL)
  document.querySelectorAll('.btn-remove-blend-component').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const removed = multiBlendComponents.splice(idx, 1);
      if (removed && removed[0]) {
        toast(`Removed "${removed[0].color_name}" from blend.`);
      }
      renderMixView(document.getElementById('view-container'));
    });
  });

  // Clear All Shades from Blend
  const clearAllBtn = document.getElementById('btn-clear-all-blend');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Clear all component shades from the blend studio?')) {
        multiBlendComponents = [];
        renderMixView(document.getElementById('view-container'));
        toast('Blend studio cleared. Pick new shades below.');
      }
    });
  }

  // ----------------------------------------------------
  // Interactive Visual Shade Search with Color Swatches
  // ----------------------------------------------------
  const searchInput = document.getElementById('blend-shade-search-input');
  const searchDropdown = document.getElementById('blend-shade-dropdown');
  const searchClearBtn = document.getElementById('blend-search-clear-btn');
  let selectedIndex = -1;
  let currentResults = [];

  function performShadeSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      searchDropdown.style.display = 'none';
      searchDropdown.innerHTML = '';
      searchClearBtn.style.display = 'none';
      currentResults = [];
      selectedIndex = -1;
      return;
    }

    searchClearBtn.style.display = 'flex';
    const terms = q.split(/\s+/);

    currentResults = catalogColors.filter(item => {
      const targetStr = `${item.color_name} ${item.color_code} ${item.manufacturer}`.toLowerCase();
      return terms.every(t => targetStr.includes(t));
    }).slice(0, 30); // Top 30 matches

    let itemsHtml = '';

    if (currentResults.length > 0) {
      itemsHtml = currentResults.map((item, idx) => {
        const hexColor = item.hex_display || item.hex_code || '#2B6E47';
        return `
          <div class="blend-search-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}">
            <div class="blend-item-left">
              <!-- Visual Color Swatch -->
              <div class="blend-item-swatch" style="background-color:${hexColor};"></div>
              <div style="overflow:hidden;">
                <div class="blend-item-name">${escapeHtml(item.color_name)}</div>
                <div class="blend-item-meta">${escapeHtml(item.manufacturer)} · Code: ${escapeHtml(item.color_code)} · ${hexColor}</div>
              </div>
            </div>
            <button type="button" class="pos-result-add-btn">+ Add to Blend</button>
          </div>
        `;
      }).join('');
    }

    // Always include custom color option at the bottom
    itemsHtml += `
      <div class="blend-search-item" id="blend-add-custom-typed-shade" style="background:#fffbeb; border-top:1.5px solid #fde68a;">
        <div class="blend-item-left">
          <div class="blend-item-swatch" style="background-color:#d97706; display:flex; align-items:center; justify-content:center; color:white; font-size:0.75rem;">✨</div>
          <div>
            <div class="blend-item-name" style="color:#b45309;">+ Add "${escapeHtml(query)}" as Custom Tailor Shade</div>
            <div class="blend-item-meta" style="color:#92400e;">Create unique bespoke formulation with custom HEX color</div>
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" style="font-weight:800; font-size:0.75rem; border-color:#fde68a;">✨ Add Custom</button>
      </div>
    `;

    searchDropdown.innerHTML = itemsHtml;
    searchDropdown.style.display = 'block';

    // Click handler for catalog shades
    searchDropdown.querySelectorAll('.blend-search-item[data-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.idx);
        if (currentResults[idx]) {
          const colorToAdd = currentResults[idx];
          const alreadyExists = multiBlendComponents.some(c => c.color_id === colorToAdd.color_id);
          if (alreadyExists) {
            toast(`"${colorToAdd.color_name}" is already in the blend.`, true);
            return;
          }
          multiBlendComponents.push({ ...colorToAdd, ratio: 50 });
          toast(`Added "${colorToAdd.color_name}" to blend.`);
          renderMixView(document.getElementById('view-container'));
        }
      });
    });

    // Click handler for custom typed shade
    const customRow = document.getElementById('blend-add-custom-typed-shade');
    if (customRow) {
      customRow.addEventListener('click', () => {
        showCustomColorModal(query);
      });
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performShadeSearch(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (searchDropdown.style.display === 'block' && currentResults.length > 0) {
        const items = searchDropdown.querySelectorAll('.blend-search-item[data-idx]');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % currentResults.length;
          items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
          items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
          items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
          items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
            const colorToAdd = currentResults[selectedIndex];
            const alreadyExists = multiBlendComponents.some(c => c.color_id === colorToAdd.color_id);
            if (alreadyExists) {
              toast(`"${colorToAdd.color_name}" is already in the blend.`, true);
              return;
            }
            multiBlendComponents.push({ ...colorToAdd, ratio: 50 });
            toast(`Added "${colorToAdd.color_name}" to blend.`);
            renderMixView(document.getElementById('view-container'));
          } else {
            showCustomColorModal(searchInput.value.trim());
          }
        } else if (e.key === 'Escape') {
          searchDropdown.style.display = 'none';
        }
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      performShadeSearch('');
      searchInput.focus();
    });
  }

  // Quick Pick Brand Tags
  document.querySelectorAll('.blend-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.search;
      if (searchInput) {
        searchInput.value = q;
        performShadeSearch(q);
        searchInput.focus();
      }
    });
  });

  // Custom Color Modal Button in Header
  const customModalBtn = document.getElementById('btn-add-custom-color-modal');
  if (customModalBtn) {
    customModalBtn.addEventListener('click', () => {
      showCustomColorModal('');
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const card = document.getElementById('add-shade-section');
    if (card && !card.contains(e.target)) {
      if (searchDropdown) searchDropdown.style.display = 'none';
    }
  });

  // Handle Multi-Blend Form Submission
  document.getElementById('multi-blend-mix-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (multiBlendComponents.length < 2) {
      toast('Please include at least 2 shades in the blend.', true);
      return;
    }

    const payload = {
      blend_name: document.getElementById('blend-custom-name').value.trim(),
      customer_phone: document.getElementById('blend-customer-phone').value.trim(),
      painter_phone: document.getElementById('blend-painter-phone').value.trim() || null,
      tin_size_litres: Number(document.getElementById('blend-tin-size').value),
      quantity_mixed: Number(document.getElementById('blend-quantity').value),
      base_id: Number(document.getElementById('blend-base-select').value),
      components: multiBlendComponents.map(c => ({
        color_id: c.color_id || 1,
        color_name: c.color_name,
        hex_code: c.hex_code || c.hex_display || '#D97706',
        ratio: c.ratio || 50
      }))
    };

    try {
      const res = await apiFetch('/api/paintpin/mix-multi', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast(`Multi-Blend PIN ${res.paint_pin} generated! Stock deducted.`);

      // Add to cart
      state.cart.push({
        type: 'mixed_paint',
        description: `Custom Multi-Blend: ${payload.blend_name} (${payload.tin_size_litres}L)`,
        paint_pin: res.paint_pin,
        quantity: payload.quantity_mixed,
        unit_cost_kes: res.unit_cost_kes,
        unit_price_kes: Math.round(res.unit_cost_kes * 1.35 / 50) * 50
      });

      showLidStickerModal({
        pin: res.paint_pin,
        colorName: payload.blend_name,
        manufacturer: 'Custom Formula Blend',
        baseName: res.base ? res.base.base_name : 'Pastel Base',
        tinSize: payload.tin_size_litres,
        formula: res.pigment_formula,
        phone: payload.customer_phone,
        date: new Date().toLocaleDateString('en-KE')
      });
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function showCustomColorModal(prefillName = '') {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width: 480px;">
        <div class="modal-header-bar">
          <h3>✨ Formulate Custom Shade</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <form id="custom-shade-modal-form" style="padding: 1.25rem;">
          <div class="form-group">
            <label>Custom Shade Name / Project Title</label>
            <input type="text" id="cust-shade-name" value="${escapeHtml(prefillName || 'Bespoke Studio Shade')}" required placeholder="e.g. Karen Villa Ocean Teal" style="font-weight:700;" />
          </div>

          <div class="form-group">
            <label>Pick Shade Color / Enter HEX</label>
            <div style="display:flex; align-items:center; gap:0.85rem;">
              <input type="color" id="cust-shade-picker" value="#D97706" style="width:54px; height:44px; padding:2px; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer;" />
              <input type="text" id="cust-shade-hex" value="#D97706" required style="font-family:var(--font-mono); font-weight:800; flex:1;" />
            </div>
          </div>

          <div class="form-group">
            <label>Initial Blend Ratio (%)</label>
            <input type="number" id="cust-shade-ratio" value="50" min="5" max="100" step="5" required style="font-weight:800;" />
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:1.2rem; background:#0f172a; color:#f59e0b; border-color:#0f172a; font-weight:800;">
            + Add Custom Shade to Blend
          </button>
        </form>
      </div>
    </div>
  `;

  const picker = document.getElementById('cust-shade-picker');
  const hexInput = document.getElementById('cust-shade-hex');

  picker.addEventListener('input', (e) => {
    hexInput.value = e.target.value.toUpperCase();
  });
  hexInput.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      picker.value = e.target.value;
    }
  });

  document.getElementById('custom-shade-modal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cust-shade-name').value.trim();
    const hex = hexInput.value.trim() || '#D97706';
    const ratio = Number(document.getElementById('cust-shade-ratio').value) || 50;

    multiBlendComponents.push({
      color_id: Date.now(),
      color_name: name,
      manufacturer: 'Custom Bespoke',
      color_code: hex,
      hex_display: hex,
      hex_code: hex,
      ratio: ratio
    });

    modal.innerHTML = '';
    toast(`Added custom shade "${name}" to blend.`);
    renderMixView(document.getElementById('view-container'));
  });
}



// ==========================================================================
// DEDICATED CAN LID STICKER PRINTER (ISOLATED CLEAN PRINT VIEW)
// ==========================================================================
function printLidSticker(data) {
  const { pin, colorName, manufacturer, baseName, tinSize, formula, phone, date } = data;
  const formulaObj = typeof formula === 'string' ? parsePigmentFormula(formula) : (formula || {});

  // Create or reuse an isolated printable iframe so nothing from background screen leaks
  let iframe = document.getElementById('sticker-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'sticker-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Can Lid Sticker - ${escapeHtml(pin)}</title>
      <style>
        @page {
          size: auto;
          margin: 6mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #ffffff;
          color: #0f172a;
          padding: 8px;
          display: flex;
          justify-content: center;
        }
        .lid-label {
          width: 100%;
          max-width: 360px;
          border: 2.5px solid #0f172a;
          border-radius: 12px;
          padding: 14px 16px;
          background: #ffffff;
        }
        .top-brand-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .store-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #475569;
        }
        .sticker-badge {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          background: #0f172a;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .shade-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .shade-meta {
          font-size: 12px;
          font-weight: 700;
          color: #0284c7;
          margin-bottom: 8px;
        }
        .pin-box {
          background: #f8fafc;
          border: 1.5px solid #0f172a;
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .pin-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
        }
        .pin-code {
          font-family: monospace;
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
        }
        .formula-section {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .formula-header {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .formula-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .pigment-chip {
          background: #ffffff;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
        }
        .footer-info {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #475569;
          font-weight: 600;
          border-top: 1px dashed #cbd5e1;
          padding-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="lid-label">
        <div class="top-brand-bar">
          <span class="store-tag">🎨 Factory Can Lid Label</span>
          <span class="sticker-badge">Repeat Mix Recipe</span>
        </div>
        <div class="shade-title">${escapeHtml(colorName)}</div>
        <div class="shade-meta">${escapeHtml(manufacturer)} · ${escapeHtml(baseName)} (${tinSize}L Tin)</div>

        <div class="pin-box">
          <span class="pin-label">Paint Recall PIN:</span>
          <span class="pin-code">${escapeHtml(pin)}</span>
        </div>

        <div class="formula-section">
          <div class="formula-header">🧪 Dispensation Droplets (${tinSize}L Tin):</div>
          <div class="formula-grid">
            ${Object.keys(formulaObj).length ? Object.entries(formulaObj).map(([code, ml]) => `
              <div class="pigment-chip">${escapeHtml(code)}: ${ml} ml</div>
            `).join('') : '<div class="pigment-chip">Factory Standard Formulation</div>'}
          </div>
        </div>

        <div class="footer-info">
          <div>Client: <strong>${escapeHtml(phone || 'Walk-in')}</strong></div>
          <div>Date: <strong>${escapeHtml(date || new Date().toLocaleDateString('en-KE'))}</strong></div>
        </div>
      </div>
    </body>
    </html>
  `);
  doc.close();

  // Trigger print cleanly on iframe window
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 250);
}

// ==========================================================================
// CAN LID STICKER & TINTING FORMULATION PIN MODAL
// ==========================================================================
function showLidStickerModal(data) {
  const modal = document.getElementById('modal-container');
  if (!modal) return;

  const { pin, colorName, manufacturer, baseName, tinSize, formula, phone, date } = data;
  const formulaObj = typeof formula === 'string' ? parsePigmentFormula(formula) : (formula || {});

  modal.innerHTML = `
    <div class="modal-overlay" style="padding: 1rem; align-items:center; justify-content:center;">
      <div class="modal-container-card" style="max-width: 480px; width: 100%; padding: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.1); background: white;">
        
        <!-- Luxury Header Bar -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 0.9rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f59e0b;">
          <div>
            <div style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.8px;">
              ✨ Tinting Dispensed &amp; Generated
            </div>
            <h3 style="margin: 2px 0 0; font-size: 1.15rem; font-weight: 900; color: white; letter-spacing: -0.3px;">
              🎨 Can Lid Sticker &amp; Paint PIN
            </h3>
          </div>
          <button class="btn-close-modal" style="color: white; background: rgba(255,255,255,0.12); border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem;" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <!-- Modal Body Content -->
        <div style="padding: 1.15rem 1.25rem;">
          
          <!-- Unified PIN & Can Lid Formulation Card -->
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.95rem 1.1rem; margin-bottom: 1rem; box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);" id="printable-lid-sticker">
            
            <!-- Top Row: Shade Title & PIN Badge -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem;">
              <div>
                <h4 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; line-height: 1.2;">
                  ${escapeHtml(colorName)}
                </h4>
                <div style="font-size: 0.74rem; color: #64748b; font-weight: 600; margin-top: 2px;">
                  ${escapeHtml(manufacturer)} · ${escapeHtml(baseName)} (${tinSize}L)
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: #0f172a; color: #f59e0b; font-weight: 900; font-size: 0.82rem; padding: 4px 9px; border-radius: 6px; font-family: var(--font-mono); letter-spacing: 0.5px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                  ${escapeHtml(pin)}
                </span>
                <div style="font-size: 0.64rem; color: #0284c7; font-weight: 700; margin-top: 2px; cursor: pointer;" id="btn-copy-pin">
                  📋 Copy PIN
                </div>
              </div>
            </div>

            <!-- Droplet Formulation Breakdown Chips -->
            <div style="margin-bottom: 0.65rem; background: white; padding: 0.6rem 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="font-size: 0.66rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                🔬 Droplet Formulation (per Litre)
              </span>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${Object.keys(formulaObj).length ? Object.entries(formulaObj).map(([pCode, qty]) => `
                  <span style="background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #1e293b;">
                    <strong>${escapeHtml(pCode)}:</strong> ${qty} ml/L
                  </span>
                `).join('') : '<span style="font-size: 0.72rem; color: #64748b;">Factory Standard Recipe</span>'}
              </div>
            </div>

            <!-- Client & Date Footer -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;">
              <div>Client: <strong style="color: #1e293b;">${escapeHtml(phone || 'Walk-in')}</strong></div>
              <div>Date: <strong style="color: #1e293b;">${escapeHtml(date || new Date().toLocaleDateString('en-KE'))}</strong></div>
              <span style="color: #059669; font-weight: 800; font-size: 0.7rem; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                ✓ Added to Cart
              </span>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
            <button type="button" class="btn btn-secondary btn-md" id="btn-print-lid-sticker" style="font-weight: 800; font-size: 0.84rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem 0.8rem;">
              🖨️ Print Lid Sticker
            </button>
            <button type="button" class="btn btn-primary btn-md" id="btn-goto-pos-checkout" style="background: #0f172a; color: #f59e0b; border-color: #0f172a; font-weight: 800; font-size: 0.84rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem 0.8rem;">
              🛒 POS Checkout (${state.cart.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach Copy PIN Handler
  const copyBtn = document.getElementById('btn-copy-pin');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(pin).then(() => {
        copyBtn.innerText = '✓ Copied!';
        setTimeout(() => { copyBtn.innerText = '📋 Copy PIN'; }, 2000);
      });
    });
  }

  // Attach Print Handler using isolated printLidSticker
  const printBtn = document.getElementById('btn-print-lid-sticker');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      printLidSticker(data);
    });
  }

  // Attach Go to POS Checkout Handler
  const posBtn = document.getElementById('btn-goto-pos-checkout');
  if (posBtn) {
    posBtn.addEventListener('click', () => {
      modal.innerHTML = '';
      window.location.hash = '#pos';
    });
  }
}

// ==========================================================================
// SAFARICOM DARAJA M-PESA CHECKOUT MODAL (STK PUSH & PAYBILL VERIFICATION)
// ==========================================================================
function showMpesaCheckoutModal(options) {
  const modal = document.getElementById('modal-container');
  if (!modal) return;

  const { customerPhone, grandTotal, items, onComplete } = options;
  let activeTab = 'stk'; // 'stk' or 'c2b'
  let pollingTimer = null;
  let countdownTimer = null;
  let secondsRemaining = 60;
  let currentCheckoutId = null;

  function renderModalContent() {
    modal.innerHTML = `
      <div class="modal-overlay" style="padding: 1rem; align-items:center; justify-content:center;">
        <div class="modal-container-card" style="max-width: 500px; width: 100%; padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45); background: white;">
          
          <!-- Top M-Pesa Header -->
          <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; padding: 1.1rem 1.35rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #34d399;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #a7f3d0; letter-spacing: 0.8px;">
                🟢 Safaricom Daraja Direct Gateway
              </div>
              <h3 style="margin: 2px 0 0; font-size: 1.25rem; font-weight: 900; color: white;">
                📱 Lipa Na M-Pesa Checkout
              </h3>
            </div>
            <button class="btn-close-modal" style="color: white; background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;" id="btn-close-mpesa-modal">✕</button>
          </div>

          <!-- Total Payable Amount Banner -->
          <div style="background: #ecfdf5; border-bottom: 1px solid #d1fae5; padding: 0.85rem 1.35rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.84rem; font-weight: 700; color: #065f46;">Amount to Pay:</span>
            <span style="font-size: 1.35rem; font-weight: 900; color: #047857; font-family: var(--font-mono);">KES ${grandTotal.toLocaleString()}</span>
          </div>

          <!-- Tab Selector Bar -->
          <div style="padding: 1rem 1.35rem 0.5rem; display: flex; gap: 0.6rem;">
            <button type="button" class="mpesa-tab-btn ${activeTab === 'stk' ? 'active' : ''}" id="tab-btn-stk">
              <span>📲</span> STK PIN Prompt (Instant)
            </button>
            <button type="button" class="mpesa-tab-btn ${activeTab === 'c2b' ? 'active' : ''}" id="tab-btn-c2b">
              <span>🧾</span> Paybill / Till Verification
            </button>
          </div>

          <!-- Modal Body Dynamic Tab Container -->
          <div style="padding: 1rem 1.35rem 1.35rem;" id="mpesa-tab-body">
            ${activeTab === 'stk' ? renderStkTabHtml() : renderC2bTabHtml()}
          </div>
        </div>
      </div>
    `;

    attachModalHandlers();
  }

  function renderStkTabHtml() {
    return `
      <div id="stk-form-container">
        <p style="font-size: 0.86rem; color: #475569; margin: 0 0 1.15rem; line-height: 1.45;">
          Enter customer phone. An instant <strong>M-Pesa PIN prompt</strong> will pop up directly on their Safaricom phone.
        </p>

        <div class="form-group" style="margin-bottom: 1.35rem;">
          <label style="font-size: 0.84rem; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 0.45rem; display: block;">
            Customer Safaricom Phone Number
          </label>
          <div style="display: flex; align-items: stretch; width: 100%; border: 2px solid #059669; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.12);">
            <div style="background: #ecfdf5; border-right: 2px solid #a7f3d0; padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #065f46; font-size: 1.05rem; gap: 5px; user-select: none;">
              <span style="font-size: 1.15rem;">🇰🇪</span>
              <span>+254</span>
            </div>
            <input 
              type="tel" 
              id="mpesa-stk-phone" 
              placeholder="712 345 678" 
              value="${formatPhoneForInput(customerPhone)}" 
              style="flex: 1; border: none !important; outline: none !important; padding: 0.85rem 1.1rem !important; font-size: 1.25rem !important; font-weight: 800 !important; color: #0f172a !important; font-family: var(--font-mono) !important; letter-spacing: 1px !important; width: 100% !important; background: transparent !important;" 
              autofocus
            />
          </div>
          <small style="color: #64748b; font-size: 0.78rem; margin-top: 6px; display: block; font-weight: 600;">
            Enter 9-digit mobile number (e.g. <strong>712345678</strong> or <strong>0712345678</strong>).
          </small>
        </div>

        <button type="button" id="btn-send-stk-push" class="btn btn-block btn-lg" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border: none; color: #ffffff !important; font-weight: 900; font-size: 1.05rem; padding: 0.95rem; border-radius: 10px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
          <span style="font-size: 1.2rem;">🚀</span>
          <span style="color: #ffffff !important; font-weight: 900;">Send M-Pesa PIN Prompt (KES ${grandTotal.toLocaleString()})</span>
        </button>
      </div>

      <!-- Live Waiting State Container -->
      <div id="stk-waiting-container" style="display: none; text-align: center; padding: 1rem 0;">
        <div class="mpesa-radar-pulse">
          <span style="font-size: 1.8rem;">📱</span>
        </div>
        
        <h4 style="margin: 0 0 0.4rem; font-size: 1.15rem; font-weight: 900; color: #065f46;">
          PIN Prompt Sent to Customer Phone!
        </h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 1rem;">
          Waiting for customer on <strong id="waiting-phone-display" style="color: #0f172a;">254...</strong> to key in their M-Pesa PIN...
        </p>

        <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: inline-block;">
          <span style="font-size: 0.82rem; font-weight: 700; color: #64748b;">Timeout in: </span>
          <span id="stk-countdown-timer" style="font-size: 1.1rem; font-weight: 900; color: #047857; font-family: var(--font-mono);">60s</span>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-stk-waiting" style="font-weight: 700;">
            ✕ Cancel
          </button>
          <button type="button" class="btn btn-sm" id="btn-simulate-stk-pin" style="background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; font-weight: 800;" title="Instantly simulate customer entering PIN (Testing)">
            ⚡ Instant PIN Test
          </button>
        </div>
      </div>
    `;
  }

  function renderC2bTabHtml() {
    return `
      <div>
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.95rem 1.1rem; margin-bottom: 1.25rem;">
          <div style="font-size: 0.76rem; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem; letter-spacing: 0.5px;">
            🏬 Store Lipa Na M-Pesa Instructions:
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.9rem;">
            <div style="background: white; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 0.76rem; font-weight: 700; text-transform: uppercase;">Paybill Number</span><br/>
              <strong style="color: #0f172a; font-family: var(--font-mono); font-size: 1.1rem; letter-spacing: 0.5px;">174379</strong>
            </div>
            <div style="background: white; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 0.76rem; font-weight: 700; text-transform: uppercase;">Account / Till</span><br/>
              <strong style="color: #047857; font-family: var(--font-mono); font-size: 1.1rem; letter-spacing: 0.5px;">PAINT-POS</strong>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 1.25rem;">
          <label style="font-size: 0.84rem; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 0.45rem; display: block;">
            M-Pesa Transaction Receipt Code
          </label>
          <input 
            type="text" 
            id="mpesa-manual-code-input" 
            placeholder="e.g. SHB71K9X3A" 
            style="width: 100%; box-sizing: border-box; min-height: 52px; font-family: var(--font-mono); font-size: 1.25rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 0.85rem 1.1rem; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; background: #ffffff; color: #0f172a;" 
            autofocus
          />
          <small style="color: #64748b; font-size: 0.78rem; margin-top: 6px; display: block; font-weight: 600;">
            Type or paste the 10-character code from the customer's Safaricom SMS.
          </small>
        </div>

        <button type="button" id="btn-verify-manual-code" class="btn btn-block btn-lg" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid #334155; color: #ffffff !important; font-weight: 900; font-size: 1.02rem; padding: 0.95rem; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
          <span style="font-size: 1.2rem;">🔍</span>
          <span style="color: #ffffff !important; font-weight: 900; letter-spacing: 0.3px;">Verify Transaction &amp; Complete Sale</span>
        </button>
      </div>
    `;
  }

  function formatPhoneForInput(raw) {
    if (!raw) return '';
    let cleaned = String(raw).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('254')) cleaned = cleaned.substring(3);
    else if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return cleaned;
  }

  function cleanupTimers() {
    if (pollingTimer) clearInterval(pollingTimer);
    if (countdownTimer) clearInterval(countdownTimer);
  }

  function attachModalHandlers() {
    // Close button
    const closeBtn = document.getElementById('btn-close-mpesa-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        cleanupTimers();
        modal.innerHTML = '';
      });
    }

    // Tabs
    const tabStk = document.getElementById('tab-btn-stk');
    const tabC2b = document.getElementById('tab-btn-c2b');
    if (tabStk) {
      tabStk.addEventListener('click', () => {
        cleanupTimers();
        activeTab = 'stk';
        renderModalContent();
      });
    }
    if (tabC2b) {
      tabC2b.addEventListener('click', () => {
        cleanupTimers();
        activeTab = 'c2b';
        renderModalContent();
      });
    }

    if (activeTab === 'stk') {
      const sendBtn = document.getElementById('btn-send-stk-push');
      const phoneInput = document.getElementById('mpesa-stk-phone');

      if (sendBtn && phoneInput) {
        sendBtn.addEventListener('click', async () => {
          const rawPhone = phoneInput.value.trim();
          if (!rawPhone || rawPhone.length < 9) {
            return toast('Please enter a valid customer phone number.', true);
          }

          sendBtn.disabled = true;
          sendBtn.innerText = '⏳ Initiating STK Push...';

          try {
            const res = await apiFetch('/api/pos/mpesa/stk-push', {
              method: 'POST',
              body: JSON.stringify({
                phone_number: rawPhone,
                amount_kes: grandTotal,
                description: `Paint POS Sale`
              })
            });

            currentCheckoutId = res.checkout_request_id;

            // Show waiting state
            document.getElementById('stk-form-container').style.display = 'none';
            const waitingBox = document.getElementById('stk-waiting-container');
            waitingBox.style.display = 'block';
            document.getElementById('waiting-phone-display').innerText = res.phone;

            // Start countdown
            secondsRemaining = 60;
            const timerEl = document.getElementById('stk-countdown-timer');
            countdownTimer = setInterval(() => {
              secondsRemaining--;
              if (timerEl) timerEl.innerText = `${secondsRemaining}s`;
              if (secondsRemaining <= 0) {
                cleanupTimers();
                toast('M-Pesa prompt timed out. Please retry.', true);
                renderModalContent();
              }
            }, 1000);

            // Start polling status every 2 seconds
            pollingTimer = setInterval(async () => {
              try {
                const statusRes = await apiFetch(`/api/pos/mpesa/status/${encodeURIComponent(currentCheckoutId)}`);
                if (statusRes && statusRes.payment_status === 'Completed') {
                  cleanupTimers();
                  handleMpesaSuccess(statusRes.mpesa_receipt_code || 'MPESA_VERIFIED');
                } else if (statusRes && (statusRes.payment_status === 'Cancelled' || statusRes.payment_status === 'Failed')) {
                  cleanupTimers();
                  toast(`Payment ${statusRes.payment_status}: ${statusRes.result_desc || 'Customer declined.'}`, true);
                  renderModalContent();
                }
              } catch (pollErr) {
                console.error('Polling error:', pollErr);
              }
            }, 2000);

            // Wire simulation button for instant testing
            const simBtn = document.getElementById('btn-simulate-stk-pin');
            if (simBtn) {
              simBtn.addEventListener('click', async () => {
                simBtn.disabled = true;
                simBtn.innerText = '⚡ Simulating PIN...';
                try {
                  const simRes = await apiFetch('/api/pos/mpesa/simulate-callback', {
                    method: 'POST',
                    body: JSON.stringify({
                      checkout_request_id: currentCheckoutId,
                      success: true
                    })
                  });
                  cleanupTimers();
                  handleMpesaSuccess(simRes.mpesa_receipt_code || 'RSH_SIMULATED');
                } catch (simErr) {
                  toast(simErr.message, true);
                }
              });
            }

            // Wire cancel button
            const cancelBtn = document.getElementById('btn-cancel-stk-waiting');
            if (cancelBtn) {
              cancelBtn.addEventListener('click', () => {
                cleanupTimers();
                renderModalContent();
              });
            }
          } catch (err) {
            toast(err.message, true);
            sendBtn.disabled = false;
            sendBtn.innerHTML = `🚀 Send M-Pesa PIN Prompt (KES ${grandTotal.toLocaleString()})`;
          }
        });
      }
    } else if (activeTab === 'c2b') {
      const verifyBtn = document.getElementById('btn-verify-manual-code');
      const codeInput = document.getElementById('mpesa-manual-code-input');

      if (verifyBtn && codeInput) {
        verifyBtn.addEventListener('click', async () => {
          const code = codeInput.value.trim().toUpperCase();
          if (!code || code.length < 5) {
            return toast('Please enter a valid M-Pesa transaction code (e.g. SHB71K9X3A).', true);
          }

          verifyBtn.disabled = true;
          verifyBtn.innerText = '🔍 Verifying Code...';

          try {
            const res = await apiFetch('/api/pos/mpesa/verify-code', {
              method: 'POST',
              body: JSON.stringify({
                receipt_code: code,
                amount_kes: grandTotal,
                phone_number: customerPhone
              })
            });

            handleMpesaSuccess(res.mpesa_receipt_code || code);
          } catch (err) {
            toast(err.message, true);
            verifyBtn.disabled = false;
            verifyBtn.innerText = '🔍 Verify Transaction & Complete Sale';
          }
        });
      }
    }
  }

  async function handleMpesaSuccess(receiptCode) {
    cleanupTimers();
    modal.innerHTML = `
      <div class="modal-overlay" style="padding: 1rem; align-items:center; justify-content:center;">
        <div class="modal-container-card" style="max-width: 440px; width: 100%; padding: 2rem; border-radius: 16px; text-align: center; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem; animation: mpesaPulse 1s infinite;">✅</div>
          <h3 style="color: #065f46; font-size: 1.35rem; font-weight: 900; margin: 0 0 0.4rem;">
            M-Pesa Payment Confirmed!
          </h3>
          <p style="color: #047857; font-size: 0.92rem; margin: 0 0 1rem;">
            Receipt Code: <strong style="font-family: var(--font-mono); color: #0f172a; font-size: 1.05rem;">${escapeHtml(receiptCode)}</strong>
          </p>
          <div style="font-size: 1.4rem; font-weight: 900; color: #0f172a; margin-bottom: 1.5rem; font-family: var(--font-mono);">
            KES ${grandTotal.toLocaleString()}
          </div>
          <p style="color: #64748b; font-size: 0.82rem; margin: 0;">Generating receipt and finalizing sale...</p>
        </div>
      </div>
    `;

    // Process checkout with Mpesa payment method
    try {
      const checkoutRes = await apiFetch('/api/pos/checkout', {
        method: 'POST',
        body: JSON.stringify({
          customer_phone: customerPhone,
          payment_method: 'Mpesa',
          mpesa_receipt_code: receiptCode,
          items: items.map(it => ({
            type: it.type || 'hardware_product',
            product_id: it.product_id || null,
            base_id: it.base_id || null,
            description: it.description,
            quantity: Number(it.quantity || 1),
            unit_price_kes: Number(it.unit_price_kes || 0),
            unit_cost_kes: Number(it.unit_cost_kes || 0),
            paint_pin: it.paint_pin || null
          }))
        })
      });

      setTimeout(() => {
        modal.innerHTML = '';
        if (typeof onComplete === 'function') {
          onComplete(checkoutRes, receiptCode);
        }
      }, 1200);
    } catch (err) {
      toast('Error finalizing invoice: ' + err.message, true);
    }
  }

  // Initial render
  renderModalContent();
}

// ==========================================================================
// STORE OWNER DARAJA M-PESA CONFIGURATION MODAL
// ==========================================================================
async function showMpesaConfigModal() {
  const modal = document.getElementById('modal-container');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-overlay" style="padding: 1rem; align-items:center; justify-content:center;">
      <div class="modal-container-card" style="max-width: 520px; width: 100%; padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45); background: white;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 1.1rem 1.35rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #34d399; letter-spacing: 0.8px;">
              ⚙️ Payment Gateway Setup
            </div>
            <h3 style="margin: 2px 0 0; font-size: 1.2rem; font-weight: 900; color: white;">
              📱 Safaricom Daraja M-Pesa Settings
            </h3>
          </div>
          <button class="btn-close-modal" style="color: white; background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <!-- Body -->
        <div style="padding: 1.25rem 1.35rem;" id="mpesa-config-form-container">
          <div style="text-align: center; padding: 2rem;">
            <div class="spinner" style="margin: 0 auto 0.5rem;"></div>
            <p>Loading gateway settings...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const config = await apiFetch('/api/pos/mpesa/config');
    const container = document.getElementById('mpesa-config-form-container');
    if (!container) return;

    container.innerHTML = `
      <form id="form-mpesa-settings">
        <!-- Environment Switcher -->
        <div class="form-group" style="margin-bottom: 1rem;">
          <label style="font-size: 0.82rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Daraja Environment</label>
          <select id="cfg-mpesa-env" class="form-control" style="font-weight: 700;">
            <option value="sandbox" ${config.env === 'sandbox' ? 'selected' : ''}>🧪 Sandbox (Testing / Development)</option>
            <option value="production" ${config.env === 'production' ? 'selected' : ''}>🟢 Live Production (Real Money)</option>
          </select>
        </div>

        <!-- Shortcode / Paybill -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.8rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Shortcode / Paybill</label>
            <input type="text" id="cfg-mpesa-shortcode" class="form-control" value="${escapeHtml(config.shortcode || '174379')}" placeholder="174379" style="font-family: var(--font-mono); font-weight: 700;" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.8rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Buy Goods Till</label>
            <input type="text" id="cfg-mpesa-till" class="form-control" value="${escapeHtml(config.till_number || '174379')}" placeholder="Till Number" style="font-family: var(--font-mono); font-weight: 700;" />
          </div>
        </div>

        <!-- Consumer Key -->
        <div class="form-group" style="margin-bottom: 1rem;">
          <label style="font-size: 0.8rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Consumer Key</label>
          <input type="text" id="cfg-mpesa-key" class="form-control" value="${escapeHtml(config.consumer_key || '')}" placeholder="Paste Consumer Key" style="font-family: var(--font-mono); font-size: 0.85rem;" />
        </div>

        <!-- Consumer Secret -->
        <div class="form-group" style="margin-bottom: 1rem;">
          <label style="font-size: 0.8rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Consumer Secret</label>
          <input type="password" id="cfg-mpesa-secret" class="form-control" value="${escapeHtml(config.consumer_secret || '')}" placeholder="Paste Consumer Secret" style="font-family: var(--font-mono); font-size: 0.85rem;" />
        </div>

        <!-- Passkey -->
        <div class="form-group" style="margin-bottom: 1.25rem;">
          <label style="font-size: 0.8rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Lipa Na M-Pesa Online Passkey</label>
          <input type="text" id="cfg-mpesa-passkey" class="form-control" placeholder="Paste Passkey (Leave blank to keep current)" style="font-family: var(--font-mono); font-size: 0.85rem;" />
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 0.6rem; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" id="btn-save-mpesa-config" style="background: #059669; border-color: #059669; font-weight: 800;">
            💾 Save Gateway Settings
          </button>
        </div>
      </form>
    `;

    document.getElementById('form-mpesa-settings').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-mpesa-config');
      saveBtn.disabled = true;
      saveBtn.innerText = '💾 Saving...';

      try {
        const payload = {
          env: document.getElementById('cfg-mpesa-env').value,
          shortcode: document.getElementById('cfg-mpesa-shortcode').value.trim(),
          till_number: document.getElementById('cfg-mpesa-till').value.trim(),
          consumer_key: document.getElementById('cfg-mpesa-key').value.trim(),
          consumer_secret: document.getElementById('cfg-mpesa-secret').value.trim(),
          passkey: document.getElementById('cfg-mpesa-passkey').value.trim()
        };

        await apiFetch('/api/pos/mpesa/config', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        toast('✅ M-Pesa gateway settings updated successfully!');
        modal.innerHTML = '';
      } catch (err) {
        toast(err.message, true);
        saveBtn.disabled = false;
        saveBtn.innerText = '💾 Save Gateway Settings';
      }
    });
  } catch (err) {
    modal.innerHTML = `
      <div class="modal-overlay" style="padding: 1rem; align-items:center; justify-content:center;">
        <div class="modal-container-card" style="max-width: 440px; width: 100%; padding: 1.5rem; text-align: center; background: white;">
          <p style="color: #dc2626;">Failed to load M-Pesa settings: ${escapeHtml(err.message)}</p>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-container').innerHTML=''">Close</button>
        </div>
      </div>
    `;
  }
}

// ==========================================================================
// PAINT PIN CUSTOMER RECALL & REPEAT FORMULATION VIEW
// ==========================================================================
function renderPinCardHtml(pinRecord, baseTins) {
  const hex = pinRecord.hex_code || '#cbd5e1';
  const formula = pinRecord.pigment_formula || '';
  const formulaItems = typeof formula === 'string' 
    ? formula.split(',').map(s => s.trim()).filter(Boolean)
    : Object.entries(formula).map(([k, v]) => `${k}:${v}`);

  return `
    <div class="card pin-recall-card" style="border: 1.5px solid var(--border-light); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; position: relative; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" data-pin="${escapeHtml(pinRecord.paint_pin)}">
      
      <!-- Card Top: Swatch & Shade Name -->
      <div>
        <div style="display: flex; gap: 0.9rem; align-items: flex-start; margin-bottom: 0.85rem;">
          <div style="width: 48px; height: 48px; min-width: 48px; border-radius: 10px; background-color: ${escapeHtml(hex)}; border: 2.5px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.15);"></div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); line-height: 1.2; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${escapeHtml(pinRecord.color_name || 'Custom Mix')}
              </h4>
              <span style="background: #0f172a; color: #f59e0b; font-family: var(--font-mono); font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 5px; white-space: nowrap;">
                ${escapeHtml(pinRecord.paint_pin)}
              </span>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center; margin-top: 3px; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #0284c7;">${escapeHtml(pinRecord.manufacturer || 'Standard')}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted);">·</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${escapeHtml(pinRecord.color_code || '')}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted);">·</span>
              <span style="font-size: 0.7rem; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 700; color: #334155;">${escapeHtml(pinRecord.required_base || 'Base')} Base</span>
            </div>
          </div>
        </div>

        <!-- Recipe Pigment Formula Pill Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.8rem; margin-bottom: 0.85rem;">
          <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.35rem; letter-spacing: 0.4px;">
            🧪 Factory Pigment Dispensation Formula (${pinRecord.tin_size_litres}L Tin):
          </div>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            ${formulaItems.map(item => {
              const [code, ml] = item.split(':');
              return `<span style="background: #ffffff; border: 1px solid #cbd5e1; font-family: var(--font-mono); font-size: 0.74rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: #0f172a;"><strong>${escapeHtml(code)}:</strong> ${escapeHtml(ml)} ml</span>`;
            }).join('') || '<span style="font-size: 0.75rem; color: var(--text-muted);">Custom shade formulation</span>'}
          </div>
        </div>

        <!-- Customer & History Metadata -->
        <div style="font-size: 0.76rem; color: var(--text-secondary); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem 0.8rem; margin-bottom: 1rem; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.75rem;">
          <div>
            <span style="color: var(--text-muted);">👤 Customer:</span> 
            <strong>${escapeHtml(pinRecord.customer_phone || 'Walk-in')}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted);">🛢️ Original Size:</span> 
            <strong>${escapeHtml(pinRecord.tin_size_litres)} Litres (x${pinRecord.quantity_mixed || 1})</strong>
          </div>
          <div>
            <span style="color: var(--text-muted);">🕒 Mixed On:</span> 
            <span>${pinRecord.created_at ? new Date(pinRecord.created_at).toLocaleDateString('en-KE') : 'Past'}</span>
          </div>
          <div>
            <span style="color: var(--text-muted);">👨‍💼 Attendant:</span> 
            <span>${escapeHtml(pinRecord.mixed_by_name || 'Staff')}</span>
          </div>
        </div>
      </div>

      <!-- Card Bottom: Re-Mix & Repeat Order Form -->
      <div style="background: #fdfefe; border-top: 1px solid var(--border-light); padding-top: 0.85rem; margin-top: auto;">
        <div style="font-size: 0.74rem; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 0.5rem;">
          🔁 Repeat Order Mix Dispenser:
        </div>
        
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
          <!-- Tin Size Selector -->
          <div style="flex: 1.4;">
            <label style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 2px;">Tin Size</label>
            <select class="form-control select-repeat-size" style="padding: 4px 8px; font-size: 0.82rem; font-weight: 700;">
              <option value="1" ${Number(pinRecord.tin_size_litres) === 1 ? 'selected' : ''}>1 Litre Tin</option>
              <option value="4" ${Number(pinRecord.tin_size_litres) === 4 ? 'selected' : ''}>4 Litres Tin</option>
              <option value="20" ${Number(pinRecord.tin_size_litres) === 20 ? 'selected' : ''}>20 Litres Drum</option>
            </select>
          </div>

          <!-- Quantity Spinner -->
          <div style="flex: 1;">
            <label style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 2px;">Quantity</label>
            <input type="number" min="1" max="100" value="1" class="form-control input-repeat-qty" style="padding: 4px 8px; font-size: 0.82rem; font-weight: 700; text-align: center;" />
          </div>

          <!-- Customer Phone Confirmation -->
          <div style="flex: 1.6;">
            <label style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 2px;">Phone</label>
            <input type="text" class="form-control input-repeat-phone" value="${escapeHtml(pinRecord.customer_phone || '')}" placeholder="Customer Phone" style="padding: 4px 8px; font-size: 0.82rem;" />
          </div>
        </div>

        <!-- Action Button Row -->
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm btn-dispense-repeat" style="flex: 2; font-weight: 800; padding: 7px 10px; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span>🎨</span> Dispense Mix &amp; Add to Cart
          </button>
          <button class="btn btn-secondary btn-sm btn-print-repeat-label" title="Print Can Lid Label" style="padding: 7px 10px; font-size: 0.82rem;">
            🖨️ Label
          </button>
          <button class="btn btn-secondary btn-sm btn-copy-card-pin" title="Copy PIN" style="padding: 7px 10px; font-size: 0.82rem;">
            📋
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachPinCardListeners(list, baseTins) {
  const cards = document.querySelectorAll('.pin-recall-card');
  cards.forEach((card, idx) => {
    const record = list[idx];
    if (!record) return;

    // 1. Copy PIN button
    const copyBtn = card.querySelector('.btn-copy-card-pin');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(record.paint_pin).then(() => {
          toast(`Copied ${record.paint_pin} to clipboard!`);
          copyBtn.innerText = '✅';
          setTimeout(() => { copyBtn.innerText = '📋'; }, 2000);
        });
      });
    }

    // 2. Print Label button
    const printBtn = card.querySelector('.btn-print-repeat-label');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const sizeSelect = card.querySelector('.select-repeat-size');
        const phoneInput = card.querySelector('.input-repeat-phone');
        showLidStickerModal({
          pin: record.paint_pin,
          colorName: record.color_name || 'Custom Mix',
          manufacturer: record.manufacturer || 'Standard',
          baseName: `${record.required_base || 'Pastel'} Base`,
          tinSize: sizeSelect ? sizeSelect.value : record.tin_size_litres,
          formula: record.pigment_formula || '',
          phone: phoneInput ? phoneInput.value : record.customer_phone,
          date: new Date().toLocaleDateString('en-KE')
        });
      });
    }

    // 3. Dispense Repeat Mix & Add to POS Cart
    const dispenseBtn = card.querySelector('.btn-dispense-repeat');
    if (dispenseBtn) {
      dispenseBtn.addEventListener('click', async () => {
        const sizeSelect = card.querySelector('.select-repeat-size');
        const qtyInput = card.querySelector('.input-repeat-qty');
        const phoneInput = card.querySelector('.input-repeat-phone');

        const tinSize = sizeSelect ? Number(sizeSelect.value) : Number(record.tin_size_litres);
        const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;
        const phone = phoneInput && phoneInput.value.trim() ? phoneInput.value.trim() : (record.customer_phone || '254700000000');

        const reqBaseLower = (record.required_base || 'Pastel').toLowerCase();
        const mfrLower = (record.manufacturer || '').toLowerCase();

        // 1. Flexible match by manufacturer, base name, and exact tin size with stock
        let matchingBase = (baseTins || []).find(b => 
          (b.manufacturer.toLowerCase().includes(mfrLower) || mfrLower.includes(b.manufacturer.toLowerCase())) &&
          (b.base_name.toLowerCase().includes(reqBaseLower) || reqBaseLower.includes(b.base_name.toLowerCase())) &&
          Number(b.tin_size_litres) === tinSize &&
          b.quantity_in_stock >= qty
        );

        // 2. Fallback matching base type with sufficient stock
        if (!matchingBase) {
          matchingBase = (baseTins || []).find(b => 
            (b.base_name.toLowerCase().includes(reqBaseLower) || reqBaseLower.includes(b.base_name.toLowerCase())) &&
            Number(b.tin_size_litres) === tinSize &&
            b.quantity_in_stock >= qty
          );
        }

        // 3. Fallback matching any available base tin
        if (!matchingBase) {
          matchingBase = (baseTins || []).find(b => b.quantity_in_stock >= qty) || (baseTins || [])[0];
        }

        if (!matchingBase) {
          return toast(`Base tin for ${record.manufacturer} ${record.required_base} (${tinSize}L) not found in stock catalog.`, true);
        }

        dispenseBtn.disabled = true;
        dispenseBtn.innerText = '⏳ Mixing & Dispensing...';

        try {
          const payload = {
            color_id: record.color_id,
            base_id: matchingBase.base_id,
            tin_size_litres: tinSize,
            quantity_mixed: qty,
            customer_phone: phone,
            painter_phone: record.painter_phone || null
          };

          const res = await apiFetch('/api/paintpin/mix', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          // Add to POS Cart
          const unitPrice = Math.round(res.unit_cost_kes * 1.35 / 50) * 50;
          state.cart.push({
            type: 'mixed_paint',
            description: `Repeat Mix: ${record.color_name} (${record.color_code || ''}) - ${tinSize}L [${res.paint_pin}]`,
            paint_pin: res.paint_pin,
            quantity: qty,
            unit_cost_kes: res.unit_cost_kes,
            unit_price_kes: unitPrice
          });

          // Update POS Sidebar Badge dynamically
          const posBtn = document.querySelector('button[data-view="pos"]');
          if (posBtn) {
            const totalUnits = (state.cart || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
            let badge = posBtn.querySelector('.nav-badge');
            if (totalUnits > 0) {
              if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                badge.id = 'top-cart-badge';
                posBtn.appendChild(badge);
              }
              badge.innerText = totalUnits;
              badge.style.display = 'inline-block';
            }
          }

          toast(`🎨 Mix Dispensed & Added to POS Cart! PIN: ${res.paint_pin}`);

          // Show Lid Sticker Modal
          showLidStickerModal({
            pin: res.paint_pin,
            colorName: record.color_name,
            manufacturer: record.manufacturer,
            baseName: matchingBase.base_name,
            tinSize: tinSize,
            formula: record.pigment_formula,
            phone: phone,
            date: new Date().toLocaleDateString('en-KE')
          });
        } catch (err) {
          toast(err.message, true);
        } finally {
          dispenseBtn.disabled = false;
          dispenseBtn.innerHTML = `<span>🎨</span> Dispense Mix &amp; Add to Cart`;
        }
      });
    }
  });
}

async function renderPinLookupView(container) {
  let baseTins = [];
  let activeMfr = 'all';

  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.pinLookup} Paint PIN Recall &amp; Repeat Formulation</h2>
        <p>Recall exact customer color recipes when a returning client brings their Paint PIN or phone number. Dispense repeat batches with 1-click!</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-secondary" id="btn-refresh-pin-history">
          🔄 Refresh PIN Records
        </button>
        <button class="btn btn-primary" onclick="showView('mix')">
          🎨 New Paint Mix Studio
        </button>
      </div>
    </div>

    <!-- Search Box Card -->
    <div class="card" style="margin-bottom: 1.5rem; padding: 1.25rem 1.5rem; border: 1.5px solid var(--border-light); background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);">
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <label style="font-size: 0.82rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">
          🔍 Search by Paint PIN, Customer / Fundi Phone, or Shade Name
        </label>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 260px; position: relative;">
            <input 
              type="text" 
              id="pin-search-input" 
              class="form-control" 
              placeholder="Enter PIN (e.g. 46849 or PIN-2026-46849), Phone (e.g. 0712345678), or Color..." 
              style="padding-left: 2.4rem; font-size: 0.95rem; font-weight: 600;" 
              autofocus
            />
            <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 1rem;">🔍</span>
          </div>
          <button class="btn btn-primary" id="btn-do-pin-search" style="min-width: 140px; font-weight: 700;">
            Search Records
          </button>
          <button class="btn btn-secondary" id="btn-clear-pin-search" style="min-width: 90px;">
            Clear
          </button>
        </div>
        
        <!-- Quick Preset Filter Pills -->
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-top: 0.25rem;">
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">Quick Filters:</span>
          <button class="btn btn-sm btn-filter active" data-mfr="all" style="padding: 3px 10px; font-size: 0.74rem;">All Brands</button>
          <button class="btn btn-sm btn-filter" data-mfr="Crown" style="padding: 3px 10px; font-size: 0.74rem;">Crown Paints</button>
          <button class="btn btn-sm btn-filter" data-mfr="Plascon" style="padding: 3px 10px; font-size: 0.74rem;">Plascon</button>
          <button class="btn btn-sm btn-filter" data-mfr="Basco Duracoat" style="padding: 3px 10px; font-size: 0.74rem;">Basco Duracoat</button>
          <button class="btn btn-sm btn-filter" data-mfr="Sadolin" style="padding: 3px 10px; font-size: 0.74rem;">Sadolin</button>
        </div>
      </div>
    </div>

    <!-- Active Results / Recent History Container -->
    <div id="pin-results-container">
      <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <div class="spinner" style="margin: 0 auto 1rem;"></div>
        <p style="font-weight: 600;">Loading Paint PIN records &amp; recipes...</p>
      </div>
    </div>
  `;

  // Helper to render PIN cards list
  async function loadDataAndRender(searchTerm = '', mfrFilter = 'all') {
    const resultsContainer = document.getElementById('pin-results-container');
    if (!resultsContainer) return;

    try {
      let url = searchTerm ? `/api/paintpin/lookup?q=${encodeURIComponent(searchTerm)}` : '/api/paintpin/recent';
      const [pins, bases] = await Promise.all([
        apiFetch(url),
        apiFetch('/api/stock/bases')
      ]);
      baseTins = bases || [];
      let list = pins || [];

      if (mfrFilter && mfrFilter !== 'all') {
        list = list.filter(p => (p.manufacturer || '').toLowerCase().includes(mfrFilter.toLowerCase()));
      }

      if (list.length === 0) {
        resultsContainer.innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem 1.5rem; border: 2px dashed var(--border-light);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎨</div>
            <h3 style="margin: 0 0 0.4rem; font-weight: 800; color: var(--text-primary);">No Paint PIN Records Found</h3>
            <p style="margin: 0 auto 1.25rem; max-width: 420px; color: var(--text-muted); font-size: 0.88rem;">
              ${searchTerm ? `No matching mixes found for "${escapeHtml(searchTerm)}". Try searching by customer phone number or shade name.` : 'No custom paint mixes recorded yet. Mix your first shade in the Tinting Studio!'}
            </p>
            <button class="btn btn-primary" onclick="showView('mix')">
              🎨 Go to Paint Mixing Studio
            </button>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
            ${searchTerm ? `🎯 Search Results for "${escapeHtml(searchTerm)}"` : `🕒 Recently Mixed Paint PINs in Store`}
            <span style="font-size: 0.75rem; background: #0f172a; color: #f59e0b; padding: 2px 8px; border-radius: 12px; font-weight: 800;">${list.length} Records</span>
          </h3>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.25rem;">
          ${list.map(pinRecord => renderPinCardHtml(pinRecord, baseTins)).join('')}
        </div>
      `;

      attachPinCardListeners(list, baseTins);
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="card" style="padding: 2rem; color: var(--status-danger); text-align: center;">
          <p>Failed to load Paint PIN records: ${escapeHtml(err.message)}</p>
          <button class="btn btn-secondary btn-sm" id="btn-retry-pins" style="margin-top: 0.5rem;">Retry</button>
        </div>
      `;
      const retryBtn = document.getElementById('btn-retry-pins');
      if (retryBtn) retryBtn.addEventListener('click', () => loadDataAndRender(searchTerm, mfrFilter));
    }
  }

  // Initial load
  loadDataAndRender();

  // Attach search bar handlers
  const searchInput = document.getElementById('pin-search-input');
  const searchBtn = document.getElementById('btn-do-pin-search');
  const clearBtn = document.getElementById('btn-clear-pin-search');
  const refreshBtn = document.getElementById('btn-refresh-pin-history');

  function triggerSearch() {
    const term = searchInput ? searchInput.value.trim() : '';
    loadDataAndRender(term, activeMfr);
  }

  if (searchBtn) searchBtn.addEventListener('click', triggerSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      loadDataAndRender('', activeMfr);
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      toast('Refreshed Paint PIN records');
      triggerSearch();
    });
  }

  // Filter pills
  const filterBtns = container.querySelectorAll('.btn-filter');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMfr = btn.dataset.mfr || 'all';
      triggerSearch();
    });
  });
}

// ==========================================================================
// 2. POS CHECKOUT VIEW & INTERACTIVE INVENTORY SEARCH
// ==========================================================================
async function renderPosView(container) {
  let hardwareProducts = [];
  let baseTins = [];
  try {
    const [pData, bData] = await Promise.all([
      apiFetch('/api/stock/products'),
      apiFetch('/api/stock/bases')
    ]);
    hardwareProducts = pData || [];
    baseTins = bData || [];
    state.inventoryProducts = hardwareProducts;
  } catch (e) {
    console.error('Failed to load inventory for POS:', e);
  }

  // Consolidated searchable inventory
  const allInventory = [
    ...hardwareProducts.map(p => ({
      id: p.product_id,
      type: 'product',
      cartType: 'hardware_product',
      name: p.product_name,
      sku: p.sku || 'HW',
      category: 'Hardware & Prep',
      categoryIcon: '🔨',
      unitCost: Number(p.unit_cost_kes || 0),
      price: Number(p.unit_price_kes || 0),
      stock: Number(p.quantity_in_stock || 0),
      unit: 'units'
    })),
    ...baseTins.map(b => ({
      id: b.base_id,
      type: 'base',
      cartType: 'tinted_paint',
      name: `${b.manufacturer} ${b.base_name} (${b.tin_size_litres}L)`,
      sku: `${b.manufacturer}-${b.tin_size_litres}L`,
      category: 'Paint Base Tin',
      categoryIcon: '🎨',
      unitCost: Number(b.unit_cost_kes || 1800),
      price: Math.round((b.unit_cost_kes || 1800) * 1.45),
      stock: Number(b.quantity_in_stock || 0),
      unit: 'tins'
    }))
  ];

  const totalItemUnits = state.cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.pos} Point of Sale Terminal &amp; Checkout</h2>
        <p>Search products in inventory, manage shopping cart, and complete customer payment.</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-secondary btn-sm" id="clear-cart-btn" style="display:${state.cart.length ? 'inline-flex' : 'none'}; border-color:#fca5a5; color:#dc2626; font-weight:700;">
          ${Icons.trash} Clear Cart
        </button>
      </div>
    </div>

    <div class="grid-layout-2col">
      <!-- Left: Inventory Search & Shopping Cart Lines -->
      <section class="card-panel">
        <!-- 1. Interactive Inventory Search Box -->
        <div class="pos-search-card" id="pos-search-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <label style="font-size:0.8rem; font-weight:800; color:#0f172a; text-transform:uppercase; display:flex; align-items:center; gap:0.4rem;">
              🔍 Search Inventory to Sell
            </label>
            <button id="add-manual-line-btn" class="btn btn-secondary btn-sm" style="padding:0.2rem 0.6rem; font-size:0.75rem; font-weight:700;">
              + Custom Line
            </button>
          </div>

          <div class="pos-search-input-wrap">
            <span class="pos-search-icon">🔎</span>
            <input 
              type="text" 
              id="pos-product-search-input" 
              class="pos-search-input" 
              placeholder="Type product name, brand, or SKU (e.g. Roller, Brush, Thinner, Tape, Filler, Crown Base)..." 
              autocomplete="off"
            />
            <button id="pos-search-clear-btn" class="pos-search-clear-btn" style="display:none;" title="Clear search">✕</button>
            
            <!-- Autocomplete Results Dropdown Popover -->
            <div id="pos-search-dropdown" class="pos-search-results-dropdown" style="display:none;"></div>
          </div>

          <!-- Quick-Filter Category Tags -->
          <div class="pos-quick-tags">
            <span style="font-size:0.72rem; font-weight:800; color:#64748b;">Quick Picks:</span>
            <button class="pos-tag-btn" data-search="Roller">🖌️ Rollers</button>
            <button class="pos-tag-btn" data-search="Brush">🎨 Brushes</button>
            <button class="pos-tag-btn" data-search="Thinner">🧪 Thinners</button>
            <button class="pos-tag-btn" data-search="Tape">🏷️ Tapes</button>
            <button class="pos-tag-btn" data-search="Sandpaper">📜 Sandpaper</button>
            <button class="pos-tag-btn" data-search="Filler">🧱 Fillers</button>
            <button class="pos-tag-btn" data-search="Base">🪣 Base Tins</button>
          </div>
        </div>

        <!-- 2. Shopping Cart Header & Container -->
        <div class="card-panel-header" style="padding-top:0;">
          <h3 id="pos-cart-header-title">Shopping Cart (${totalItemUnits} item${totalItemUnits === 1 ? '' : 's'})</h3>
          <span class="sub-badge">Terminal #01</span>
        </div>

        <div class="cart-items-container" id="cart-items-container"></div>
      </section>

      <!-- Right: Settle & Payment -->
      <section class="card-panel">
        <div class="card-panel-header">
          <h3>Payment &amp; Customer Settle</h3>
          <span class="sub-badge">Step 2: Settle</span>
        </div>

        <form id="pos-checkout-form">
          <div class="form-group" style="margin-bottom: 1.2rem;">
            <label style="font-weight: 800; font-size: 0.84rem; color: #0f172a; text-transform: uppercase; margin-bottom: 0.4rem; display: block;">
              Customer / Fundi Phone Number
            </label>
            <div style="display: flex; align-items: stretch; width: 100%; border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="background: #f8fafc; border-right: 1.5px solid #e2e8f0; padding: 0.75rem 0.9rem; display: flex; align-items: center; justify-content: center; color: #64748b;">
                ${Icons.phone}
              </div>
              <input 
                type="tel" 
                id="pos-customer-phone" 
                placeholder="254712345678" 
                value="254712345678" 
                style="flex: 1; border: none !important; outline: none !important; padding: 0.75rem 1rem !important; font-size: 1.05rem !important; font-weight: 700 !important; color: #0f172a !important; font-family: var(--font-mono) !important; background: transparent !important; width: 100% !important;" 
              />
            </div>
            <div id="credit-status-pill" style="margin-top:0.4rem;"></div>
          </div>

          <div class="form-group">
            <label>Select Payment Method</label>
            <div class="payment-methods-grid">
              <div class="payment-option-card active" data-method="Cash">
                <span class="payment-icon-lg">💵</span>
                <span class="payment-label-text">Cash</span>
              </div>
              <div class="payment-option-card mpesa" data-method="M-Pesa">
                <span class="payment-icon-lg">📱</span>
                <span class="payment-label-text">M-Pesa</span>
              </div>
              <div class="payment-option-card" data-method="Fundi Credit">
                <span class="payment-icon-lg">👷</span>
                <span class="payment-label-text">Fundi Credit</span>
              </div>
            </div>
          </div>

          <!-- Executive Order Summary Receipt -->
          <div class="order-summary-card">
            <div class="summary-line">
              <span>Items Subtotal:</span>
              <span id="pos-subtotal" style="font-weight:800; font-family:var(--font-mono);">KES 0</span>
            </div>
            <div class="summary-line">
              <span>VAT / Tax (16% Inclusive):</span>
              <span style="font-weight:700; color:var(--text-muted); font-family:var(--font-mono);">KES 0</span>
            </div>
            <div class="summary-line total-line">
              <span>Payable Total:</span>
              <span class="total-val" id="pos-grand-total">KES 0</span>
            </div>
          </div>

          <button type="submit" id="pos-submit-btn" class="btn btn-primary btn-block btn-lg" ${state.cart.length === 0 ? 'disabled' : ''}>
            ✅ Complete Checkout
          </button>
        </form>

        <div id="pos-result-box" style="margin-top:1.2rem;"></div>
      </section>
    </div>
  `;

  let selectedPaymentMethod = 'Cash';

  function addItemToCart(item) {
    if (!item) return;
    if (item.type === 'product') {
      const existing = state.cart.find(c => c.product_id === item.id && c.type === 'hardware_product');
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 1) + 1;
      } else {
        state.cart.push({
          type: 'hardware_product',
          product_id: item.id,
          description: item.name,
          quantity: 1,
          unit_cost_kes: item.unitCost,
          unit_price_kes: item.price
        });
      }
    } else if (item.type === 'base') {
      const existing = state.cart.find(c => c.base_id === item.id && c.type === 'tinted_paint');
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 1) + 1;
      } else {
        state.cart.push({
          type: 'tinted_paint',
          base_id: item.id,
          description: item.name,
          quantity: 1,
          unit_cost_kes: item.unitCost,
          unit_price_kes: item.price
        });
      }
    }
    toast(`Added "${item.name}" to cart`);
    renderCart();
  }

  // ----------------------------------------------------
  // Interactive Search & Typeahead Autocomplete Logic
  // ----------------------------------------------------
  const searchInput = document.getElementById('pos-product-search-input');
  const searchDropdown = document.getElementById('pos-search-dropdown');
  const searchClearBtn = document.getElementById('pos-search-clear-btn');
  let selectedIndex = -1;
  let currentResults = [];

  function performSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      searchDropdown.style.display = 'none';
      searchDropdown.innerHTML = '';
      searchClearBtn.style.display = 'none';
      currentResults = [];
      selectedIndex = -1;
      return;
    }

    searchClearBtn.style.display = 'flex';
    const terms = q.split(/\s+/);

    currentResults = allInventory.filter(item => {
      const targetStr = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
      return terms.every(t => targetStr.includes(t));
    }).slice(0, 25); // Top 25 matches

    if (!currentResults.length) {
      searchDropdown.innerHTML = `
        <div style="padding:1.2rem; text-align:center; color:#64748b;">
          <div style="font-size:1.4rem; margin-bottom:4px;">🔍</div>
          <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">No inventory items found for "${escapeHtml(query)}"</div>
          <p style="font-size:0.76rem; margin:3px 0 8px;">Item might not be cataloged or out of stock.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="pos-btn-add-custom-search" style="font-size:0.75rem;">+ Add "${escapeHtml(query)}" as Custom Item</button>
        </div>
      `;
      searchDropdown.style.display = 'block';

      const customBtn = document.getElementById('pos-btn-add-custom-search');
      if (customBtn) {
        customBtn.addEventListener('click', () => {
          const priceStr = prompt(`Enter unit selling price in KES for "${query}":`, '500');
          if (priceStr !== null) {
            const price = Number(priceStr) || 0;
            state.cart.push({
              type: 'manual_line',
              description: query,
              quantity: 1,
              unit_price_kes: price,
              unit_cost_kes: Math.round(price * 0.7)
            });
            toast(`Added "${query}" to cart`);
            renderCart();
            searchInput.value = '';
            performSearch('');
          }
        });
      }
      return;
    }

    selectedIndex = 0; // Default first result
    searchDropdown.innerHTML = currentResults.map((item, idx) => {
      const stockBadge = item.stock <= 0 
        ? `<span style="color:#dc2626; font-weight:800; font-size:0.72rem; background:#fee2e2; padding:1px 6px; border-radius:4px;">❌ Out of Stock</span>`
        : item.stock <= 5 
        ? `<span style="color:#d97706; font-weight:800; font-size:0.72rem; background:#fef3c7; padding:1px 6px; border-radius:4px;">⚠️ Low Stock (${item.stock})</span>`
        : `<span style="color:#16a34a; font-weight:800; font-size:0.72rem; background:#dcfce7; padding:1px 6px; border-radius:4px;">✅ In Stock (${item.stock} ${item.unit})</span>`;

      return `
        <div class="pos-search-result-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}">
          <div class="pos-result-info">
            <div class="pos-result-name">${item.categoryIcon} ${escapeHtml(item.name)}</div>
            <div class="pos-result-meta">
              <span>SKU: ${escapeHtml(item.sku)}</span>
              <span>·</span>
              ${stockBadge}
            </div>
          </div>
          <div class="pos-result-price-box">
            <span class="pos-result-price">KES ${item.price.toLocaleString()}</span>
            <button type="button" class="pos-result-add-btn">+ Add to Cart</button>
          </div>
        </div>
      `;
    }).join('');

    searchDropdown.style.display = 'block';

    // Click handler for items
    searchDropdown.querySelectorAll('.pos-search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.idx);
        if (currentResults[idx]) {
          addItemToCart(currentResults[idx]);
          searchInput.value = '';
          performSearch('');
          searchInput.focus();
        }
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (searchDropdown.style.display === 'block' && currentResults.length > 0) {
      const items = searchDropdown.querySelectorAll('.pos-search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
        items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
          addItemToCart(currentResults[selectedIndex]);
          searchInput.value = '';
          performSearch('');
          searchInput.focus();
        }
      } else if (e.key === 'Escape') {
        searchDropdown.style.display = 'none';
      }
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    performSearch('');
    searchInput.focus();
  });

  // Quick Pick Tags
  document.querySelectorAll('.pos-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.search;
      searchInput.value = q;
      performSearch(q);
      searchInput.focus();
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const card = document.getElementById('pos-search-card');
    if (card && !card.contains(e.target)) {
      if (searchDropdown) searchDropdown.style.display = 'none';
    }
  });

  function renderCart() {
    const box = document.getElementById('cart-items-container');
    if (!state.cart.length) {
      box.innerHTML = `
        <div class="empty-cart-box">
          <p style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:0.3rem;">Cart is Empty</p>
          <p class="muted" style="font-size:0.88rem;">Use the search bar above to type and add products to the customer's cart.</p>
        </div>
      `;
      updateTotals();
      const clearBtn = document.getElementById('clear-cart-btn');
      if (clearBtn) clearBtn.style.display = 'none';
      const submitBtn = document.getElementById('pos-submit-btn');
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) clearBtn.style.display = 'inline-flex';
    const submitBtn = document.getElementById('pos-submit-btn');
    if (submitBtn) submitBtn.disabled = false;

    box.innerHTML = state.cart.map((item, idx) => {
      const lineTotal = (item.unit_price_kes || 0) * (item.quantity || 1);
      return `
        <div class="cart-row-card">
          <div class="cart-item-info">
            <div class="cart-item-title">${escapeHtml(item.description)}</div>
            ${item.paint_pin ? `<span class="cart-item-badge">PIN: ${item.paint_pin}</span>` : ''}
          </div>

          <div class="cart-item-controls">
            <div class="quantity-stepper">
              <button type="button" class="btn-qty-minus" data-idx="${idx}">-</button>
              <input type="number" class="cart-qty-input" data-idx="${idx}" value="${item.quantity || 1}" min="1" />
              <button type="button" class="btn-qty-plus" data-idx="${idx}">+</button>
            </div>

            <div class="price-input-box">
              <span>KES</span>
              <input type="number" class="cart-price-input" data-idx="${idx}" value="${item.unit_price_kes || 0}" step="10" />
            </div>

            <div class="cart-row-total">
              KES ${lineTotal.toLocaleString()}
            </div>

            <button type="button" class="btn-delete-row" data-idx="${idx}" title="Remove Item">
              ${Icons.trash}
            </button>
          </div>
        </div>
      `;
    }).join('');

    box.querySelectorAll('.btn-qty-minus').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (state.cart[idx].quantity > 1) {
          state.cart[idx].quantity -= 1;
        } else {
          state.cart.splice(idx, 1);
        }
        renderCart();
      });
    });

    box.querySelectorAll('.btn-qty-plus').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        state.cart[idx].quantity = (Number(state.cart[idx].quantity) || 1) + 1;
        renderCart();
      });
    });

    box.querySelectorAll('.cart-qty-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const idx = Number(input.dataset.idx);
        state.cart[idx].quantity = Math.max(1, Number(e.target.value) || 1);
        renderCart();
      });
    });

    box.querySelectorAll('.cart-price-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const idx = Number(input.dataset.idx);
        state.cart[idx].unit_price_kes = Math.max(0, Number(e.target.value) || 0);
        renderCart();
      });
    });

    box.querySelectorAll('.btn-delete-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        state.cart.splice(idx, 1);
        renderCart();
      });
    });

    updateTotals();
  }

  function updateTotals() {
    const totalUnits = state.cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const totalPrice = state.cart.reduce((sum, item) => sum + ((item.unit_price_kes || 0) * (item.quantity || 1)), 0);

    // Update Card Header Title dynamically
    const headerTitle = document.getElementById('pos-cart-header-title');
    if (headerTitle) {
      headerTitle.innerText = `Shopping Cart (${totalUnits} item${totalUnits === 1 ? '' : 's'})`;
    }

    // Update Subtotal and Grand Total
    const subtotalEl = document.getElementById('pos-subtotal');
    const grandTotalEl = document.getElementById('pos-grand-total');
    if (subtotalEl) subtotalEl.innerText = 'KES ' + totalPrice.toLocaleString();
    if (grandTotalEl) grandTotalEl.innerText = 'KES ' + totalPrice.toLocaleString();

    // Update Sidebar Navigation Cart Badge dynamically
    const posBtn = document.querySelector('button[data-view="pos"]');
    if (posBtn) {
      let badge = posBtn.querySelector('.nav-badge');
      if (totalUnits > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          badge.id = 'top-cart-badge';
          posBtn.appendChild(badge);
        }
        badge.innerText = totalUnits;
        badge.style.display = 'inline-block';
      } else if (badge) {
        badge.remove();
      }
    }
  }

  // Manual line add
  const addManualBtn = document.getElementById('add-manual-line-btn');
  if (addManualBtn) {
    addManualBtn.addEventListener('click', () => {
      const desc = prompt('Enter custom item description (e.g. Paint Roller Frame 9-inch):', 'Hardware Accessory');
      if (!desc) return;
      const priceStr = prompt('Enter unit price in KES:', '450');
      const price = Number(priceStr) || 0;

      state.cart.push({
        type: 'manual_line',
        description: desc,
        quantity: 1,
        unit_price_kes: price,
        unit_cost_kes: Math.round(price * 0.7)
      });
      toast(`Added "${desc}" to cart`);
      renderCart();
    });
  }

  // Clear Cart
  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      if (confirm('Clear all items from shopping cart?')) {
        state.cart = [];
        renderCart();
      }
    });
  }

  // Wire Payment Method Cards
  container.querySelectorAll('.payment-option-card').forEach((card) => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.payment-option-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      selectedPaymentMethod = card.dataset.method;
    });
  });

  // Credit limit real-time lookup
  const phoneInput = document.getElementById('pos-customer-phone');
  const creditStatusPill = document.getElementById('credit-status-pill');
  if (phoneInput && creditStatusPill) {
    const checkCredit = async (phone) => {
      if (!phone || phone.length < 9) {
        creditStatusPill.innerHTML = '';
        return;
      }
      try {
        const client = await apiFetch(`/api/clients/${phone}`);
        if (client && client.credit_limit_kes > 0) {
          const avail = client.credit_limit_kes - client.current_debt_kes;
          creditStatusPill.innerHTML = `
            <span class="status-pill paid" style="font-size:0.75rem;">
              👷 ${client.full_name}: Avail Credit KES ${avail.toLocaleString()} / ${client.credit_limit_kes.toLocaleString()}
            </span>
          `;
        } else {
          creditStatusPill.innerHTML = '<span class="status-pill" style="font-size:0.75rem;">Cash/M-Pesa Customer (No Credit Limit)</span>';
        }
      } catch (e) {
        creditStatusPill.innerHTML = '';
      }
    };
    phoneInput.addEventListener('blur', (e) => checkCredit(e.target.value.trim()));
    checkCredit(phoneInput.value.trim());
  }

  // Submit Checkout Form
  const checkoutForm = document.getElementById('pos-checkout-form');
  const resultBox = document.getElementById('pos-result-box');

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.cart.length) {
      toast('Shopping cart is empty.', true);
      return;
    }

    const customerPhone = phoneInput ? phoneInput.value.trim() : '254700000000';
    const grandTotal = state.cart.reduce((sum, it) => sum + ((it.unit_price_kes || 0) * (it.quantity || 1)), 0);

    // If M-Pesa is selected, trigger Daraja Direct Checkout Modal
    if (selectedPaymentMethod === 'M-Pesa') {
      showMpesaCheckoutModal({
        customerPhone: customerPhone,
        grandTotal: grandTotal,
        items: state.cart,
        onComplete: (res, receiptCode) => {
          resultBox.innerHTML = `
            <div style="background:#ecfdf5; border:1.5px solid #a7f3d0; border-radius:12px; padding:1.25rem; text-align:center;">
              <div style="font-size:2.2rem; margin-bottom:4px;">🎉</div>
              <h4 style="color:#065f46; font-size:1.15rem; font-weight:800; margin:0 0 4px;">M-Pesa Sale Completed!</h4>
              <p style="color:#047857; font-size:0.88rem; margin:0 0 0.5rem;">Invoice <strong>#${res.invoice_number || 'INV-SUCCESS'}</strong> · M-Pesa Receipt <strong>${escapeHtml(receiptCode)}</strong></p>
              <div style="font-size:1.15rem; font-weight:900; color:#0f172a; margin-bottom:1rem; font-family:var(--font-mono);">KES ${grandTotal.toLocaleString()}</div>
              <div style="display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm" id="pos-btn-print-receipt" style="background:#059669; border-color:#059669;">🖨️ Print Receipt</button>
                <button class="btn btn-secondary btn-sm" id="pos-btn-new-sale">🛒 Next Sale</button>
              </div>
            </div>
          `;

          const printBtn = document.getElementById('pos-btn-print-receipt');
          if (printBtn) {
            printBtn.addEventListener('click', () => {
              showReceiptModal({
                invoice_id: res.invoice_id,
                invoice_number: res.invoice_number,
                customer_phone: customerPhone,
                payment_method: 'Mpesa',
                mpesa_receipt_code: receiptCode,
                total_kes: grandTotal,
                total_amount_kes: grandTotal,
                created_at: new Date().toISOString(),
                items: res.items || state.cart
              });
            });
          }

          const nextSaleBtn = document.getElementById('pos-btn-new-sale');
          if (nextSaleBtn) {
            nextSaleBtn.addEventListener('click', () => {
              state.cart = [];
              renderPosView(container);
            });
          }

          // Open receipt automatically
          showReceiptModal({
            invoice_id: res.invoice_id,
            invoice_number: res.invoice_number,
            customer_phone: customerPhone,
            payment_method: 'Mpesa',
            mpesa_receipt_code: receiptCode,
            total_kes: grandTotal,
            total_amount_kes: grandTotal,
            created_at: new Date().toISOString(),
            items: res.items || state.cart
          });

          state.cart = [];
          updateTotals();
        }
      });
      return;
    }

    const payload = {
      customer_phone: customerPhone,
      payment_method: selectedPaymentMethod,
      items: state.cart.map(it => ({
        type: it.type || 'hardware_product',
        product_id: it.product_id || null,
        base_id: it.base_id || null,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit_price_kes: Number(it.unit_price_kes || 0),
        unit_cost_kes: Number(it.unit_cost_kes || 0),
        paint_pin: it.paint_pin || null
      }))
    };

    const submitBtn = document.getElementById('pos-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = '⏳ Processing Checkout...';

    try {
      const res = await apiFetch('/api/pos/checkout', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      resultBox.innerHTML = `
        <div style="background:#ecfdf5; border:1.5px solid #a7f3d0; border-radius:12px; padding:1.25rem; text-align:center;">
          <div style="font-size:2.2rem; margin-bottom:4px;">🎉</div>
          <h4 style="color:#065f46; font-size:1.15rem; font-weight:800; margin:0 0 4px;">Sale Completed Successfully!</h4>
          <p style="color:#047857; font-size:0.88rem; margin:0 0 1rem;">Invoice <strong>#${res.invoice_number || 'INV-SUCCESS'}</strong> for <strong>KES ${grandTotal.toLocaleString()}</strong></p>
          <div style="display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" id="pos-btn-print-receipt" style="background:#059669; border-color:#059669;">🖨️ Print Receipt</button>
            <button class="btn btn-secondary btn-sm" id="pos-btn-new-sale">🛒 Next Sale</button>
          </div>
        </div>
      `;

      const printBtn = document.getElementById('pos-btn-print-receipt');
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          showReceiptModal({
            invoice_id: res.invoice_id,
            invoice_number: res.invoice_number,
            customer_phone: customerPhone,
            payment_method: selectedPaymentMethod,
            total_kes: grandTotal,
            total_amount_kes: grandTotal,
            created_at: new Date().toISOString(),
            items: payload.items
          });
        });
      }

      const nextSaleBtn = document.getElementById('pos-btn-new-sale');
      if (nextSaleBtn) {
        nextSaleBtn.addEventListener('click', () => {
          state.cart = [];
          renderPosView(container);
        });
      }

      state.cart = [];
      updateTotals();
      toast('Payment completed & receipt generated!');
    } catch (err) {
      resultBox.innerHTML = `
        <div style="background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:1rem; color:#dc2626;">
          <strong>Checkout Error:</strong> ${err.message}
        </div>
      `;
      submitBtn.disabled = false;
      submitBtn.innerText = '✅ Complete Checkout';
      toast(err.message, true);
    }
  });

  renderCart();
}


// 3. PRO-FORMA QUOTATION BUILDER & EXECUTIVE PROJECT LOCKING
// ==========================================================================
async function renderQuotesView(container) {
  const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.quotes} Pro-Forma Quotation Builder &amp; Project Locking</h2>
        <p>Draft commercial quotes for site foremen with 14-day price locks and 1-click invoice conversion.</p>
      </div>
      <div class="view-header-actions" style="display:flex; align-items:center; gap:0.6rem;">
        <button id="btn-clear-all-quotes" class="btn btn-secondary btn-sm" style="border-color:#fca5a5; color:#dc2626; font-weight:700;">
          ${Icons.trash} Clear All Quotes
        </button>
        <button id="btn-create-quote" class="btn btn-primary btn-sm" style="background:#0f172a; color:#f59e0b; border-color:#0f172a; font-weight:800;">
          ${Icons.plus} New Pro-Forma Quote
        </button>
      </div>
    </div>

    <!-- 3 Executive KPI Summary Cards -->
    <div class="quotes-3kpi-grid" id="quotes-kpi-summary">
      <div class="kpi-metric-card" style="border-left: 4px solid #f59e0b;">
        <div class="kpi-metric-label">ACTIVE 14-DAY PRICE LOCKS</div>
        <div>
          <div class="kpi-metric-val" id="qkpi-active-val" style="color:#d97706;">KSh 0</div>
          <div class="kpi-currency-prefix" id="qkpi-active-sub" style="margin-top:2px;">0 quote(s) locked</div>
        </div>
      </div>

      <div class="kpi-metric-card" style="border-left: 4px solid #059669;">
        <div class="kpi-metric-label">CONVERTED TO INVOICES</div>
        <div>
          <div class="kpi-metric-val green" id="qkpi-conv-val">KSh 0</div>
          <div class="kpi-currency-prefix" id="qkpi-conv-sub" style="margin-top:2px;">0 converted sale(s)</div>
        </div>
      </div>

      <div class="kpi-metric-card" style="border-left: 4px solid #3b82f6;">
        <div class="kpi-metric-label">TOTAL QUOTED PIPELINE</div>
        <div>
          <div class="kpi-metric-val" id="qkpi-total-val" style="color:#0f172a;">KSh 0</div>
          <div class="kpi-currency-prefix" id="qkpi-total-sub" style="margin-top:2px;">0 total quotation(s)</div>
        </div>
      </div>
    </div>

    <!-- Quotations Table Card -->
    <div class="card-panel" style="padding:0; overflow:hidden;">
      <div class="card-panel-header" style="padding:1.1rem 1.25rem; border-bottom:1.5px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="margin:0; font-size:1.05rem; font-weight:800;">Active &amp; Historical Quotations</h3>
          <span style="font-size:0.75rem; color:#64748b;">Review price locks, print pro-forma sheets, or convert quotes to live POS receipts</span>
        </div>
      </div>
      <div id="quotes-table-container">
        <div style="padding:2.5rem; text-align:center; color:#64748b;">Loading commercial quotations...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-create-quote').addEventListener('click', showCreateQuoteModal);

  document.getElementById('btn-clear-all-quotes').addEventListener('click', () => {
    promptSecurityPin({
      title: '🗑️ Clear All Quotations',
      description: 'Are you sure you want to permanently clear all active and expired commercial quotations? This requires Store PIN authorization.',
      badgeText: 'PIN Protected',
      confirmText: 'Confirm & Clear Quotes',
      onConfirm: async (pin) => {
        const res = await apiFetch('/api/quotations/clear-all', {
          method: 'POST',
          body: JSON.stringify({ pin })
        });
        toast(res.message || 'All quotations cleared.');
        renderQuotesView(container);
      }
    });
  });

  try {
    const list = await apiFetch('/api/quotations');
    const box = document.getElementById('quotes-table-container');

    // Calculate Summary Metrics
    let activeVal = 0;
    let activeCount = 0;
    let convVal = 0;
    let convCount = 0;
    let totalVal = 0;

    (list || []).forEach((q) => {
      const isExpired = new Date(q.expires_at) < new Date() && q.status === 'Active';
      const val = Number(q.total_amount_kes || 0);
      totalVal += val;
      if (q.status === 'Converted') {
        convVal += val;
        convCount++;
      } else if (q.status === 'Active' && !isExpired) {
        activeVal += val;
        activeCount++;
      }
    });

    const activeEl = document.getElementById('qkpi-active-val');
    const activeSub = document.getElementById('qkpi-active-sub');
    const convEl = document.getElementById('qkpi-conv-val');
    const convSub = document.getElementById('qkpi-conv-sub');
    const totalEl = document.getElementById('qkpi-total-val');
    const totalSub = document.getElementById('qkpi-total-sub');

    if (activeEl) activeEl.innerText = `KSh ${fmt(activeVal)}`;
    if (activeSub) activeSub.innerText = `${activeCount} active quote(s) locked for 14 days`;
    if (convEl) convEl.innerText = `KSh ${fmt(convVal)}`;
    if (convSub) convSub.innerText = `${convCount} quote(s) converted to sales`;
    if (totalEl) totalEl.innerText = `KSh ${fmt(totalVal)}`;
    if (totalSub) totalSub.innerText = `${list.length} total estimate(s) drafted`;

    if (!list || !list.length) {
      box.innerHTML = `
        <div style="padding:3.5rem 1rem; text-align:center; color:#64748b;">
          <div style="font-size:2.2rem; margin-bottom:0.5rem;">📋</div>
          <strong style="font-size:1.05rem; color:#0f172a;">No commercial quotations drafted yet.</strong>
          <p style="font-size:0.85rem; margin:4px 0 1.2rem;">Create a 14-day price locked quotation for site foremen or project clients.</p>
          <button class="btn btn-primary btn-sm" onclick="showCreateQuoteModal()">+ Create First Quotation</button>
        </div>
      `;
      return;
    }

    box.innerHTML = `
      <table class="quote-premium-table">
        <thead>
          <tr>
            <th style="width: 140px;">QUOTE #</th>
            <th>CUSTOMER / CONTRACTOR</th>
            <th>SITE LOCATION</th>
            <th>TOTAL AMOUNT</th>
            <th>PRICE LOCK STATUS</th>
            <th style="text-align:right;">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((q) => {
            const isExpired = new Date(q.expires_at) < new Date() && q.status === 'Active';
            return `
              <tr>
                <td>
                  <strong style="font-size:0.92rem; color:#0f172a; letter-spacing:0.3px; white-space:nowrap;">
                    ${q.quote_number}
                  </strong>
                </td>
                <td>
                  <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">
                    ${escapeHtml(q.customer_name)}
                  </div>
                  <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">
                    📞 ${escapeHtml(q.customer_phone || 'No phone')}
                  </div>
                </td>
                <td>
                  <div style="font-size:0.86rem; color:#334155; font-weight:600;">
                    📍 ${escapeHtml(q.site_location || 'On-site collection')}
                  </div>
                </td>
                <td>
                  <strong style="font-size:0.95rem; color:#0f172a; white-space:nowrap;">
                    KSh ${fmt(q.total_amount_kes)}
                  </strong>
                </td>
                <td>
                  ${q.status === 'Converted' ? `<span class="status-pill paid" style="font-size:0.75rem; font-weight:800;">✅ CONVERTED</span>` :
                    isExpired ? `<span class="status-pill failed" style="font-size:0.75rem; font-weight:800;">⚠️ LOCK EXPIRED</span>` :
                    `<span class="status-pill pending" style="font-size:0.75rem; font-weight:800; background:#fef3c7; color:#92400e; border:1px solid #fde68a;">🔒 14-DAY LOCK</span>`}
                </td>
                <td style="text-align:right;">
                  <div style="display:inline-flex; align-items:center; gap:0.35rem; justify-content:flex-end;">
                    <button data-id="${q.quote_id}" class="btn-view-quote btn btn-secondary btn-sm" style="padding:0.28rem 0.65rem; font-size:0.78rem; font-weight:700;">
                      View
                    </button>
                    <button data-id="${q.quote_id}" class="btn-pdf-quote btn btn-secondary btn-sm" style="padding:0.28rem 0.65rem; font-size:0.78rem; font-weight:700; color:#b45309; border-color:#fde68a; background:#fffbeb;" title="Download Pro-Forma PDF">
                      📥 PDF
                    </button>
                    ${q.status === 'Active' && !isExpired ? `
                      <button data-id="${q.quote_id}" class="btn-convert-quote btn btn-primary btn-sm" style="padding:0.28rem 0.65rem; font-size:0.78rem; font-weight:800; background:#0f172a; color:#f59e0b; border-color:#0f172a;">
                        Convert
                      </button>
                    ` : ''}
                    <button data-id="${q.quote_id}" data-num="${q.quote_number}" class="btn-delete-quote btn btn-danger btn-sm" style="padding:0.28rem 0.5rem; font-size:0.78rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Quote (PIN Required)">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    box.querySelectorAll('.btn-view-quote').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = list.find((x) => x.quote_id === Number(btn.dataset.id));
        showPrintQuoteModal(q);
      });
    });

    box.querySelectorAll('.btn-pdf-quote').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = list.find((x) => x.quote_id === Number(btn.dataset.id));
        if (q) downloadProformaQuotationPdf(q);
      });
    });

    box.querySelectorAll('.btn-convert-quote').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Convert this Pro-Forma Quote into a live POS invoice and deduct stock?')) return;
        try {
          const res = await apiFetch(`/api/quotations/${btn.dataset.id}/convert`, { method: 'POST', body: JSON.stringify({ payment_method: 'Cash' }) });
          toast(res.message);
          renderQuotesView(container);
        } catch (err) {
          toast(err.message, true);
        }
      });
    });

    box.querySelectorAll('.btn-delete-quote').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;
        promptSecurityPin({
          title: `🗑️ Delete Quote ${num}`,
          description: `Permanently delete quotation ${num}? This requires PIN authorization.`,
          badgeText: 'PIN Protected',
          confirmText: 'Confirm & Delete Quote',
          onConfirm: async (pin) => {
            const res = await apiFetch(`/api/quotations/${id}`, {
              method: 'DELETE',
              body: JSON.stringify({ pin })
            });
            toast(res.message || 'Quote deleted successfully.');
            renderQuotesView(container);
          }
        });
      });
    });

  } catch (err) {
    document.getElementById('quotes-table-container').innerHTML = `<p class="status-pill failed">${err.message}</p>`;
  }
}


function showCreateQuoteModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:680px;">
        <div class="modal-header-bar">
          <h3>Create Pro-Forma Quotation (14-Day Price Lock)</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="new-quote-form">
          <div class="form-row">
            <div class="form-group">
              <label>Client / Site Foreman Name</label>
              <input type="text" id="nq-name" placeholder="e.g. Eng. George Otieno" required />
            </div>
            <div class="form-group">
              <label>Client Phone Number</label>
              <input type="text" id="nq-phone" placeholder="2547XXXXXXXX" required />
            </div>
          </div>
          <div class="form-group">
            <label>Project / Site Location</label>
            <input type="text" id="nq-site" placeholder="e.g. Kilimani Commercial Heights, 4th Floor" />
          </div>

          <div style="border-top:1px solid var(--border-light); padding-top:1rem; margin-top:0.5rem;">
            <label style="font-weight:700; font-size:0.85rem;">Quotation Items</label>
            <div id="quote-line-builder" style="display:flex; flex-direction:column; gap:0.5rem; margin:0.6rem 0;">
              <div class="quote-line-row" style="display:flex; gap:0.5rem;">
                <input type="text" placeholder="Item description (e.g. Crown Silk 20L Verona Gold)" class="ql-desc" style="flex:2;" required />
                <input type="number" placeholder="Qty" value="1" min="1" class="ql-qty" style="width:70px;" required />
                <input type="number" placeholder="Price (KES)" value="3200" class="ql-price" style="width:110px;" required />
              </div>
            </div>
            <button type="button" id="btn-add-quote-line" class="btn btn-secondary btn-sm">+ Add Line</button>
          </div>

          <div class="form-group" style="margin-top:1rem;">
            <label>Notes / Site Terms</label>
            <input type="text" id="nq-notes" value="Includes on-site tinting verification and 14-day price lock guarantee." />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Generate Pro-Forma Quote</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-add-quote-line').addEventListener('click', () => {
    const builder = document.getElementById('quote-line-builder');
    const row = document.createElement('div');
    row.className = 'quote-line-row';
    row.style.cssText = 'display:flex; gap:0.5rem; margin-top:0.4rem;';
    row.innerHTML = `
      <input type="text" placeholder="Item description" class="ql-desc" style="flex:2;" required />
      <input type="number" placeholder="Qty" value="1" min="1" class="ql-qty" style="width:70px;" required />
      <input type="number" placeholder="Price (KES)" value="500" class="ql-price" style="width:110px;" required />
      <button type="button" class="btn-delete-row" onclick="this.parentElement.remove()">✕</button>
    `;
    builder.appendChild(row);
  });

  document.getElementById('new-quote-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rows = Array.from(document.querySelectorAll('.quote-line-row'));
    const items = rows.map((r) => ({
      description: r.querySelector('.ql-desc').value.trim(),
      quantity: Number(r.querySelector('.ql-qty').value) || 1,
      unit_price_kes: Number(r.querySelector('.ql-price').value) || 0
    })).filter((i) => i.description);

    const payload = {
      customer_name: document.getElementById('nq-name').value.trim(),
      customer_phone: document.getElementById('nq-phone').value.trim(),
      site_location: document.getElementById('nq-site').value.trim(),
      notes: document.getElementById('nq-notes').value.trim(),
      validity_days: 14,
      items
    };

    try {
      const res = await apiFetch('/api/quotations', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(`Quote ${res.quote_number} generated successfully!`);
      showView('quotes');
    } catch (err) {
      toast(err.message, true);
    }
  });
}



// ==========================================================================
// PRO-FORMA QUOTATION PDF GENERATOR & PRINT ENGINE (MATCHING VIEWED DOCUMENT)
// ==========================================================================

function generateProformaQuotationHtml(q) {
  const isConverted = q.status === 'Converted';
  const isExpired = new Date(q.expires_at) < new Date() && !isConverted;
  const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

  return `
    <div class="proforma-pdf-document" style="background:#ffffff; max-width:760px; margin:0 auto; padding:28px 32px; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#0f172a; position:relative; box-sizing:border-box; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
      
      <!-- Watermark Across Center: visible and distinguishable, yet translucent so item details remain sharp and clear -->
      <div style="position:absolute; top:46%; left:50%; transform:translate(-50%, -50%) rotate(-24deg); font-size:5.4rem; font-weight:900; color:rgba(71, 85, 105, 0.085); pointer-events:none; z-index:0; letter-spacing:10px; text-transform:uppercase; white-space:nowrap; user-select:none; font-family:'Plus Jakarta Sans', -apple-system, sans-serif;">
        ${isConverted ? 'CONVERTED' : isExpired ? 'EXPIRED' : 'PRO-FORMA'}
      </div>

      <div style="position:relative; z-index:1;">
        <!-- 1. Header Bar Matching Screenshot -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.1rem;">
          <div>
            <h1 style="margin:0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.4px;">PAINT &amp; HARDWARE ERP</h1>
            <p style="margin:3px 0 0; font-size:0.85rem; color:#64748b; font-weight:500; line-height:1.4;">
              Specialist Paint Tinting &amp; Building Hardware Depot<br/>
              Nairobi, Kenya · Tel: +254 700 000 000
            </p>
          </div>

          <div style="text-align:right;">
            <div style="display:inline-block; padding:4px 12px; border-radius:9999px; font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; ${
              isConverted 
                ? 'background:#ecfdf5; color:#065f46; border:1.5px solid #a7f3d0;' 
                : isExpired 
                  ? 'background:#fef2f2; color:#991b1b; border:1.5px solid #fecaca;' 
                  : 'background:#fef3c7; color:#92400e; border:1.5px solid #fde68a;'
            }">
              ${isConverted ? '✅ CONVERTED TO INVOICE' : isExpired ? '⚠️ LOCK EXPIRED' : '🔒 14-DAY PRICE LOCK'}
            </div>
            <div style="font-family:'JetBrains Mono', monospace; font-size:1.2rem; font-weight:800; color:#0f172a; letter-spacing:0.5px;">
              ${q.quote_number}
            </div>
            <div style="font-size:0.82rem; color:#64748b; margin-top:2px;">
              Date: <strong style="color:#0f172a;">${new Date(q.created_at).toLocaleDateString('en-GB')}</strong>
            </div>
            <div style="font-size:0.82rem; color:#64748b;">
              Valid Until: <strong style="color:#0f172a;">${new Date(q.expires_at).toLocaleDateString('en-GB')}</strong>
            </div>
          </div>
        </div>

        <!-- Horizontal Solid Line -->
        <div style="height:2px; background:#0f172a; margin-bottom:1.25rem;"></div>

        <!-- 2. Dual Rounded Info Boxes Matching Screenshot -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-bottom:1.4rem;">
          <!-- Left: Client Info -->
          <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:0.95rem 1.15rem;">
            <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
              QUOTED TO (CLIENT):
            </div>
            <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-bottom:3px;">
              ${escapeHtml(q.customer_name || 'Valued Client')}
            </div>
            <div style="font-size:0.85rem; color:#475569; line-height:1.45;">
              Phone: <strong style="color:#0f172a;">${escapeHtml(q.customer_phone || 'N/A')}</strong><br/>
              Site: <strong style="color:#0f172a;">${escapeHtml(q.site_location || 'On-site collection')}</strong>
            </div>
          </div>

          <!-- Right: Payment & Settlement -->
          <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:0.95rem 1.15rem; text-align:right;">
            <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
              PAYMENT &amp; SETTLEMENT:
            </div>
            <div style="font-size:0.85rem; color:#475569; line-height:1.45;">
              M-Pesa Buy Goods Till: <strong style="color:#0f172a; font-family:'JetBrains Mono', monospace; font-size:0.92rem;">849201</strong><br/>
              Equity Bank A/C: <strong style="color:#0f172a; font-family:'JetBrains Mono', monospace; font-size:0.92rem;">011029384756</strong><br/>
              Branch: <strong style="color:#0f172a;">Nairobi Supreme</strong>
            </div>
          </div>
        </div>

        <!-- 3. Itemized Products Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:1.4rem;">
          <thead>
            <tr style="background:#f8fafc; border-top:1px solid #e2e8f0; border-bottom:1.5px solid #cbd5e1;">
              <th style="padding:9px 12px; font-size:0.75rem; font-weight:800; color:#64748b; text-align:center; width:35px;">#</th>
              <th style="padding:9px 12px; font-size:0.75rem; font-weight:800; color:#64748b; text-align:left;">ITEM DESCRIPTION</th>
              <th style="padding:9px 12px; font-size:0.75rem; font-weight:800; color:#64748b; text-align:center; width:70px;">QTY</th>
              <th style="padding:9px 12px; font-size:0.75rem; font-weight:800; color:#64748b; text-align:right; width:130px;">UNIT PRICE</th>
              <th style="padding:9px 12px; font-size:0.75rem; font-weight:800; color:#64748b; text-align:right; width:140px;">AMOUNT (KES)</th>
            </tr>
          </thead>
          <tbody>
            ${(q.items || []).map((it, idx) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:11px 12px; text-align:center; font-size:0.84rem; color:#64748b;">${idx + 1}</td>
                <td style="padding:11px 12px; font-size:0.9rem; font-weight:700; color:#0f172a;">${escapeHtml(it.description)}</td>
                <td style="padding:11px 12px; text-align:center; font-size:0.9rem; font-weight:700; color:#0f172a;">${it.quantity}</td>
                <td style="padding:11px 12px; text-align:right; font-size:0.88rem; font-family:'JetBrains Mono', monospace; color:#334155;">KES ${fmt(it.unit_price_kes)}</td>
                <td style="padding:11px 12px; text-align:right; font-size:0.92rem; font-weight:800; font-family:'JetBrains Mono', monospace; color:#0f172a;">KES ${fmt(Number(it.quantity) * Number(it.unit_price_kes))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 4. Grand Total Row Matching Screenshot -->
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:1rem; margin-bottom:1.5rem; padding-right:12px;">
          <span style="font-size:1.02rem; font-weight:800; color:#0f172a; letter-spacing:0.3px;">GRAND TOTAL (KES):</span>
          <span style="font-size:1.3rem; font-weight:800; color:#d97706; font-family:'JetBrains Mono', monospace; letter-spacing:0.5px;">KES ${fmt(q.total_amount_kes)}</span>
        </div>

        <!-- 5. Commercial Guarantee Footer -->
        <div style="border-top:1px dashed #cbd5e1; padding-top:0.85rem; font-size:0.76rem; color:#64748b; line-height:1.45;">
          <strong>Commercial Guarantee:</strong> Prices and paint tinting formulations are strictly price-locked for 14 calendar days from issue date. Custom mixed paint is precision-formulated upon client approval.
        </div>
      </div>
    </div>
  `;
}

function downloadProformaQuotationPdf(q) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '750px';
  container.innerHTML = generateProformaQuotationHtml(q);
  document.body.appendChild(container);

  if (window.html2pdf) {
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `ProForma_Quotation_${q.quote_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container.querySelector('.proforma-pdf-document')).save().then(() => {
      document.body.removeChild(container);
      toast(`Pro-Forma Quotation ${q.quote_number} downloaded as PDF!`);
    }).catch((err) => {
      console.error('html2pdf generation error, falling back to jsPDF:', err);
      document.body.removeChild(container);
      fallbackJsPdfQuotation(q);
    });
  } else {
    document.body.removeChild(container);
    fallbackJsPdfQuotation(q);
  }
}

function fallbackJsPdfQuotation(q) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const isConverted = q.status === 'Converted';
      const isExpired = new Date(q.expires_at) < new Date() && !isConverted;
      const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

      // Top White Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, 'F');

      // Brand Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PAINT & HARDWARE ERP', 14, 20);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Specialist Paint Tinting & Building Hardware Depot', 14, 26);
      doc.text('Nairobi, Kenya · Tel: +254 700 000 000', 14, 31);

      // Quote Number & Header Info on Right
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(q.quote_number, 196, 26, { align: 'right' });

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${new Date(q.created_at).toLocaleDateString('en-GB')}`, 196, 32, { align: 'right' });
      doc.text(`Valid Until: ${new Date(q.expires_at).toLocaleDateString('en-GB')}`, 196, 37, { align: 'right' });

      // Status Pill
      if (isConverted) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(144, 12, 52, 7, 3, 3, 'FD');
        doc.setTextColor(6, 95, 70);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('CONVERTED TO INVOICE', 170, 16.5, { align: 'center' });
      } else {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(253, 230, 138);
        doc.roundedRect(150, 12, 46, 7, 3, 3, 'FD');
        doc.setTextColor(146, 64, 14);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('14-DAY PRICE LOCK', 173, 16.5, { align: 'center' });
      }

      // Subtle Translucent Watermark in Center
      doc.setTextColor(240, 243, 248);
      doc.setFontSize(44);
      doc.setFont('helvetica', 'bold');
      doc.text(isConverted ? 'CONVERTED' : isExpired ? 'EXPIRED' : 'PRO-FORMA', 105, 140, { align: 'center', angle: 25 });

      // Horizontal Divider
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(14, 42, 196, 42);

      // 2 Gray Boxes Side-by-Side
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 46, 88, 28, 2, 2, 'FD');
      doc.roundedRect(108, 46, 88, 28, 2, 2, 'FD');

      // Left Box: Quoted To
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('QUOTED TO (CLIENT):', 18, 52);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(q.customer_name || 'Valued Client', 18, 58);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Phone: ${q.customer_phone || 'N/A'}`, 18, 64);
      doc.text(`Site: ${(q.site_location || 'On-site collection').substring(0, 35)}`, 18, 70);

      // Right Box: Payment & Settlement
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT & SETTLEMENT:', 192, 52, { align: 'right' });

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('M-Pesa Buy Goods Till: 849201', 192, 58, { align: 'right' });
      doc.text('Equity Bank A/C: 011029384756', 192, 64, { align: 'right' });
      doc.text('Branch: Nairobi Supreme', 192, 70, { align: 'right' });

      // Table
      const tableData = (q.items || []).map((it, idx) => [
        String(idx + 1),
        it.description || 'Quoted Product',
        String(it.quantity || 1),
        'KES ' + fmt(it.unit_price_kes),
        'KES ' + fmt(Number(it.quantity || 1) * Number(it.unit_price_kes || 0))
      ]);

      doc.autoTable({
        startY: 79,
        head: [['#', 'ITEM DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT (KES)']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [100, 116, 139],
          fontStyle: 'bold',
          fontSize: 7.5,
          lineWidth: { bottom: 0.3 },
          lineColor: [203, 213, 225]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 90, fontStyle: 'bold' },
          2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        styles: { font: 'helvetica', fontSize: 8.5, textColor: [15, 23, 42], cellPadding: 3.5 }
      });

      let finalY = doc.lastAutoTable.finalY + 8;

      // Grand Total
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('GRAND TOTAL (KES):', 145, finalY + 4, { align: 'right' });

      doc.setTextColor(217, 119, 6);
      doc.setFontSize(12);
      doc.text(`KES ${fmt(q.total_amount_kes)}`, 196, finalY + 4, { align: 'right' });

      finalY += 16;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, finalY, 196, finalY);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Commercial Guarantee: Prices and paint tinting formulations are strictly price-locked for 14 calendar days from issue date.', 14, finalY + 5);

      doc.save(`ProForma_Quotation_${q.quote_number}.pdf`);
      toast(`Pro-Forma Quotation ${q.quote_number} downloaded as PDF!`);
    } catch (e) {
      console.error('jsPDF generation failed:', e);
      window.print();
    }
  } else {
    window.print();
  }
}

function printProformaQuotation(q) {
  const printWin = window.open('', '_blank', 'width=800,height=900');
  printWin.document.write(`
    <html>
      <head>
        <title>Pro-Forma Quotation - ${q.quote_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 20px; background: #fff; color: #0f172a; }
        </style>
      </head>
      <body>
        ${generateProformaQuotationHtml(q)}
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function showPrintQuoteModal(q) {
  const modal = document.getElementById('modal-container');
  const isConverted = q.status === 'Converted';
  const isExpired = new Date(q.expires_at) < new Date() && !isConverted;

  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:820px; padding:1.25rem;">
        <div class="modal-header-bar" style="margin-bottom:0.8rem; padding-bottom:0.6rem; border-bottom:1px solid #e2e8f0;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:1.2rem;">📋</span>
            <h3 style="margin:0; font-size:1.1rem; font-weight:800;">Pro-Forma Quotation Document</h3>
          </div>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <div id="modal-printable-quote-area">
          ${generateProformaQuotationHtml(q)}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; padding-top:0.6rem; border-top:1px solid #e2e8f0;">
          <div>
            ${q.status === 'Active' && !isExpired ? `
              <button class="btn btn-primary btn-sm btn-modal-convert" style="font-weight:700;">
                ⚡ Convert to Live Invoice
              </button>
            ` : ''}
          </div>
          <div style="display:flex; gap:0.6rem;">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-container').innerHTML=''">Close</button>
            <button class="btn btn-secondary btn-sm" id="btn-modal-print-quote" style="font-weight:700;">
              ${Icons.printer} Print Document
            </button>
            <button class="btn btn-primary btn-sm" id="btn-modal-download-quote-pdf" style="font-weight:700; background:#d97706; border-color:#b45309;">
              📥 Download PDF Quotation
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-modal-download-quote-pdf').addEventListener('click', () => {
    downloadProformaQuotationPdf(q);
  });

  document.getElementById('btn-modal-print-quote').addEventListener('click', () => {
    printProformaQuotation(q);
  });

  const convertBtn = modal.querySelector('.btn-modal-convert');
  if (convertBtn) {
    convertBtn.addEventListener('click', async () => {
      if (!confirm('Convert this Pro-Forma Quote into a live POS invoice and deduct stock?')) return;
      try {
        const res = await apiFetch(`/api/quotations/${q.quote_id}/convert`, { method: 'POST', body: JSON.stringify({ payment_method: 'Cash' }) });
        toast(res.message);
        document.getElementById('modal-container').innerHTML = '';
        showView('quotes');
      } catch (err) {
        toast(err.message, true);
      }
    });
  }
}



// ==========================================================================

// ==========================================================================
// 4. SMART INVENTORY & REAL-TIME STOCK VALUATION SYSTEM (EXECUTIVE REDESIGN)
// ==========================================================================
let currentStockFilter = 'all';

async function renderStockView(container, filter = currentStockFilter) {
  currentStockFilter = filter;
  const isOwner = (state.user && (state.user.role === 'Owner' || state.user.system_role === 'Owner'));
  const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.stock} Smart Inventory &amp; Live Stock Valuation</h2>
        <p>Real-time asset valuation, profit margins, and automated stock replenishment.</p>
      </div>
      <div class="view-header-actions" style="display:flex; align-items:center; gap:0.5rem;">
        <button id="btn-clear-all-stock" class="btn btn-secondary btn-sm" style="border-color:#fca5a5; color:#dc2626; font-weight:700;">
          ${Icons.trash} Clear All Inventory
        </button>
        <button id="btn-quick-restock-top" class="btn btn-primary btn-sm" style="display:inline-flex; align-items:center; gap:0.4rem; font-weight:800; background:#0f172a; color:#f59e0b; border-color:#0f172a;">
          ⚡ Quick Restock
        </button>
        ${isOwner ? `
          <button id="btn-add-product" class="btn btn-secondary btn-sm" style="font-weight:700;">${Icons.plus} Add Product</button>
          <button id="btn-add-base" class="btn btn-secondary btn-sm" style="font-weight:700;">${Icons.plus} Add Base Tin</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" id="btn-refresh-stock-val" title="Refresh Live Valuation">
          🔄
        </button>
      </div>
    </div>

    <!-- Live Valuation 4-KPI Grid -->
    <div id="stock-valuation-banner">
      <div style="padding:2rem; text-align:center; color:#64748b;">
        <div class="spinner" style="margin:0 auto 0.5rem;"></div>
        Loading live stock valuation &amp; inventory assets...
      </div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="filter-tabs-row" id="stock-filter-tabs" style="display:none; margin-bottom:1.25rem;">
      <button class="filter-tab-pill ${filter === 'all' ? 'active' : ''}" data-filter="all">All Inventory Items</button>
      <button class="filter-tab-pill ${filter === 'low' ? 'active' : ''}" data-filter="low" id="tab-low-stock" style="font-weight:800;">
        🚨 Needs Restocking
      </button>
      <button class="filter-tab-pill ${filter === 'base' ? 'active' : ''}" data-filter="base">🎨 Base Paint Tins</button>
      <button class="filter-tab-pill ${filter === 'pigment' ? 'active' : ''}" data-filter="pigment">🧪 Tinting Pigments (ml)</button>
      <button class="filter-tab-pill ${filter === 'hardware' ? 'active' : ''}" data-filter="hardware">🔨 Hardware &amp; Prep</button>
    </div>

    <!-- Inventory Table Card -->
    <div class="card-panel" id="stock-main-panel" style="display:none; padding:0; overflow:hidden;">
      <div id="stock-table-body"></div>
    </div>
  `;

  document.getElementById('btn-refresh-stock-val').addEventListener('click', () => renderStockView(container, currentStockFilter));

  const btnClearStock = document.getElementById('btn-clear-all-stock');
  if (btnClearStock) {
    btnClearStock.addEventListener('click', () => {
      promptSecurityPin({
        title: '🗑️ Clear All Inventory Stock',
        description: 'Are you sure you want to permanently clear all stock items (products, base paint tins, and tinting pigments)? This action requires Master Security PIN.',
        badgeText: 'Master PIN Required',
        confirmText: 'Confirm & Clear Inventory',
        onConfirm: async (pin) => {
          const res = await apiFetch('/api/stock/clear-all', {
            method: 'POST',
            body: JSON.stringify({ pin, scope: 'all', reason: 'Client inventory wipe' })
          });
          toast(res.message || 'All inventory items cleared.');
          renderStockView(container);
        }
      });
    });
  }

  try {
    const [valData, bData, pData, prData] = await Promise.all([
      apiFetch('/api/stock/valuation'),
      apiFetch('/api/stock/bases'),
      apiFetch('/api/stock/pigments'),
      apiFetch('/api/stock/products')
    ]);

    const valuation = valData;
    const bases = bData || [];
    const pigments = pData || [];
    const products = prData || [];

    // 1. Render Real-Time Valuation Banner
    const valBanner = document.getElementById('stock-valuation-banner');
    if (valBanner) {
      valBanner.innerHTML = `
        <div class="stock-4valuation-grid">
          <!-- 1. Wholesale Cost Basis -->
          <div class="kpi-metric-card" style="border-left: 4px solid #0284c7;">
            <div class="kpi-metric-label">WHOLESALE COST WORTH</div>
            <div>
              <div class="kpi-metric-val" style="color: #0284c7;">KSh ${fmt(valuation.total_cost_worth_kes)}</div>
              <div class="kpi-currency-prefix" style="margin-top:2px;">Purchase Asset Capital</div>
            </div>
          </div>

          <!-- 2. Expected Retail Worth -->
          <div class="kpi-metric-card" style="border-left: 4px solid #10b981;">
            <div class="kpi-metric-label">EXPECTED RETAIL WORTH</div>
            <div>
              <div class="kpi-metric-val green">KSh ${fmt(valuation.total_retail_worth_kes)}</div>
              <div class="kpi-currency-prefix" style="margin-top:2px;">Selling Revenue Potential</div>
            </div>
          </div>

          <!-- 3. Potential Gross Profit -->
          <div class="kpi-metric-card" style="border-left: 4px solid #f59e0b;">
            <div class="kpi-metric-label">POTENTIAL GROSS PROFIT</div>
            <div>
              <div class="kpi-metric-val" style="color:#d97706;">+KSh ${fmt(valuation.potential_profit_kes)}</div>
              <div class="kpi-currency-prefix" style="margin-top:2px;">Margin: ${valuation.profit_margin_pct}% on inventory</div>
            </div>
          </div>

          <!-- 4. Stock Health & Restock Warning -->
          <div class="kpi-metric-card" style="border-left: 4px solid ${valuation.low_stock_count > 0 ? '#ef4444' : '#16a34a'};">
            <div class="kpi-metric-label">INVENTORY HEALTH</div>
            <div>
              <div class="kpi-metric-val" style="font-size:1.15rem; color:${valuation.low_stock_count > 0 ? '#dc2626' : '#16a34a'};">
                ${valuation.low_stock_count > 0 ? `🚨 ${valuation.low_stock_count} Items Need Restocking` : '✅ All Items Well Stocked'}
              </div>
              <div class="kpi-currency-prefix" style="margin-top:2px;">${valuation.total_skus_tracked} Total SKUs Monitored</div>
            </div>
          </div>
        </div>
      `;
    }

    // 2. Setup Filter Tabs & Badges
    const filterTabs = document.getElementById('stock-filter-tabs');
    const mainPanel = document.getElementById('stock-main-panel');
    if (filterTabs) filterTabs.style.display = 'flex';
    if (mainPanel) mainPanel.style.display = 'block';

    const tabLow = document.getElementById('tab-low-stock');
    if (tabLow) {
      if (valuation.low_stock_count > 0) {
        tabLow.innerHTML = `🚨 Needs Restocking (${valuation.low_stock_count})`;
        tabLow.style.background = filter === 'low' ? '#dc2626' : '#fef2f2';
        tabLow.style.color = filter === 'low' ? 'white' : '#dc2626';
        tabLow.style.borderColor = '#f87171';
      } else {
        tabLow.innerHTML = `✅ Needs Restocking (0)`;
        tabLow.style.background = '';
        tabLow.style.color = '';
        tabLow.style.borderColor = '';
      }
    }

    // Attach Tab Clicks
    document.querySelectorAll('.filter-tab-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderStockView(container, btn.dataset.filter);
      });
    });

    // Wire Top Action Buttons
    const btnQuickRestock = document.getElementById('btn-quick-restock-top');
    if (btnQuickRestock) {
      btnQuickRestock.addEventListener('click', () => {
        showRestockModal(null, { bases, pigments, products });
      });
    }

    if (isOwner) {
      const btnAddP = document.getElementById('btn-add-product');
      const btnAddB = document.getElementById('btn-add-base');
      if (btnAddP) btnAddP.addEventListener('click', showAddProductModal);
      if (btnAddB) btnAddB.addEventListener('click', showAddBaseModal);
    }

    // 3. Build Filtered Rows
    const tableBody = document.getElementById('stock-table-body');
    if (!tableBody) return;

    if (filter === 'low') {
      // DEDICATED RESTOCKING REPLENISHMENT VIEW
      const lowItems = valuation.low_stock_items || [];
      if (!lowItems.length) {
        tableBody.innerHTML = `
          <div style="padding:3.5rem 2rem; text-align:center; background:#ecfdf5;">
            <div style="font-size:2.5rem; margin-bottom:0.5rem;">🎉</div>
            <h3 style="color:#065f46; font-size:1.25rem; font-weight:800; margin-bottom:0.4rem;">Zero Depleted Stock!</h3>
            <p style="color:#047857; font-size:0.9rem; max-width:480px; margin:0 auto 1.2rem;">All paint base tins, tinting color pigments, and hardware shop accessories are currently above their reorder thresholds.</p>
            <button class="btn btn-secondary btn-sm" onclick="renderStockView(document.getElementById('view-container'), 'all')">
              View All Inventory
            </button>
          </div>
        `;
      } else {
        tableBody.innerHTML = `
          <div style="padding:1rem 1.25rem; border-bottom:1.5px solid #fee2e2; background:#fff5f5; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:0.5rem;">
                🚨 Urgent Restock &amp; Supply Replenishment Hub
              </h3>
              <span style="font-size:0.78rem; color:#64748b;">
                ${lowItems.length} lines need immediate restocking. Restock directly below using Cash Drawer, M-Pesa, Bank, or Supplier Credit.
              </span>
            </div>
          </div>

          <table class="stock-luxury-table">
            <thead>
              <tr>
                <th>ITEM &amp; CATEGORY</th>
                <th>CURRENT STOCK</th>
                <th>MIN THRESHOLD</th>
                <th>BUY COST</th>
                <th>SUGGESTED REORDER</th>
                <th style="text-align:right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${lowItems.map((item) => `
                <tr style="background:#fffafa;">
                  <td>
                    <div style="font-weight:800; color:#0f172a; font-size:0.92rem;">${escapeHtml(item.name)}</div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                      <span class="status-pill failed" style="font-size:0.68rem; font-weight:800; padding:1px 6px;">${item.type === 'base' ? 'Paint Base' : item.type === 'pigment' ? 'Pigment' : 'Hardware'}</span>
                      · Brand: ${escapeHtml(item.brand || 'Store SKU')}
                    </div>
                  </td>
                  <td>
                    <span style="font-weight:800; font-size:0.92rem; color:#dc2626; background:#fef2f2; padding:0.25rem 0.6rem; border-radius:6px; border:1px solid #fecaca; white-space:nowrap;">
                      ${item.current_qty} ${item.unit}
                    </span>
                  </td>
                  <td style="font-size:0.85rem; color:#64748b; font-weight:700; white-space:nowrap;">
                    Min ${item.low_stock_threshold} ${item.unit}
                  </td>
                  <td style="font-weight:700; font-size:0.92rem; color:#0f172a; white-space:nowrap;">
                    KSh ${fmt(item.unit_cost)}
                  </td>
                  <td>
                    <span style="font-weight:800; font-size:0.86rem; color:#0284c7; background:#f0f9ff; padding:0.25rem 0.6rem; border-radius:6px; border:1px solid #bae6fd; white-space:nowrap;">
                      +${item.suggested_reorder} ${item.unit}
                    </span>
                  </td>
                  <td style="text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:0.35rem; justify-content:flex-end;">
                      <button class="btn btn-primary btn-sm btn-row-restock" data-type="${item.type}" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-unit="${item.unit}" data-cost="${item.unit_cost}" data-suggest="${item.suggested_reorder}" data-stock="${item.current_qty}" style="font-weight:800; padding:0.28rem 0.75rem; display:inline-flex; align-items:center; gap:0.3rem; background:#0f172a; color:#f59e0b; border-color:#0f172a;">
                        ⚡ Restock
                      </button>
                      <button class="btn btn-danger btn-sm btn-delete-stock-item" data-type="${item.type}" data-id="${item.id}" data-name="${escapeHtml(item.name)}" style="padding:0.28rem 0.5rem; font-size:0.78rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Item (PIN Required)">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } else {
      // STANDARD INVENTORY VIEW (STREAMLINED LUXURY COLUMNS)
      let rows = [];

      if (filter === 'all' || filter === 'base') {
        bases.forEach((b) => {
          const qty = Number(b.quantity_in_stock || 0);
          const isLow = qty <= Number(b.low_stock_threshold || 5);
          const unitCost = Number(b.unit_cost_kes || 1800);
          const retailPrice = Math.round(unitCost * 1.45);
          rows.push({
            type: 'Base Tin',
            actionType: 'base',
            id: b.base_id,
            name: `${b.manufacturer || 'Paint'} ${b.base_name || 'Base Paint'} (${b.tin_size_litres || 4}L)`,
            brand: b.manufacturer || 'Crown',
            unitCost: unitCost,
            price: retailPrice,
            stockStr: `${qty} Tins`,
            rawQty: qty,
            unit: 'tin',
            isLow: isLow,
            threshold: b.low_stock_threshold || 5
          });
        });
      }

      if (filter === 'all' || filter === 'pigment') {
        pigments.forEach((p) => {
          const qtyMl = Number(p.quantity_ml != null ? p.quantity_ml : 5000);
          const isLow = qtyMl <= Number(p.low_stock_threshold_ml || 500);
          const costPerMl = Number(p.unit_cost_per_ml_kes || 4.5);
          const retailPerMl = Math.round(costPerMl * 1.5 * 10) / 10;
          rows.push({
            type: 'Pigment',
            actionType: 'pigment',
            id: p.pigment_id,
            name: `${p.pigment_name || 'Color Pigment'} (Code: ${p.pigment_code || 'BK'})`,
            brand: 'FastTint Precision',
            unitCost: costPerMl,
            price: retailPerMl,
            stockStr: `${qtyMl.toLocaleString()} ml`,
            rawQty: qtyMl,
            unit: 'ml',
            isLow: isLow,
            threshold: p.low_stock_threshold_ml || 500
          });
        });
      }

      if (filter === 'all' || filter === 'hardware') {
        products.forEach((pr) => {
          const qty = Number(pr.quantity_in_stock || 0);
          const isLow = qty <= Number(pr.low_stock_threshold || 5);
          rows.push({
            type: 'Hardware',
            actionType: 'product',
            id: pr.product_id,
            name: pr.product_name,
            brand: pr.sku || 'Retail Item',
            unitCost: Number(pr.unit_cost_kes || 0),
            price: Number(pr.unit_price_kes || 0),
            stockStr: `${qty} Units`,
            rawQty: qty,
            unit: 'unit',
            isLow: isLow,
            threshold: pr.low_stock_threshold || 5
          });
        });
      }

      tableBody.innerHTML = `
        <table class="stock-luxury-table">
          <thead>
            <tr>
              <th>ITEM &amp; SPECIFICATION</th>
              <th style="width:130px;">BUY COST</th>
              <th style="width:130px;">SELL PRICE</th>
              <th style="width:130px;">LIVE STOCK</th>
              <th style="width:170px;">STOCK HEALTH</th>
              <th style="text-align:right; width:220px;">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr style="${r.isLow ? 'background:#fffafa;' : ''}">
                <td>
                  <div style="font-weight:800; color:#0f172a; font-size:0.92rem;">${escapeHtml(r.name)}</div>
                  <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                    <span class="status-pill ${r.isLow ? 'failed' : 'paid'}" style="font-size:0.68rem; font-weight:800; padding:1px 6px;">${r.type}</span>
                    · SKU: ${escapeHtml(r.brand)}
                  </div>
                </td>
                <td>
                  <strong style="font-size:0.92rem; color:#475569; white-space:nowrap;">
                    KSh ${fmt(r.unitCost)}${r.unit === 'ml' ? '/ml' : ''}
                  </strong>
                </td>
                <td>
                  <strong style="font-size:0.92rem; color:#0f172a; white-space:nowrap;">
                    KSh ${fmt(r.price)}${r.unit === 'ml' ? '/ml' : ''}
                  </strong>
                </td>
                <td>
                  <strong style="${r.isLow ? 'color:#dc2626;' : 'color:#0f172a;'} font-size:0.95rem; white-space:nowrap;">
                    ${r.stockStr}
                  </strong>
                </td>
                <td>
                  <div class="stock-meter-cell">
                    <span style="font-size:0.75rem; font-weight:800; color:${r.isLow ? '#dc2626' : '#059669'};">
                      ${r.isLow ? '⚠️ REORDER NEEDED' : '✅ Optimal Stock'}
                    </span>
                    <div class="stock-bar-track">
                      <div class="stock-bar-fill ${r.isLow ? 'danger' : 'healthy'}" style="width:${Math.min(100, Math.max(15, (r.rawQty / (r.threshold * 2)) * 100))}%;"></div>
                    </div>
                  </div>
                </td>
                <td style="text-align:right;">
                  <div style="display:inline-flex; align-items:center; gap:0.35rem; justify-content:flex-end;">
                    <button class="btn btn-primary btn-sm btn-row-restock" data-type="${r.actionType}" data-id="${r.id}" data-name="${escapeHtml(r.name)}" data-unit="${r.unit}" data-cost="${r.unitCost}" data-suggest="10" data-stock="${r.rawQty}" style="padding:0.26rem 0.65rem; font-size:0.78rem; font-weight:800; background:#0f172a; color:#f59e0b; border-color:#0f172a;">
                      ⚡ Restock
                    </button>
                    ${isOwner ? `
                      <button data-type="${r.actionType}" data-id="${r.id}" data-name="${escapeHtml(r.name)}" data-qty="${r.rawQty}" class="btn-adjust-stock btn btn-secondary btn-sm" style="padding:0.26rem 0.65rem; font-size:0.78rem; font-weight:700;">
                        Adjust
                      </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm btn-delete-stock-item" data-type="${r.actionType}" data-id="${r.id}" data-name="${escapeHtml(r.name)}" style="padding:0.26rem 0.5rem; font-size:0.78rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Item (PIN Required)">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Attach Row Restock Clicks
    tableBody.querySelectorAll('.btn-row-restock').forEach((btn) => {
      btn.addEventListener('click', () => {
        showRestockModal({
          type: btn.dataset.type,
          id: Number(btn.dataset.id),
          name: btn.dataset.name,
          unit: btn.dataset.unit,
          unitCost: Number(btn.dataset.cost || 0),
          suggestedQty: Number(btn.dataset.suggest || 10),
          currentQty: Number(btn.dataset.stock || 0)
        }, { bases, pigments, products });
      });
    });

    // Attach Row Adjust Clicks
    tableBody.querySelectorAll('.btn-adjust-stock').forEach((btn) => {
      btn.addEventListener('click', () => {
        showStockAdjustModal({
          type: btn.dataset.type,
          id: Number(btn.dataset.id),
          name: btn.dataset.name,
          currentQty: Number(btn.dataset.qty)
        });
      });
    });

    // Attach Row Delete Clicks
    tableBody.querySelectorAll('.btn-delete-stock-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        promptSecurityPin({
          title: `🗑️ Delete ${name}`,
          description: `Permanently remove "${name}" from inventory? This requires Store PIN authorization.`,
          badgeText: 'PIN Protected',
          confirmText: 'Confirm & Delete Item',
          onConfirm: async (pin) => {
            const res = await apiFetch(`/api/stock/item/${type}/${id}`, {
              method: 'DELETE',
              body: JSON.stringify({ pin, reason: 'Manual product removal' })
            });
            toast(res.message || 'Stock item deleted.');
            renderStockView(container);
          }
        });
      });
    });

  } catch (err) {
    const tableBody = document.getElementById('stock-table-body');
    if (tableBody) tableBody.innerHTML = `<p class="status-pill failed">Failed to load inventory: ${err.message}</p>`;
  }
}


async function showRestockModal(prefillItem = null, catalog = { bases: [], pigments: [], products: [] }) {
  let suppliers = [];
  let accounts = [];
  try {
    const [sData, aData] = await Promise.all([
      apiFetch('/api/suppliers'),
      apiFetch('/api/cashbook/accounts')
    ]);
    suppliers = sData || [];
    accounts = aData || [];
  } catch (e) {
    console.error('Failed to load suppliers/accounts:', e);
  }

  const defaultCost = prefillItem ? prefillItem.unitCost : 100;
  const defaultQty = prefillItem ? (prefillItem.suggestedQty || 10) : 10;
  const defaultTotal = Math.round(defaultCost * defaultQty);

  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width: 520px;">
        <div class="modal-header-bar">
          <h3>⚡ Quick Restock Supply</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <form id="quick-restock-form">
          ${prefillItem ? `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.9rem; margin-bottom:1.1rem;">
              <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:2px;">Restocking Item</div>
              <div style="font-weight:800; font-size:1rem; color:#0f172a;">${escapeHtml(prefillItem.name)}</div>
              <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">Current In-Stock: <strong style="color:#0f172a;">${prefillItem.currentQty} ${prefillItem.unit}</strong></div>
              <input type="hidden" id="rstk-type" value="${prefillItem.type}" />
              <input type="hidden" id="rstk-id" value="${prefillItem.id}" />
            </div>
          ` : `
            <div class="form-group">
              <label>Select Item to Restock</label>
              <select id="rstk-picker" required>
                <optgroup label="🎨 Base Paint Tins">
                  ${(catalog.bases || []).map(b => `<option value="base:${b.base_id}:${b.unit_cost_kes || 1800}:${escapeHtml(b.manufacturer)} ${escapeHtml(b.base_name)} (${b.tin_size_litres}L):tin">${escapeHtml(b.manufacturer)} ${escapeHtml(b.base_name)} (${b.tin_size_litres}L) [Stock: ${b.quantity_in_stock}]</option>`).join('')}
                </optgroup>
                <optgroup label="🔨 Hardware Products">
                  ${(catalog.products || []).map(p => `<option value="product:${p.product_id}:${p.unit_cost_kes || 200}:${escapeHtml(p.product_name)}:unit">${escapeHtml(p.product_name)} [Stock: ${p.quantity_in_stock}]</option>`).join('')}
                </optgroup>
                <optgroup label="🧪 Tinting Pigments">
                  ${(catalog.pigments || []).map(pig => `<option value="pigment:${pig.pigment_id}:${pig.unit_cost_per_ml_kes || 4.5}:${escapeHtml(pig.pigment_name)}:ml">${escapeHtml(pig.pigment_name)} (${pig.pigment_code}) [Stock: ${pig.quantity_ml}ml]</option>`).join('')}
                </optgroup>
              </select>
            </div>
          `}

          <div class="form-row">
            <div class="form-group">
              <label>Quantity to Restock (+)</label>
              <input type="number" id="rstk-qty" value="${defaultQty}" min="1" step="any" required style="font-weight:800; font-family:var(--font-mono); font-size:1.05rem;" />
            </div>
            <div class="form-group">
              <label>Unit Buy Cost Basis (KES)</label>
              <input type="number" id="rstk-unit-cost" value="${defaultCost}" min="0" step="any" required style="font-weight:800; font-family:var(--font-mono); font-size:1.05rem;" />
            </div>
          </div>

          <!-- Total Calculation Card -->
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.8rem 1rem; margin-bottom:1.1rem; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.84rem; font-weight:700; color:#166534;">Total Restock Investment:</span>
            <span id="rstk-total-display" style="font-family:var(--font-mono); font-size:1.25rem; font-weight:800; color:#15803d;">
              KSh ${defaultTotal.toLocaleString()}
            </span>
          </div>

          <!-- Payment / Funding Source -->
          <div class="form-group">
            <label>Funding Source / Payment Method</label>
            <select id="rstk-funding" required>
              <option value="none">📦 Existing / Unlinked Inventory (No Cash Deducted)</option>
              <option value="cashbook" selected>💵 Deduct from Treasury Account (Cash Drawer / M-Pesa / Bank)</option>
              <option value="supplier_credit">🏭 Charge to Supplier Credit / Bill (Pay Later)</option>
            </select>
          </div>

          <!-- Cashbook Account Selector -->
          <div class="form-group" id="rstk-acc-group">
            <label>Select Treasury Cashbook Account</label>
            <select id="rstk-account">
              ${accounts.map(acc => `<option value="${acc.account_id}">${acc.account_type === 'Cash' ? '💵' : acc.account_type === 'M-Pesa' ? '📱' : '🏦'} ${escapeHtml(acc.account_name)} (Bal: KES ${Math.round(acc.balance_kes || 0).toLocaleString()})</option>`).join('')}
            </select>
          </div>

          <!-- Supplier Selector -->
          <div class="form-group" id="rstk-sup-group" style="display:none;">
            <label>Select Supplier for Credit Billing</label>
            <select id="rstk-supplier">
              ${suppliers.map(s => `<option value="${s.supplier_id}">🏭 ${escapeHtml(s.supplier_name)} (Current Debt: KES ${Math.round(s.current_balance_kes || 0).toLocaleString()})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Delivery Note / Batch Ref / Supplier Notes (Optional)</label>
            <input type="text" id="rstk-notes" placeholder="e.g. Crown Paints delivery note #8921 / Local Hardware Depot" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.4rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-restock" style="font-weight:800;">
              ⚡ Confirm &amp; Restock Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Dynamic Total Calculator
  const qtyInput = document.getElementById('rstk-qty');
  const costInput = document.getElementById('rstk-unit-cost');
  const totalDisplay = document.getElementById('rstk-total-display');
  const fundingSelect = document.getElementById('rstk-funding');
  const accGroup = document.getElementById('rstk-acc-group');
  const supGroup = document.getElementById('rstk-sup-group');
  const pickerSelect = document.getElementById('rstk-picker');

  function updateTotal() {
    const q = Number(qtyInput.value || 0);
    const c = Number(costInput.value || 0);
    const tot = Math.round(q * c);
    totalDisplay.innerText = `KSh ${tot.toLocaleString()}`;
  }

  qtyInput.addEventListener('input', updateTotal);
  costInput.addEventListener('input', updateTotal);

  if (pickerSelect) {
    pickerSelect.addEventListener('change', () => {
      const parts = pickerSelect.value.split(':');
      costInput.value = Number(parts[2] || 0);
      updateTotal();
    });
  }

  fundingSelect.addEventListener('change', () => {
    const val = fundingSelect.value;
    accGroup.style.display = val === 'cashbook' ? 'block' : 'none';
    supGroup.style.display = val === 'supplier_credit' ? 'block' : 'none';
  });

  // Submit Handler
  document.getElementById('quick-restock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-restock');
    btn.disabled = true;
    btn.innerText = 'Restocking...';

    let itemType, itemId;
    if (prefillItem) {
      itemType = prefillItem.type;
      itemId = prefillItem.id;
    } else {
      const parts = pickerSelect.value.split(':');
      itemType = parts[0];
      itemId = Number(parts[1]);
    }

    const payload = {
      item_type: itemType,
      item_id: itemId,
      quantity_to_add: Number(qtyInput.value),
      unit_cost_kes: Number(costInput.value),
      funding_source: fundingSelect.value,
      account_id: fundingSelect.value === 'cashbook' ? Number(document.getElementById('rstk-account').value) : null,
      supplier_id: fundingSelect.value === 'supplier_credit' ? Number(document.getElementById('rstk-supplier').value) : null,
      notes: document.getElementById('rstk-notes').value.trim()
    };

    try {
      const res = await apiFetch('/api/stock/restock', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message || 'Restock successfully recorded!');
      showView('stock');
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
      btn.innerText = '⚡ Confirm & Restock Stock';
    }
  });
}

// ---------------- Adjust Stock Modal ----------------
function showStockAdjustModal(data) {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:460px;">
        <div class="modal-header-bar">
          <h3>Adjust Stock: ${escapeHtml(data.name)}</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="stock-adjust-form">
          <div class="form-group">
            <label>Current Live Stock</label>
            <input type="text" value="${data.currentQty}" disabled style="font-weight:700; font-family:var(--font-mono);" />
          </div>
          <div class="form-group">
            <label>New Corrected Quantity</label>
            <input type="number" id="adj-new-qty" value="${data.currentQty}" step="any" min="0" required style="font-weight:800; font-family:var(--font-mono); font-size:1.1rem;" />
          </div>
          <div class="form-group">
            <label>Reason for Correction (Audited)</label>
            <input type="text" id="adj-reason" placeholder="e.g. Physical inventory count / Spillage / Breakage" required />
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Adjustment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('stock-adjust-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newQty = Number(document.getElementById('adj-new-qty').value);
    const reason = document.getElementById('adj-reason').value.trim();

    try {
      const res = await apiFetch('/api/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({ item_type: data.type, item_id: data.id, new_quantity: newQty, reason })
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message || `Stock updated for ${data.name}.`);
      showView('stock');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------------- Add Product Modal ----------------
function showAddProductModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:480px;">
        <div class="modal-header-bar">
          <h3>Add Retail Hardware Product</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="new-prod-form">
          <div class="form-group">
            <label>Product Name</label>
            <input type="text" id="np-name" placeholder="e.g. Masking Tape 2-inch" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>SKU / Barcode</label>
              <input type="text" id="np-sku" placeholder="e.g. TAPE-2IN" />
            </div>
            <div class="form-group">
              <label>Initial Quantity</label>
              <input type="number" id="np-qty" value="15" min="0" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Retail Selling Price (KES)</label>
              <input type="number" id="np-price" placeholder="350" min="1" required />
            </div>
            <div class="form-group">
              <label>Unit Cost Basis (KES)</label>
              <input type="number" id="np-cost" placeholder="200" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label>Low Stock Reorder Threshold</label>
            <input type="number" id="np-min" value="5" min="1" required />
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Product to Inventory</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('new-prod-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      product_name: document.getElementById('np-name').value.trim(),
      sku: document.getElementById('np-sku').value.trim() || undefined,
      unit_price_kes: Number(document.getElementById('np-price').value),
      unit_cost_kes: Number(document.getElementById('np-cost').value) || 0,
      quantity_in_stock: Number(document.getElementById('np-qty').value) || 0,
      low_stock_threshold: Number(document.getElementById('np-min').value) || 5
    };
    try {
      const res = await apiFetch('/api/stock/products', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message || 'Product registered to inventory.');
      showView('stock');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------------- Add Base Tin Modal ----------------
function showAddBaseModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:480px;">
        <div class="modal-header-bar">
          <h3>Add New Tinting Base Tin</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="new-base-form">
          <div class="form-row">
            <div class="form-group">
              <label>Brand / Manufacturer</label>
              <input type="text" id="nb-mfg" placeholder="Crown, Plascon, Duracoat" required />
            </div>
            <div class="form-group">
              <label>Tin Size (Litres)</label>
              <input type="number" id="nb-size" value="4" step="0.5" min="0.5" required />
            </div>
          </div>
          <div class="form-group">
            <label>Base Name</label>
            <input type="text" id="nb-name" placeholder="e.g. Vinyl Matt Deep Base" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Initial Quantity</label>
              <input type="number" id="nb-qty" value="10" min="0" required />
            </div>
            <div class="form-group">
              <label>Unit Cost Basis (KES)</label>
              <input type="number" id="nb-cost" placeholder="1850" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label>Low Stock Reorder Threshold</label>
            <input type="number" id="nb-min" value="5" min="1" required />
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Base Tin</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('new-base-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      manufacturer: document.getElementById('nb-mfg').value.trim(),
      base_name: document.getElementById('nb-name').value.trim(),
      tin_size_litres: Number(document.getElementById('nb-size').value),
      unit_cost_kes: Number(document.getElementById('nb-cost').value) || 0,
      quantity_in_stock: Number(document.getElementById('nb-qty').value) || 0,
      low_stock_threshold: Number(document.getElementById('nb-min').value) || 5
    };
    try {
      const res = await apiFetch('/api/stock/bases', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message || 'Base tin registered to inventory.');
      showView('stock');
    } catch (err) {
      toast(err.message, true);
    }
  });
}


// ==========================================================================
// 5. SUPPLIERS SECTION (BALANCES, 1-CLICK PAYMENTS & BILLS)
// ==========================================================================
async function renderSuppliersView(container) {
  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.suppliers} Suppliers &amp; Balances</h2>
        <p>Track supplier balances, record goods received on credit, and pay supplier balances in full or custom top-up amounts.</p>
      </div>
      <div class="view-header-actions" style="display:flex; align-items:center; gap:0.5rem;">
        <button id="btn-clear-all-suppliers" class="btn btn-danger btn-sm" style="border: 1.5px solid #dc2626; background: transparent; color: #dc2626; font-weight: 800; display:inline-flex; align-items:center; gap:0.4rem;" title="Delete all supplier records (PIN Required)">
          🗑️ Delete All
        </button>
        <button id="btn-add-supplier" class="btn btn-secondary btn-sm">${Icons.plus} Add Supplier</button>
        <button id="btn-record-bill" class="btn btn-primary btn-sm">${Icons.plus} Record Supplier Bill</button>
      </div>
    </div>

    <!-- Summary Box: Total Balance Owed -->
    <div class="cashbook-kpi-grid" style="margin-bottom:1.4rem;">
      <div class="cashbook-kpi-card outflow">
        <span class="cashbook-kpi-label">Total Amount We Owe Suppliers</span>
        <div class="cashbook-kpi-val" style="color:#0284c7;" id="total-supplier-balance-val">KES 0</div>
        <span style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Payable to paint manufacturers &amp; hardware distributors</span>
      </div>
    </div>

    <!-- Suppliers Grid -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>🏭 Active Suppliers &amp; Balance Directory</h3>
      </div>
      <div id="suppliers-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1.2rem;">
        <div style="padding:2rem; text-align:center; color:var(--text-muted);">Loading supplier directory...</div>
      </div>
    </div>

    <!-- Recent Supplier Payment / Bill Transactions -->
    <div class="card-panel" style="margin-top:1.5rem;">
      <div class="card-panel-header">
        <h3>📜 Recent Supplier Purchases &amp; Payment Ledger</h3>
      </div>
      <div id="supplier-tx-table-container" class="table-responsive">
        <div style="padding:2rem; text-align:center; color:var(--text-muted);">Loading transactions...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-supplier').addEventListener('click', showAddSupplierModal);
  document.getElementById('btn-record-bill').addEventListener('click', showRecordSupplierBillModal);

  // Clear All Suppliers Handler
  const clearAllBtn = document.getElementById('btn-clear-all-suppliers');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      promptSecurityPin({
        title: '⚠️ WIPE ALL SUPPLIERS DIRECTORY',
        description: 'This will permanently delete ALL suppliers and their complete purchase ledger history. Enter Store Master PIN to authorize.',
        badgeText: 'HIGH RISK OPERATION',
        confirmText: 'Wipe All Suppliers',
        onConfirm: async (pin) => {
          try {
            const res = await apiFetch('/api/suppliers/clear-all', {
              method: 'POST',
              body: JSON.stringify({ pin, reason: 'Bulk clear all suppliers' })
            });
            toast(res.message || 'All suppliers cleared successfully.');
            renderSuppliersView(container);
          } catch (err) {
            toast(err.message, true);
          }
        }
      });
    });
  }

  try {
    const data = await apiFetch('/api/suppliers');
    const { suppliers, total_balance_owed_kes, recent_transactions } = data;

    document.getElementById('total-supplier-balance-val').innerText = 'KES ' + (total_balance_owed_kes || 0).toLocaleString();

    // Render Supplier Cards
    const grid = document.getElementById('suppliers-cards-grid');
    if (!suppliers.length) {
      grid.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No suppliers registered yet. Click "+ Add Supplier" to get started.</div>';
    } else {
      grid.innerHTML = suppliers.map((s) => {
        const hasBal = s.current_balance_kes > 0;
        return `
          <div class="supplier-card">
            <div class="supplier-card-header">
              <div>
                <h4 class="supplier-name">${escapeHtml(s.name)}</h4>
                <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">
                  👤 ${escapeHtml(s.contact_person || 'Accounts Rep')} · 📞 ${escapeHtml(s.phone || 'N/A')}
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted);">
                  📍 ${escapeHtml(s.location || 'Local Depot')}
                </div>
              </div>
              <span class="brand-pill">${s.lead_time_days || 2}d Lead</span>
            </div>

            <div class="supplier-balance-box">
              <span class="supplier-balance-label">Current Balance Owed:</span>
              <span class="supplier-balance-amount ${hasBal ? '' : 'zero'}">
                KES ${(s.current_balance_kes || 0).toLocaleString()}
              </span>
            </div>

            <div style="display:flex; gap:0.4rem; align-items:center;">
              <button data-id="${s.supplier_id}" data-name="${escapeHtml(s.name)}" data-bal="${s.current_balance_kes || 0}" class="btn-pay-supplier btn btn-primary btn-sm" style="flex:1;">
                💳 Pay Balance
              </button>
              <button data-id="${s.supplier_id}" data-name="${escapeHtml(s.name)}" class="btn-bill-supplier btn btn-secondary btn-sm">
                + Bill
              </button>
              <button data-id="${s.supplier_id}" data-name="${escapeHtml(s.name)}" class="btn-view-sup-ledger btn btn-secondary btn-sm" title="View Transaction Ledger">
                Ledger
              </button>
              <button data-id="${s.supplier_id}" data-name="${escapeHtml(s.name)}" data-bal="${s.current_balance_kes || 0}" class="btn-delete-supplier btn btn-danger btn-sm" style="padding:0.32rem 0.55rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Supplier (PIN Required)">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Attach button events
    grid.querySelectorAll('.btn-pay-supplier').forEach((btn) => {
      btn.addEventListener('click', () => {
        showPaySupplierModal(Number(btn.dataset.id), btn.dataset.name, Number(btn.dataset.bal));
      });
    });

    grid.querySelectorAll('.btn-bill-supplier').forEach((btn) => {
      btn.addEventListener('click', () => {
        showRecordSupplierBillModal(Number(btn.dataset.id));
      });
    });

    grid.querySelectorAll('.btn-view-sup-ledger').forEach((btn) => {
      btn.addEventListener('click', () => {
        showSupplierLedgerModal(Number(btn.dataset.id));
      });
    });

    // Single Supplier Deletion Handler
    grid.querySelectorAll('.btn-delete-supplier').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const name = btn.dataset.name;
        const bal = Number(btn.dataset.bal);

        promptSecurityPin({
          title: `🗑️ Delete Supplier: ${name}`,
          description: `Are you sure you want to permanently remove "${name}"? ${bal > 0 ? `⚠️ This supplier has an outstanding balance of KES ${bal.toLocaleString()}.` : ''} Enter Store Owner PIN to authorize deletion.`,
          badgeText: 'Owner Protected',
          confirmText: 'Authorize Deletion',
          onConfirm: async (pin) => {
            try {
              const res = await apiFetch(`/api/suppliers/${id}`, {
                method: 'DELETE',
                body: JSON.stringify({ pin, reason: `Manual deletion of ${name}` })
              });
              toast(res.message || `Supplier "${name}" deleted successfully.`);
              renderSuppliersView(container);
            } catch (err) {
              toast(err.message, true);
            }
          }
        });
      });
    });

    // Render Recent Transactions
    const txBox = document.getElementById('supplier-tx-table-container');
    if (!recent_transactions || !recent_transactions.length) {
      txBox.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No supplier payments or bills recorded yet.</div>';
    } else {
      txBox.innerHTML = `
        <table class="premium-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Supplier Name</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Account Used</th>
              <th>Notes / Invoice</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            ${recent_transactions.map((t) => `
              <tr>
                <td style="font-family:var(--font-mono); font-size:0.8rem;">${new Date(t.created_at).toLocaleString()}</td>
                <td><strong>${escapeHtml(t.supplier_name)}</strong></td>
                <td>
                  <span class="status-pill ${t.tx_type === 'Payment' ? 'paid' : 'pending'}">
                    ${t.tx_type === 'Payment' ? '💳 Payment' : '📦 Purchase Bill'}
                  </span>
                </td>
                <td style="font-weight:700; color:${t.tx_type === 'Payment' ? '#047857' : '#0284c7'}; font-family:var(--font-mono);">
                  KES ${t.amount_kes.toLocaleString()}
                </td>
                <td style="font-size:0.82rem;">${escapeHtml(t.account_name || 'Main Cash Drawer')}</td>
                <td style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(t.notes || '—')}</td>
                <td style="font-size:0.82rem;">${escapeHtml(t.recorded_by_name || 'Owner')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

  } catch (err) {
    document.getElementById('suppliers-cards-grid').innerHTML = `<p class="status-pill failed">${err.message}</p>`;
  }
}


function showAddSupplierModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>Add New Supplier</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="add-supplier-form">
          <div class="form-group">
            <label>Supplier / Company Name</label>
            <input type="text" id="sup-name" placeholder="e.g. Crown Paints Kenya PLC / Hardware Wholesalers" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Contact Person</label>
              <input type="text" id="sup-contact" placeholder="e.g. James Mwangi" />
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" id="sup-phone" placeholder="0722XXXXXX" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" id="sup-email" placeholder="orders@supplier.co.ke" />
            </div>
            <div class="form-group">
              <label>Location / Depot</label>
              <input type="text" id="sup-location" placeholder="Industrial Area, Nairobi" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Lead Time (Days)</label>
              <input type="number" id="sup-lead" value="2" min="1" />
            </div>
            <div class="form-group">
              <label>Initial Opening Balance Owed (KES)</label>
              <input type="number" id="sup-init-bal" value="0" min="0" />
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Supplier</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('add-supplier-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('sup-name').value.trim(),
      contact_person: document.getElementById('sup-contact').value.trim(),
      phone: document.getElementById('sup-phone').value.trim(),
      email: document.getElementById('sup-email').value.trim(),
      location: document.getElementById('sup-location').value.trim(),
      lead_time_days: Number(document.getElementById('sup-lead').value) || 2,
      initial_balance_kes: Number(document.getElementById('sup-init-bal').value) || 0
    };

    try {
      const res = await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('suppliers');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function showPaySupplierModal(supplierId, supplierName, currentBalance) {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>💳 Pay Supplier Balance: ${supplierName}</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:var(--radius-md); padding:1rem 1.2rem; margin-bottom:1.2rem;">
          <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:#991b1b;">Current Balance Owed:</div>
          <div style="font-size:1.6rem; font-weight:800; font-family:var(--font-mono); color:#b91c1c;">
            KES ${currentBalance.toLocaleString()}
          </div>
        </div>

        <form id="pay-supplier-form">
          <div class="form-group">
            <label>Payment Amount Option</label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:0.8rem;">
              <button type="button" id="btn-opt-full" class="btn btn-secondary btn-sm" style="font-weight:800; border-color:var(--brand-gold);">
                ⚡ Pay Full Max (KES ${currentBalance.toLocaleString()})
              </button>
              <button type="button" id="btn-opt-custom" class="btn btn-secondary btn-sm">
                ✏️ Custom Top-Up Amount
              </button>
            </div>
            <input type="number" id="pay-sup-amt" value="${currentBalance}" min="1" required style="font-size:1.2rem; font-weight:800; font-family:var(--font-mono);" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Payment Source Account (Deducts from Cashbook)</label>
              <select id="pay-sup-account" required>
                <option value="1">Main Counter Cash Till</option>
                <option value="2">Safaricom M-Pesa Buy Goods</option>
                <option value="3">Equity Bank Operational</option>
              </select>
            </div>
            <div class="form-group">
              <label>Payment Method</label>
              <select id="pay-sup-method">
                <option value="Bank Transfer">Bank Wire Transfer</option>
                <option value="M-Pesa">M-Pesa Business Till</option>
                <option value="Cash">Cash at Counter</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Payment Reference / Notes</label>
            <input type="text" id="pay-sup-notes" placeholder="e.g. Cheque #49281 / M-Pesa ref / Supplier invoice settlement" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Confirm &amp; Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-opt-full').addEventListener('click', () => {
    document.getElementById('pay-sup-amt').value = currentBalance;
  });

  document.getElementById('btn-opt-custom').addEventListener('click', () => {
    const input = document.getElementById('pay-sup-amt');
    input.value = '';
    input.focus();
  });

  document.getElementById('pay-supplier-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amt = Number(document.getElementById('pay-sup-amt').value);
    const accId = Number(document.getElementById('pay-sup-account').value);
    const method = document.getElementById('pay-sup-method').value;
    const notes = document.getElementById('pay-sup-notes').value.trim();

    try {
      const res = await apiFetch('/api/suppliers/payment', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supplierId,
          amount_kes: amt,
          account_id: accId,
          payment_method: method,
          notes
        })
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('suppliers');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function showRecordSupplierBillModal(preselectedSupplierId = null) {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>📦 Record Supplier Bill / Delivery on Credit</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <p style="font-size:0.86rem; color:var(--text-muted); margin-bottom:1rem;">
          Record stock received on invoice from manufacturer. This will increase the supplier's balance owed.
        </p>

        <form id="record-bill-form">
          <div class="form-group">
            <label>Select Supplier</label>
            <select id="bill-supplier-select" required>
              <option value="1">Crown Paints Kenya PLC</option>
              <option value="2">Basco Paints (Duracoat) Ltd</option>
              <option value="3">Kansai Plascon Kenya</option>
              <option value="4">Harris Brushes &amp; Hardware Wholesalers</option>
            </select>
          </div>

          <div class="form-group">
            <label>Bill / Invoice Amount (KES)</label>
            <input type="number" id="bill-amount" placeholder="e.g. 45000" min="1" required style="font-size:1.15rem; font-weight:800; font-family:var(--font-mono);" />
          </div>

          <div class="form-group">
            <label>Supplier Invoice Reference #</label>
            <input type="text" id="bill-ref" placeholder="e.g. INV-CP-2026-9812" required />
          </div>

          <div class="form-group">
            <label>Items Summary / Notes</label>
            <input type="text" id="bill-notes" placeholder="e.g. 20x 4L Vinyl Matt bases + 5x Red Oxide Primers" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Record Bill</button>
          </div>
        </form>
      </div>
    </div>
  `;

  if (preselectedSupplierId) {
    document.getElementById('bill-supplier-select').value = preselectedSupplierId;
  }

  document.getElementById('record-bill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const supId = Number(document.getElementById('bill-supplier-select').value);
    const amt = Number(document.getElementById('bill-amount').value);
    const ref = document.getElementById('bill-ref').value.trim();
    const notes = document.getElementById('bill-notes').value.trim();

    try {
      const res = await apiFetch('/api/suppliers/bill', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supId,
          amount_kes: amt,
          invoice_reference: ref,
          notes: notes ? `${ref}: ${notes}` : ref
        })
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('suppliers');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function showSupplierLedgerModal(supplierId) {
  const modal = document.getElementById('modal-container');
  try {
    const data = await apiFetch(`/api/suppliers/${supplierId}/ledger`);
    const { supplier, transactions } = data;

    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container-card" style="max-width:760px;">
          <div class="modal-header-bar">
            <h3>📜 ${supplier.name} — Transaction Ledger</h3>
            <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:1rem 1.2rem; border-radius:var(--radius-md); border:1px solid var(--border-light); margin-bottom:1.2rem;">
            <div>
              <div style="font-size:0.85rem; color:var(--text-muted);">Phone: <strong>${supplier.phone || 'N/A'}</strong> · Location: <strong>${supplier.location || 'Nairobi'}</strong></div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Balance Owed:</span>
              <div style="font-size:1.3rem; font-weight:800; font-family:var(--font-mono); color:#b91c1c;">
                KES ${(supplier.current_balance_kes || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div class="table-responsive" style="max-height:360px; overflow-y:auto;">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Transaction Type</th>
                  <th>Amount (KES)</th>
                  <th>Account Used</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.length ? transactions.map(t => `
                  <tr>
                    <td>${new Date(t.created_at).toLocaleString()}</td>
                    <td>
                      <span class="status-pill ${t.tx_type === 'Payment' ? 'paid' : 'pending'}">
                        ${t.tx_type}
                      </span>
                    </td>
                    <td><strong style="color:${t.tx_type === 'Payment' ? '#047857' : '#b91c1c'}; font-family:var(--font-mono);">KES ${t.amount_kes.toLocaleString()}</strong></td>
                    <td>${t.account_name || '-'}</td>
                    <td class="muted small">${t.notes || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No transactions recorded yet.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:1.4rem;">
            <button class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Close Ledger</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    toast(err.message, true);
  }
}

// ==========================================================================
// 6. REAL-TIME CASHBOOK & EXPENSES (SIMPLE EVERYDAY LANGUAGE)
// ==========================================================================
async function renderCashbookView(container) {
  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.cashbook} Real-Time Cashbook &amp; Expenses</h2>
        <p>Simple money tracker: see money collected from counter sales, operational shop expenses, and live balances across all accounts.</p>
      </div>
      <div class="view-header-actions" style="display:flex; align-items:center; gap:0.5rem;">
        <button id="btn-clear-all-expenses" class="btn btn-secondary btn-sm" style="border-color:#cbd5e1; color:#64748b; font-weight:700;">
          🗑️ Clear All Expenses
        </button>
        <button id="btn-add-expense" class="btn btn-primary btn-sm" style="background:#0284c7; border-color:#0284c7; color:white; font-weight:800;">
          ${Icons.plus} Add Shop Expense
        </button>
      </div>
    </div>

    <!-- Live Account Balances & Cash In/Out Summary -->
    <div class="cashbook-kpi-grid" id="cashbook-kpi-summary">
      <div style="padding:1.5rem; text-align:center; color:var(--text-muted);">Loading cashbook balances...</div>
    </div>

    <!-- Live Cashbook Register -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>📖 Live Cashbook Register (Money In &amp; Money Out)</h3>
        <span class="sub-badge">Real-Time Transactions</span>
      </div>
      <div id="cashbook-register-table-box" class="table-responsive">
        <div style="padding:2rem; text-align:center; color:var(--text-muted);">Loading movements...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-expense').addEventListener('click', showLogExpenseModal);

  const btnClearExp = document.getElementById('btn-clear-all-expenses');
  if (btnClearExp) {
    btnClearExp.addEventListener('click', () => {
      promptSecurityPin({
        title: '🗑️ Clear All Shop Expenses',
        description: 'Are you sure you want to clear all recorded expense entries? This action requires Store PIN authorization.',
        badgeText: 'PIN Protected',
        confirmText: 'Confirm & Clear Expenses',
        onConfirm: async (pin) => {
          const res = await apiFetch('/api/financials/expenses/clear-all', {
            method: 'POST',
            body: JSON.stringify({ pin })
          });
          toast(res.message || 'All expenses cleared.');
          renderCashbookView(container);
        }
      });
    });
  }

  try {
    const data = await apiFetch('/api/financials/cashflow');
    const { accounts, summary, recent_movements } = data;

    // Render KPI Cards
    const kpiBox = document.getElementById('cashbook-kpi-summary');
    kpiBox.innerHTML = `
      <!-- Account Balances -->
      ${accounts.map(a => {
        const isCash = a.account_type === 'Cash Drawer';
        const isMpesa = a.account_type === 'M-Pesa Till';
        return `
          <div class="cashbook-kpi-card">
            <span class="cashbook-kpi-label">${isCash ? '💵 Cash in Drawer' : isMpesa ? '📱 M-Pesa Till' : '🏦 Bank Balance'}</span>
            <div class="cashbook-kpi-val">KES ${(a.balance_kes || 0).toLocaleString()}</div>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">${escapeHtml(a.account_name)}</span>
          </div>
        `;
      }).join('')}

      <!-- Total Money In -->
      <div class="cashbook-kpi-card inflow">
        <span class="cashbook-kpi-label">🟢 Total Money In (Sales)</span>
        <div class="cashbook-kpi-val" style="color:#047857;">KES ${(summary.total_money_in_kes || 0).toLocaleString()}</div>
        <span style="font-size:0.75rem; color:#047857; margin-top:3px;">From sales &amp; credit debt paid</span>
      </div>

      <!-- Total Money Out (Royal Blue for Calm Executive Feel) -->
      <div class="cashbook-kpi-card outflow">
        <span class="cashbook-kpi-label">🔵 Total Money Out (Expenses)</span>
        <div class="cashbook-kpi-val" style="color:#0284c7;">KES ${(summary.total_money_out_kes || 0).toLocaleString()}</div>
        <span style="font-size:0.75rem; color:#0284c7; margin-top:3px;">Shop bills &amp; supplier settlements</span>
      </div>

      <!-- Net Balance -->
      <div class="cashbook-kpi-card net">
        <span class="cashbook-kpi-label">💰 Net Money Available</span>
        <div class="cashbook-kpi-val" style="color:#92400e;">KES ${(summary.net_balance_kes || 0).toLocaleString()}</div>
        <span style="font-size:0.75rem; color:#92400e; margin-top:3px;">Total liquid shop funds</span>
      </div>
    `;

    // Render Register Table
    const tableBox = document.getElementById('cashbook-register-table-box');
    if (!recent_movements || !recent_movements.length) {
      tableBox.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No cashbook movements recorded yet.</div>';
    } else {
      tableBox.innerHTML = `
        <table class="premium-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Movement Type</th>
              <th>Party / Customer / Vendor</th>
              <th>Amount (KES)</th>
              <th>Account</th>
              <th>Recorded By</th>
              <th>Notes / Details</th>
            </tr>
          </thead>
          <tbody>
            ${recent_movements.map(m => {
              const isInflow = m.type === 'Sales Inflow' || m.type === 'Credit Repaid';
              return `
                <tr>
                  <td style="font-family:var(--font-mono); font-size:0.8rem;">${new Date(m.created_at).toLocaleString()}</td>
                  <td>
                    <span class="${isInflow ? 'cashbook-tag-in' : 'cashbook-tag-out'}">
                      ${isInflow ? '🟢 ' + escapeHtml(m.type) : '🔵 ' + escapeHtml(m.type)}
                    </span>
                  </td>
                  <td><strong>${escapeHtml(m.party || 'Store Customer')}</strong></td>
                  <td>
                    <strong style="font-family:var(--font-mono); font-size:0.95rem; color:${isInflow ? '#047857' : '#0284c7'};">
                      ${isInflow ? '+' : '-'} KES ${m.amount_kes.toLocaleString()}
                    </strong>
                  </td>
                  <td style="font-size:0.85rem;">${escapeHtml(m.account_name || m.payment_method || '-')}</td>
                  <td style="font-size:0.85rem;">${escapeHtml(m.recorded_by_name || 'Staff')}</td>
                  <td class="muted small" style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(m.notes || m.title || '-')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    document.getElementById('cashbook-kpi-summary').innerHTML = `<p class="status-pill failed">${err.message}</p>`;
  }
}


function showLogExpenseModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>Add Shop Expense</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="new-expense-form">
          <div class="form-group">
            <label>What was this expense for?</label>
            <select id="exp-category" required>
              <option value="Shop Rent">Shop Premise Rent</option>
              <option value="Staff Wages">Staff Wages / Allowance</option>
              <option value="Transport & Fuel">Delivery Fuel &amp; Transport</option>
              <option value="Utilities">Electricity Tokens &amp; Water</option>
              <option value="Machine Calibration">Tinting Machine Servicing &amp; Calibration</option>
              <option value="Tea & Snacks">Staff Tea, Lunch &amp; Snacks</option>
              <option value="Store Supplies">Shop Cleaning &amp; Packaging Supplies</option>
              <option value="Other">Other Shop Expense</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Amount Spent (KES)</label>
              <input type="number" id="exp-amt" placeholder="e.g. 3500" min="1" required style="font-size:1.15rem; font-weight:800; font-family:var(--font-mono);" />
            </div>
            <div class="form-group">
              <label>Paid To Whom? (Person / Store)</label>
              <input type="text" id="exp-recipient" placeholder="e.g. Landlord / Kenya Power / Total Station" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Payment Method</label>
              <select id="exp-method">
                <option value="Cash">Cash (Counter Till)</option>
                <option value="M-Pesa">M-Pesa Business Till</option>
                <option value="Bank Transfer">Bank Wire Transfer</option>
              </select>
            </div>
            <div class="form-group">
              <label>Deduct From Account</label>
              <select id="exp-account">
                <option value="1">Main Counter Cash Till</option>
                <option value="2">Safaricom M-Pesa Buy Goods</option>
                <option value="3">Equity Bank Operational</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Reference Notes (Optional)</label>
            <input type="text" id="exp-notes" placeholder="e.g. Receipt #9821 or token purchase" />
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-danger">Record Expense</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('new-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      category: document.getElementById('exp-category').value,
      amount_kes: Number(document.getElementById('exp-amt').value),
      recipient: document.getElementById('exp-recipient').value.trim(),
      payment_method: document.getElementById('exp-method').value,
      account_id: Number(document.getElementById('exp-account').value),
      notes: document.getElementById('exp-notes').value.trim()
    };

    try {
      const res = await apiFetch('/api/financials/expense', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('cashbook');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ==========================================================================
// 7. CUSTOMER CREDIT & DEBT CLEARANCES (OWNER ONLY)
// ==========================================================================
async function renderCreditView(container) {
  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.credit} Customer Credit &amp; Debt Clearances</h2>
        <p>Monitor unpaid balances from customers who bought on credit and record instant debt repayments (full max clearance or custom top-up amounts).</p>
      </div>
      <div class="view-header-actions" style="display:flex; align-items:center; gap:0.5rem;">
        <button id="btn-clear-all-credit" class="btn btn-danger btn-sm" style="border: 1.5px solid #dc2626; background: transparent; color: #dc2626; font-weight: 800; display:inline-flex; align-items:center; gap:0.4rem;" title="Delete all customer credit accounts (PIN Required)">
          🗑️ Delete All
        </button>
        <button id="btn-add-credit-customer" class="btn btn-primary btn-sm">${Icons.plus} Add Credit Customer</button>
      </div>
    </div>

    <!-- Summary Box -->
    <div class="cashbook-kpi-grid" style="margin-bottom:1.4rem;">
      <div class="cashbook-kpi-card outflow">
        <span class="cashbook-kpi-label">Total Debt Owed to Shop by Customers</span>
        <div class="cashbook-kpi-val" style="color:#0284c7;" id="total-customer-debt-val">KES 0</div>
        <span style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Pending debt repayments from painters &amp; contractors</span>
      </div>
    </div>

    <!-- Customer Credit List -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>👥 Customers with Outstanding Credit Balance</h3>
      </div>
      <div id="credit-customers-container">
        <div style="padding:2rem; text-align:center; color:var(--text-muted);">Loading customer credit list...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-credit-customer').addEventListener('click', showAddCreditCustomerModal);

  // Clear All Credit Accounts Handler
  const clearAllCreditBtn = document.getElementById('btn-clear-all-credit');
  if (clearAllCreditBtn) {
    clearAllCreditBtn.addEventListener('click', () => {
      promptSecurityPin({
        title: '⚠️ WIPE ALL CUSTOMER CREDIT ACCOUNTS',
        description: 'This will permanently delete ALL customer credit accounts, statements, and debt ledgers. Enter Store Master PIN to authorize.',
        badgeText: 'HIGH RISK OPERATION',
        confirmText: 'Wipe All Credit Accounts',
        onConfirm: async (pin) => {
          try {
            const res = await apiFetch('/api/reports/credit/clear-all', {
              method: 'POST',
              body: JSON.stringify({ pin, reason: 'Bulk clear all customer credit' })
            });
            toast(res.message || 'All customer credit accounts cleared.');
            renderCreditView(container);
          } catch (err) {
            toast(err.message, true);
          }
        }
      });
    });
  }

  try {
    const accounts = await apiFetch('/api/reports/credit');
    const debtors = accounts.filter(a => a.current_balance_kes > 0);
    const totalDebt = accounts.reduce((sum, a) => sum + (a.current_balance_kes || 0), 0);

    document.getElementById('total-customer-debt-val').innerText = 'KES ' + totalDebt.toLocaleString();

    const box = document.getElementById('credit-customers-container');
    if (!accounts.length) {
      box.innerHTML = '<div style="padding:2.5rem; text-align:center; color:var(--text-muted);">No credit customer accounts registered yet. Click "+ Add Credit Customer" to create an approved account.</div>';
      return;
    }

    box.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        ${accounts.map(c => {
          const hasDebt = c.current_balance_kes > 0;
          return `
            <div class="credit-customer-row">
              <div>
                <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">${escapeHtml(c.fundi_name)}</h4>
                <div style="font-size:0.84rem; color:var(--text-muted); margin-top:2px;">
                  📞 Phone: <strong>${escapeHtml(c.phone_number)}</strong> · Credit Limit: <strong>KES ${c.credit_limit_kes.toLocaleString()}</strong>
                </div>
              </div>

              <div style="text-align:right;">
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Unpaid Debt Balance:</div>
                <div class="credit-debt-badge" style="color:${hasDebt ? '#0284c7' : '#047857'};">
                  KES ${c.current_balance_kes.toLocaleString()}
                </div>
              </div>

              <div style="display:flex; gap:0.4rem; align-items:center;">
                ${hasDebt ? `
                  <button data-id="${c.account_id}" data-name="${escapeHtml(c.fundi_name)}" data-bal="${c.current_balance_kes}" class="btn-clear-debt-full btn btn-primary btn-sm" title="Clear entire debt in 1 click">
                    ⚡ Clear Full (KES ${c.current_balance_kes.toLocaleString()})
                  </button>
                  <button data-id="${c.account_id}" data-name="${escapeHtml(c.fundi_name)}" data-bal="${c.current_balance_kes}" class="btn-clear-debt-custom btn btn-secondary btn-sm">
                    ✏️ Custom Top-Up
                  </button>
                ` : `
                  <span class="status-pill paid" style="padding:0.4rem 0.8rem;">✅ Fully Paid</span>
                `}
                <button data-id="${c.account_id}" class="btn-view-credit-stmt btn btn-secondary btn-sm">
                  Statement
                </button>
                <button data-id="${c.account_id}" data-name="${escapeHtml(c.fundi_name)}" data-bal="${c.current_balance_kes}" class="btn-delete-credit-account btn btn-danger btn-sm" style="padding:0.32rem 0.55rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Credit Account (PIN Required)">
                  🗑️
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Attach Clearance Events
    box.querySelectorAll('.btn-clear-debt-full').forEach((btn) => {
      btn.addEventListener('click', () => {
        showDebtClearanceModal(Number(btn.dataset.id), btn.dataset.name, Number(btn.dataset.bal), Number(btn.dataset.bal));
      });
    });

    box.querySelectorAll('.btn-clear-debt-custom').forEach((btn) => {
      btn.addEventListener('click', () => {
        showDebtClearanceModal(Number(btn.dataset.id), btn.dataset.name, Number(btn.dataset.bal), null);
      });
    });

    box.querySelectorAll('.btn-view-credit-stmt').forEach((btn) => {
      btn.addEventListener('click', () => {
        showCreditStatementModal(Number(btn.dataset.id));
      });
    });

    // Single Customer Credit Account Deletion Handler
    box.querySelectorAll('.btn-delete-credit-account').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const name = btn.dataset.name;
        const bal = Number(btn.dataset.bal);

        promptSecurityPin({
          title: `🗑️ Delete Credit Account: ${name}`,
          description: `Permanently delete credit account for "${name}"? ${bal > 0 ? `⚠️ Customer has an unpaid debt balance of KES ${bal.toLocaleString()}.` : ''} Enter Store Owner PIN to authorize deletion.`,
          badgeText: 'Owner Protected',
          confirmText: 'Authorize Deletion',
          onConfirm: async (pin) => {
            try {
              const res = await apiFetch(`/api/reports/credit/${id}`, {
                method: 'DELETE',
                body: JSON.stringify({ pin, reason: `Manual deletion of customer ${name}` })
              });
              toast(res.message || `Customer credit account for "${name}" deleted.`);
              renderCreditView(container);
            } catch (err) {
              toast(err.message, true);
            }
          }
        });
      });
    });

  } catch (err) {
    document.getElementById('credit-customers-container').innerHTML = `<p class="status-pill failed">${err.message}</p>`;
  }
}


function showAddCreditCustomerModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>Add Customer Credit Account</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="new-credit-cust-form">
          <div class="form-group">
            <label>Customer / Fundi Name</label>
            <input type="text" id="ncc-name" placeholder="e.g. Eng. Patrick Kamau" required />
          </div>
          <div class="form-group">
            <label>Phone Number (M-Pesa Registered)</label>
            <input type="text" id="ncc-phone" placeholder="2547XXXXXXXX" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Approved Credit Limit (KES)</label>
              <input type="number" id="ncc-limit" value="20000" step="500" required />
            </div>
            <div class="form-group">
              <label>Initial Unpaid Debt Balance (KES)</label>
              <input type="number" id="ncc-debt" value="0" min="0" />
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Account</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('new-credit-cust-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fundi_name: document.getElementById('ncc-name').value.trim(),
      phone_number: document.getElementById('ncc-phone').value.trim(),
      credit_limit_kes: Number(document.getElementById('ncc-limit').value),
      initial_debt_kes: Number(document.getElementById('ncc-debt').value) || 0
    };

    try {
      const res = await apiFetch('/api/reports/credit/account', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('credit');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function showDebtClearanceModal(accountId, customerName, currentBalance, presetAmount) {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>💰 Record Customer Debt Repayment</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:var(--radius-md); padding:1rem 1.2rem; margin-bottom:1.2rem;">
          <div style="font-size:0.8rem; font-weight:700; color:#991b1b; text-transform:uppercase;">Customer: ${customerName}</div>
          <div style="font-size:1.5rem; font-weight:800; font-family:var(--font-mono); color:#b91c1c;">
            Unpaid Debt: KES ${currentBalance.toLocaleString()}
          </div>
        </div>

        <form id="debt-clearance-form">
          <div class="form-group">
            <label>Repayment Amount (KES)</label>
            <input type="number" id="dc-amt" value="${presetAmount !== null ? presetAmount : currentBalance}" max="${currentBalance}" min="1" required style="font-size:1.2rem; font-weight:800; font-family:var(--font-mono);" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Receiving Cashbook Account (Deposits Funds)</label>
              <select id="dc-account" required>
                <option value="1">Main Counter Cash Till</option>
                <option value="2">Safaricom M-Pesa Buy Goods</option>
                <option value="3">Equity Bank Operational</option>
              </select>
            </div>
            <div class="form-group">
              <label>Payment Mode</label>
              <select id="dc-mode">
                <option value="Cash">Cash at Counter</option>
                <option value="M-Pesa">M-Pesa Till Receipt</option>
                <option value="Bank Transfer">Bank Wire Deposit</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Reference Notes / M-Pesa Receipt Code</label>
            <input type="text" id="dc-notes" placeholder="e.g. M-Pesa code QHJ829182 / Cash paid at counter" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Accept &amp; Clear Debt</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('debt-clearance-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amt = Number(document.getElementById('dc-amt').value);
    const accId = Number(document.getElementById('dc-account').value);
    const mode = document.getElementById('dc-mode').value;
    const notes = document.getElementById('dc-notes').value.trim();

    try {
      const res = await apiFetch('/api/reports/credit/payment', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          amount_kes: amt,
          cashflow_account_id: accId,
          payment_method: mode,
          notes
        })
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('credit');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function showCreditStatementModal(accountId) {
  const modal = document.getElementById('modal-container');
  try {
    const data = await apiFetch(`/api/reports/credit/${accountId}/statement`);
    const { account, transactions } = data;

    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container-card" style="max-width:760px;">
          <div class="modal-header-bar">
            <h3>📜 Credit Statement: ${account.fundi_name}</h3>
            <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:1rem 1.2rem; border-radius:var(--radius-md); border:1px solid var(--border-light); margin-bottom:1.2rem;">
            <div>
              <div style="font-size:0.85rem; color:var(--text-muted);">Phone: <strong>${account.phone_number}</strong> · Limit: <strong>KES ${account.credit_limit_kes.toLocaleString()}</strong></div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Current Debt:</span>
              <div style="font-size:1.3rem; font-weight:800; font-family:var(--font-mono); color:#b91c1c;">
                KES ${(account.current_balance_kes || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div class="table-responsive" style="max-height:360px; overflow-y:auto;">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Invoice Reference</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.length ? transactions.map(t => `
                  <tr>
                    <td>${new Date(t.created_at).toLocaleString()}</td>
                    <td>
                      <span class="status-pill ${t.tx_type === 'Payment' ? 'paid' : 'pending'}">
                        ${t.tx_type === 'Payment' ? '✅ Debt Payment' : '🛒 Credit Charge'}
                      </span>
                    </td>
                    <td><strong style="color:${t.tx_type === 'Payment' ? '#047857' : '#b91c1c'}; font-family:var(--font-mono);">KES ${t.amount_kes.toLocaleString()}</strong></td>
                    <td>${t.invoice_id ? '#' + t.invoice_id : 'Direct Repayment'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No credit transactions recorded yet.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:1.4rem;">
            <button class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Close Statement</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    toast(err.message, true);
  }
}

// ==========================================================================
// 8. OWNER-ONLY EMPLOYEE MANAGEMENT & PRIVILEGES
// ==========================================================================
async function renderEmployeesView(container) {
  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.employees} Employee Management &amp; Privileges</h2>
        <p>Store Owner control center: add staff members, assign limited role privileges, toggle active status, and reset employee credentials.</p>
      </div>
      <div class="view-header-actions">
        <button id="btn-add-employee" class="btn btn-primary btn-sm">${Icons.plus} Add New Employee</button>
      </div>
    </div>

    <!-- Privilege Guide Card -->
    <div style="background:#f8fafc; border:1.5px solid var(--border-light); border-radius:var(--radius-lg); padding:1.4rem; margin-bottom:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:1.2rem;">
      <div style="background:white; border:1px solid var(--border-light); border-radius:var(--radius-md); padding:1.1rem;">
        <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-primary); margin-bottom:0.4rem;">⚡ Staff Attendant Privileges</h4>
        <ul style="font-size:0.84rem; color:var(--text-secondary); line-height:1.7; padding-left:1.2rem;">
          <li>Point of Sale Checkout &amp; Counter Sales</li>
          <li>Custom Paint Tinting &amp; Formulation PINs</li>
          <li>Pro-Forma Quotation Builder</li>
          <li>Smart Inventory Stock Quantities View</li>
        </ul>
      </div>

      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:var(--radius-md); padding:1.1rem;">
        <h4 style="font-size:0.95rem; font-weight:800; color:#92400e; margin-bottom:0.4rem;">👑 Store Owner Privileges (Full Admin)</h4>
        <ul style="font-size:0.84rem; color:#78350f; line-height:1.7; padding-left:1.2rem;">
          <li>Business Reports Center &amp; PDF Downloads</li>
          <li>Real-Time Cashbook &amp; Operational Expenses</li>
          <li>Suppliers &amp; Supplier Balance Payments</li>
          <li>Customer Credit &amp; Debt Clearances</li>
          <li>Employee Management &amp; Security Audit Logs</li>
        </ul>
      </div>
    </div>

    <!-- Employee List Panel -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>Registered System Users &amp; Attendants</h3>
      </div>
      <div id="employees-list-container">
        <div style="padding:2rem; text-align:center; color:var(--text-muted);">Loading employees...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-employee').addEventListener('click', showAddEmployeeModal);

  try {
    const employees = await apiFetch('/api/auth/employees');
    const box = document.getElementById('employees-list-container');

    box.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        ${employees.map(u => {
          const isOwner = u.system_role === 'Owner';
          return `
            <div class="employee-card">
              <div style="display:flex; align-items:center; gap:1rem;">
                <div class="user-avatar" style="width:44px; height:44px; font-size:1.1rem; background:${isOwner ? '#090d16' : '#334155'}; color:${isOwner ? 'var(--brand-gold)' : 'white'};">
                  ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style="font-size:1.05rem; font-weight:800; color:var(--text-primary);">${u.full_name}</div>
                  <div style="font-size:0.84rem; color:var(--text-muted); margin-top:2px;">
                    📞 Phone: <strong>${u.phone_number}</strong> · Role: <strong>${u.system_role}</strong>
                  </div>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:0.8rem;">
                <span class="employee-status-pill ${u.is_active ? 'active' : 'inactive'}">
                  ${u.is_active ? '✅ Active' : '⛔ Deactivated'}
                </span>

                ${!isOwner ? `
                  <button data-id="${u.user_id}" data-active="${u.is_active}" class="btn-toggle-emp-status btn btn-secondary btn-sm">
                    ${u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button data-id="${u.user_id}" data-name="${u.full_name}" class="btn-reset-emp-pass btn btn-secondary btn-sm">
                    Reset Password
                  </button>
                ` : `
                  <span class="brand-pill" style="background:#090d16; color:var(--brand-gold);">👑 Primary Owner</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    box.querySelectorAll('.btn-toggle-emp-status').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const currentActive = btn.dataset.active === 'true';
        try {
          await apiFetch(`/api/auth/employees/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: !currentActive })
          });
          toast(`Employee account ${!currentActive ? 'activated' : 'deactivated'}.`);
          showView('employees');
        } catch (err) {
          toast(err.message, true);
        }
      });
    });

    box.querySelectorAll('.btn-reset-emp-pass').forEach((btn) => {
      btn.addEventListener('click', () => {
        showResetEmployeePasswordModal(Number(btn.dataset.id), btn.dataset.name);
      });
    });

  } catch (err) {
    document.getElementById('employees-list-container').innerHTML = `<p class="status-pill failed">${err.message}</p>`;
  }
}

function showAddEmployeeModal() {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card">
        <div class="modal-header-bar">
          <h3>Add New Employee</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="add-employee-form">
          <div class="form-group">
            <label>Employee Full Name</label>
            <input type="text" id="emp-name" placeholder="e.g. Peter Otieno" required />
          </div>

          <div class="form-group">
            <label>Phone Number (Login ID)</label>
            <input type="text" id="emp-phone" placeholder="2547XXXXXXXX" required />
          </div>

          <div class="form-group">
            <label>System Role &amp; Privileges</label>
            <select id="emp-role" required>
              <option value="Staff" selected>Staff Attendant (POS, Tinting, Quotes, Inventory View)</option>
              <option value="Owner">Store Owner (Full Administrative Access)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Initial Password (min 6 characters)</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.lock}</span>
              <input type="password" id="emp-pass" placeholder="••••••••" minlength="6" required />
              <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('emp-pass', this)" title="Show/Hide Password">👁️</button>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Employee</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      full_name: document.getElementById('emp-name').value.trim(),
      phone_number: document.getElementById('emp-phone').value.trim(),
      system_role: document.getElementById('emp-role').value,
      password: document.getElementById('emp-pass').value
    };

    try {
      const res = await apiFetch('/api/auth/employees', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
      showView('employees');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function showResetEmployeePasswordModal(userId, userName) {
  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:440px;">
        <div class="modal-header-bar">
          <h3>Reset Password for ${userName}</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>
        <form id="reset-emp-pass-form">
          <div class="form-group">
            <label>New Password for Employee</label>
            <div class="input-with-icon">
              <span class="input-icon">${Icons.lock}</span>
              <input type="password" id="rep-new-pass" placeholder="••••••••" minlength="6" required />
              <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('rep-new-pass', this)" title="Show/Hide Password">👁️</button>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn btn-primary">Save New Password</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('reset-emp-pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('rep-new-pass').value;
    try {
      const res = await apiFetch(`/api/auth/employees/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPass })
      });
      document.getElementById('modal-container').innerHTML = '';
      toast(res.message);
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ==========================================================================
// 9. OWNER REPORTS CENTER & INSTANT PDF EXPORTS
// ==========================================================================
let currentReportPeriod = 'this_month';

async function renderReportsCenterView(container, period = currentReportPeriod) {
  currentReportPeriod = period;

  container.innerHTML = `
    <div class="reports-dashboard-wrap">
      <!-- Title & Subtitle Matching Screenshot -->
      <div style="margin-bottom: 1.2rem;">
        <h2 class="reports-header-title" id="report-period-title">Report Centre — Loading...</h2>
        <p class="reports-header-desc">Business performance metrics, profitability summaries, and financial reconciliation.</p>
      </div>

      <!-- Action & Period Filter Toolbar -->
      <div class="reports-toolbar">
        <button class="period-pill-btn ${period === 'this_month' ? 'active' : ''}" data-period="this_month">This Month</button>
        <button class="period-pill-btn ${period === 'last_month' ? 'active' : ''}" data-period="last_month">Last Month</button>
        <button class="period-pill-btn ${period === 'all_time' ? 'active' : ''}" data-period="all_time">All Time</button>
        <button class="reports-action-btn" id="btn-export-pdf-report">
          ${Icons.download} Export PDF
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-system-factory-reset" style="border-color:#fca5a5; color:#dc2626; font-weight:800; display:inline-flex; align-items:center; gap:0.3rem;">
          ⚙️ Factory Reset / Fresh Slate
        </button>
      </div>

      <!-- 5 Metric Cards in 1 Row -->
      <div class="reports-5kpi-grid">
        <!-- 1. Total Sales -->
        <div class="kpi-metric-card">
          <div class="kpi-metric-label">TOTAL SALES</div>
          <div>
            <div class="kpi-currency-prefix">KES</div>
            <div class="kpi-metric-val" id="rep-total-sales">KSh 0</div>
          </div>
        </div>

        <!-- 2. Cost of Goods -->
        <div class="kpi-metric-card">
          <div class="kpi-metric-label">COST OF GOODS</div>
          <div>
            <div class="kpi-currency-prefix">KES</div>
            <div class="kpi-metric-val" id="rep-cogs">KSh 0</div>
          </div>
        </div>

        <!-- 3. Gross Profit -->
        <div class="kpi-metric-card">
          <div class="kpi-metric-label">GROSS PROFIT</div>
          <div>
            <div class="kpi-currency-prefix">KES</div>
            <div class="kpi-metric-val green" id="rep-gross-profit">KSh 0</div>
          </div>
        </div>

        <!-- 4. Expenses -->
        <div class="kpi-metric-card">
          <div class="kpi-metric-label">EXPENSES</div>
          <div>
            <div class="kpi-currency-prefix">KES</div>
            <div class="kpi-metric-val" style="color:#0284c7;" id="rep-expenses">KSh 0</div>
          </div>
        </div>

        <!-- 5. Estimated Net Profit / Loss -->
        <div class="kpi-metric-card">
          <div class="kpi-metric-label" id="rep-net-label">ESTIMATED NET PROFIT</div>
          <div>
            <div class="kpi-currency-prefix">KES</div>
            <div class="kpi-metric-val green" id="rep-net-profit">KSh 0</div>
          </div>
        </div>
      </div>

      <!-- 2-Column Section Below: Product Profitability & Low Stock Alert Items -->
      <div class="reports-2col-layout">
        
        <!-- Left: Product Profitability -->
        <div class="report-box-card">
          <div class="report-box-header">
            <h3>🏅 Product Profitability</h3>
          </div>
          <div id="product-profitability-list">
            <div style="padding: 1.5rem; text-align: center; color: #64748b;">Loading product profitability...</div>
          </div>
        </div>

        <!-- Right: Low Stock Alert Items -->
        <div class="report-box-card">
          <div class="report-box-header">
            <h3>🚨 Low Stock Alert Items</h3>
          </div>
          <div id="low-stock-alert-list">
            <div style="padding: 1.5rem; text-align: center; color: #64748b;">Checking stock levels...</div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach Period Filter Buttons
  container.querySelectorAll('.period-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderReportsCenterView(container, btn.dataset.period);
    });
  });

  try {
    const data = await apiFetch(`/api/reports/center-overview?period=${period}`);
    const { month_label, sales, profits, product_profitability, low_stock_items } = data;

    const titleEl = document.getElementById('report-period-title');
    if (titleEl) titleEl.innerText = `Report Centre — ${month_label}`;

    // Populate the 5 cards
    const totalSales = sales.total_revenue_kes || 0;
    const cogs = profits.total_cogs_kes || 0;
    const grossProfit = profits.gross_profit_kes || 0;
    const expenses = profits.total_opex_kes || 0;
    const netProfit = profits.net_profit_kes || 0;

    const salesEl = document.getElementById('rep-total-sales');
    const cogsEl = document.getElementById('rep-cogs');
    const grossEl = document.getElementById('rep-gross-profit');
    const expEl = document.getElementById('rep-expenses');
    const netValEl = document.getElementById('rep-net-profit');
    const netLabelEl = document.getElementById('rep-net-label');

    if (salesEl) salesEl.innerText = `KSh ${Math.round(totalSales).toLocaleString()}`;
    if (cogsEl) cogsEl.innerText = `KSh ${Math.round(cogs).toLocaleString()}`;
    if (grossEl) grossEl.innerText = `KSh ${Math.round(grossProfit).toLocaleString()}`;
    if (expEl) expEl.innerText = `KSh ${Math.round(expenses).toLocaleString()}`;

    if (netValEl && netLabelEl) {
      if (netProfit < 0) {
        netLabelEl.innerText = 'ESTIMATED NET LOSS';
        netValEl.className = 'kpi-metric-val red';
        netValEl.innerText = `KSh ${Math.round(netProfit).toLocaleString()}`;
      } else {
        netLabelEl.innerText = 'ESTIMATED NET PROFIT';
        netValEl.className = 'kpi-metric-val green';
        netValEl.innerText = `KSh ${Math.round(netProfit).toLocaleString()}`;
      }
    }

    // Render Product Profitability
    const ppBox = document.getElementById('product-profitability-list');
    if (ppBox) {
      if (!product_profitability || !product_profitability.length) {
        ppBox.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;">No product sales recorded in this period.</div>';
      } else {
        ppBox.innerHTML = product_profitability.map((p, idx) => `
          <div class="product-profit-row">
            <div class="pp-left">
              <div class="pp-name">#${idx + 1} ${escapeHtml(p.name)}</div>
              <div class="pp-sub">
                ${p.units_sold} unit${p.units_sold === 1 ? '' : 's'} sold · Revenue KSh ${Math.round(p.revenue_kes || 0).toLocaleString()}
              </div>
            </div>
            <div class="pp-profit">+KSh ${Math.round(p.profit_kes || 0).toLocaleString()}</div>
          </div>
        `).join('');
      }
    }

    // Render Low Stock Alert Items
    const lsBox = document.getElementById('low-stock-alert-list');
    if (lsBox) {
      if (!low_stock_items || !low_stock_items.length) {
        lsBox.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #047857; background: #ecfdf5; border-radius: 8px; font-weight: 600;">✅ All inventory items are currently well stocked above reorder thresholds!</div>';
      } else {
        lsBox.innerHTML = low_stock_items.map((item) => `
          <div class="low-stock-table-row">
            <div class="ls-left">
              <div class="ls-name">${escapeHtml(item.name)}</div>
              <div class="ls-sub">Reorder Threshold: ${item.low_stock_threshold} ${item.unit || 'piece'}</div>
            </div>
            <div class="ls-qty">${item.current_qty} ${item.unit || 'piece'}</div>
          </div>
        `).join('');
      }
    }

    // Export PDF
    const exportBtn = document.getElementById('btn-export-pdf-report');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        downloadExecutiveReportPdf(data);
      });
    }

    // Factory Reset Tool
    const resetBtn = document.getElementById('btn-system-factory-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        promptSecurityPin({
          title: '⚙️ Factory Data Reset / Clean Slate',
          description: 'Are you preparing the system for live launch? This will permanently wipe all test transactions, sales, expenses, and quotations, and restore clean initial cash balances. Requires Master Security PIN.',
          badgeText: 'Master PIN Authorization',
          confirmText: 'Execute Factory Reset',
          onConfirm: async (pin) => {
            const res = await apiFetch('/api/reports/system-reset', {
              method: 'POST',
              body: JSON.stringify({ pin, reset_scope: 'all', reason: 'Store initial go-live reset' })
            });
            toast(res.message || 'System reset successfully completed!');
            renderReportsCenterView(container);
          }
        });
      });
    }

  } catch (err) {
    const titleEl = document.getElementById('report-period-title');
    if (titleEl) titleEl.innerText = 'Report Centre';
    toast(err.message, true);
  }
}

// ==========================================================================
// 10. REAL-TIME SALES ORDERS VIEW & PDF INVOICE DOWNLOAD
// ==========================================================================

// ==========================================================================
// UNIVERSAL STORE SECURITY AUTHORIZATION PIN & DELETION ENGINE
// ==========================================================================

function promptSecurityPin(options) {
  const {
    title = '🔒 Store Authorization PIN Required',
    description = 'Please enter your Store Authorization PIN to confirm this action.',
    badgeText = 'Security Protected',
    confirmText = 'Authorize & Proceed',
    confirmClass = 'btn-danger',
    onConfirm
  } = options;

  const isOwner = (state.user && (state.user.role === 'Owner' || state.user.system_role === 'Owner'));

  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay" style="z-index:99999;">
      <div class="modal-container-card" style="max-width: 440px; border: 1.5px solid #fecaca; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);">
        <div class="modal-header-bar" style="border-bottom: 1.5px solid #fee2e2; background: #fff5f5; border-radius: 12px 12px 0 0; padding: 1rem 1.25rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <div style="font-size:1.4rem;">🔒</div>
            <div>
              <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#991b1b;">${escapeHtml(title)}</h3>
              <span style="font-size:0.72rem; font-weight:800; color:#dc2626; text-transform:uppercase;">${escapeHtml(badgeText)}</span>
            </div>
          </div>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <form id="security-pin-auth-form" style="padding: 1.25rem;">
          <p style="font-size:0.86rem; color:#475569; margin:0 0 1rem; line-height:1.45;">
            ${description}
          </p>

          <div class="form-group" style="margin-bottom:1.1rem;">
            <label style="font-weight:800; font-size:0.82rem; color:#0f172a; display:flex; justify-content:space-between;">
              <span>Store Security PIN</span>
              ${isOwner ? '<span style="color:#0284c7; font-weight:600; font-size:0.74rem;">(Default Master PIN: 7788)</span>' : '<span style="color:#64748b; font-size:0.74rem;">(Request from Owner)</span>'}
            </label>
            <input
              type="password"
              id="sec-auth-pin-input"
              maxlength="8"
              placeholder="Enter PIN (e.g. 7788)"
              required
              autofocus
              style="font-size:1.4rem; letter-spacing:6px; text-align:center; font-family:var(--font-mono); font-weight:800; padding:0.65rem; border:2px solid #cbd5e1; border-radius:8px;"
            />
          </div>

          <div id="sec-pin-error" style="display:none; margin-bottom:0.9rem; padding:0.5rem 0.75rem; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; font-size:0.8rem; font-weight:700; color:#b91c1c;"></div>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Cancel</button>
            <button type="submit" class="btn ${confirmClass}" id="btn-sec-auth-submit" style="font-weight:800; padding:0.5rem 1.2rem;">
              ${escapeHtml(confirmText)}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const pinInput = document.getElementById('sec-auth-pin-input');
  setTimeout(() => pinInput && pinInput.focus(), 60);

  document.getElementById('security-pin-auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = pinInput.value.trim();
    const submitBtn = document.getElementById('btn-sec-auth-submit');
    const errorBox = document.getElementById('sec-pin-error');
    errorBox.style.display = 'none';

    submitBtn.disabled = true;
    submitBtn.innerText = 'Verifying...';

    try {
      await onConfirm(pin);
      document.getElementById('modal-container').innerHTML = '';
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerText = confirmText;
      errorBox.innerText = err.message || 'Authorization failed. Invalid PIN.';
      errorBox.style.display = 'block';
      pinInput.value = '';
      pinInput.focus();
    }
  });
}

// Store Owner PIN Manager Modal
async function showStorePinManagerModal() {
  let masterPin = '7788';
  let staffPins = [];
  try {
    const data = await apiFetch('/api/auth/store-pin');
    masterPin = data.master_security_pin || '7788';
    staffPins = data.active_staff_pins || [];
  } catch (e) {
    console.error('Failed to load store PINs:', e);
  }

  const modal = document.getElementById('modal-container');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width: 540px;">
        <div class="modal-header-bar">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:1.3rem;">🔑</span>
            <div>
              <h3 style="margin:0; font-size:1.1rem; font-weight:800;">Store Security &amp; Authorization PINs</h3>
              <span style="font-size:0.75rem; color:#64748b;">Manage Master Owner PIN and delegate temporary staff authorization PINs</span>
            </div>
          </div>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <div style="padding:1.25rem;">
          <!-- 1. Master Owner PIN Card -->
          <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:1rem 1.2rem; margin-bottom:1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem;">
              <div>
                <span style="font-size:0.72rem; font-weight:800; color:#0284c7; text-transform:uppercase;">Owner Master Security PIN</span>
                <div style="font-size:1.4rem; font-weight:800; font-family:var(--font-mono); color:#0f172a; letter-spacing:4px; margin-top:2px;">
                  ${escapeHtml(masterPin)}
                </div>
              </div>
              <span class="status-pill paid" style="font-size:0.75rem; font-weight:800;">Active Master</span>
            </div>
            <p style="font-size:0.8rem; color:#64748b; margin:0 0 0.8rem; line-height:1.4;">
              This Master PIN authorizes record deletions, sales clearing, audit resets, and complete system factory resets.
            </p>
            <form id="change-master-pin-form" style="display:flex; gap:0.5rem;">
              <input type="password" id="new-master-pin-input" placeholder="New PIN (4-8 digits)" maxlength="8" required style="font-family:var(--font-mono); font-weight:700; font-size:0.95rem; width:160px;" />
              <button type="submit" class="btn btn-secondary btn-sm" style="font-weight:700;">Update Master PIN</button>
            </form>
          </div>

          <!-- 2. Active Staff Delegated PINs -->
          <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <strong style="font-size:0.86rem; color:#0f172a;">Active Delegated Staff PINs (${staffPins.length})</strong>
              <button class="btn btn-secondary btn-sm" onclick="showGeneratePinModal()" style="font-size:0.78rem; font-weight:700;">+ Generate Staff PIN</button>
            </div>

            ${staffPins.length === 0 ? `
              <div style="padding:1rem; text-align:center; background:#f8fafc; border-radius:8px; font-size:0.82rem; color:#64748b;">
                No active staff PINs generated. Click "+ Generate Staff PIN" to give temporary deletion privileges to an employee.
              </div>
            ` : `
              <table class="premium-table" style="font-size:0.82rem;">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>PIN Code</th>
                    <th>Permission / Scope</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  ${staffPins.map(p => `
                    <tr>
                      <td><strong>${escapeHtml(p.staff_name)}</strong></td>
                      <td><span style="font-family:var(--font-mono); font-weight:800; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${escapeHtml(p.pin_code)}</span></td>
                      <td><span class="status-pill pending">${escapeHtml(p.purpose)}</span></td>
                      <td style="font-size:0.75rem; color:#64748b;">${new Date(p.expires_at).toLocaleTimeString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('change-master-pin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPin = document.getElementById('new-master-pin-input').value.trim();
    if (newPin.length < 4) {
      toast('PIN must be at least 4 digits.', true);
      return;
    }
    try {
      const res = await apiFetch('/api/auth/set-master-pin', {
        method: 'POST',
        body: JSON.stringify({ new_pin: newPin })
      });
      toast(res.message || 'Master PIN updated!');
      showStorePinManagerModal();
    } catch (err) {
      toast(err.message, true);
    }
  });
}


// ==========================================================================
// 10. REAL-TIME SALES ORDERS & INVOICES (MATCHING SCREENSHOT)
// ==========================================================================
let salesHistoryState = {
  invoices: [],
  fromDate: '',
  toDate: '',
  paymentMethod: 'ALL',
  searchQuery: '',
  quickRange: 'ALL'
};

async function renderSalesView(container) {
  const isOwner = (state.user && (state.user.role === 'Owner' || state.user.system_role === 'Owner'));

  // Default dates if empty
  const todayStr = new Date().toISOString().split('T')[0];
  if (!salesHistoryState.fromDate) {
    salesHistoryState.fromDate = todayStr;
    salesHistoryState.toDate = todayStr;
    salesHistoryState.quickRange = 'TODAY';
  }

  container.innerHTML = `
    <div class="view-header">
      <div class="view-header-content">
        <h2>${Icons.sales} Sales History &amp; Invoices</h2>
        <p>Track, review, print receipts/invoices, or delete sales with Store PIN authorization.</p>
      </div>
      <div class="view-header-actions">
        <button id="btn-clear-all-sales" class="btn btn-danger btn-sm" style="border: 1.5px solid #dc2626; background: transparent; color: #dc2626; font-weight: 800; display:inline-flex; align-items:center; gap:0.4rem;">
          ${Icons.trash} Clear All Sales History
        </button>
      </div>
    </div>

    <!-- Filter Card Matching Screenshot -->
    <div class="sales-filter-card">
      <div class="sales-filter-row">
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase;">FROM DATE</label>
          <input type="date" id="sales-from-date" value="${salesHistoryState.fromDate}" style="font-weight:700; font-family:var(--font-mono);" />
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase;">TO DATE</label>
          <input type="date" id="sales-to-date" value="${salesHistoryState.toDate}" style="font-weight:700; font-family:var(--font-mono);" />
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase;">PAYMENT METHOD</label>
          <select id="sales-pay-method" style="font-weight:700;">
            <option value="ALL" ${salesHistoryState.paymentMethod === 'ALL' ? 'selected' : ''}>All payment methods</option>
            <option value="Cash" ${salesHistoryState.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Mpesa" ${salesHistoryState.paymentMethod === 'Mpesa' ? 'selected' : ''}>M-Pesa</option>
            <option value="Credit" ${salesHistoryState.paymentMethod === 'Credit' ? 'selected' : ''}>Credit</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase;">SEARCH INVOICES / ITEMS</label>
          <div style="position:relative;">
            <input type="text" id="sales-search-input" value="${salesHistoryState.searchQuery}" placeholder="Invoice #, customer, item.." style="padding-left:2.2rem; font-weight:600;" />
            <span style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:0.9rem;">🔍</span>
          </div>
        </div>
      </div>

      <!-- Quick Range Row -->
      <div class="quick-range-row" style="margin-top:0.6rem; padding-top:0.6rem; border-top:1px solid #f1f5f9;">
        <span style="font-size:0.8rem; font-weight:700; color:#64748b; margin-right:0.25rem;">Quick Range:</span>
        <button class="quick-range-btn ${salesHistoryState.quickRange === 'TODAY' ? 'active' : ''}" data-range="TODAY">Today</button>
        <button class="quick-range-btn ${salesHistoryState.quickRange === 'YESTERDAY' ? 'active' : ''}" data-range="YESTERDAY">Yesterday</button>
        <button class="quick-range-btn ${salesHistoryState.quickRange === 'WEEK' ? 'active' : ''}" data-range="WEEK">Last 7 Days</button>
        <button class="quick-range-btn ${salesHistoryState.quickRange === 'MONTH' ? 'active' : ''}" data-range="MONTH">This Month</button>
        <button class="quick-range-btn ${salesHistoryState.quickRange === 'ALL' ? 'active' : ''}" data-range="ALL">All Time</button>
      </div>
    </div>

    <!-- 2 KPI Summary Cards -->
    <div class="sales-2kpi-grid">
      <!-- 1. Filtered Sales Volume -->
      <div class="kpi-metric-card" style="border-left: 4px solid #059669;">
        <div class="kpi-metric-label">FILTERED SALES VOLUME</div>
        <div>
          <div class="kpi-metric-val green" id="sales-kpi-volume">KSh 0</div>
          <div class="kpi-currency-prefix" id="sales-kpi-count" style="margin-top:2px;">0 invoice(s) found</div>
        </div>
      </div>

      <!-- 2. Filtered Gross Profit (Owner) -->
      <div class="kpi-metric-card" style="border-left: 4px solid #10b981;">
        <div class="kpi-metric-label">FILTERED GROSS PROFIT (OWNER)</div>
        <div>
          <div class="kpi-metric-val green" id="sales-kpi-profit">KSh 0</div>
          <div class="kpi-currency-prefix" id="sales-kpi-margin" style="margin-top:2px;">Margin on filtered sales: 0.0%</div>
        </div>
      </div>
    </div>

    <!-- Sales Invoices Table -->
    <div class="card-panel">
      <div class="table-responsive" id="sales-table-container">
        <div style="padding:2rem; text-align:center; color:#64748b;">Loading sales history...</div>
      </div>
    </div>
  `;

  // Attach Top Button: Clear All Sales History
  document.getElementById('btn-clear-all-sales').addEventListener('click', () => {
    promptSecurityPin({
      title: '🗑️ Clear All Sales History',
      description: 'Are you sure you want to permanently clear all completed sales orders and invoice records? This action is forensic audited.',
      badgeText: 'Owner PIN Required',
      confirmText: 'Confirm Wipe All Sales',
      onConfirm: async (pin) => {
        const res = await apiFetch('/api/pos/clear-history', {
          method: 'POST',
          body: JSON.stringify({ pin, reason: 'Client store reset' })
        });
        toast(res.message || 'All sales history cleared!');
        renderSalesView(container);
      }
    });
  });

  // Attach Filter Listeners
  const fromDateInput = document.getElementById('sales-from-date');
  const toDateInput = document.getElementById('sales-to-date');
  const paySelect = document.getElementById('sales-pay-method');
  const searchInput = document.getElementById('sales-search-input');

  fromDateInput.addEventListener('change', (e) => {
    salesHistoryState.fromDate = e.target.value;
    salesHistoryState.quickRange = 'CUSTOM';
    updateQuickRangeButtons();
    filterAndRenderSalesTable();
  });

  toDateInput.addEventListener('change', (e) => {
    salesHistoryState.toDate = e.target.value;
    salesHistoryState.quickRange = 'CUSTOM';
    updateQuickRangeButtons();
    filterAndRenderSalesTable();
  });

  paySelect.addEventListener('change', (e) => {
    salesHistoryState.paymentMethod = e.target.value;
    filterAndRenderSalesTable();
  });

  searchInput.addEventListener('input', (e) => {
    salesHistoryState.searchQuery = e.target.value.toLowerCase().trim();
    filterAndRenderSalesTable();
  });

  // Attach Quick Range Clicks
  document.querySelectorAll('.quick-range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      salesHistoryState.quickRange = range;
      const now = new Date();
      const todayISO = now.toISOString().split('T')[0];

      if (range === 'TODAY') {
        salesHistoryState.fromDate = todayISO;
        salesHistoryState.toDate = todayISO;
      } else if (range === 'YESTERDAY') {
        const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        salesHistoryState.fromDate = y;
        salesHistoryState.toDate = y;
      } else if (range === 'WEEK') {
        const w = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        salesHistoryState.fromDate = w;
        salesHistoryState.toDate = todayISO;
      } else if (range === 'MONTH') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        salesHistoryState.fromDate = firstDay;
        salesHistoryState.toDate = todayISO;
      } else if (range === 'ALL') {
        salesHistoryState.fromDate = '';
        salesHistoryState.toDate = '';
      }

      fromDateInput.value = salesHistoryState.fromDate;
      toDateInput.value = salesHistoryState.toDate;
      updateQuickRangeButtons();
      filterAndRenderSalesTable();
    });
  });

  function updateQuickRangeButtons() {
    document.querySelectorAll('.quick-range-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.range === salesHistoryState.quickRange);
    });
  }

  // Load Invoices
  try {
    const invoices = await apiFetch('/api/reports/sales');
    salesHistoryState.invoices = invoices || [];
    filterAndRenderSalesTable();
  } catch (err) {
    document.getElementById('sales-table-container').innerHTML = `<p class="status-pill failed">Failed to load sales: ${err.message}</p>`;
  }
}

function filterAndRenderSalesTable() {
  const isOwner = (state.user && (state.user.role === 'Owner' || state.user.system_role === 'Owner'));
  const allInvoices = salesHistoryState.invoices || [];

  const filtered = allInvoices.filter((inv) => {
    // Date filter
    if (salesHistoryState.fromDate && inv.created_at) {
      const invDate = inv.created_at.split('T')[0].split(' ')[0];
      if (invDate < salesHistoryState.fromDate) return false;
    }
    if (salesHistoryState.toDate && inv.created_at) {
      const invDate = inv.created_at.split('T')[0].split(' ')[0];
      if (invDate > salesHistoryState.toDate) return false;
    }

    // Payment method filter
    if (salesHistoryState.paymentMethod !== 'ALL') {
      if ((inv.payment_method || '').toLowerCase() !== salesHistoryState.paymentMethod.toLowerCase()) {
        return false;
      }
    }

    // Search query
    if (salesHistoryState.searchQuery) {
      const q = salesHistoryState.searchQuery;
      const invNum = (inv.invoice_number || '').toLowerCase();
      const cust = (inv.customer_phone || 'walk-in').toLowerCase();
      const itemsStr = (inv.items || []).map(i => i.description).join(' ').toLowerCase();
      const cashier = (inv.served_by || '').toLowerCase();
      if (!invNum.includes(q) && !cust.includes(q) && !itemsStr.includes(q) && !cashier.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Calculate Filtered KPIs
  let totalVol = 0;
  let totalCost = 0;

  filtered.forEach((inv) => {
    totalVol += Number(inv.total_kes || 0);
    const itemsCost = (inv.items || []).reduce((sum, i) => sum + (Number(i.line_cost_kes || i.unit_cost_kes || (i.unit_price_kes * 0.65)) * Number(i.quantity || 1)), 0);
    totalCost += itemsCost;
  });

  const grossProfit = Math.max(0, totalVol - totalCost);
  const marginPct = totalVol > 0 ? ((grossProfit / totalVol) * 100).toFixed(1) : '0.0';

  const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

  // Update KPI Cards
  const volEl = document.getElementById('sales-kpi-volume');
  const countEl = document.getElementById('sales-kpi-count');
  const profitEl = document.getElementById('sales-kpi-profit');
  const marginEl = document.getElementById('sales-kpi-margin');

  if (volEl) volEl.innerText = `KSh ${fmt(totalVol)}`;
  if (countEl) countEl.innerText = `${filtered.length} invoice(s) found`;
  if (profitEl) profitEl.innerText = `KSh ${fmt(grossProfit)}`;
  if (marginEl) marginEl.innerText = `Margin on filtered sales: ${marginPct}%`;

  // Render Table
  const tableContainer = document.getElementById('sales-table-container');
  if (!tableContainer) return;

  if (!filtered.length) {
    tableContainer.innerHTML = `
      <div style="padding: 3.5rem 1rem; text-align: center; color: #64748b;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧾</div>
        <strong style="font-size: 1.05rem; color: #0f172a;">No sales orders match the selected filters.</strong>
        <p style="font-size: 0.85rem; margin: 4px 0 0;">Try adjusting your date range or clearing the search query.</p>
      </div>
    `;
    return;
  }

  tableContainer.innerHTML = `
    <table class="sales-luxury-table">
      <thead>
        <tr>
          <th style="width:165px;">INVOICE # &amp; TIME</th>
          <th style="width:145px;">CUSTOMER</th>
          <th>ITEMS SOLD SUMMARY</th>
          <th style="width:150px;">TOTAL &amp; PROFIT</th>
          <th style="width:125px;">PAYMENT</th>
          <th style="text-align:right; width:225px;">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((inv) => {
          const invDate = new Date(inv.created_at);
          const dateStr = invDate.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeStr = invDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

          const itemsCount = (inv.items || []).reduce((sum, i) => sum + Number(i.quantity || 1), 0);
          const firstItemName = (inv.items && inv.items[0]) ? inv.items[0].description : 'Sale Item';
          const itemsSummary = inv.items && inv.items.length > 1 
            ? `${inv.items[0].quantity} × ${firstItemName} + ${inv.items.length - 1} other item${inv.items.length - 1 === 1 ? '' : 's'}`
            : `${itemsCount} × ${firstItemName}`;

          const invCost = (inv.items || []).reduce((sum, i) => sum + (Number(i.line_cost_kes || i.unit_cost_kes || (i.unit_price_kes * 0.65)) * Number(i.quantity || 1)), 0);
          const invProfit = Math.max(0, inv.total_kes - invCost);

          const payMethodClass = (inv.payment_method || '').toUpperCase().includes('MPESA') ? 'purple' : (inv.payment_method || '').toUpperCase().includes('CREDIT') ? 'pending' : 'paid';

          return `
            <tr>
              <td>
                <strong style="font-size:0.92rem; color:#0f172a; white-space:nowrap; letter-spacing:0.3px;">
                  ${inv.invoice_number}
                </strong>
                <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                  ${dateStr} · ${timeStr}
                </div>
              </td>
              <td>
                <div style="font-weight:700; color:#0f172a; font-size:0.88rem;">
                  ${escapeHtml(inv.customer_phone || 'Walk-in Client')}
                </div>
                <div style="font-size:0.74rem; color:#64748b;">
                  By: ${escapeHtml(inv.served_by || 'Store Staff')}
                </div>
              </td>
              <td>
                <div style="display:flex; align-items:center; gap:0.45rem;">
                  <span style="font-weight:800; font-size:0.75rem; background:#f1f5f9; color:#334155; padding:2px 7px; border-radius:4px; white-space:nowrap;">
                    ${itemsCount} pc${itemsCount === 1 ? '' : 's'}
                  </span>
                  <span style="font-size:0.88rem; color:#0f172a; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(itemsSummary)}">
                    ${escapeHtml(itemsSummary)}
                  </span>
                </div>
              </td>
              <td>
                <strong style="font-size:0.95rem; color:#15803d; white-space:nowrap;">
                  KSh ${fmt(inv.total_kes)}
                </strong>
                <div style="font-size:0.74rem; color:#047857; font-weight:700; margin-top:1px; white-space:nowrap;">
                  +${fmt(invProfit)} Profit
                </div>
              </td>
              <td>
                <span class="status-pill ${payMethodClass}" style="font-weight:800; font-size:0.72rem; text-transform:uppercase; white-space:nowrap;">
                  ${escapeHtml(inv.payment_method || 'CASH')}
                </span>
              </td>
              <td style="text-align:right;">
                <div style="display:inline-flex; align-items:center; gap:0.3rem; justify-content:flex-end;">
                  <button class="btn btn-secondary btn-sm btn-sale-view" data-invoice='${JSON.stringify(inv).replace(/'/g, "&apos;")}' style="padding:0.26rem 0.55rem; font-size:0.76rem; font-weight:700;">
                    View
                  </button>
                  <button class="btn btn-secondary btn-sm btn-sale-receipt" data-invoice='${JSON.stringify(inv).replace(/'/g, "&apos;")}' style="padding:0.26rem 0.55rem; font-size:0.76rem; font-weight:700;">
                    Receipt
                  </button>
                  <button class="btn btn-secondary btn-sm btn-sale-invoice" data-invoice='${JSON.stringify(inv).replace(/'/g, "&apos;")}' style="padding:0.26rem 0.55rem; font-size:0.76rem; font-weight:700;">
                    Invoice
                  </button>
                  <button class="btn btn-danger btn-sm btn-sale-delete" data-id="${inv.invoice_id}" data-num="${inv.invoice_number}" data-amt="${inv.total_kes}" style="padding:0.26rem 0.45rem; font-size:0.76rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Sale (PIN Required)">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Attach Row Action Handlers
  tableContainer.querySelectorAll('.btn-sale-view').forEach((btn) => {
    btn.addEventListener('click', () => {
      try {
        const inv = JSON.parse(btn.dataset.invoice);
        showSaleDetailModal(inv);
      } catch (e) {
        console.error('Failed to parse invoice data:', e);
      }
    });
  });

  tableContainer.querySelectorAll('.btn-sale-receipt').forEach((btn) => {
    btn.addEventListener('click', () => {
      try {
        const inv = JSON.parse(btn.dataset.invoice);
        showReceiptModal(inv);
      } catch (e) {
        console.error('Failed to parse invoice data for receipt:', e);
      }
    });
  });

  tableContainer.querySelectorAll('.btn-sale-invoice').forEach((btn) => {
    btn.addEventListener('click', () => {
      try {
        const inv = JSON.parse(btn.dataset.invoice);
        showA4InvoiceModal(inv);
      } catch (e) {
        console.error('Failed to parse invoice data for A4 invoice:', e);
      }
    });
  });

  tableContainer.querySelectorAll('.btn-sale-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const num = btn.dataset.num;
      const amt = Number(btn.dataset.amt || 0);

      promptSecurityPin({
        title: `🗑️ Delete Invoice ${num}`,
        description: `Permanently delete sale ${num} (KES ${amt.toLocaleString()})? Sold inventory quantities will be restored and balances reversed.`,
        badgeText: 'PIN Protected',
        confirmText: 'Confirm & Delete Sale',
        onConfirm: async (pin) => {
          const res = await apiFetch(`/api/pos/invoice/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ pin, reason: 'Manual sale deletion' })
          });
          toast(res.message || 'Invoice deleted and stock restored.');
          // Reload invoices
          const invoices = await apiFetch('/api/reports/sales');
          salesHistoryState.invoices = invoices || [];
          filterAndRenderSalesTable();
        }
      });
    });
  });
}


// Sale Detail Modal
function showSaleDetailModal(inv) {
  const modal = document.getElementById('modal-container');
  const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width: 580px;">
        <div class="modal-header-bar">
          <div>
            <h3 style="margin:0; font-size:1.15rem; font-weight:800;">Sale Breakdown: ${inv.invoice_number}</h3>
            <span style="font-size:0.75rem; color:#64748b;">${new Date(inv.created_at).toLocaleString()} · Served by: ${escapeHtml(inv.served_by || 'Staff')}</span>
          </div>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <div style="padding: 1.25rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid #e2e8f0;">
            <div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Customer</div>
              <div style="font-weight:700; color:#0f172a;">${escapeHtml(inv.customer_phone || 'Walk-in Customer')}</div>
            </div>
            <div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Payment Mode</div>
              <span class="status-pill paid">${escapeHtml(inv.payment_method || 'Cash')}</span>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Total Paid</div>
              <div style="font-size:1.25rem; font-weight:800; color:#15803d; font-family:var(--font-mono);">KSh ${fmt(inv.total_kes)}</div>
            </div>
          </div>

          <table class="premium-table" style="font-size:0.84rem; margin-bottom:1.25rem;">
            <thead>
              <tr>
                <th>Item &amp; Formulation</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.items || []).map(i => `
                <tr>
                  <td>
                    <strong>${escapeHtml(i.description)}</strong>
                    ${i.paint_pin ? `<div style="font-size:0.72rem; color:#0284c7;">PIN: ${escapeHtml(i.paint_pin)}</div>` : ''}
                  </td>
                  <td>${i.quantity}</td>
                  <td>KSh ${fmt(i.unit_price_kes)}</td>
                  <td><strong style="font-family:var(--font-mono);">KSh ${fmt(i.quantity * i.unit_price_kes)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
            <button class="btn btn-secondary" onclick="printSaleReceipt(${JSON.stringify(inv).replace(/"/g, '&quot;')})">🖨️ Print Receipt</button>
            <button class="btn btn-primary" onclick="downloadSalesInvoicePdf(${JSON.stringify(inv).replace(/"/g, '&quot;')})">📥 Download PDF</button>
          </div>
        </div>
      </div>
    </div>
  `;
}


// ==========================================================================
// RECEIPT & INVOICE MODALS
// ==========================================================================
function showReceiptModal(inv) {
  if (!inv) return;
  printSaleReceipt(inv);
}

function showA4InvoiceModal(inv) {
  if (!inv) return;
  downloadSalesInvoicePdf(inv);
}

async function showGeneratePinModal() {
  promptSecurityPin({
    title: '🔑 Generate Store Authorization PIN',
    description: 'Enter Master Owner PIN to issue a new single-use or operational authorization PIN.',
    badgeText: 'Owner Protected',
    confirmText: 'Generate PIN',
    onConfirm: async (pin) => {
      const res = await apiFetch('/api/security-pins/generate', {
        method: 'POST',
        body: JSON.stringify({
          action_scope: 'STOCK_RESTOCK',
          pin,
          description: 'Counter Generated PIN',
          expires_hours: 24
        })
      });
      toast(`New PIN Generated: ${res.pin}`);
      showStorePinManagerModal();
    }
  });
}

// Thermal Receipt Print Handler
function printSaleReceipt(inv) {
  const printWin = window.open('', '_blank', 'width=400,height=600');
  const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-US');

  printWin.document.write(`
    <html>
      <head>
        <title>Receipt - ${inv.invoice_number}</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 10px; color: #000; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
          table { width: 100%; font-size: 11px; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; }
          td.r, th.r { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">PAINT & HARDWARE ERP</div>
        <div class="center">Specialist Paint Tinting & Hardware</div>
        <div class="center">Nairobi, Kenya · Tel: 0700 000 000</div>
        <div class="divider"></div>
        <div class="flex"><span>Invoice:</span><span class="bold">${inv.invoice_number}</span></div>
        <div class="flex"><span>Date:</span><span>${new Date(inv.created_at || Date.now()).toLocaleString()}</span></div>
        <div class="flex"><span>Cashier:</span><span>${inv.served_by || 'Staff'}</span></div>
        <div class="flex"><span>Customer:</span><span>${inv.customer_phone || 'Walk-in'}</span></div>
        <div class="flex"><span>Payment:</span><span class="bold">${inv.payment_method}</span></div>
        ${inv.mpesa_receipt_code ? `<div class="flex"><span>M-Pesa Ref:</span><span class="bold" style="font-family:monospace; color:#047857;">${inv.mpesa_receipt_code}</span></div>` : ''}
        <div class="divider"></div>
        <table>
          <thead>
            <tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>
          </thead>
          <tbody>
            ${(inv.items || []).map(i => `
              <tr>
                <td>${i.description}</td>
                <td class="r">${i.quantity}</td>
                <td class="r">${fmt(i.unit_price_kes)}</td>
                <td class="r">${fmt((i.quantity || 1) * (i.unit_price_kes || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="flex bold" style="font-size: 13px;">
          <span>TOTAL PAID:</span>
          <span>KES ${fmt(inv.total_kes || inv.total_amount_kes)}</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 10px;">
          Thank you for your business!<br/>Goods once sold are only returnable in original condition within 48 hours.
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}


// ==========================================================================
// 11. SECURITY AUDIT LOGS (REAL-TIME FILTERING & AUTO-REFRESH)
// ==========================================================================
let auditAutoRefreshTimer = null;
// ==========================================================================
// 11. ENTERPRISE SECURITY AUDIT LOG & FORENSIC TRACEABILITY LEDGER
// ==========================================================================
let auditState = {
  logs: [],
  summary: null,
  activeCategory: 'ALL',
  searchQuery: '',
  selectedOperator: 'ALL',
  selectedDateRange: 'ALL',
  selectedPayMode: 'ALL'
};

async function renderAuditView(container) {
  container.innerHTML = `
    <div class="audit-view-wrap">
      <!-- Title & Subtitle Matching Screenshot -->
      <div style="margin-bottom: 1.2rem;">
        <h2 class="audit-header-title">
          ${Icons.audit} Enterprise Audit Log &amp; Traceability Ledger
        </h2>
        <p class="audit-header-desc">Real-time forensic tracking of every sale item, credit transaction, stock delivery, price adjustment, and security authorization.</p>
      </div>

      <!-- Top Action Buttons Bar -->
      <div class="audit-top-actions">
        <button id="btn-audit-clear-all" class="btn-audit-action clear">
          ${Icons.trash} Clear All Logs
        </button>
        <button id="btn-audit-export-csv" class="btn-audit-action csv">
          📊 Export CSV
        </button>
        <button id="btn-audit-download-pdf" class="btn-audit-action pdf">
          ${Icons.download} Download PDF
        </button>
      </div>

      <!-- 5 Stat Cards in 1 Row -->
      <div class="audit-5stat-grid" id="audit-stat-cards-container">
        <!-- 1. Total Events -->
        <div class="audit-stat-card">
          <div class="audit-stat-label">🔄 TOTAL EVENTS</div>
          <div>
            <div class="audit-stat-val" id="astat-total-events">0</div>
            <div class="audit-stat-sub">Recorded audit trail</div>
          </div>
        </div>

        <!-- 2. Cash Sales Logged -->
        <div class="audit-stat-card">
          <div class="audit-stat-label">🛒 CASH SALES LOGGED</div>
          <div>
            <div class="audit-stat-val green" id="astat-cash-sales">KSh 0</div>
            <div class="audit-stat-sub" id="astat-cash-sub">0 cash/split transactions</div>
          </div>
        </div>

        <!-- 3. Credit Volume Logged -->
        <div class="audit-stat-card">
          <div class="audit-stat-label">💳 CREDIT VOLUME LOGGED</div>
          <div>
            <div class="audit-stat-val purple" id="astat-credit-sales">KSh 0</div>
            <div class="audit-stat-sub" id="astat-credit-sub">0 credit invoices issued</div>
          </div>
        </div>

        <!-- 4. Stock Movements -->
        <div class="audit-stat-card">
          <div class="audit-stat-label">📦 STOCK MOVEMENTS</div>
          <div>
            <div class="audit-stat-val" id="astat-stock-movements">0</div>
            <div class="audit-stat-sub">Deliveries, ADJs &amp; changes</div>
          </div>
        </div>

        <!-- 5. Security & Auth -->
        <div class="audit-stat-card">
          <div class="audit-stat-label">🔐 SECURITY &amp; AUTH</div>
          <div>
            <div class="audit-stat-val" id="astat-security-auth">0</div>
            <div class="audit-stat-sub">Logins, PINs &amp; credentials</div>
          </div>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="audit-category-pills" id="audit-category-pills-bar">
        <button class="audit-cat-pill active" data-cat="ALL">All Events (0)</button>
        <button class="audit-cat-pill" data-cat="CASH_SALE">🛒 Cash Sales (0)</button>
        <button class="audit-cat-pill" data-cat="CREDIT_SALE">💳 Credit Sales (0)</button>
        <button class="audit-cat-pill" data-cat="STOCK">📦 Stock &amp; Receiving (0)</button>
        <button class="audit-cat-pill" data-cat="PAYMENT">💰 Debt &amp; Payments (0)</button>
        <button class="audit-cat-pill" data-cat="PRICE_CHANGE">🏷️ Price Changes (0)</button>
        <button class="audit-cat-pill" data-cat="QUOTE">📋 Quotes (0)</button>
        <button class="audit-cat-pill" data-cat="EXPENSE">💵 Expenses (0)</button>
        <button class="audit-cat-pill" data-cat="SECURITY">🔐 Security (0)</button>
      </div>

      <!-- Search & Dropdown Filter Bar -->
      <div class="audit-filter-bar">
        <div class="audit-search-input-wrap">
          <span class="audit-search-icon">🔍</span>
          <input type="text" id="audit-search-input" class="audit-search-input" placeholder="Search action, product item, invoice #, customer, amount..." />
        </div>

        <select id="audit-operator-filter" class="audit-dropdown-select">
          <option value="ALL">All Operators</option>
        </select>

        <select id="audit-date-filter" class="audit-dropdown-select">
          <option value="ALL">All Dates</option>
          <option value="TODAY">Today</option>
          <option value="WEEK">This Week</option>
          <option value="MONTH">This Month</option>
        </select>

        <select id="audit-paymode-filter" class="audit-dropdown-select">
          <option value="ALL">All Pay Modes</option>
          <option value="Cash">Cash</option>
          <option value="Mpesa">M-Pesa</option>
          <option value="Credit">Credit</option>
        </select>
      </div>

      <!-- Table Sub-Info -->
      <div class="audit-sub-info">
        <span id="audit-showing-count">Showing 0 of 0 events in real-time</span>
        <span>💡 Click any row to inspect complete itemized receipt, cost margins, and raw forensic JSON.</span>
      </div>

      <!-- Forensic Table -->
      <div class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th style="width: 140px;">TIMESTAMP</th>
              <th style="width: 180px;">OPERATOR</th>
              <th style="width: 110px;">TYPE</th>
              <th>ACTION &amp; ITEMIZED PRODUCTS</th>
              <th style="width: 170px;">LEDGER / PAYMENT IMPACT</th>
              <th style="width: 60px; text-align: center;">INSPECT</th>
            </tr>
          </thead>
          <tbody id="audit-table-body">
            <tr>
              <td colspan="6" style="padding: 2.5rem; text-align: center; color: #64748b;">Loading real-time audit ledger...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach search & filter listeners
  document.getElementById('audit-search-input').addEventListener('input', (e) => {
    auditState.searchQuery = e.target.value.toLowerCase().trim();
    filterAndRenderAuditRows();
  });

  document.getElementById('audit-operator-filter').addEventListener('change', (e) => {
    auditState.selectedOperator = e.target.value;
    filterAndRenderAuditRows();
  });

  document.getElementById('audit-date-filter').addEventListener('change', (e) => {
    auditState.selectedDateRange = e.target.value;
    filterAndRenderAuditRows();
  });

  document.getElementById('audit-paymode-filter').addEventListener('change', (e) => {
    auditState.selectedPayMode = e.target.value;
    filterAndRenderAuditRows();
  });

  // Attach Category Filter Pills
  document.getElementById('audit-category-pills-bar').querySelectorAll('.audit-cat-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.audit-cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      auditState.activeCategory = btn.dataset.cat;
      filterAndRenderAuditRows();
    });
  });

  // Attach Action buttons
  document.getElementById('btn-audit-clear-all').addEventListener('click', () => {
    promptSecurityPin({
      title: '🗑️ Clear All Security Audit Logs',
      description: 'Are you sure you want to wipe and reset the entire forensic audit trail? A clean initialization record will be generated.',
      badgeText: 'Master PIN Required',
      confirmText: 'Confirm & Clear Audit Logs',
      onConfirm: async (pin) => {
        const res = await apiFetch('/api/audit/clear-all', {
          method: 'POST',
          body: JSON.stringify({ pin })
        });
        toast(res.message || 'Audit logs wiped and reset.');
        await loadAuditData();
      }
    });
  });

  document.getElementById('btn-audit-export-csv').addEventListener('click', () => {
    exportAuditLogsCsv(auditState.logs);
  });

  document.getElementById('btn-audit-download-pdf').addEventListener('click', () => {
    downloadAuditReportPdf(auditState.logs, auditState.summary);
  });

  await loadAuditData();
}

async function loadAuditData() {
  try {
    const [summary, logs] = await Promise.all([
      apiFetch('/api/audit/summary'),
      apiFetch('/api/audit/log')
    ]);

    auditState.summary = summary;
    auditState.logs = logs;

    // 1. Populate Stat Cards
    const totalEl = document.getElementById('astat-total-events');
    const cashEl = document.getElementById('astat-cash-sales');
    const cashSubEl = document.getElementById('astat-cash-sub');
    const creditEl = document.getElementById('astat-credit-sales');
    const creditSubEl = document.getElementById('astat-credit-sub');
    const stockEl = document.getElementById('astat-stock-movements');
    const secEl = document.getElementById('astat-security-auth');

    if (totalEl) totalEl.innerText = summary.total_events || 0;
    if (cashEl) cashEl.innerText = `KSh ${(summary.cash_sales?.total_kes || 0).toLocaleString()}`;
    if (cashSubEl) cashSubEl.innerText = `${summary.cash_sales?.count || 0} cash/split transactions`;
    if (creditEl) creditEl.innerText = `KSh ${(summary.credit_sales?.total_kes || 0).toLocaleString()}`;
    if (creditSubEl) creditSubEl.innerText = `${summary.credit_sales?.count || 0} credit invoices issued`;
    if (stockEl) stockEl.innerText = summary.stock_movements_count || 0;
    if (secEl) secEl.innerText = summary.security_auth_count || 0;

    // 2. Populate Category Pills with Counts
    const counts = summary.counts || {};
    const pills = document.querySelectorAll('.audit-cat-pill');
    pills.forEach((p) => {
      const cat = p.dataset.cat;
      if (cat === 'ALL') p.innerText = `All Events (${counts.all || 0})`;
      else if (cat === 'CASH_SALE') p.innerText = `🛒 Cash Sales (${counts.cash_sales || 0})`;
      else if (cat === 'CREDIT_SALE') p.innerText = `💳 Credit Sales (${counts.credit_sales || 0})`;
      else if (cat === 'STOCK') p.innerText = `📦 Stock & Receiving (${counts.stock || 0})`;
      else if (cat === 'PAYMENT') p.innerText = `💰 Debt & Payments (${counts.debt_payments || 0})`;
      else if (cat === 'PRICE_CHANGE') p.innerText = `🏷️ Price Changes (${counts.price_changes || 0})`;
      else if (cat === 'QUOTE') p.innerText = `📋 Quotes (${counts.quotes || 0})`;
      else if (cat === 'EXPENSE') p.innerText = `💵 Expenses (${counts.expenses || 0})`;
      else if (cat === 'SECURITY') p.innerText = `🔐 Security (${counts.security || 0})`;
    });

    // 3. Populate Operator Dropdown
    const operators = Array.from(new Set(logs.map(l => l.operator_name).filter(Boolean)));
    const opSelect = document.getElementById('audit-operator-filter');
    if (opSelect) {
      opSelect.innerHTML = '<option value="ALL">All Operators</option>' +
        operators.map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`).join('');
    }

    filterAndRenderAuditRows();
  } catch (err) {
    const tbody = document.getElementById('audit-table-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="padding:2rem; text-align:center; color:#dc2626;">${err.message}</td></tr>`;
  }
}

function filterAndRenderAuditRows() {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;

  const { logs, activeCategory, searchQuery, selectedOperator, selectedDateRange, selectedPayMode } = auditState;
  const now = new Date();

  const filtered = logs.filter((r) => {
    // 1. Category Filter
    if (activeCategory !== 'ALL' && r.category !== activeCategory) {
      return false;
    }

    // 2. Operator Filter
    if (selectedOperator !== 'ALL' && r.operator_name !== selectedOperator) {
      return false;
    }

    // 3. Date Filter
    if (selectedDateRange !== 'ALL') {
      const logDate = new Date(r.timestamp);
      if (selectedDateRange === 'TODAY') {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (selectedDateRange === 'WEEK') {
        const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (selectedDateRange === 'MONTH') {
        if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    // 4. Pay Mode Filter
    if (selectedPayMode !== 'ALL') {
      const details = (r.details || '').toUpperCase();
      if (!details.includes(selectedPayMode.toUpperCase())) return false;
    }

    // 5. Search Query
    if (searchQuery) {
      const searchBlob = `${r.action} ${r.details || ''} ${r.operator_name || ''} ${r.category || ''} ${r.ledger_impact || ''}`.toLowerCase();
      if (!searchBlob.includes(searchQuery)) return false;
    }

    return true;
  });

  // Update Showing Count
  const showingEl = document.getElementById('audit-showing-count');
  if (showingEl) {
    showingEl.innerText = `Showing ${filtered.length} of ${logs.length} events in real-time`;
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 3rem; text-align: center; color: #64748b;">
          No audit events found matching your search and filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((r) => {
    const initials = (r.operator_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const formattedDate = new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 16);

    return `
      <tr data-log-id="${r.log_id}" class="audit-log-row">
        <td style="font-family: var(--font-mono); font-size: 0.82rem; color: #475569;">
          ${formattedDate}
        </td>
        <td>
          <div class="operator-cell">
            <div class="operator-avatar">${initials}</div>
            <div>
              <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">${escapeHtml(r.operator_name)}</div>
              <div style="font-size: 0.74rem; color: #64748b; text-transform: capitalize;">${escapeHtml(r.operator_role)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="audit-badge ${r.category}">${r.category}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${escapeHtml(r.action)}</div>
          <div style="font-size: 0.82rem; color: #475569;">${escapeHtml(r.details || 'No additional details logged.')}</div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.88rem; ${r.ledger_impact.startsWith('+') ? 'color:#16a34a;' : r.ledger_impact.startsWith('-') ? 'color:#dc2626;' : 'color:#64748b;'}">
            ${escapeHtml(r.ledger_impact)}
          </span>
        </td>
        <td style="text-align: center;">
          <div style="display:inline-flex; align-items:center; gap:0.3rem;">
            <button class="btn btn-secondary btn-sm btn-inspect-log" data-log-id="${r.log_id}" style="padding: 0.25rem 0.45rem; font-size: 0.75rem;" title="Inspect Raw Forensic JSON">
              👁️
            </button>
            <button class="btn btn-danger btn-sm btn-delete-audit-log" data-log-id="${r.log_id}" style="padding: 0.25rem 0.45rem; font-size: 0.75rem; background:#fee2e2; color:#dc2626; border:1px solid #fecaca;" title="Delete Single Log Entry (PIN Required)">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Row click & inspect handler
  tbody.querySelectorAll('.audit-log-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const logId = Number(row.dataset.logId);
      const log = auditState.logs.find(l => l.log_id === logId);
      if (log) showAuditDetailModal(log);
    });
  });

  tbody.querySelectorAll('.btn-inspect-log').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const logId = Number(btn.dataset.logId);
      const log = auditState.logs.find(l => l.log_id === logId);
      if (log) showAuditDetailModal(log);
    });
  });

  tbody.querySelectorAll('.btn-delete-audit-log').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const logId = Number(btn.dataset.logId);
      promptSecurityPin({
        title: `🗑️ Delete Audit Log #${logId}`,
        description: `Permanently delete audit record #${logId} from forensic ledger? This deletion requires PIN authorization.`,
        badgeText: 'PIN Protected Deletion',
        confirmText: 'Confirm & Delete Log',
        onConfirm: async (pin) => {
          const res = await apiFetch(`/api/audit/entry/${logId}`, {
            method: 'DELETE',
            body: JSON.stringify({ pin })
          });
          toast(res.message || 'Audit log entry deleted.');
          await loadAuditData();
        }
      });
    });
  });
}

function showAuditDetailModal(log) {
  const formattedJson = JSON.stringify(log, null, 2);

  showModal(`
    <div style="padding: 0.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; border-bottom:1.5px solid #e2e8f0; padding-bottom:0.8rem;">
        <div>
          <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:0.5rem;">
            🛡️ Forensic Audit Event #${log.log_id}
          </h3>
          <span style="font-size:0.82rem; color:#64748b;">${new Date(log.timestamp).toLocaleString()}</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="audit-badge ${log.category}">${log.category}</span>
          <span class="status-pill ${log.status === 'ALLOWED' ? 'paid' : 'failed'}" style="font-size:0.75rem;">
            ${log.status === 'ALLOWED' ? '✅ ALLOWED' : '⛔ DENIED'}
          </span>
        </div>
      </div>

      <!-- Overview Cards -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; margin-bottom:1.2rem;">
        <div style="background:#f8fafc; padding:0.9rem; border-radius:8px; border:1px solid #e2e8f0;">
          <div style="font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:2px;">Operator / Actor</div>
          <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">${escapeHtml(log.operator_name)}</div>
          <div style="font-size:0.78rem; color:#64748b; text-transform:capitalize;">Role: ${escapeHtml(log.operator_role)}</div>
        </div>
        <div style="background:#f8fafc; padding:0.9rem; border-radius:8px; border:1px solid #e2e8f0;">
          <div style="font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:2px;">Ledger Impact &amp; Terminal</div>
          <div style="font-family:var(--font-mono); font-weight:800; font-size:1rem; ${log.ledger_impact.startsWith('+') ? 'color:#16a34a;' : log.ledger_impact.startsWith('-') ? 'color:#dc2626;' : 'color:#475569;'}">
            ${escapeHtml(log.ledger_impact)}
          </div>
          <div style="font-size:0.78rem; color:#64748b;">Device: ${escapeHtml(log.device_fingerprint || 'terminal')}</div>
        </div>
      </div>

      <!-- Action & Details -->
      <div style="margin-bottom:1.2rem;">
        <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:0.35rem;">Event Action &amp; Description</div>
        <div style="background:#f8fafc; padding:0.9rem 1rem; border-radius:8px; border:1px solid #e2e8f0; font-size:0.92rem; color:#1e293b; line-height:1.45;">
          <div style="font-weight:800; color:#0f172a; margin-bottom:4px;">${escapeHtml(log.action)}</div>
          <div>${escapeHtml(log.details || 'No additional parameters logged.')}</div>
        </div>
      </div>

      <!-- Raw JSON Forensic Metadata -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase;">Raw Forensic JSON Metadata</div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-audit-json" style="padding:0.25rem 0.65rem; font-size:0.75rem;">
            📋 Copy JSON
          </button>
        </div>
        <pre style="background:#090d16; color:#f8fafc; padding:1rem; border-radius:8px; font-family:var(--font-mono); font-size:0.78rem; max-height:220px; overflow-y:auto; line-height:1.4;">${escapeHtml(formattedJson)}</pre>
      </div>

      <div style="margin-top:1.4rem; display:flex; justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close Inspection</button>
      </div>
    </div>
  `);

  const copyBtn = document.getElementById('btn-copy-audit-json');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyJsonToClipboard(formattedJson, copyBtn);
    });
  }
}

function exportAuditLogsCsv(logs) {
  if (!logs || !logs.length) {
    toast('No audit logs to export.', true);
    return;
  }

  const headers = ['Log ID', 'Timestamp', 'Operator', 'Role', 'Category', 'Action', 'Details', 'Ledger Impact', 'Status', 'Device Fingerprint'];
  const rows = logs.map(l => [
    l.log_id,
    `"${l.timestamp}"`,
    `"${(l.operator_name || '').replace(/"/g, '""')}"`,
    `"${(l.operator_role || '').replace(/"/g, '""')}"`,
    `"${(l.category || '').replace(/"/g, '""')}"`,
    `"${(l.action || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`,
    `"${(l.ledger_impact || '').replace(/"/g, '""')}"`,
    `"${l.status}"`,
    `"${(l.device_fingerprint || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Security_Audit_Logs_${new Date().toISOString().substring(0, 10)}.csv`;
  link.click();
  toast('Audit logs downloaded as CSV!');
}

function downloadAuditReportPdf(logs, summary) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Branded Header
      doc.setFillColor(9, 13, 22);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SECURITY AUDIT LOGS & TRACEABILITY LEDGER', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Forensic Activity & Security Traceability Report', 14, 26);
      doc.text(new Date().toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' }), 160, 26);

      const tableData = logs.slice(0, 50).map(l => [
        new Date(l.timestamp).toISOString().replace('T', ' ').substring(0, 16),
        l.operator_name || 'System',
        l.category,
        (l.action + ' - ' + (l.details || '')).substring(0, 45),
        l.status
      ]);

      doc.autoTable({
        startY: 44,
        head: [['Timestamp', 'Operator', 'Type', 'Action & Details', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [9, 13, 22], textColor: [245, 158, 11], fontStyle: 'bold' },
        styles: { font: 'helvetica', fontSize: 8 }
      });

      doc.save(`Audit_Report_${new Date().toISOString().substring(0, 10)}.pdf`);
      toast('Security Audit report downloaded as PDF!');
      return;
    } catch (e) {
      console.error('jsPDF generation failed:', e);
    }
  }

  window.print();
}

// ==========================================================================
// 12. CLIENT-SIDE PDF GENERATION & DOWNLOAD ENGINE
// ==========================================================================
function downloadSalesInvoicePdf(inv) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Store Branded Header
      doc.setFillColor(9, 13, 22);
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(245, 158, 11);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PAINT & HARDWARE ERP', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Sales Receipt & Tax Invoice | Nairobi, Kenya', 14, 26);

      doc.setTextColor(245, 158, 11);
      doc.setFontSize(14);
      doc.text(inv.invoice_number, 150, 18);

      doc.setTextColor(200, 200, 200);
      doc.setFontSize(9);
      doc.text(new Date(inv.created_at).toLocaleDateString('en-KE'), 150, 26);

      // Metadata Box
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Phone:', 14, 48);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.customer_phone || 'Walk-in Retail Customer', 52, 48);

      doc.setFont('helvetica', 'bold');
      doc.text('Cashier / Served By:', 14, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.served_by || 'Counter Staff', 52, 55);

      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method:', 120, 48);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.payment_method + ' (' + inv.status + ')', 155, 48);

      // Itemized Table using jsPDF-AutoTable
      const tableData = (inv.items || []).map(i => [
        i.description + (i.paint_pin ? ' [' + i.paint_pin + ']' : ''),
        String(i.quantity),
        'KES ' + Number(i.unit_price_kes).toLocaleString(),
        'KES ' + (Number(i.quantity) * Number(i.unit_price_kes)).toLocaleString()
      ]);

      doc.autoTable({
        startY: 62,
        head: [['Item Description', 'Qty', 'Unit Price', 'Line Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [9, 13, 22], textColor: [245, 158, 11], fontStyle: 'bold' },
        styles: { font: 'helvetica', fontSize: 9 }
      });

      const finalY = doc.lastAutoTable.finalY + 12;

      // Total Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(120, finalY, 76, 22, 3, 3, 'FD');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL AMOUNT:', 125, finalY + 9);
      doc.setFontSize(14);
      doc.setTextColor(4, 120, 87);
      doc.text('KES ' + Number(inv.total_kes).toLocaleString(), 125, finalY + 17);

      // Thank You Note
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for shopping at Paint & Hardware ERP! Goods once sold in good condition are not returnable.', 14, finalY + 36);

      doc.save(`${inv.invoice_number}_Receipt.pdf`);
      toast(`Invoice ${inv.invoice_number} downloaded as PDF!`);
      return;
    } catch (e) {
      console.error('jsPDF generation failed, using print fallback:', e);
    }
  }

  // Fallback printable view
  window.print();
}

function downloadExecutiveReportPdf(data) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFillColor(9, 13, 22);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PAINT & HARDWARE ERP — EXECUTIVE REPORT', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Complete Store Sales, Profit & Loss, Inventory & Expense Summary', 14, 26);

      doc.text(new Date().toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' }), 160, 26);

      const { sales, profits, stock, credit } = data;

      const summaryRows = [
        ['Total Sales Revenue', 'KES ' + sales.total_revenue_kes.toLocaleString()],
        ['Paid Counter Invoices', String(sales.paid_orders_count) + ' Orders'],
        ['Cost of Goods Sold (COGS)', 'KES ' + profits.total_cogs_kes.toLocaleString()],
        ['Gross Profit', 'KES ' + profits.gross_profit_kes.toLocaleString() + ' (' + profits.gross_margin_pct + '%)'],
        ['Operating Expenses (OPEX)', 'KES ' + profits.total_opex_kes.toLocaleString()],
        ['True Net Profit', 'KES ' + profits.net_profit_kes.toLocaleString() + ' (' + profits.net_margin_pct + '%)'],
        ['Current Stock Worth (Wholesale Cost)', 'KES ' + stock.total_stock_cost_worth_kes.toLocaleString()],
        ['Expected Retail Selling Worth', 'KES ' + stock.total_stock_retail_worth_kes.toLocaleString()],
        ['Total Customer Credit Debt Owed to Store', 'KES ' + credit.total_outstanding_debt_kes.toLocaleString()]
      ];

      doc.autoTable({
        startY: 44,
        head: [['Financial & Business Metric', 'Value']],
        body: summaryRows,
        theme: 'striped',
        headStyles: { fillColor: [9, 13, 22], textColor: [245, 158, 11] }
      });

      doc.save('Paint_Hardware_Executive_Report.pdf');
      toast('Executive Business Report PDF downloaded!');
      return;
    } catch (e) {}
  }
  window.print();
}

function downloadSalesReportPdf(sales) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Sales Performance Report', 14, 20);
      doc.setFontSize(10);
      doc.text('Total Revenue: KES ' + sales.total_revenue_kes.toLocaleString(), 14, 30);
      doc.text('Total Orders: ' + sales.paid_orders_count, 14, 37);

      const rows = sales.payment_methods.map(pm => [pm.payment_method, String(pm.count), 'KES ' + pm.total_kes.toLocaleString()]);
      doc.autoTable({
        startY: 46,
        head: [['Payment Method', 'Orders Count', 'Total Amount']],
        body: rows
      });
      doc.save('Sales_Report.pdf');
      toast('Sales Report PDF downloaded!');
      return;
    } catch (e) {}
  }
  window.print();
}

function downloadProfitReportPdf(profits) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Profit & Loss Summary Report', 14, 20);

      const rows = [
        ['Sales Revenue', 'KES ' + profits.total_revenue_kes.toLocaleString()],
        ['Cost of Goods Sold (Stock)', 'KES ' + profits.total_cogs_kes.toLocaleString()],
        ['Gross Profit', 'KES ' + profits.gross_profit_kes.toLocaleString() + ' (' + profits.gross_margin_pct + '%)'],
        ['Shop Overheads (Expenses)', 'KES ' + profits.total_opex_kes.toLocaleString()],
        ['True Net Profit', 'KES ' + profits.net_profit_kes.toLocaleString() + ' (' + profits.net_margin_pct + '%)']
      ];

      doc.autoTable({
        startY: 30,
        head: [['Line Item', 'Amount (KES)']],
        body: rows
      });
      doc.save('Profit_Loss_Report.pdf');
      toast('Profit & Loss Report PDF downloaded!');
      return;
    } catch (e) {}
  }
  window.print();
}

function downloadStockReportPdf(stock) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Inventory Stock Valuation Report', 14, 20);

      const rows = [
        ['Total Stock Purchase Worth (Cost)', 'KES ' + stock.total_stock_cost_worth_kes.toLocaleString()],
        ['Expected Retail Selling Worth', 'KES ' + stock.total_stock_retail_worth_kes.toLocaleString()],
        ['Potential Gross Profit from Stock', 'KES ' + stock.stock_potential_profit_kes.toLocaleString()]
      ];

      doc.autoTable({
        startY: 30,
        head: [['Stock Valuation Category', 'Value (KES)']],
        body: rows
      });
      doc.save('Inventory_Valuation_Report.pdf');
      toast('Inventory Valuation Report PDF downloaded!');
      return;
    } catch (e) {}
  }
  window.print();
}

function downloadExpensesReportPdf(categories) {
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Operating Expenses Breakdown Report', 14, 20);

      const rows = (categories || []).map(c => [c.category, String(c.count), 'KES ' + c.total_kes.toLocaleString()]);
      doc.autoTable({
        startY: 30,
        head: [['Expense Category', 'Transactions Count', 'Total Spent (KES)']],
        body: rows
      });
      doc.save('Expenses_Report.pdf');
      toast('Expenses Report PDF downloaded!');
      return;
    } catch (e) {}
  }
  window.print();
}


// ---------------- Boot Initialization ----------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

if (state.token) {
  state.user = getStoredUser();
  if (state.user) {
    apiFetch('/api/auth/profile').then(user => {
      if (user) {
        saveUser(user);
        renderApp();
      }
    }).catch(err => {
      if (err && err.status === 401) {
        setToken(null);
        saveUser(null);
        renderApp();
      }
    });
  } else {
    setToken(null);
  }
}
renderApp();

if (window.offlineDb && window.offlineDb.syncPendingInvoices) {
  window.offlineDb.syncPendingInvoices(apiFetch).catch(() => {});
}

// ==========================================================================
// USER PROFILE & OWNER SECURITY PIN PASSWORD MANAGEMENT
// ==========================================================================
async function showUserProfileModal() {
  const modal = document.getElementById('modal-container');
  const isOwner = state.user && (state.user.role === 'Owner' || state.user.system_role === 'Owner');

  let staffUsers = [];
  let recentPins = [];
  if (isOwner) {
    try {
      const [uData, pData] = await Promise.all([
        apiFetch('/api/auth/users'),
        apiFetch('/api/auth/pins')
      ]);
      staffUsers = uData;
      recentPins = pData;
    } catch (e) {}
  }

  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:760px;">
        <div class="modal-header-bar">
          <h3>👤 User Profile &amp; Security Credentials</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <!-- User Identity Header -->
        <div style="display:flex; align-items:center; gap:1.2rem; background:#f8fafc; border:1px solid var(--border-light); border-radius:var(--radius-lg); padding:1.4rem; margin-bottom:1.6rem;">
          <div class="user-avatar" style="width:56px; height:56px; font-size:1.3rem;">
            ${(state.user.full_name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div style="flex:1;">
            <div style="font-size:1.25rem; font-weight:800; color:var(--text-primary);">${state.user.full_name}</div>
            <div style="font-size:0.88rem; color:var(--text-muted); margin-top:2px;">
              📞 Phone: <strong>${state.user.phone_number}</strong> · Status: <span class="status-pill success">Active Account</span>
            </div>
            <div style="margin-top:6px; display:flex; align-items:center; gap:0.6rem;">
              <span class="user-role-badge" style="font-size:0.75rem; background:#0f172a; color:var(--brand-gold); padding:2px 8px; border-radius:4px;">
                ${isOwner ? '👑 STORE OWNER & ADMINISTRATOR' : '⚡ STORE ATTENDANT'}
              </span>
              ${isOwner ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="showStorePinManagerModal()" style="font-size:0.75rem; font-weight:700; padding:2px 8px;">
                  🔑 Manage Store PINs
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Tabs / Sections -->
        <div style="display:grid; grid-template-columns: 1fr; gap:1.6rem;">
          
          <!-- Change Password Form -->
          <div class="card-panel" style="margin-bottom:0;">
            <div class="card-panel-header">
              <h3>🔐 Change Password (Requires Owner Security PIN)</h3>
            </div>

            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:var(--radius-md); padding:0.9rem 1.1rem; margin-bottom:1.2rem; font-size:0.85rem; color:#92400e;">
              ℹ️ To change your account password, enter a <strong>6-digit Owner Security Authorization PIN</strong>.
              ${!isOwner ? 'Please ask the <strong>Store Owner</strong> to generate an authorization PIN for you.' : 'As the Store Owner, you can generate your authorization PIN below.'}
            </div>

            <form id="change-password-form">
              <div class="form-row">
                <div class="form-group">
                  <label>New Password (min 6 characters)</label>
                  <div class="input-with-icon">
                    <span class="input-icon">${Icons.lock}</span>
                    <input type="password" id="cp-new-pass" placeholder="••••••••" required minlength="6" />
                    <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('cp-new-pass', this)" title="Show/Hide Password">👁️</button>
                  </div>
                </div>
                <div class="form-group">
                  <label>Confirm New Password</label>
                  <div class="input-with-icon">
                    <span class="input-icon">${Icons.lock}</span>
                    <input type="password" id="cp-confirm-pass" placeholder="••••••••" required minlength="6" />
                    <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('cp-confirm-pass', this)" title="Show/Hide Password">👁️</button>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>6-Digit Owner Security Authorization PIN</label>
                <div class="input-with-icon">
                  <span class="input-icon">${Icons.key}</span>
                  <input type="text" id="cp-security-pin" placeholder="e.g. 849201" maxlength="6" required style="font-family:var(--font-mono); font-size:1.1rem; font-weight:800; letter-spacing:3px;" />
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
                <button type="submit" class="btn btn-primary">
                  🔐 Update Password
                </button>
              </div>
            </form>
          </div>

          <!-- Owner PIN Generator Panel (Visible ONLY to Owner) -->
          ${isOwner ? `
            <div class="card-panel" style="margin-bottom:0; background:#fbfcfe; border-color:#e0e7ff;">
              <div class="card-panel-header">
                <h3>👑 Owner Security PIN Generator</h3>
                <span class="sub-badge">Owner Authorization Engine</span>
              </div>

              <p style="font-size:0.86rem; color:var(--text-muted); margin-bottom:1.2rem;">
                Generate single-use 6-digit authorization PINs for yourself or staff members to authorize password updates.
              </p>

              <form id="generate-pin-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Select Target Staff Account</label>
                    <select id="pin-target-user" required>
                      ${staffUsers.map((u) => `
                        <option value="${u.user_id}">
                          ${u.full_name} (${u.system_role}) - ${u.phone_number}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Authorization Purpose</label>
                    <input type="text" id="pin-purpose" value="Password Reset &amp; Credentials Update" required />
                  </div>
                </div>

                <div style="display:flex; justify-content:flex-end;">
                  <button type="submit" class="btn btn-secondary btn-sm" style="background:#4338ca; color:white; border-color:#4338ca;">
                    ⚡ Generate 6-Digit Authorization PIN
                  </button>
                </div>
              </form>

              <!-- Dynamic Generated PIN Output Box -->
              <div id="generated-pin-output"></div>

              <!-- Recent PINs Log -->
              <div style="margin-top:1.4rem; border-top:1px solid var(--border-light); padding-top:1rem;">
                <h4 style="font-size:0.88rem; font-weight:800; color:var(--text-primary); margin-bottom:0.8rem;">
                  Recent Security PIN Authorization Ledger
                </h4>
                <div class="table-responsive">
                  <table class="premium-table">
                    <thead>
                      <tr>
                        <th>PIN Code</th>
                        <th>Target User</th>
                        <th>Status</th>
                        <th>Expires At</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${recentPins.length ? recentPins.slice(0, 5).map((p) => `
                        <tr>
                          <td><strong style="font-family:var(--font-mono); letter-spacing:2px;">${p.pin_code}</strong></td>
                          <td>${p.target_user_name} (${p.target_user_role})</td>
                          <td>
                            <span class="status-pill ${p.is_used ? 'failed' : 'success'}">
                              ${p.is_used ? 'Used / Succeeded' : 'Active (Valid)'}
                            </span>
                          </td>
                          <td style="font-size:0.8rem; color:var(--text-muted);">
                            ${new Date(p.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(p.expires_at).toLocaleDateString()})
                          </td>
                        </tr>
                      `).join('') : '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No recent PINs generated yet.</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;

  // Handle Change Password Form Submission
  document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('cp-new-pass').value;
    const confirmPass = document.getElementById('cp-confirm-pass').value;
    const pin = document.getElementById('cp-security-pin').value.trim();

    if (newPass !== confirmPass) {
      alert('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ new_password: newPass, security_pin: pin })
      });
      alert('✅ ' + res.message);
      document.getElementById('modal-container').innerHTML = '';
    } catch (err) {
      alert('❌ ' + err.message);
    }
  });

  // Handle Owner Generate PIN Form
  if (isOwner) {
    document.getElementById('generate-pin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetUserId = Number(document.getElementById('pin-target-user').value);
      const purpose = document.getElementById('pin-purpose').value.trim();

      try {
        const res = await apiFetch('/api/auth/generate-pin', {
          method: 'POST',
          body: JSON.stringify({ target_user_id: targetUserId, purpose })
        });

        document.getElementById('generated-pin-output').innerHTML = `
          <div class="security-pin-display-box">
            <div style="font-size:0.85rem; font-weight:800; text-transform:uppercase; color:#92400e;">
              🔑 6-Digit Owner Security Authorization PIN Generated
            </div>
            <div class="security-pin-code-large">${res.pin_code}</div>
            <div style="font-size:0.85rem; color:#78350f;">
              Authorized for: <strong>${res.target_user.full_name} (${res.target_user.system_role})</strong><br/>
              Valid until: <strong>${new Date(res.expires_at).toLocaleString()}</strong> (Single Use Only)
            </div>
          </div>
        `;

        toast(`Security PIN ${res.pin_code} generated for ${res.target_user.full_name}`);
      } catch (err) {
        toast(err.message, true);
      }
    });
  }
}


// ==========================================================================
// BULK IMPORT & 1,000+ KENYA MASTER FANDECK SYNC ENGINE
// ==========================================================================
let activeImportTab = 'fandecks'; // 'fandecks' | 'colors' | 'products'
let parsedColorRows = [];
let parsedProductRows = [];

async function showBulkImportModal(defaultTab = 'fandecks') {
  activeImportTab = defaultTab;
  const modal = document.getElementById('modal-container');

  let colorCount = 0;
  let productCount = 0;
  try {
    const [cData, pData] = await Promise.all([
      apiFetch('/api/colors/count'),
      apiFetch('/api/stock/products')
    ]);
    colorCount = cData.total || 0;
    productCount = pData.length || 0;
  } catch (e) {}

  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-container-card" style="max-width:860px;">
        <div class="modal-header-bar">
          <h3>📥 Bulk Catalog Importer &amp; Official Kenyan Fandecks</h3>
          <button class="btn-close-modal" onclick="document.getElementById('modal-container').innerHTML=''">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="bulk-import-tabs-nav">
          <button class="bulk-tab-btn ${activeImportTab === 'fandecks' ? 'active' : ''}" data-tab="fandecks">
            ⚡ 1-Click Master Fandecks (1,000+ Shades)
          </button>
          <button class="bulk-tab-btn ${activeImportTab === 'colors' ? 'active' : ''}" data-tab="colors">
            🎨 Import Colors (Excel / CSV)
          </button>
          <button class="bulk-tab-btn ${activeImportTab === 'products' ? 'active' : ''}" data-tab="products">
            🛠️ Import Hardware Products (Excel / CSV)
          </button>
        </div>

        <!-- Dynamic Tab Content -->
        <div id="bulk-import-tab-body">
          ${renderImportTabBody(colorCount, productCount)}
        </div>
      </div>
    </div>
  `;

  // Attach Tab Switcher Events
  document.querySelectorAll('.bulk-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeImportTab = btn.dataset.tab;
      document.querySelectorAll('.bulk-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('bulk-import-tab-body').innerHTML = renderImportTabBody(colorCount, productCount);
      initImportTabEvents();
    });
  });

  initImportTabEvents();
}

function renderImportTabBody(colorCount, productCount) {
  if (activeImportTab === 'fandecks') {
    return `
      <!-- Tab 1: 1-Click Official Kenyan Master Fandecks -->
      <div class="fandeck-banner-card">
        <div>
          <span style="font-size:0.78rem; font-weight:800; text-transform:uppercase; color:var(--brand-gold); letter-spacing:0.6px;">
            Official Kenyan Digital Fandecks
          </span>
          <h3 style="font-size:1.35rem; font-weight:900; margin:0.2rem 0; color:white;">
            Kenyan Paint Hardware Master Catalog
          </h3>
          <p style="font-size:0.88rem; color:#cbd5e1; max-width:560px; line-height:1.5;">
            In Kenya, paint stores and tinting centers synchronize digital fandeck libraries from Crown Paints, Basco Duracoat, Kansai Plascon, and Sadolin to populate over 1,000+ factory-tested tinting recipes and swatches instantly.
          </p>
        </div>
        <div style="text-align:right; background:rgba(255,255,255,0.06); padding:1rem 1.4rem; border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:2rem; font-weight:900; font-family:var(--font-mono); color:var(--brand-gold);" id="catalog-count-display">${colorCount}</div>
          <div style="font-size:0.75rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Active Shades in System</div>
        </div>
      </div>

      <div class="fandeck-sync-grid">
        <div class="fandeck-brand-card">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">Crown Paints Ambiance</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Rift Valley, Savannah, Verona &amp; Classic Whites</p>
          </div>
          <span class="brand-pill" style="background:#fef3c7; color:#92400e;">400+ Shades</span>
        </div>

        <div class="fandeck-brand-card">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">Basco Duracoat Library</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Covermatt, Superwash, Real Gloss &amp; Weatherguard</p>
          </div>
          <span class="brand-pill" style="background:#e0e7ff; color:#4338ca;">350+ Shades</span>
        </div>

        <div class="fandeck-brand-card">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">Kansai Plascon Inspired</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Micatex, Wall &amp; All, Velvaglo &amp; Cashmere</p>
          </div>
          <span class="brand-pill" style="background:#d1fae5; color:#065f46;">300+ Shades</span>
        </div>

        <div class="fandeck-brand-card">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">Hardware Accessories Pack</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Brushes, Rollers, Thinners, Fillers &amp; Sandpapers</p>
          </div>
          <span class="brand-pill" style="background:#ffedd5; color:#9a3412;">50+ Products</span>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:0.8rem; margin-top:1.5rem;">
        <button type="button" id="btn-sync-hardware-catalog" class="btn btn-secondary">
          🛠️ Sync Hardware Accessories (50+)
        </button>
        <button type="button" id="btn-sync-1000-colors" class="btn btn-primary btn-lg">
          ⚡ 1-Click Sync Master Fandecks (1,000+ Shades)
        </button>
      </div>

      <div id="sync-result-box" style="margin-top:1.2rem;"></div>
    `;
  } else if (activeImportTab === 'colors') {
    return `
      <!-- Tab 2: Custom Colors Excel / CSV Importer -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">Import Custom Paint Color Catalog (Excel / CSV)</h4>
          <p style="font-size:0.84rem; color:var(--text-muted);">Upload your distributor's spreadsheet or paste table data directly below.</p>
        </div>
        <a href="/api/colors/template/csv" download="kenyan_paint_colors_template.csv" class="btn btn-secondary btn-sm">
          📥 Download Sample CSV Template
        </a>
      </div>

      <div class="excel-dropzone" id="color-dropzone">
        <div class="dropzone-icon">📄</div>
        <h4 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:0.3rem;">
          Drag and drop your .csv spreadsheet here, or <span style="color:var(--brand-gold-dark); text-decoration:underline;">Browse File</span>
        </h4>
        <p style="font-size:0.82rem; color:var(--text-muted);">
          Supported columns: <strong>Manufacturer, Color Code, Color Name, Required Base, Pigment Formula, Hex Code</strong>
        </p>
        <input type="file" id="color-file-input" accept=".csv,.txt" style="display:none;" />
      </div>

      <div class="form-group">
        <label>Or Paste CSV / Excel Data Directly</label>
        <textarea id="color-paste-textarea" rows="4" placeholder="manufacturer,color_code,color_name,required_base,pigment_formula,hex_code&#10;Crown,CRN-501,Safari Sunset,Pastel,BK:0.10;YO:1.40,#E2A03F" style="font-family:var(--font-mono); font-size:0.85rem;"></textarea>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button type="button" id="btn-parse-color-data" class="btn btn-secondary btn-sm">
          🔍 Preview &amp; Validate Data
        </button>
        <button type="button" id="btn-submit-color-import" class="btn btn-primary" style="display:none;">
          🚀 Commit &amp; Import Colors (<span id="parsed-color-count">0</span>)
        </button>
      </div>

      <div id="color-preview-container"></div>
    `;
  } else {
    return `
      <!-- Tab 3: Hardware Accessories Excel / CSV Importer -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0;">Import Hardware Products &amp; Accessories</h4>
          <p style="font-size:0.84rem; color:var(--text-muted);">Bulk import rollers, brushes, solvents, sandpaper, fillers, and primers.</p>
        </div>
        <a href="/api/stock/template-products/csv" download="hardware_inventory_template.csv" class="btn btn-secondary btn-sm">
          📥 Download Products Template CSV
        </a>
      </div>

      <div class="excel-dropzone" id="product-dropzone">
        <div class="dropzone-icon">🛠️</div>
        <h4 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:0.3rem;">
          Drag and drop hardware product .csv spreadsheet here, or <span style="color:var(--brand-gold-dark); text-decoration:underline;">Browse File</span>
        </h4>
        <p style="font-size:0.82rem; color:var(--text-muted);">
          Columns: <strong>product_name, sku, unit_cost_kes, unit_price_kes, quantity_in_stock, low_stock_threshold</strong>
        </p>
        <input type="file" id="product-file-input" accept=".csv,.txt" style="display:none;" />
      </div>

      <div class="form-group">
        <label>Or Paste Products CSV Text</label>
        <textarea id="product-paste-textarea" rows="4" placeholder="product_name,sku,unit_cost_kes,unit_price_kes,quantity_in_stock,low_stock_threshold&#10;Harris Classic Brush 3-inch,BRUSH-3IN,190,350,90,25" style="font-family:var(--font-mono); font-size:0.85rem;"></textarea>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button type="button" id="btn-parse-product-data" class="btn btn-secondary btn-sm">
          🔍 Preview &amp; Validate Products
        </button>
        <button type="button" id="btn-submit-product-import" class="btn btn-primary" style="display:none;">
          🚀 Commit &amp; Import Products (<span id="parsed-product-count">0</span>)
        </button>
      </div>

      <div id="product-preview-container"></div>
    `;
  }
}

function initImportTabEvents() {
  // 1-Click Sync Master Fandecks
  const syncBtn = document.getElementById('btn-sync-1000-colors');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      syncBtn.innerText = '⏳ Synchronizing 1,000+ Master Fandeck Shades...';

      try {
        const res = await apiFetch('/api/colors/seed-kenyan-fandecks', { method: 'POST' });
        document.getElementById('sync-result-box').innerHTML = `
          <div class="card-panel" style="background:#ecfdf5; border-color:#a7f3d0; padding:1.2rem; text-align:center;">
            <h4 style="font-size:1.1rem; font-weight:800; color:#065f46; margin:0;">🎉 ${res.message}</h4>
            <p style="font-size:0.88rem; color:#047857; margin-top:3px;">
              Total catalog now contains <strong>${res.total_colors} active shades</strong> ready for instant search and tinting.
            </p>
          </div>
        `;
        toast('1,000+ Official Kenyan Shades Synchronized!');
        const countDisplay = document.getElementById('catalog-count-display');
        if (countDisplay) countDisplay.innerText = res.total_colors;
        syncBtn.innerText = '✅ Fandecks Synchronized';
      } catch (err) {
        toast(err.message, true);
        syncBtn.disabled = false;
        syncBtn.innerText = '⚡ 1-Click Sync Master Fandecks (1,000+ Shades)';
      }
    });
  }

  // 1-Click Sync Hardware Accessories
  const syncHwBtn = document.getElementById('btn-sync-hardware-catalog');
  if (syncHwBtn) {
    syncHwBtn.addEventListener('click', async () => {
      syncHwBtn.disabled = true;
      syncHwBtn.innerText = '⏳ Syncing Hardware Accessories...';
      try {
        const res = await apiFetch('/api/stock/seed-hardware-catalog', { method: 'POST' });
        toast(res.message);
        syncHwBtn.innerText = '✅ Hardware Catalog Synced';
      } catch (err) {
        toast(err.message, true);
        syncHwBtn.disabled = false;
        syncHwBtn.innerText = '🛠️ Sync Hardware Accessories (50+)';
      }
    });
  }

  // Custom Color File Dropzone
  const colorDropzone = document.getElementById('color-dropzone');
  const colorFileInput = document.getElementById('color-file-input');
  if (colorDropzone && colorFileInput) {
    colorDropzone.addEventListener('click', () => colorFileInput.click());
    colorFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        document.getElementById('color-paste-textarea').value = evt.target.result;
        parseColorCsvText(evt.target.result);
      };
      reader.readAsText(file);
    });
  }

  const parseColorBtn = document.getElementById('btn-parse-color-data');
  if (parseColorBtn) {
    parseColorBtn.addEventListener('click', () => {
      const text = document.getElementById('color-paste-textarea').value.trim();
      if (!text) {
        toast('Please paste CSV text or select a file first.', true);
        return;
      }
      parseColorCsvText(text);
    });
  }

  const submitColorBtn = document.getElementById('btn-submit-color-import');
  if (submitColorBtn) {
    submitColorBtn.addEventListener('click', async () => {
      if (!parsedColorRows.length) return;
      submitColorBtn.disabled = true;
      submitColorBtn.innerText = `⏳ Importing ${parsedColorRows.length} shades...`;

      try {
        const res = await apiFetch('/api/colors/bulk-import', {
          method: 'POST',
          body: JSON.stringify({ colors: parsedColorRows })
        });
        toast(`Successfully imported ${res.imported} colors!`);
        showBulkImportModal('fandecks');
      } catch (err) {
        toast(err.message, true);
        submitColorBtn.disabled = false;
        submitColorBtn.innerText = `🚀 Commit & Import Colors (${parsedColorRows.length})`;
      }
    });
  }

  // Product File Dropzone & Parsing
  const productDropzone = document.getElementById('product-dropzone');
  const productFileInput = document.getElementById('product-file-input');
  if (productDropzone && productFileInput) {
    productDropzone.addEventListener('click', () => productFileInput.click());
    productFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        document.getElementById('product-paste-textarea').value = evt.target.result;
        parseProductCsvText(evt.target.result);
      };
      reader.readAsText(file);
    });
  }

  const parseProductBtn = document.getElementById('btn-parse-product-data');
  if (parseProductBtn) {
    parseProductBtn.addEventListener('click', () => {
      const text = document.getElementById('product-paste-textarea').value.trim();
      if (!text) {
        toast('Please paste CSV text or select a file first.', true);
        return;
      }
      parseProductCsvText(text);
    });
  }

  const submitProductBtn = document.getElementById('btn-submit-product-import');
  if (submitProductBtn) {
    submitProductBtn.addEventListener('click', async () => {
      if (!parsedProductRows.length) return;
      submitProductBtn.disabled = true;
      submitProductBtn.innerText = `⏳ Importing ${parsedProductRows.length} products...`;

      try {
        const res = await apiFetch('/api/stock/bulk-import-products', {
          method: 'POST',
          body: JSON.stringify({ products: parsedProductRows })
        });
        toast(`Successfully imported ${res.imported} hardware products!`);
        showBulkImportModal('products');
      } catch (err) {
        toast(err.message, true);
        submitProductBtn.disabled = false;
        submitProductBtn.innerText = `🚀 Commit & Import Products (${parsedProductRows.length})`;
      }
    });
  }
}

// Simple Client CSV Line Parser
function parseCsvLines(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    // Regex to handle quoted commas
    const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]+)|(?=,)|$)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(lines[i])) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      const val = match[1] ? match[1].replace(/\"\"/g, '"') : match[2] || '';
      matches.push(val.trim());
      if (matches.length > headers.length + 2) break;
    }

    const row = {};
    headers.forEach((h, hIdx) => {
      row[h] = matches[hIdx] || '';
    });
    records.push(row);
  }

  return records;
}

function parseColorCsvText(text) {
  const rows = parseCsvLines(text);
  if (!rows.length) {
    toast('No valid data rows found in CSV', true);
    return;
  }

  parsedColorRows = rows.map((r, idx) => {
    return {
      manufacturer: r.manufacturer || r.Manufacturer || r.Brand || 'Crown',
      color_code: r.color_code || r.code || r.Code || `C-${idx+1}`,
      color_name: r.color_name || r.name || r.Name || 'Custom Shade',
      required_base: r.required_base || r.paint_base || r.Base || 'Pastel',
      pigment_formula: r.pigment_formula || r.pigment_recipe || r.formula || 'BK:0.10,YO:0.50',
      hex_code: r.hex_code || r.hex_display || r.hex || '#E2A03F'
    };
  });

  const previewBox = document.getElementById('color-preview-container');
  previewBox.innerHTML = `
    <div style="margin-top:1.2rem;">
      <h4 style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-bottom:0.6rem;">
        Previewing ${parsedColorRows.length} Color Records (Ready to Import)
      </h4>
      <div class="import-preview-table-box">
        <table class="premium-table">
          <thead>
            <tr>
              <th>Swatch</th>
              <th>Manufacturer</th>
              <th>Code</th>
              <th>Color Name</th>
              <th>Base</th>
              <th>Formula</th>
            </tr>
          </thead>
          <tbody>
            ${parsedColorRows.slice(0, 15).map(c => `
              <tr>
                <td><div class="paint-swatch" style="width:26px; height:26px; background:${c.hex_code}; border-radius:6px;"></div></td>
                <td><strong>${c.manufacturer}</strong></td>
                <td style="font-family:var(--font-mono);">${c.color_code}</td>
                <td>${c.color_name}</td>
                <td><span class="brand-pill">${c.required_base}</span></td>
                <td style="font-size:0.75rem; font-family:var(--font-mono);">${c.pigment_formula}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${parsedColorRows.length > 15 ? `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:0.4rem;">+ ${parsedColorRows.length - 15} more records will be imported</div>` : ''}
    </div>
  `;

  const submitBtn = document.getElementById('btn-submit-color-import');
  document.getElementById('parsed-color-count').innerText = parsedColorRows.length;
  submitBtn.style.display = 'inline-flex';
}

function parseProductCsvText(text) {
  const rows = parseCsvLines(text);
  if (!rows.length) {
    toast('No valid product rows found in CSV', true);
    return;
  }

  parsedProductRows = rows.map((r, idx) => {
    return {
      product_name: r.product_name || r.name || r.Name || 'Hardware Accessory',
      sku: r.sku || r.SKU || r.barcode || `SKU-${idx+1}`,
      unit_cost_kes: Number(r.unit_cost_kes || r.cost || 150),
      unit_price_kes: Number(r.unit_price_kes || r.price || 250),
      quantity_in_stock: Number(r.quantity_in_stock || r.stock || 20),
      low_stock_threshold: Number(r.low_stock_threshold || r.min || 5)
    };
  });

  const previewBox = document.getElementById('product-preview-container');
  previewBox.innerHTML = `
    <div style="margin-top:1.2rem;">
      <h4 style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-bottom:0.6rem;">
        Previewing ${parsedProductRows.length} Hardware Product Records
      </h4>
      <div class="import-preview-table-box">
        <table class="premium-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Unit Cost (KES)</th>
              <th>Selling Price (KES)</th>
              <th>Stock</th>
              <th>Min Alert</th>
            </tr>
          </thead>
          <tbody>
            ${parsedProductRows.slice(0, 15).map(p => `
              <tr>
                <td><strong>${p.product_name}</strong></td>
                <td style="font-family:var(--font-mono);">${p.sku}</td>
                <td>KES ${p.unit_cost_kes.toLocaleString()}</td>
                <td><strong style="color:#047857;">KES ${p.unit_price_kes.toLocaleString()}</strong></td>
                <td><strong>${p.quantity_in_stock}</strong></td>
                <td>${p.low_stock_threshold}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${parsedProductRows.length > 15 ? `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:0.4rem;">+ ${parsedProductRows.length - 15} more records will be imported</div>` : ''}
    </div>
  `;

  const submitBtn = document.getElementById('btn-submit-product-import');
  document.getElementById('parsed-product-count').innerText = parsedProductRows.length;
  submitBtn.style.display = 'inline-flex';
}

