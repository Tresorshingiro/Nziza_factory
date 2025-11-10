-- ============================================
-- PRODUCTION DEMO DATA MIGRATION
-- ============================================
-- 
-- This migration adds sample production data including:
-- - Farmers and milk collections
-- - Production batches with realistic conversion ratios
-- - Stock records for raw materials and finished goods
-- - Stock movements tracking
-- 
-- Run this AFTER the demo users migration (002_demo_users.sql)
-- ============================================

-- Create additional farmers for the demo factory
INSERT INTO farmers (id, name, factory_id, phone, address, current_milk_price, payment_frequency, is_active, total_supplied, total_paid, balance) VALUES
('f1111111-1111-1111-1111-111111111111', 'Jean Baptiste', '11111111-1111-1111-1111-111111111111', '+250781234567', 'Kigali, Gasabo', 800, 'monthly', true, 15000, 12000000, 0),
('f2222222-2222-2222-2222-222222222222', 'Marie Claire', '11111111-1111-1111-1111-111111111111', '+250782345678', 'Kigali, Nyarugenge', 850, 'monthly', true, 12000, 10200000, 0),
('f3333333-3333-3333-3333-333333333333', 'Paul Kagame Jr', '11111111-1111-1111-1111-111111111111', '+250783456789', 'Kigali, Kicukiro', 900, 'weekly', true, 8000, 7200000, 0),
('f4444444-4444-4444-4444-444444444444', 'Grace Uwimana', '11111111-1111-1111-1111-111111111111', '+250784567890', 'Musanze, Ruhengeri', 750, 'monthly', true, 20000, 15000000, 0),
('f5555555-5555-5555-5555-555555555555', 'David Nkurunziza', '11111111-1111-1111-1111-111111111111', '+250785678901', 'Huye, Butare', 800, 'monthly', true, 18000, 14400000, 0)
ON CONFLICT (id) DO NOTHING;

