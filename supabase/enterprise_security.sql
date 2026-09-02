-- =====================================================================
-- ENTERPRISE ROW LEVEL SECURITY (RLS) & ACCESS CONTROL LOCKDOWN
-- Target: Supabase (PostgreSQL 15+)
-- Client Security: High-level Protection against Data Compromise
-- =====================================================================

-- 1. REVOKE ALL DIRECT PUBLIC / ANON ACCESS TO PROTECT CLIENT DATA
REVOKE ALL ON SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- 2. GRANT FULL PRIVILEGES STRICTLY TO SERVICE_ROLE (BACKEND SERVER ONLY) & POSTGRES
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 16 TABLES
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

-- 4. CONFIGURE STRICT ACCESS POLICIES (ONLY SERVICE_ROLE CAN ACCESS)
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
        -- Remove any old policies
        EXECUTE format('DROP POLICY IF EXISTS "Deny public anon direct access" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow service_role full management" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access for authenticated and service_role" ON %I', t);
        
        -- Policy: Allow only backend service_role to manage data
        EXECUTE format('CREATE POLICY "Allow service_role full management" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
