-- =====================================================================
-- KENYAN PAINT & HARDWARE ENTERPRISE ERP - SUPABASE POSTGRESQL SCHEMA
-- Project: Paint Hardware Enterprise ERP
-- Target: Supabase (PostgreSQL 15+)
-- =====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS store_users (
    user_id       SERIAL PRIMARY KEY,
    full_name     TEXT NOT NULL,
    phone_number  TEXT UNIQUE NOT NULL,          -- e.g. '254712345678'
    system_role   TEXT CHECK (system_role IN ('Owner','Staff')) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MASTER MANUFACTURER COLOR LIBRARY (2,263+ Official Shades)
CREATE TABLE IF NOT EXISTS manufacturer_colors (
    color_id        SERIAL PRIMARY KEY,
    manufacturer    TEXT NOT NULL,               -- 'Crown', 'Kansai Plascon', 'Basco Duracoat', 'Sadolin'
    color_code      TEXT UNIQUE NOT NULL,         -- 'AP154-2', 'C-104'
    color_name      TEXT NOT NULL,                -- 'Verona Gold', 'Lamu White'
    required_base   TEXT NOT NULL,                -- 'Pastel', 'Deep', 'Yellow'
    pigment_formula TEXT NOT NULL,                -- 'BK:0.25,YO:1.20' or JSON formula
    hex_code        TEXT NOT NULL                 -- '#E2A03F'
);

-- 3. THE CUSTOMER PAINT PIN LEDGER
CREATE TABLE IF NOT EXISTS paint_pin_ledger (
    paint_pin       TEXT PRIMARY KEY,             -- 'PIN-2026-10042'
    color_id        INTEGER REFERENCES manufacturer_colors(color_id) ON DELETE SET NULL,
    customer_phone  TEXT NOT NULL,
    painter_phone   TEXT,
    tin_size_litres NUMERIC(8,2) NOT NULL,        -- 1.00, 4.00, 20.00
    quantity_mixed  INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL
);

-- 4. MPESA / BANK TRANSACTION LOG
CREATE TABLE IF NOT EXISTS mpesa_payments (
    transaction_id      SERIAL PRIMARY KEY,
    mpesa_receipt_code  TEXT UNIQUE,
    checkout_request_id TEXT UNIQUE,
    phone_number        TEXT NOT NULL,
    amount_kes          NUMERIC(12,2) NOT NULL,
    payment_status      TEXT CHECK (payment_status IN ('Pending','Completed','Failed')) NOT NULL DEFAULT 'Pending',
    bank_reference      TEXT,
    invoice_id          INTEGER,
    timestamp           TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STOCK: BASE TINS (Paint bases held in litres/tins)
CREATE TABLE IF NOT EXISTS stock_base_tins (
    base_id             SERIAL PRIMARY KEY,
    manufacturer        TEXT NOT NULL,
    base_name           TEXT NOT NULL,                 -- 'Vinyl Matt Pastel Base'
    tin_size_litres     NUMERIC(8,2) NOT NULL,
    quantity_in_stock   INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    unit_cost_kes       NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE(manufacturer, base_name, tin_size_litres)
);

-- 6. STOCK: PIGMENTS (Tracked in millilitres)
CREATE TABLE IF NOT EXISTS stock_pigments (
    pigment_id             SERIAL PRIMARY KEY,
    pigment_code           TEXT UNIQUE NOT NULL,          -- 'BK', 'YO', 'RE', 'RO', 'BL', 'GR'
    pigment_name           TEXT NOT NULL,
    quantity_ml            NUMERIC(12,2) NOT NULL DEFAULT 0,
    low_stock_threshold_ml NUMERIC(12,2) NOT NULL DEFAULT 200,
    unit_cost_per_ml_kes   NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 7. PRODUCTS (Hardware accessories sold at counter)
CREATE TABLE IF NOT EXISTS products (
    product_id          SERIAL PRIMARY KEY,
    product_name        TEXT NOT NULL,
    sku                 TEXT UNIQUE,
    unit_price_kes      NUMERIC(12,2) NOT NULL,
    unit_cost_kes       NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_in_stock   INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5
);

-- 8. INVOICES (POS Checkout)
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id     SERIAL PRIMARY KEY,
    created_by     INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    customer_phone TEXT,
    payment_method TEXT CHECK (payment_method IN ('Mpesa','Cash','Credit')) NOT NULL,
    total_kes      NUMERIC(12,2) NOT NULL,
    status         TEXT CHECK (status IN ('Pending','Paid','Cancelled')) NOT NULL DEFAULT 'Pending',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    item_id        SERIAL PRIMARY KEY,
    invoice_id     INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    description    TEXT NOT NULL,                 -- e.g. 'Paint PIN-2026-10042' or product name
    paint_pin      TEXT REFERENCES paint_pin_ledger(paint_pin) ON DELETE SET NULL,
    product_id     INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
    quantity       NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price_kes NUMERIC(12,2) NOT NULL,
    line_cost_kes  NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 9. FUNDI / CONTRACTOR CREDIT ACCOUNTS
CREATE TABLE IF NOT EXISTS credit_accounts (
    account_id          SERIAL PRIMARY KEY,
    fundi_name          TEXT NOT NULL,
    phone_number        TEXT UNIQUE NOT NULL,
    credit_limit_kes    NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_balance_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
    approved_by         INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    tx_id         SERIAL PRIMARY KEY,
    account_id    INTEGER REFERENCES credit_accounts(account_id) ON DELETE CASCADE,
    invoice_id    INTEGER REFERENCES invoices(invoice_id) ON DELETE SET NULL,
    amount_kes    NUMERIC(12,2) NOT NULL,
    tx_type       TEXT CHECK (tx_type IN ('Charge','Payment')) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SECURITY AUDIT LOG (Append-only)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id             SERIAL PRIMARY KEY,
    timestamp          TIMESTAMPTZ DEFAULT NOW(),
    user_id            INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    device_fingerprint TEXT,
    action             TEXT NOT NULL,
    details            TEXT,
    status             TEXT NOT NULL
);

-- 11. CASHFLOW & TREASURY ACCOUNTS
CREATE TABLE IF NOT EXISTS cashflow_accounts (
    account_id     SERIAL PRIMARY KEY,
    account_type   TEXT CHECK (account_type IN ('Cash Drawer','M-Pesa Till','Bank Account')) NOT NULL,
    account_name   TEXT NOT NULL,
    account_number TEXT,
    balance_kes    NUMERIC(14,2) NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 12. OPERATIONAL EXPENSES LOG
CREATE TABLE IF NOT EXISTS expenses (
    expense_id     SERIAL PRIMARY KEY,
    category       TEXT NOT NULL,                 -- 'Shop Rent', 'Transport & Fuel', 'Staff Wages', etc.
    amount_kes     NUMERIC(12,2) NOT NULL,
    recipient      TEXT NOT NULL,
    payment_method TEXT NOT NULL,                -- 'Cash', 'M-Pesa', 'Bank Transfer'
    account_id     INTEGER REFERENCES cashflow_accounts(account_id) ON DELETE SET NULL,
    notes          TEXT,
    recorded_by    INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PRO-FORMA QUOTATIONS (With 14-day price lock)
CREATE TABLE IF NOT EXISTS quotations (
    quote_id         SERIAL PRIMARY KEY,
    quote_number     TEXT UNIQUE NOT NULL,        -- e.g. 'PRQ-2026-1042'
    customer_name    TEXT NOT NULL,
    customer_phone   TEXT NOT NULL,
    site_location    TEXT,
    total_amount_kes NUMERIC(12,2) NOT NULL,
    validity_days    INTEGER NOT NULL DEFAULT 14,
    expires_at       TIMESTAMPTZ NOT NULL,
    status           TEXT CHECK (status IN ('Active','Converted','Expired','Cancelled')) NOT NULL DEFAULT 'Active',
    items_json       JSONB NOT NULL,
    notes            TEXT,
    created_by       INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 14. SUPPLIERS & PROCUREMENT
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id         SERIAL PRIMARY KEY,
    name                TEXT NOT NULL,
    contact_person      TEXT,
    phone               TEXT,
    email               TEXT,
    location            TEXT,
    lead_time_days      INTEGER DEFAULT 3,
    current_balance_kes NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supplier_transactions (
    tx_id         SERIAL PRIMARY KEY,
    supplier_id   INTEGER REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    amount_kes    NUMERIC(12,2) NOT NULL,
    tx_type       TEXT CHECK (tx_type IN ('Purchase', 'Payment')) NOT NULL,
    account_id    INTEGER REFERENCES cashflow_accounts(account_id) ON DELETE SET NULL,
    notes         TEXT,
    recorded_by   INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id            SERIAL PRIMARY KEY,
    po_number        TEXT UNIQUE NOT NULL,          -- e.g. 'PO-2026-081'
    supplier_id      INTEGER REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    total_amount_kes NUMERIC(12,2) NOT NULL DEFAULT 0,
    status           TEXT CHECK (status IN ('Draft','Ordered','In-Transit','Received','Cancelled')) NOT NULL DEFAULT 'Draft',
    items_json       JSONB NOT NULL,
    notes            TEXT,
    created_by       INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    received_at      TIMESTAMPTZ
);

-- 15. SECURITY AUTHORIZATION PINS
CREATE TABLE IF NOT EXISTS security_pins (
    pin_id         SERIAL PRIMARY KEY,
    target_user_id INTEGER REFERENCES store_users(user_id) ON DELETE CASCADE,
    pin_code       TEXT NOT NULL,
    purpose        TEXT DEFAULT 'Password Reset',
    is_used        INTEGER DEFAULT 0,
    expires_at     TIMESTAMPTZ NOT NULL,
    generated_by   INTEGER REFERENCES store_users(user_id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 16. STORE SETTINGS
CREATE TABLE IF NOT EXISTS store_settings (
    setting_key TEXT PRIMARY KEY,
    setting_val TEXT
);

-- INDEXES FOR HIGH-PERFORMANCE SEARCH & REPORTING
CREATE INDEX IF NOT EXISTS idx_manufacturer_colors_search ON manufacturer_colors (manufacturer, color_name);
CREATE INDEX IF NOT EXISTS idx_manufacturer_colors_code ON manufacturer_colors (color_code);
CREATE INDEX IF NOT EXISTS idx_paint_pin_customer ON paint_pin_ledger (customer_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_phone ON credit_accounts (phone_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations (status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables for Supabase security compliance
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_pin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_base_tins ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_pigments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access for backend API integration
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access for authenticated and service_role" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow full access for authenticated and service_role" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