-- Get user IDs for data insertion
DO $$
DECLARE
    factory_manager_id UUID;
    demo_factory_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Get factory manager ID
    SELECT id INTO factory_manager_id FROM auth.users WHERE email = 'factory@nziza.com';
    
    IF factory_manager_id IS NOT NULL THEN
        -- Insert milk collections for the past month (October 2025)
        INSERT INTO milk_collections (id, factory_id, farmer_id, collection_date, quantity_liters, price_per_liter, total_amount, quality_grade, temperature, recorded_by) VALUES
        -- Jean Baptiste collections
        ('mc111111-1111-1111-1111-111111111111', demo_factory_id, 'f1111111-1111-1111-1111-111111111111', '2025-10-01', 500, 800, 400000, 'A', 4.2, factory_manager_id),
        ('mc111112-1111-1111-1111-111111111111', demo_factory_id, 'f1111111-1111-1111-1111-111111111111', '2025-10-05', 600, 800, 480000, 'A', 4.1, factory_manager_id),
        ('mc111113-1111-1111-1111-111111111111', demo_factory_id, 'f1111111-1111-1111-1111-111111111111', '2025-10-10', 550, 800, 440000, 'B', 4.3, factory_manager_id),
        ('mc111114-1111-1111-1111-111111111111', demo_factory_id, 'f1111111-1111-1111-1111-111111111111', '2025-10-15', 700, 800, 560000, 'A', 4.0, factory_manager_id),
        ('mc111115-1111-1111-1111-111111111111', demo_factory_id, 'f1111111-1111-1111-1111-111111111111', '2025-10-20', 650, 800, 520000, 'A', 4.1, factory_manager_id),
        ('mc111116-1111-1111-1111-111111111111', demo_factory_id, 'f1111111-1111-1111-1111-111111111111', '2025-10-25', 800, 800, 640000, 'A', 4.2, factory_manager_id),
        
        -- Marie Claire collections
        ('mc222221-1111-1111-1111-111111111111', demo_factory_id, 'f2222222-2222-2222-2222-222222222222', '2025-10-02', 400, 850, 340000, 'A', 4.0, factory_manager_id),
        ('mc222222-1111-1111-1111-111111111111', demo_factory_id, 'f2222222-2222-2222-2222-222222222222', '2025-10-07', 450, 850, 382500, 'A', 4.1, factory_manager_id),
        ('mc222223-1111-1111-1111-111111111111', demo_factory_id, 'f2222222-2222-2222-2222-222222222222', '2025-10-12', 500, 850, 425000, 'B', 4.4, factory_manager_id),
        ('mc222224-1111-1111-1111-111111111111', demo_factory_id, 'f2222222-2222-2222-2222-222222222222', '2025-10-18', 480, 850, 408000, 'A', 4.0, factory_manager_id),
        ('mc222225-1111-1111-1111-111111111111', demo_factory_id, 'f2222222-2222-2222-2222-222222222222', '2025-10-23', 520, 850, 442000, 'A', 4.2, factory_manager_id),
        
        -- Paul Kagame Jr collections (weekly payments)
        ('mc333331-1111-1111-1111-111111111111', demo_factory_id, 'f3333333-3333-3333-3333-333333333333', '2025-10-01', 300, 900, 270000, 'A', 3.9, factory_manager_id),
        ('mc333332-1111-1111-1111-111111111111', demo_factory_id, 'f3333333-3333-3333-3333-333333333333', '2025-10-08', 350, 900, 315000, 'A', 4.0, factory_manager_id),
        ('mc333333-1111-1111-1111-111111111111', demo_factory_id, 'f3333333-3333-3333-3333-333333333333', '2025-10-15', 320, 900, 288000, 'A', 4.1, factory_manager_id),
        ('mc333334-1111-1111-1111-111111111111', demo_factory_id, 'f3333333-3333-3333-3333-333333333333', '2025-10-22', 380, 900, 342000, 'A', 4.0, factory_manager_id),
        
        -- Grace Uwimana collections
        ('mc444441-1111-1111-1111-111111111111', demo_factory_id, 'f4444444-4444-4444-4444-444444444444', '2025-10-03', 800, 750, 600000, 'A', 4.2, factory_manager_id),
        ('mc444442-1111-1111-1111-111111111111', demo_factory_id, 'f4444444-4444-4444-4444-444444444444', '2025-10-09', 900, 750, 675000, 'A', 4.1, factory_manager_id),
        ('mc444443-1111-1111-1111-111111111111', demo_factory_id, 'f4444444-4444-4444-4444-444444444444', '2025-10-16', 850, 750, 637500, 'B', 4.3, factory_manager_id),
        ('mc444444-1111-1111-1111-111111111111', demo_factory_id, 'f4444444-4444-4444-4444-444444444444', '2025-10-24', 950, 750, 712500, 'A', 4.0, factory_manager_id),
        
        -- David Nkurunziza collections
        ('mc555551-1111-1111-1111-111111111111', demo_factory_id, 'f5555555-5555-5555-5555-555555555555', '2025-10-04', 600, 800, 480000, 'A', 4.1, factory_manager_id),
        ('mc555552-1111-1111-1111-111111111111', demo_factory_id, 'f5555555-5555-5555-5555-555555555555', '2025-10-11', 700, 800, 560000, 'A', 4.0, factory_manager_id),
        ('mc555553-1111-1111-1111-111111111111', demo_factory_id, 'f5555555-5555-5555-5555-555555555555', '2025-10-19', 650, 800, 520000, 'A', 4.2, factory_manager_id),
        ('mc555554-1111-1111-1111-111111111111', demo_factory_id, 'f5555555-5555-5555-5555-555555555555', '2025-10-26', 750, 800, 600000, 'A', 4.1, factory_manager_id)
        ON CONFLICT (id) DO NOTHING;

        -- Insert production batches with realistic conversion ratios
        -- Gouda: 10L milk = 1kg cheese
        -- Cheddar: 8L milk = 1kg cheese  
        -- Mozzarella: 6L milk = 1kg cheese
        INSERT INTO production_batches (id, factory_id, batch_number, production_date, cheese_type, milk_used_liters, cheese_produced_kg, conversion_ratio, waste_kg, byproduct_kg, quality_score, supervisor_id, status) VALUES
        -- October 2025 Gouda Production
        ('pb111111-1111-1111-1111-111111111111', demo_factory_id, 'GOUDA-2025-10-001', '2025-10-05', 'gouda', 1000, 100, 10.0, 2.5, 15.0, 95, factory_manager_id, 'completed'),
        ('pb111112-1111-1111-1111-111111111111', demo_factory_id, 'GOUDA-2025-10-002', '2025-10-10', 'gouda', 1200, 120, 10.0, 3.0, 18.0, 92, factory_manager_id, 'completed'),
        ('pb111113-1111-1111-1111-111111111111', demo_factory_id, 'GOUDA-2025-10-003', '2025-10-15', 'gouda', 1500, 150, 10.0, 4.0, 22.5, 96, factory_manager_id, 'completed'),
        ('pb111114-1111-1111-1111-111111111111', demo_factory_id, 'GOUDA-2025-10-004', '2025-10-20', 'gouda', 1800, 180, 10.0, 5.0, 27.0, 94, factory_manager_id, 'completed'),
        ('pb111115-1111-1111-1111-111111111111', demo_factory_id, 'GOUDA-2025-10-005', '2025-10-25', 'gouda', 2000, 200, 10.0, 6.0, 30.0, 97, factory_manager_id, 'completed'),
        
        -- October 2025 Cheddar Production
        ('pb222221-1111-1111-1111-111111111111', demo_factory_id, 'CHEDDAR-2025-10-001', '2025-10-07', 'cheddar', 800, 100, 8.0, 2.0, 12.0, 93, factory_manager_id, 'completed'),
        ('pb222222-1111-1111-1111-111111111111', demo_factory_id, 'CHEDDAR-2025-10-002', '2025-10-14', 'cheddar', 1000, 125, 8.0, 3.0, 15.0, 89, factory_manager_id, 'completed'),
        ('pb222223-1111-1111-1111-1111111111111', demo_factory_id, 'CHEDDAR-2025-10-003', '2025-10-21', 'cheddar', 1200, 150, 8.0, 4.0, 18.0, 91, factory_manager_id, 'completed'),
        ('pb222224-1111-1111-1111-111111111111', demo_factory_id, 'CHEDDAR-2025-10-004', '2025-10-28', 'cheddar', 800, 100, 8.0, 2.5, 12.0, 95, factory_manager_id, 'in_progress'),
        
        -- October 2025 Mozzarella Production
        ('pb333331-1111-1111-1111-111111111111', demo_factory_id, 'MOZZARELLA-2025-10-001', '2025-10-08', 'mozzarella', 600, 100, 6.0, 1.5, 9.0, 98, factory_manager_id, 'completed'),
        ('pb333332-1111-1111-1111-111111111111', demo_factory_id, 'MOZZARELLA-2025-10-002', '2025-10-16', 'mozzarella', 900, 150, 6.0, 2.5, 13.5, 96, factory_manager_id, 'completed'),
        ('pb333333-1111-1111-1111-111111111111', demo_factory_id, 'MOZZARELLA-2025-10-003', '2025-10-24', 'mozzarella', 720, 120, 6.0, 2.0, 10.8, 94, factory_manager_id, 'completed')
        ON CONFLICT (id) DO NOTHING;

        -- Insert initial stock records
        INSERT INTO stock (id, factory_id, stock_type, item_name, item_code, cheese_type, quantity, unit, unit_cost, total_value, reorder_level, location, last_updated_by) VALUES
        -- Raw Milk Stock
        ('st111111-1111-1111-1111-111111111111', demo_factory_id, 'raw_milk', 'Fresh Milk', 'MILK-001', NULL, 5000, 'liters', 800, 4000000, 1000, 'Cold Storage A', factory_manager_id),
        
        -- Finished Goods - Gouda
        ('st222221-1111-1111-1111-111111111111', demo_factory_id, 'finished_goods', 'Gouda Cheese', 'GOUDA-001', 'gouda', 750, 'kg', 8000, 6000000, 100, 'Aging Room 1', factory_manager_id),
        
        -- Finished Goods - Cheddar
        ('st333331-1111-1111-1111-111111111111', demo_factory_id, 'finished_goods', 'Cheddar Cheese', 'CHEDDAR-001', 'cheddar', 475, 'kg', 7500, 3562500, 50, 'Aging Room 2', factory_manager_id),
        
        -- Finished Goods - Mozzarella
        ('st444441-1111-1111-1111-111111111111', demo_factory_id, 'finished_goods', 'Mozzarella Cheese', 'MOZZARELLA-001', 'mozzarella', 370, 'kg', 9000, 3330000, 30, 'Fresh Storage', factory_manager_id),
        
        -- Byproducts
        ('st555551-1111-1111-1111-111111111111', demo_factory_id, 'byproduct', 'Whey Protein', 'WHEY-001', NULL, 120, 'kg', 2000, 240000, 20, 'Byproduct Storage', factory_manager_id),
        ('st555552-1111-1111-1111-111111111111', demo_factory_id, 'byproduct', 'Cheese Waste', 'WASTE-001', NULL, 25, 'kg', 500, 12500, 10, 'Waste Area', factory_manager_id)
        ON CONFLICT (id) DO NOTHING;

        -- Insert stock movements for production batches
        INSERT INTO stock_movements (id, stock_id, factory_id, movement_type, quantity, reason, reference_id, reference_type, recorded_by) VALUES
        -- Milk consumption for Gouda batch 1
        ('sm111111-1111-1111-1111-111111111111', 'st111111-1111-1111-1111-111111111111', demo_factory_id, 'out', 1000, 'Used for Gouda production', 'pb111111-1111-1111-1111-111111111111', 'production_batch', factory_manager_id),
        -- Gouda production output
        ('sm111112-1111-1111-1111-111111111111', 'st222221-1111-1111-1111-111111111111', demo_factory_id, 'in', 100, 'Gouda production batch completed', 'pb111111-1111-1111-1111-111111111111', 'production_batch', factory_manager_id),
        -- Whey byproduct from Gouda
        ('sm111113-1111-1111-1111-111111111111', 'st555551-1111-1111-1111-111111111111', demo_factory_id, 'in', 15, 'Whey from Gouda production', 'pb111111-1111-1111-1111-111111111111', 'production_batch', factory_manager_id),
        
        -- Milk consumption for Cheddar batch 1
        ('sm222221-1111-1111-1111-111111111111', 'st111111-1111-1111-1111-111111111111', demo_factory_id, 'out', 800, 'Used for Cheddar production', 'pb222221-1111-1111-1111-111111111111', 'production_batch', factory_manager_id),
        -- Cheddar production output
        ('sm222222-1111-1111-1111-111111111111', 'st333331-1111-1111-1111-111111111111', demo_factory_id, 'in', 100, 'Cheddar production batch completed', 'pb222221-1111-1111-1111-111111111111', 'production_batch', factory_manager_id),
        
        -- Milk consumption for Mozzarella batch 1
        ('sm333331-1111-1111-1111-111111111111', 'st111111-1111-1111-1111-111111111111', demo_factory_id, 'out', 600, 'Used for Mozzarella production', 'pb333331-1111-1111-1111-111111111111', 'production_batch', factory_manager_id),
        -- Mozzarella production output
        ('sm333332-1111-1111-1111-111111111111', 'st444441-1111-1111-1111-111111111111', demo_factory_id, 'in', 100, 'Mozzarella production batch completed', 'pb333331-1111-1111-1111-111111111111', 'production_batch', factory_manager_id)
        ON CONFLICT (id) DO NOTHING;

    END IF;
