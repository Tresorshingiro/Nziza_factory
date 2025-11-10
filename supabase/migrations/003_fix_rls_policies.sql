-- ============================================
-- FIX RLS POLICIES
-- ============================================
-- This fixes the 406 error by simplifying the policies
-- Run this AFTER creating users with 002_demo_users.sql

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Senior managers can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Everyone can view factories" ON factories;
DROP POLICY IF EXISTS "Senior managers can manage factories" ON factories;

-- Recreate users table policies (ONE policy for SELECT, simpler)
CREATE POLICY "Authenticated users can view all users" ON users 
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert themselves" ON users 
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users 
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete themselves" ON users 
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = id);

-- Drop any existing factory policies
DROP POLICY IF EXISTS "Authenticated users can view factories" ON factories;
DROP POLICY IF EXISTS "Authenticated users can manage factories" ON factories;

-- Factories policies (allow authenticated users to read)
CREATE POLICY "Authenticated users can view factories" ON factories 
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can manage factories" ON factories 
    FOR ALL 
    TO authenticated
    USING (true);

-- Update other table policies to allow authenticated access
-- (In production, you'd want more restrictive policies based on role)

-- Farmers
DROP POLICY IF EXISTS "Factory managers see their factory data" ON farmers;
DROP POLICY IF EXISTS "Factory managers manage their farmers" ON farmers;
DROP POLICY IF EXISTS "Authenticated users can access farmers" ON farmers;

CREATE POLICY "Authenticated users can access farmers" ON farmers 
    FOR ALL 
    TO authenticated
    USING (true);

-- Milk Collections
DROP POLICY IF EXISTS "Authenticated users can access milk_collections" ON milk_collections;

CREATE POLICY "Authenticated users can access milk_collections" ON milk_collections 
    FOR ALL 
    TO authenticated
    USING (true);

-- Production Batches
DROP POLICY IF EXISTS "Authenticated users can access production_batches" ON production_batches;

CREATE POLICY "Authenticated users can access production_batches" ON production_batches 
    FOR ALL 
    TO authenticated
    USING (true);

-- Stock
DROP POLICY IF EXISTS "Authenticated users can access stock" ON stock;

CREATE POLICY "Authenticated users can access stock" ON stock 
    FOR ALL 
    TO authenticated
    USING (true);

-- Stock Movements
DROP POLICY IF EXISTS "Authenticated users can access stock_movements" ON stock_movements;

CREATE POLICY "Authenticated users can access stock_movements" ON stock_movements 
    FOR ALL 
    TO authenticated
    USING (true);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can access customers" ON customers;

CREATE POLICY "Authenticated users can access customers" ON customers 
    FOR ALL 
    TO authenticated
    USING (true);

-- Sales Orders
DROP POLICY IF EXISTS "Authenticated users can access sales_orders" ON sales_orders;

CREATE POLICY "Authenticated users can access sales_orders" ON sales_orders 
    FOR ALL 
    TO authenticated
    USING (true);

-- Sales Order Items
DROP POLICY IF EXISTS "Authenticated users can access sales_order_items" ON sales_order_items;

CREATE POLICY "Authenticated users can access sales_order_items" ON sales_order_items 
    FOR ALL 
    TO authenticated
    USING (true);

-- Invoices
DROP POLICY IF EXISTS "Authenticated users can access invoices" ON invoices;

CREATE POLICY "Authenticated users can access invoices" ON invoices 
    FOR ALL 
    TO authenticated
    USING (true);

-- Payments
DROP POLICY IF EXISTS "Authenticated users can access payments" ON payments;

CREATE POLICY "Authenticated users can access payments" ON payments 
    FOR ALL 
    TO authenticated
    USING (true);

-- Farmer Payments
DROP POLICY IF EXISTS "Authenticated users can access farmer_payments" ON farmer_payments;

CREATE POLICY "Authenticated users can access farmer_payments" ON farmer_payments 
    FOR ALL 
    TO authenticated
    USING (true);

-- Suppliers
DROP POLICY IF EXISTS "Authenticated users can access suppliers" ON suppliers;

CREATE POLICY "Authenticated users can access suppliers" ON suppliers 
    FOR ALL 
    TO authenticated
    USING (true);

-- Expenses
DROP POLICY IF EXISTS "Authenticated users can access expenses" ON expenses;

CREATE POLICY "Authenticated users can access expenses" ON expenses 
    FOR ALL 
    TO authenticated
    USING (true);

-- Purchase Orders
DROP POLICY IF EXISTS "Authenticated users can access purchase_orders" ON purchase_orders;

CREATE POLICY "Authenticated users can access purchase_orders" ON purchase_orders 
    FOR ALL 
    TO authenticated
    USING (true);

-- Daily Reports
DROP POLICY IF EXISTS "Authenticated users can access daily_reports" ON daily_reports;

CREATE POLICY "Authenticated users can access daily_reports" ON daily_reports 
    FOR ALL 
    TO authenticated
    USING (true);

-- Employees
DROP POLICY IF EXISTS "Authenticated users can access employees" ON employees;

CREATE POLICY "Authenticated users can access employees" ON employees 
    FOR ALL 
    TO authenticated
    USING (true);

-- Attendance
DROP POLICY IF EXISTS "Authenticated users can access attendance" ON attendance;

CREATE POLICY "Authenticated users can access attendance" ON attendance 
    FOR ALL 
    TO authenticated
    USING (true);

-- Payroll
DROP POLICY IF EXISTS "Authenticated users can access payroll" ON payroll;

CREATE POLICY "Authenticated users can access payroll" ON payroll 
    FOR ALL 
    TO authenticated
    USING (true);

-- Tasks
DROP POLICY IF EXISTS "Authenticated users can access tasks" ON tasks;

CREATE POLICY "Authenticated users can access tasks" ON tasks 
    FOR ALL 
    TO authenticated
    USING (true);

-- Notifications (already correct)
DROP POLICY IF EXISTS "Users see their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users see their own notifications" ON notifications 
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications 
    FOR UPDATE 
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Audit Log
DROP POLICY IF EXISTS "Senior managers can view audit logs" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

CREATE POLICY "Authenticated users can view audit logs" ON audit_log 
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "System can insert audit logs" ON audit_log 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
