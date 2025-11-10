-- Add payment fields to milk_collections table
-- ============================================

-- Add payment method columns to milk_collections
ALTER TABLE milk_collections 
ADD COLUMN payment_method TEXT,
ADD COLUMN mobile_number TEXT,
ADD COLUMN bank_account TEXT,
ADD COLUMN reference_number TEXT;

-- Create index for payment method for better query performance
CREATE INDEX idx_milk_collections_payment_method ON milk_collections(payment_method);

-- Comment the new columns
COMMENT ON COLUMN milk_collections.payment_method IS 'Payment method used: cash, bank_transfer, mobile_money, check';
COMMENT ON COLUMN milk_collections.mobile_number IS 'Mobile number for mobile money payments';
COMMENT ON COLUMN milk_collections.bank_account IS 'Bank account number for bank transfers';
COMMENT ON COLUMN milk_collections.reference_number IS 'Transaction reference number for electronic payments';