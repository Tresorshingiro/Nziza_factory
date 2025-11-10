-- ============================================
-- DEBUG: Check Main Boss Access
-- ============================================
-- Run this to verify the Main Boss can access their profile

-- Check if Main Boss user exists
SELECT 
    id,
    email,
    full_name,
    role,
    factory_id,
    is_active
FROM users 
WHERE email = 'boss@nziza.com';

-- Check RLS policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users';

-- Test if authenticated role can select from users
-- (This simulates what happens when Main Boss logs in)
SET ROLE authenticated;
SELECT * FROM users WHERE email = 'boss@nziza.com';
RESET ROLE;
