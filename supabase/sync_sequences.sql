-- =====================================================================
-- SYNCHRONIZE ALL POSTGRESQL PRIMARY KEY SEQUENCES
-- Run this once in Supabase SQL Editor so new auto-increment rows succeed
-- =====================================================================

DO $$
DECLARE
    seq RECORD;
    t text;
    col text;
BEGIN
    FOR t, col IN
        VALUES 
            ('audit_log', 'log_id'),
            ('invoices', 'invoice_id'),
            ('invoice_items', 'item_id'),
            ('expenses', 'expense_id'),
            ('products', 'product_id'),
            ('stock_base_tins', 'base_id'),
            ('stock_pigments', 'pigment_id'),
            ('store_users', 'user_id'),
            ('cashflow_accounts', 'account_id'),
            ('credit_accounts', 'account_id'),
            ('credit_transactions', 'tx_id'),
            ('suppliers', 'supplier_id'),
            ('supplier_transactions', 'tx_id'),
            ('purchase_orders', 'po_id'),
            ('quotations', 'quote_id'),
            ('security_pins', 'pin_id'),
            ('manufacturer_colors', 'color_id')
    LOOP
        BEGIN
            EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), coalesce(max(%I), 1) + 1, false) FROM %I', t, col, col, t);
        EXCEPTION WHEN OTHERS THEN
            -- Continue if table or column doesn't exist
        END;
    END LOOP;
END $$;
