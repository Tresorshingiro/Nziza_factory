-- ============================================
-- VERIFY AND FIX USER SETUP
-- ============================================
-- Run this to check if users are properly linked and fix if needed

-- Step 1: Check if auth users exist and if they're linked to users table
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created,
    u.id as user_id,
    u.email as user_email,
    u.role as user_role,
    CASE 
        WHEN u.id IS NULL THEN 'NOT LINKED - Need to run linking script'
        ELSE 'LINKED - OK'
    END as status
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE au.email IN ('boss@nziza.com', 'manager@nziza.com', 'factory@nziza.com')
ORDER BY au.email;

-- Step 2: If users are not linked, run this to link them
-- (This will only work if you created auth users in Dashboard first)

-- Create test factory if it doesn't exist
INSERT INTO factories (id, name, code, location, status, capacity) VALUES
('11111111-1111-1111-1111-111111111111', 'NZIZA Factory A', 'FA-001', 'Kigali, Rwanda', 'active', 10000)
ON CONFLICT (id) DO NOTHING;

-- Link auth users to users table
INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions)
SELECT 
    au.id,
    au.email,
    CASE 
        WHEN au.email = 'boss@nziza.com' THEN 'Main Boss'
        WHEN au.email = 'manager@nziza.com' THEN 'Senior Manager'
        WHEN au.email = 'factory@nziza.com' THEN 'Factory Manager'
    END,
    CASE 
        WHEN au.email = 'boss@nziza.com' THEN 'main_boss'::user_role
        WHEN au.email = 'manager@nziza.com' THEN 'senior_manager'::user_role
        WHEN au.email = 'factory@nziza.com' THEN 'factory_manager'::user_role
    END,
    CASE 
        WHEN au.email = 'factory@nziza.com' THEN '11111111-1111-1111-1111-111111111111'::uuid
        ELSE NULL
    END,
    true,
    CASE 
        WHEN au.email = 'boss@nziza.com' THEN '{"all": true}'::jsonb
        WHEN au.email = 'manager@nziza.com' THEN '{"manage_users": true, "review_reports": true}'::jsonb
        WHEN au.email = 'factory@nziza.com' THEN '{"submit_reports": true}'::jsonb
    END
FROM auth.users au
WHERE au.email IN ('boss@nziza.com', 'manager@nziza.com', 'factory@nziza.com')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    factory_id = EXCLUDED.factory_id,
    permissions = EXCLUDED.permissions;

-- Step 3: Verify the linking was successful
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    f.name as factory_name,
    u.is_active,
    u.permissions
FROM users u
LEFT JOIN factories f ON u.factory_id = f.id
WHERE u.email IN ('boss@nziza.com', 'manager@nziza.com', 'factory@nziza.com')
ORDER BY u.email;
