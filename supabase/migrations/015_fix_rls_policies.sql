-- ============================================
-- FIX MISSING RLS POLICIES FOR FACTORY-SCOPED TABLES
-- ============================================
-- This migration adds the missing RLS policies that were commented out in the initial schema

-- ============================================
-- USERS TABLE POLICIES (Add missing INSERT/UPDATE for senior managers)
-- ============================================

CREATE POLICY "Senior managers can insert users" ON users FOR INSERT 
    WITH CHECK (get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Senior managers can update users" ON users FOR UPDATE 
    USING (get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- FACTORIES TABLE POLICIES (Add missing INSERT/UPDATE/DELETE)
-- ============================================

CREATE POLICY "Senior managers can insert factories" ON factories FOR INSERT 
    WITH CHECK (get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Senior managers can update factories" ON factories FOR UPDATE 
    USING (get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Senior managers can delete factories" ON factories FOR DELETE 
    USING (get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- MILK COLLECTIONS POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory milk collections" ON milk_collections FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their milk collections" ON milk_collections FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- FARMER PAYMENTS POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory payments" ON farmer_payments FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory payments" ON farmer_payments FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- PRODUCTION BATCHES POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory production" ON production_batches FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory production" ON production_batches FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- STOCK POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory stock" ON stock FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory stock" ON stock FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- STOCK MOVEMENTS POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory stock movements" ON stock_movements FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory stock movements" ON stock_movements FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- SALES ORDERS POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory sales orders" ON sales_orders FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory sales orders" ON sales_orders FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- SALES ORDER ITEMS POLICIES
-- ============================================

CREATE POLICY "Users can see sales order items for their orders" ON sales_order_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM sales_orders so 
        WHERE so.id = order_id 
        AND (get_user_role() = 'factory_manager' AND so.factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    ));

CREATE POLICY "Users can manage sales order items for their orders" ON sales_order_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM sales_orders so 
        WHERE so.id = order_id 
        AND (get_user_role() = 'factory_manager' AND so.factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM sales_orders so 
        WHERE so.id = order_id 
        AND (get_user_role() = 'factory_manager' AND so.factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    ));

-- ============================================
-- INVOICES POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory invoices" ON invoices FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory invoices" ON invoices FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

CREATE POLICY "Users can see payments for their invoices" ON payments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.id = invoice_id 
        AND (get_user_role() = 'factory_manager' AND i.factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    ));

CREATE POLICY "Users can manage payments for their invoices" ON payments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.id = invoice_id 
        AND (get_user_role() = 'factory_manager' AND i.factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.id = invoice_id 
        AND (get_user_role() = 'factory_manager' AND i.factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    ));

-- ============================================
-- EXPENSES POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory expenses" ON expenses FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory expenses" ON expenses FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- PURCHASE ORDERS POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory purchase orders" ON purchase_orders FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory purchase orders" ON purchase_orders FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- DAILY REPORTS POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory reports" ON daily_reports FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory reports" ON daily_reports FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- EMPLOYEES POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory employees" ON employees FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory employees" ON employees FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- ATTENDANCE POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory attendance" ON attendance FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory attendance" ON attendance FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- PAYROLL POLICIES
-- ============================================

CREATE POLICY "Factory managers see their factory payroll" ON payroll FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their factory payroll" ON payroll FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'))
    WITH CHECK (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- ============================================
-- TASKS POLICIES
-- ============================================

CREATE POLICY "Users see tasks assigned to them or in their factory" ON tasks FOR SELECT 
    USING (
        assigned_to = auth.uid() OR 
        (get_user_role() = 'factory_manager' AND factory_id = get_user_factory()) OR 
        get_user_role() IN ('senior_manager', 'main_boss')
    );

CREATE POLICY "Users can manage tasks in their scope" ON tasks FOR ALL
    USING (
        assigned_by = auth.uid() OR
        assigned_to = auth.uid() OR 
        (get_user_role() = 'factory_manager' AND factory_id = get_user_factory()) OR 
        get_user_role() IN ('senior_manager', 'main_boss')
    )
    WITH CHECK (
        assigned_by = auth.uid() OR
        (get_user_role() = 'factory_manager' AND factory_id = get_user_factory()) OR 
        get_user_role() IN ('senior_manager', 'main_boss')
    );

-- ============================================
-- GLOBAL TABLES (No factory restriction)
-- ============================================

-- CUSTOMERS (Global - no factory restriction for now)
CREATE POLICY "All authenticated users can view customers" ON customers FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Senior managers can manage customers" ON customers FOR ALL
    USING (get_user_role() IN ('senior_manager', 'main_boss', 'factory_manager'))
    WITH CHECK (get_user_role() IN ('senior_manager', 'main_boss', 'factory_manager'));

-- SUPPLIERS (Global - no factory restriction for now)
CREATE POLICY "All authenticated users can view suppliers" ON suppliers FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Senior managers can manage suppliers" ON suppliers FOR ALL
    USING (get_user_role() IN ('senior_manager', 'main_boss', 'factory_manager'))
    WITH CHECK (get_user_role() IN ('senior_manager', 'main_boss', 'factory_manager'));

-- Verify policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;