END $$;

-- Update farmer totals based on milk collections
UPDATE farmers SET 
    total_supplied = (
        SELECT COALESCE(SUM(quantity_liters), 0) 
        FROM milk_collections 
        WHERE farmer_id = farmers.id
    ),
    total_paid = (
        SELECT COALESCE(SUM(total_amount), 0) 
        FROM milk_collections 
        WHERE farmer_id = farmers.id
    ),
    balance = 0  -- Assuming all payments are up to date
WHERE factory_id = '11111111-1111-1111-1111-111111111111';

-- Verify the data was inserted correctly
SELECT 
    'Farmers' as table_name,
    COUNT(*) as record_count
FROM farmers
WHERE factory_id = '11111111-1111-1111-1111-111111111111'

UNION ALL

SELECT 
    'Milk Collections' as table_name,
    COUNT(*) as record_count
FROM milk_collections
WHERE factory_id = '11111111-1111-1111-1111-111111111111'

UNION ALL

SELECT 
    'Production Batches' as table_name,
    COUNT(*) as record_count
FROM production_batches
WHERE factory_id = '11111111-1111-1111-1111-111111111111'

UNION ALL

SELECT 
    'Stock Items' as table_name,
    COUNT(*) as record_count
FROM stock
WHERE factory_id = '11111111-1111-1111-1111-111111111111'

UNION ALL

SELECT 
    'Stock Movements' as table_name,
    COUNT(*) as record_count
FROM stock_movements
WHERE factory_id = '11111111-1111-1111-1111-111111111111';

-- Show production summary
SELECT 
    pb.cheese_type,
    COUNT(*) as batch_count,
    SUM(pb.milk_used_liters) as total_milk_used,
    SUM(pb.cheese_produced_kg) as total_cheese_produced,
    ROUND(AVG(pb.conversion_ratio), 2) as avg_conversion_ratio,
    ROUND(AVG(pb.quality_score), 1) as avg_quality_score
FROM production_batches pb
WHERE pb.factory_id = '11111111-1111-1111-1111-111111111111'
GROUP BY pb.cheese_type
ORDER BY pb.cheese_type;