// Lightweight IndexedDB wrapper used for offline resilience:
//  - "colors_cache": last-known color catalog, so attendants can still
//    search paint colors with no internet.
//  - "pending_invoices": invoices created while offline, synced once the
//    connection returns.
const DB_NAME = 'paint_erp_offline';
const DB_VERSION = 1;

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('colors_cache')) {
        db.createObjectStore('colors_cache', { keyPath: 'color_id' });
      }
      if (!db.objectStoreNames.contains('pending_invoices')) {
        db.createObjectStore('pending_invoices', { keyPath: 'local_id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cacheColors(colors) {
  const db = await openOfflineDb();
  const tx = db.transaction('colors_cache', 'readwrite');
  const store = tx.objectStore('colors_cache');
  colors.forEach((c) => store.put(c));
  return new Promise((resolve) => (tx.oncomplete = resolve));
}

async function searchCachedColors(query) {
  const db = await openOfflineDb();
  const tx = db.transaction('colors_cache', 'readonly');
  const store = tx.objectStore('colors_cache');
  return new Promise((resolve) => {
    const results = [];
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const c = cursor.value;
        const q = query.toLowerCase();
        if (
          c.color_name.toLowerCase().includes(q) ||
          c.color_code.toLowerCase().includes(q) ||
          c.manufacturer.toLowerCase().includes(q)
        ) {
          results.push(c);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

async function queueOfflineInvoice(invoicePayload) {
  const db = await openOfflineDb();
  const tx = db.transaction('pending_invoices', 'readwrite');
  tx.objectStore('pending_invoices').add({ ...invoicePayload, queued_at: new Date().toISOString() });
  return new Promise((resolve) => (tx.oncomplete = resolve));
}

async function getPendingInvoices() {
  const db = await openOfflineDb();
  const tx = db.transaction('pending_invoices', 'readonly');
  const store = tx.objectStore('pending_invoices');
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

async function clearPendingInvoice(localId) {
  const db = await openOfflineDb();
  const tx = db.transaction('pending_invoices', 'readwrite');
  tx.objectStore('pending_invoices').delete(localId);
  return new Promise((resolve) => (tx.oncomplete = resolve));
}

// Attempt to flush any offline-queued invoices to the server. Call this
// on app load and whenever the browser regains connectivity.
async function syncPendingInvoices(apiFetch) {
  const pending = await getPendingInvoices();
  for (const inv of pending) {
    try {
      const { local_id, queued_at, ...payload } = inv;
      const res = await apiFetch('/api/pos/invoice', { method: 'POST', body: JSON.stringify(payload) });
      if (res && res.ok !== false) {
        await clearPendingInvoice(local_id);
      }
    } catch (e) {
      // Still offline - leave it queued and try again next time
      break;
    }
  }
}

window.offlineDb = {
  cacheColors,
  searchCachedColors,
  queueOfflineInvoice,
  getPendingInvoices,
  clearPendingInvoice,
  syncPendingInvoices
};
