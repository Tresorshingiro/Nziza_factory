-- Add factory_id to suppliers table to connect suppliers to specific factories

-- Add factory_id column to suppliers table
ALTER TABLE suppliers 
ADD COLUMN factory_id UUID REFERENCES factories(id);

-- Create index for better query performance
CREATE INDEX idx_suppliers_factory_id ON suppliers(factory_id);

-- Update RLS policies for suppliers to include factory-based access
DROP POLICY IF EXISTS "Users can view suppliers based on their factory access" ON suppliers;
DROP POLICY IF EXISTS "Factory managers can insert suppliers for their factory" ON suppliers;
DROP POLICY IF EXISTS "Factory managers can update suppliers for their factory" ON suppliers;
DROP POLICY IF EXISTS "Factory managers can delete suppliers for their factory" ON suppliers;

-- Allow users to view suppliers based on their role and factory access
CREATE POLICY "Users can view suppliers based on their factory access" 
ON suppliers FOR SELECT USING (
  CASE 
    WHEN get_user_role() = 'main_boss' THEN true
    WHEN get_user_role() = 'senior_manager' THEN true
    WHEN get_user_role() = 'factory_manager' THEN factory_id = get_user_factory()
    ELSE false
  END
);

-- Allow factory managers to insert suppliers for their factory
CREATE POLICY "Factory managers can insert suppliers for their factory" 
ON suppliers FOR INSERT WITH CHECK (
  CASE 
    WHEN get_user_role() = 'main_boss' THEN true
    WHEN get_user_role() = 'senior_manager' THEN true
    WHEN get_user_role() = 'factory_manager' THEN factory_id = get_user_factory()
    ELSE false
  END
);

-- Allow factory managers to update suppliers for their factory
CREATE POLICY "Factory managers can update suppliers for their factory" 
ON suppliers FOR UPDATE USING (
  CASE 
    WHEN get_user_role() = 'main_boss' THEN true
    WHEN get_user_role() = 'senior_manager' THEN true
    WHEN get_user_role() = 'factory_manager' THEN factory_id = get_user_factory()
    ELSE false
  END
) WITH CHECK (
  CASE 
    WHEN get_user_role() = 'main_boss' THEN true
    WHEN get_user_role() = 'senior_manager' THEN true
    WHEN get_user_role() = 'factory_manager' THEN factory_id = get_user_factory()
    ELSE false
  END
);

-- Allow factory managers to delete suppliers for their factory
CREATE POLICY "Factory managers can delete suppliers for their factory" 
ON suppliers FOR DELETE USING (
  CASE 
    WHEN get_user_role() = 'main_boss' THEN true
    WHEN get_user_role() = 'senior_manager' THEN true
    WHEN get_user_role() = 'factory_manager' THEN factory_id = get_user_factory()
    ELSE false
  END
);

-- Add some demo suppliers with factory assignments
INSERT INTO suppliers (name, supplier_code, email, phone, address, city, supplier_type, factory_id, is_active) VALUES
('Dairy Equipment Co.', 'SUP001', 'info@dairyequip.rw', '+250 788 123 456', 'KG 15 Ave', 'Kigali', 'Equipment', (SELECT id FROM factories WHERE name = 'Kigali Dairy Factory' LIMIT 1), true),
('Rwanda Packaging Ltd', 'SUP002', 'sales@packaging.rw', '+250 788 234 567', 'KN 20 St', 'Huye', 'Packaging', (SELECT id FROM factories WHERE name = 'Huye Processing Plant' LIMIT 1), true),
('Fresh Transport Services', 'SUP003', 'transport@fresh.rw', '+250 788 345 678', 'Musanze Road', 'Musanze', 'Transportation', (SELECT id FROM factories WHERE name = 'Musanze Cheese Factory' LIMIT 1), true),
('Local Farm Supplies', 'SUP004', 'supplies@localfarm.rw', '+250 788 456 789', 'Nyagatare Ave', 'Nyagatare', 'Raw Materials', (SELECT id FROM factories WHERE name = 'Nyagatare Dairy Hub' LIMIT 1), true),
('Industrial Cleaners Ltd', 'SUP005', 'clean@industrial.rw', '+250 788 567 890', 'Kigali Heights', 'Kigali', 'Services', (SELECT id FROM factories WHERE name = 'Kigali Dairy Factory' LIMIT 1), true);

-- Update existing suppliers to assign them to NZIZA factory A (assuming it exists)
-- If NZIZA factory A doesn't exist, assign to the first available factory
UPDATE suppliers 
SET factory_id = (
  SELECT id FROM factories 
  WHERE name ILIKE '%nziza%' OR code ILIKE '%nziza%' 
  LIMIT 1
)
WHERE factory_id IS NULL 
AND (
  name IN ('Manzi', 'Eddy', 'Eric', 'Kessy') 
  OR supplier_code IN ('SUPP-MANZ104', 'FARM-EDDY', 'FARM-ERIC', 'SUPP-KESS746')
);

-- If no NZIZA factory found, assign to first factory
UPDATE suppliers 
SET factory_id = (SELECT id FROM factories ORDER BY created_at LIMIT 1)
WHERE factory_id IS NULL;