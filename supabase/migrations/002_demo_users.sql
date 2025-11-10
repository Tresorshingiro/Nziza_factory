-- ============================================
-- DEMO USERS SETUP SCRIPT
-- ============================================
-- 
-- IMPORTANT: Follow these steps IN ORDER:
-- 
-- STEP 1: Run the initial schema migration (001_initial_schema.sql) first
-- 
-- STEP 2: Create auth users in Supabase Dashboard:
--   1. Go to Authentication > Users > Add user
--   2. Create these 3 users (check "Auto Confirm User"):
--      - boss@nziza.com (password: boss123456)
--      - manager@nziza.com (password: manager123456)
--      - factory@nziza.com (password: factory123456)
--
-- STEP 3: Run this entire script below
-- ============================================

-- Create test factory
INSERT INTO factories (id, name, code, location, status, capacity) VALUES
('11111111-1111-1111-1111-111111111111', 'NZIZA Factory A', 'FA-001', 'Kigali, Rwanda', 'active', 10000)
ON CONFLICT (id) DO NOTHING;

-- Get auth user IDs and insert into users table
DO $$
DECLARE
    boss_id UUID;
    manager_id UUID;
    factory_manager_id UUID;
BEGIN
    -- Get auth user IDs
    SELECT id INTO boss_id FROM auth.users WHERE email = 'boss@nziza.com';
    SELECT id INTO manager_id FROM auth.users WHERE email = 'manager@nziza.com';
    SELECT id INTO factory_manager_id FROM auth.users WHERE email = 'factory@nziza.com';
    
    -- Insert into users table if auth users exist
    IF boss_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions) 
        VALUES (boss_id, 'boss@nziza.com', 'Main Boss', 'main_boss', NULL, true, '{"all": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF manager_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions) 
        VALUES (manager_id, 'manager@nziza.com', 'Senior Manager', 'senior_manager', NULL, true, '{"manage_users": true, "review_reports": true, "manage_factories": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF factory_manager_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions) 
        VALUES (factory_manager_id, 'factory@nziza.com', 'Factory Manager', 'factory_manager', '11111111-1111-1111-1111-111111111111', true, '{"submit_reports": true, "manage_production": true}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Verify the users were created
SELECT u.id, u.email, u.full_name, u.role, f.name as factory_name
FROM users u
LEFT JOIN factories f ON u.factory_id = f.id
WHERE u.email IN ('boss@nziza.com', 'manager@nziza.com', 'factory@nziza.com');
