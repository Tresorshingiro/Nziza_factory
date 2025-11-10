-- ============================================
-- Remove unnecessary columns from milk_collections
-- ============================================

-- Remove quality_grade, temperature, and recorded_by columns
ALTER TABLE milk_collections DROP COLUMN IF EXISTS quality_grade;
ALTER TABLE milk_collections DROP COLUMN IF EXISTS temperature;
ALTER TABLE milk_collections DROP COLUMN IF EXISTS recorded_by;
