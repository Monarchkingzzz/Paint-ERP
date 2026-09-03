const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const DEFAULT_SUPABASE_URL = 'https://jlgnwdbdnmflhqgbnvhd.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZ253ZGJkbm1mbGhxZ2JudmhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODMyODAyNSwiZXhwIjoyMTAzOTA0MDI1fQ.i3tWvZ6Qh6ecozQNJHgXeSEAWfZnNbJ2aMdvYDT6F38';

let supabase = null;

function getSupabaseClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  if (url && key) {
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    console.log('✅ Supabase live cloud synchronization active ->', url);
  }
  return supabase;
}

getSupabaseClient();

const PK_MAP = {
  invoices: 'invoice_id',
  audit_log: 'log_id',
  invoice_items: 'item_id',
  expenses: 'expense_id',
  mpesa_payments: 'transaction_id',
  credit_transactions: 'tx_id',
  quotations: 'quote_id',
  suppliers: 'supplier_id'
};

const SUPABASE_WHITELIST = {
  mpesa_payments: [
    'transaction_id',
    'mpesa_receipt_code',
    'checkout_request_id',
    'phone_number',
    'amount_kes',
    'payment_status',
    'bank_reference',
    'invoice_id',
    'timestamp'
  ],
  invoices: [
    'invoice_id',
    'created_by',
    'customer_phone',
    'payment_method',
    'total_kes',
    'status',
    'created_at'
  ],
  invoice_items: [
    'item_id',
    'invoice_id',
    'description',
    'paint_pin',
    'product_id',
    'quantity',
    'unit_price_kes',
    'line_cost_kes'
  ]
};

function sanitizeRecord(table, record) {
  if (!record || typeof record !== 'object') return record;
  const allowed = SUPABASE_WHITELIST[table];
  if (!allowed) return record;
  const clean = {};
  for (const key of allowed) {
    if (key in record && record[key] !== undefined) {
      clean[key] = record[key];
    }
  }
  return clean;
}

/**
 * Sync single or multiple rows to a Supabase table.
 * Non-blocking with automatic error recovery, column sanitization, and sequence auto-healing.
 */
async function syncToSupabase(table, records, upsertOnConflict = null) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let rawData = Array.isArray(records) ? records : [records];
    if (rawData.length === 0) return null;

    const data = SUPABASE_WHITELIST[table] ? rawData.map(r => sanitizeRecord(table, r)) : rawData;

    if (upsertOnConflict) {
      const { data: res, error } = await client.from(table).upsert(data, { onConflict: upsertOnConflict }).select();
      if (error) console.error(`[Supabase Sync Upsert Error] ${table}:`, error.message);
      return res;
    }

    let { data: res, error } = await client.from(table).insert(data).select();
    
    // Auto-heal primary key collision on ephemeral serverless cold-starts or sequence desync
    if (error && (error.message.includes('unique constraint') || error.message.includes('duplicate key')) && PK_MAP[table]) {
      const pk = PK_MAP[table];
      try {
        const { data: topRows } = await client.from(table).select(pk).order(pk, { ascending: false }).limit(1);
        let nextId = (topRows && topRows.length && typeof topRows[0][pk] === 'number' ? topRows[0][pk] : 0) + 1;
        
        const fixedData = data.map(item => ({
          ...item,
          [pk]: nextId++
        }));
        const retry = await client.from(table).insert(fixedData).select();
        if (retry.error) {
          console.error(`[Supabase Sync Retry Error] ${table}:`, retry.error.message);
        } else {
          return retry.data;
        }
      } catch (retryErr) {
        console.error(`[Supabase Auto-Heal Exception] ${table}:`, retryErr.message);
      }
    } else if (error) {
      console.error(`[Supabase Sync Insert Error] ${table}:`, error.message);
    }
    return res;
  } catch (err) {
    console.error(`[Supabase Sync Exception] ${table}:`, err.message);
    return null;
  }
}

async function updateSupabase(table, matchObj, updates) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const cleanUpdates = SUPABASE_WHITELIST[table] ? sanitizeRecord(table, updates) : updates;
    const { error } = await client.from(table).update(cleanUpdates).match(matchObj);
    if (error) console.error(`[Supabase Update Error] ${table}:`, error.message);
  } catch (err) {
    console.error(`[Supabase Update Exception] ${table}:`, err.message);
  }
}

async function deleteFromSupabase(table, matchObj) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { error } = await client.from(table).delete().match(matchObj);
    if (error) console.error(`[Supabase Delete Error] ${table}:`, error.message);
  } catch (err) {
    console.error(`[Supabase Delete Exception] ${table}:`, err.message);
  }
}

/**
 * Full Sync of all tables from local SQLite up to Supabase cloud.
 */
