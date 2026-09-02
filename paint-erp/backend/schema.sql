-- =====================================================================
-- Kenyan Paint Hardware ERP - Database Schema (SQLite dialect)
-- Ported from the original PostgreSQL-style spec.
-- =====================================================================

-- 1. USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS store_users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    phone_number  TEXT UNIQUE NOT NULL,          -- e.g. '254712345678'
    system_role   TEXT CHECK (system_role IN ('Owner','Staff')) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active     INTEGER DEFAULT 1
);

-- 2. MASTER MANUFACTURER COLOR LIBRARY
CREATE TABLE IF NOT EXISTS manufacturer_colors (
    color_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer    TEXT NOT NULL,               -- 'Crown', 'Plascon', 'Duracoat'
    color_code      TEXT UNIQUE NOT NULL,         -- 'AP154-2'
    color_name      TEXT NOT NULL,                -- 'Verona Gold'
    required_base   TEXT NOT NULL,                -- 'Pastel', 'Deep', 'Yellow'
    pigment_formula TEXT NOT NULL,                -- 'BK:0.25,YO:1.20'
    hex_code        TEXT NOT NULL                 -- '#E2A03F'
);

-- 3. THE CUSTOMER PAINT PIN LEDGER
CREATE TABLE IF NOT EXISTS paint_pin_ledger (
    paint_pin       TEXT PRIMARY KEY,             -- 'PIN-2026-10042'
    color_id        INTEGER REFERENCES manufacturer_colors(color_id),
    customer_phone  TEXT NOT NULL,
    painter_phone   TEXT,
    tin_size_litres REAL NOT NULL,                -- 1.00, 4.00, 20.00
    quantity_mixed  INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by      INTEGER REFERENCES store_users(user_id)
);

