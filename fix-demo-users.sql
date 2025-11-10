-- Fix Demo Users Script
-- Run this in your Supabase SQL Editor

-- First, create a test factory if it doesn't exist
INSERT INTO factories (id, name, code, location, status, capacity) VALUES
('11111111-1111-1111-1111-111111111111', 'NZIZA Factory A', 'FA-001', 'Kigali, Rwanda', 'active', 10000)
ON CONFLICT (id) DO NOTHING;

-- Create demo users in the users table with hardcoded UUIDs
-- You'll need to replace these UUIDs with the actual auth.users IDs from Supabase

-- Update existing Main Boss user with correct Auth User ID
UPDATE users 
SET id = 'ff9c97c5-9d7b-4344-97d6-d9061e91142c'
WHERE email = 'boss@nziza.com';

-- Also insert in case the update didn't work
INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions) VALUES
('ff9c97c5-9d7b-4344-97d6-d9061e91142c', 'boss@nziza.com', 'Main Boss', 'main_boss', NULL, true, '{"all": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    permissions = EXCLUDED.permissions;

-- Senior Manager  
INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions) VALUES
('22222222-2222-2222-2222-222222222222', 'manager@nziza.com', 'Senior Manager', 'senior_manager', NULL, true, '{"manage_users": true, "review_reports": true, "manage_factories": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    permissions = EXCLUDED.permissions;

-- Factory Manager
INSERT INTO users (id, email, full_name, role, factory_id, is_active, permissions) VALUES
('33333333-3333-3333-3333-333333333333', 'factory@nziza.com', 'Factory Manager', 'factory_manager', '11111111-1111-1111-1111-111111111111', true, '{"submit_reports": true, "manage_production": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    factory_id = EXCLUDED.factory_id,
    is_active = EXCLUDED.is_active,
    permissions = EXCLUDED.permissions;

-- Verify the users
SELECT id, email, full_name, role, factory_id, is_active 
FROM users 
WHERE email IN ('boss@nziza.com', 'manager@nziza.com', 'factory@nziza.com');