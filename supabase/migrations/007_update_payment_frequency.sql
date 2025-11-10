-- ============================================
-- Update payment frequency to include 'daily'
-- ============================================

-- Drop the old constraint
ALTER TABLE farmers DROP CONSTRAINT IF EXISTS farmers_payment_frequency_check;

-- Add the new constraint with 'daily' option
ALTER TABLE farmers ADD CONSTRAINT farmers_payment_frequency_check 
CHECK (payment_frequency IN ('daily', 'weekly', 'monthly'));