-- 4. MPESA / BANK TRANSACTION LOG & CONFIGURATION
CREATE TABLE IF NOT EXISTS mpesa_config (
    config_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    env             TEXT NOT NULL DEFAULT 'sandbox',   -- 'sandbox' or 'production'
    consumer_key    TEXT,
    consumer_secret TEXT,
    passkey         TEXT,
    shortcode       TEXT NOT NULL DEFAULT '174379',
    till_number     TEXT,
    callback_url    TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mpesa_payments (
    transaction_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    mpesa_receipt_code  TEXT UNIQUE,
    checkout_request_id TEXT UNIQUE,
    merchant_request_id TEXT,
    phone_number        TEXT NOT NULL,
    amount_kes          REAL NOT NULL,
    payment_status      TEXT CHECK (payment_status IN ('Pending','Completed','Failed','Cancelled')) NOT NULL,
    transaction_type    TEXT DEFAULT 'STK_PUSH',         -- 'STK_PUSH', 'C2B_PAYBILL', 'C2B_TILL'
    result_code         INTEGER,
    result_desc         TEXT,
    bank_reference      TEXT,
    invoice_id          INTEGER,
    raw_payload         TEXT,
    timestamp           TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. STOCK: BASE TINS (paint bases held in litres/tins)
CREATE TABLE IF NOT EXISTS stock_base_tins (
    base_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer  TEXT NOT NULL,
    base_name     TEXT NOT NULL,                 -- 'Vinyl Matt Pastel Base'
    tin_size_litres REAL NOT NULL,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    unit_cost_kes REAL NOT NULL DEFAULT 0,
    UNIQUE(manufacturer, base_name, tin_size_litres)
);

-- 6. STOCK: PIGMENTS (tracked in millilitres)
CREATE TABLE IF NOT EXISTS stock_pigments (
    pigment_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    pigment_code  TEXT UNIQUE NOT NULL,          -- 'BK', 'YO', 'RE'
    pigment_name  TEXT NOT NULL,
    quantity_ml   REAL NOT NULL DEFAULT 0,
    low_stock_threshold_ml REAL NOT NULL DEFAULT 200,
    unit_cost_per_ml_kes REAL NOT NULL DEFAULT 0
);

-- 7. PRODUCTS (non-paint hardware items sold at the counter)
CREATE TABLE IF NOT EXISTS products (
    product_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name  TEXT NOT NULL,
    sku           TEXT UNIQUE,
    unit_price_kes REAL NOT NULL,
    unit_cost_kes REAL NOT NULL DEFAULT 0,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5
);

-- 8. INVOICES (POS checkout)
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by    INTEGER REFERENCES store_users(user_id),
    customer_phone TEXT,
    payment_method TEXT CHECK (payment_method IN ('Mpesa','Cash','Credit')) NOT NULL,
    total_kes     REAL NOT NULL,
    status        TEXT CHECK (status IN ('Pending','Paid','Cancelled')) NOT NULL DEFAULT 'Pending',
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    item_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id    INTEGER REFERENCES invoices(invoice_id),
    description   TEXT NOT NULL,                 -- e.g. 'Paint PIN-2026-10042' or product name
    paint_pin     TEXT REFERENCES paint_pin_ledger(paint_pin),
    product_id    INTEGER REFERENCES products(product_id),
    quantity      REAL NOT NULL DEFAULT 1,
    unit_price_kes REAL NOT NULL,
    line_cost_kes REAL NOT NULL DEFAULT 0         -- cost basis for P&L
);

-- 9. FUNDI / CONTRACTOR CREDIT ACCOUNTS
CREATE TABLE IF NOT EXISTS credit_accounts (
    account_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    fundi_name    TEXT NOT NULL,
    phone_number  TEXT UNIQUE NOT NULL,
    credit_limit_kes REAL NOT NULL DEFAULT 0,
    current_balance_kes REAL NOT NULL DEFAULT 0,
    approved_by   INTEGER REFERENCES store_users(user_id)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    tx_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id    INTEGER REFERENCES credit_accounts(account_id),
    invoice_id    INTEGER REFERENCES invoices(invoice_id),
    amount_kes    REAL NOT NULL,
    tx_type       TEXT CHECK (tx_type IN ('Charge','Payment')) NOT NULL,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. SECURITY AUDIT LOG (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id       INTEGER REFERENCES store_users(user_id),
    device_fingerprint TEXT,
    action        TEXT NOT NULL,
    details       TEXT,
    status        TEXT NOT NULL
);

-- 11. CASHFLOW & TREASURY ACCOUNTS
CREATE TABLE IF NOT EXISTS cashflow_accounts (
    account_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    account_type  TEXT CHECK (account_type IN ('Cash Drawer','M-Pesa Till','Bank Account')) NOT NULL,
    account_name  TEXT NOT NULL,
    account_number TEXT,
    balance_kes   REAL NOT NULL DEFAULT 0,
    updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. OPERATIONAL EXPENSES LOG
CREATE TABLE IF NOT EXISTS expenses (
    expense_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    category      TEXT NOT NULL,                 -- 'Shop Rent', 'Transport & Fuel', 'Staff Wages', 'Machine Calibration', 'Utilities', 'Maintenance', 'Other'
    amount_kes    REAL NOT NULL,
    recipient     TEXT NOT NULL,
    payment_method TEXT NOT NULL,                -- 'Cash', 'M-Pesa', 'Bank Transfer'
    account_id    INTEGER REFERENCES cashflow_accounts(account_id),
    notes         TEXT,
    recorded_by   INTEGER REFERENCES store_users(user_id),
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 13. PRO-FORMA QUOTATIONS (with 14-day price lock)
CREATE TABLE IF NOT EXISTS quotations (
    quote_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number    TEXT UNIQUE NOT NULL,        -- e.g. 'PRQ-2026-1042'
    customer_name   TEXT NOT NULL,
    customer_phone  TEXT NOT NULL,
    site_location   TEXT,
    total_amount_kes REAL NOT NULL,
    validity_days   INTEGER NOT NULL DEFAULT 14,
    expires_at      TEXT NOT NULL,
    status          TEXT CHECK (status IN ('Active','Converted','Expired','Cancelled')) NOT NULL DEFAULT 'Active',
    items_json      TEXT NOT NULL,               -- Array of {description, quantity, unit_price_kes, paint_pin, product_id}
    notes           TEXT,
    created_by      INTEGER REFERENCES store_users(user_id),
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 14. SUPPLIERS & PROCUREMENT
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,                 -- 'Crown Paints Kenya PLC', 'Basco Paints (Duracoat)'
    contact_person TEXT,
    phone         TEXT,
    email         TEXT,
    location      TEXT,
    lead_time_days INTEGER DEFAULT 3,
    current_balance_kes REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supplier_transactions (
    tx_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id   INTEGER REFERENCES suppliers(supplier_id),
    amount_kes    REAL NOT NULL,
    tx_type       TEXT CHECK (tx_type IN ('Purchase', 'Payment')) NOT NULL,
    account_id    INTEGER REFERENCES cashflow_accounts(account_id),
    notes         TEXT,
    recorded_by   INTEGER REFERENCES store_users(user_id),
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number     TEXT UNIQUE NOT NULL,          -- e.g. 'PO-2026-081'
    supplier_id   INTEGER REFERENCES suppliers(supplier_id),
    total_amount_kes REAL NOT NULL DEFAULT 0,
    status        TEXT CHECK (status IN ('Draft','Ordered','In-Transit','Received','Cancelled')) NOT NULL DEFAULT 'Draft',
    items_json    TEXT NOT NULL,                 -- Array of items ordered
    notes         TEXT,
    created_by    INTEGER REFERENCES store_users(user_id),
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    received_at   TEXT
);

-- 15. SECURITY AUTHORIZATION PINS (Owner-generated for password resets)
CREATE TABLE IF NOT EXISTS security_pins (
    pin_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    target_user_id INTEGER REFERENCES store_users(user_id),
    pin_code      TEXT NOT NULL,               -- e.g. '849201'
    purpose       TEXT DEFAULT 'Password Reset',
    is_used       INTEGER DEFAULT 0,
    expires_at    TEXT NOT NULL,
    generated_by  INTEGER REFERENCES store_users(user_id),
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
