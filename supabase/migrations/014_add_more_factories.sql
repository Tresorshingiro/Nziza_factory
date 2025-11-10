-- ============================================
-- CREATE NEW FACTORIES AND DEMO DATA
-- ============================================
-- Run this script to create additional factories for testing
-- Make sure you have the initial schema and demo users set up first

-- Insert additional factories
INSERT INTO factories (id, name, code, location, address, phone, email, status, capacity, notes) VALUES
('22222222-2222-2222-2222-222222222222', 'NZIZA North Factory', 'NF-001', 'Musanze, Rwanda', 'Musanze District, Northern Province', '+250 788 111 222', 'north@nziza.com', 'active', 15000, 'Main northern production facility'),
('33333333-3333-3333-3333-333333333333', 'NZIZA South Factory', 'SF-001', 'Huye, Rwanda', 'Huye District, Southern Province', '+250 788 333 444', 'south@nziza.com', 'active', 12000, 'Southern regional factory'),
('44444444-4444-4444-4444-444444444444', 'NZIZA East Factory', 'EF-001', 'Kayonza, Rwanda', 'Kayonza District, Eastern Province', '+250 788 555 666', 'east@nziza.com', 'active', 8000, 'Eastern expansion facility'),
('55555555-5555-5555-5555-555555555555', 'NZIZA West Factory', 'WF-001', 'Rusizi, Rwanda', 'Rusizi District, Western Province', '+250 788 777 888', 'west@nziza.com', 'active', 10000, 'Western border factory')
ON CONFLICT (id) DO NOTHING;

-- Create some demo suppliers
INSERT INTO suppliers (id, name, supplier_code, email, phone, address, supplier_type, is_active) VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'Rwanda Energy Group', 'REG-001', 'billing@reg.rw', '+250 252 123 456', 'Kigali, Rwanda', 'Utilities', true),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'Dairy Equipment Co.', 'DEC-001', 'sales@dairyequip.rw', '+250 788 234 567', 'Kigali, Rwanda', 'Equipment', true),
('cccc3333-cccc-3333-cccc-333333333333', 'Fresh Transport Ltd', 'FTL-001', 'dispatch@freshtransport.rw', '+250 788 345 678', 'Musanze, Rwanda', 'Transportation', true),
('dddd4444-dddd-4444-dddd-444444444444', 'Rwanda Packaging Ltd', 'RPL-001', 'orders@packaging.rw', '+250 788 456 789', 'Huye, Rwanda', 'Packaging', true)
ON CONFLICT (id) DO NOTHING;

-- Create some demo customers
INSERT INTO customers (id, name, customer_code, email, phone, address, customer_type, is_active) VALUES
('1111aaaa-1111-aaaa-1111-aaaaaaaaaaaa', 'Kigali Supermarkets', 'KS-001', 'procurement@kigalisupermarkets.rw', '+250 788 111 111', 'Kigali, Rwanda', 'wholesale', true),
('2222bbbb-2222-bbbb-2222-bbbbbbbbbbbb', 'Rwanda Hotels Group', 'RHG-001', 'purchasing@rwandahotels.com', '+250 788 222 222', 'Kigali, Rwanda', 'wholesale', true),
('3333cccc-3333-cccc-3333-cccccccccccc', 'City Retail Chain', 'CRC-001', 'buyers@cityretail.rw', '+250 788 333 333', 'Huye, Rwanda', 'retail', true),
('4444dddd-4444-dddd-4444-dddddddddddd', 'East Africa Distributors', 'EAD-001', 'orders@eastafricadist.com', '+250 788 444 444', 'Kayonza, Rwanda', 'distributor', true)
ON CONFLICT (id) DO NOTHING;

-- Verify the factories were created
SELECT f.id, f.name, f.code, f.location, f.status, u.full_name as manager_name
FROM factories f
LEFT JOIN users u ON f.manager_id = u.id
ORDER BY f.name;

-- Show available factories without managers
SELECT f.id, f.name, f.code, f.location 
FROM factories f 
WHERE f.manager_id IS NULL 
AND f.status = 'active'
ORDER BY f.name;

-- Show current users
SELECT u.id, u.email, u.full_name, u.role, f.name as factory_name
FROM users u
LEFT JOIN factories f ON u.factory_id = f.id
ORDER BY u.role, u.full_name;