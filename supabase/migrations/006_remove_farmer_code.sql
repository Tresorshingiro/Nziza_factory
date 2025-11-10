-- ============================================
-- Remove farmer code column (auto-generated not needed)
-- ============================================

-- Drop the code column and its index
DROP INDEX IF EXISTS idx_farmers_code;
ALTER TABLE farmers DROP COLUMN IF EXISTS code;

-- The farmer ID (UUID) will be used for identification instead