async function syncAllToSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    console.log('ℹ️ Cannot sync: SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY not configured in .env');
    return { error: 'Supabase API key missing in .env' };
  }

  const { db } = require('./db');
  console.log('🔄 Starting Full Sync from local database to Supabase...');

  const results = {};

  try {
    // 1. Store Users
    const users = db.prepare('SELECT user_id, full_name, phone_number, system_role, password_hash, is_active FROM store_users').all();
    if (users.length) {
      const { error } = await client.from('store_users').upsert(users.map(u => ({ ...u, is_active: Boolean(u.is_active) })), { onConflict: 'phone_number' });
      results.store_users = error ? `Error: ${error.message}` : `${users.length} rows synced`;
    }

    // 2. Base Tins
    const bases = db.prepare('SELECT manufacturer, base_name, tin_size_litres, quantity_in_stock, low_stock_threshold, unit_cost_kes FROM stock_base_tins').all();
    if (bases.length) {
      const { error } = await client.from('stock_base_tins').upsert(bases, { onConflict: 'manufacturer,base_name,tin_size_litres' });
      results.stock_base_tins = error ? `Error: ${error.message}` : `${bases.length} rows synced`;
    }

    // 3. Pigments
    const pigments = db.prepare('SELECT pigment_code, pigment_name, quantity_ml, low_stock_threshold_ml, unit_cost_per_ml_kes FROM stock_pigments').all();
    if (pigments.length) {
      const { error } = await client.from('stock_pigments').upsert(pigments, { onConflict: 'pigment_code' });
      results.stock_pigments = error ? `Error: ${error.message}` : `${pigments.length} rows synced`;
    }

    // 4. Products
    const products = db.prepare('SELECT product_name, sku, unit_price_kes, unit_cost_kes, quantity_in_stock, low_stock_threshold FROM products').all();
    if (products.length) {
      const { error } = await client.from('products').upsert(products, { onConflict: 'sku' });
      results.products = error ? `Error: ${error.message}` : `${products.length} rows synced`;
    }

    // 5. Paint PIN Ledger (Must be synced before invoice_items to satisfy foreign keys)
    const pins = db.prepare('SELECT paint_pin, color_id, customer_phone, painter_phone, tin_size_litres, quantity_mixed, created_at, created_by FROM paint_pin_ledger').all();
    if (pins.length) {
      const { error } = await client.from('paint_pin_ledger').upsert(pins, { onConflict: 'paint_pin' });
      results.paint_pin_ledger = error ? `Error: ${error.message}` : `${pins.length} rows synced`;
    }

    // 6. Cashflow Accounts
    const accounts = db.prepare('SELECT account_id, account_type, account_name, account_number, balance_kes FROM cashflow_accounts').all();
    if (accounts.length) {
      const { error } = await client.from('cashflow_accounts').upsert(accounts, { onConflict: 'account_id' });
      results.cashflow_accounts = error ? `Error: ${error.message}` : `${accounts.length} rows synced`;
    }

    // 7. Suppliers
    const suppliers = db.prepare('SELECT supplier_id, name, contact_person, phone, email, location, lead_time_days, current_balance_kes FROM suppliers').all();
    if (suppliers.length) {
      const { error } = await client.from('suppliers').upsert(suppliers, { onConflict: 'supplier_id' });
      results.suppliers = error ? `Error: ${error.message}` : `${suppliers.length} rows synced`;
    }

    // 8. Invoices & Items
    const invoices = db.prepare('SELECT invoice_id, created_by, customer_phone, payment_method, total_kes, status, created_at FROM invoices').all();
    if (invoices.length) {
      const { error } = await client.from('invoices').upsert(invoices, { onConflict: 'invoice_id' });
      results.invoices = error ? `Error: ${error.message}` : `${invoices.length} rows synced`;
    }

    // Get list of existing product IDs and paint pins in Supabase
    const { data: supaProds } = await client.from('products').select('product_id');
    const { data: supaPins } = await client.from('paint_pin_ledger').select('paint_pin');
    const validProductIds = new Set((supaProds || []).map(p => p.product_id));
    const validPins = new Set((supaPins || []).map(p => p.paint_pin));

    const items = db.prepare('SELECT item_id, invoice_id, description, paint_pin, product_id, quantity, unit_price_kes, line_cost_kes FROM invoice_items').all();
    if (items.length) {
      const sanitizedItems = items.map(item => ({
        ...item,
        product_id: item.product_id && validProductIds.has(item.product_id) ? item.product_id : null,
        paint_pin: item.paint_pin && validPins.has(item.paint_pin) ? item.paint_pin : null
      }));
      const { error } = await client.from('invoice_items').upsert(sanitizedItems, { onConflict: 'item_id' });
      results.invoice_items = error ? `Error: ${error.message}` : `${items.length} rows synced`;
    }

    // 9. M-Pesa Payments
    const mpesaRows = db.prepare('SELECT transaction_id, mpesa_receipt_code, checkout_request_id, phone_number, amount_kes, payment_status, bank_reference, invoice_id, timestamp FROM mpesa_payments').all();
    if (mpesaRows.length) {
      const { error } = await client.from('mpesa_payments').upsert(mpesaRows, { onConflict: 'transaction_id' });
      results.mpesa_payments = error ? `Error: ${error.message}` : `${mpesaRows.length} rows synced`;
    }

    // 10. Quotations
    const quotes = db.prepare('SELECT quote_id, quote_number, customer_name, customer_phone, site_location, total_amount_kes, validity_days, expires_at, status, items_json, notes, created_by, created_at FROM quotations').all();
    if (quotes.length) {
      const formatted = quotes.map(q => ({
        ...q,
        items_json: typeof q.items_json === 'string' ? JSON.parse(q.items_json) : q.items_json
      }));
      const { error } = await client.from('quotations').upsert(formatted, { onConflict: 'quote_id' });
      results.quotations = error ? `Error: ${error.message}` : `${quotes.length} rows synced`;
    }

    // 10. Audit Log
    const logs = db.prepare('SELECT log_id, timestamp, user_id, device_fingerprint, action, details, status FROM audit_log ORDER BY log_id ASC').all();
    if (logs.length) {
      const { error } = await client.from('audit_log').upsert(logs, { onConflict: 'log_id' });
      results.audit_log = error ? `Error: ${error.message}` : `${logs.length} rows synced`;
    }

    console.log('✅ Supabase Full Sync Complete:', results);
    return { success: true, results };
  } catch (err) {
    console.error('❌ Supabase Full Sync Error:', err.message);
    return { error: err.message };
  }
}

module.exports = {
  getSupabaseClient,
  syncToSupabase,
  updateSupabase,
  deleteFromSupabase,
  syncAllToSupabase
};
