-- NZIZA Factory Management System Database Schema
-- This file contains all table definitions, indexes, and Row Level Security policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('main_boss', 'senior_manager', 'factory_manager');
CREATE TYPE factory_status AS ENUM ('active', 'frozen');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'approved', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE stock_type AS ENUM ('raw_milk', 'finished_goods', 'byproduct');
CREATE TYPE cheese_type AS ENUM ('gouda', 'cheddar', 'mozzarella', 'other');

-- ============================================
-- FACTORIES (Created first to avoid FK issues)
-- ============================================

CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    location TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    manager_id UUID, -- Will add FK constraint later
    status factory_status DEFAULT 'active',
    capacity NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_factories_status ON factories(status);
CREATE INDEX idx_factories_code ON factories(code);

-- ============================================
-- USERS AND AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    factory_id UUID REFERENCES factories(id),
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_factory ON users(factory_id);
CREATE INDEX idx_users_email ON users(email);

-- Add foreign key constraint for factories.manager_id now that users table exists
ALTER TABLE factories ADD CONSTRAINT fk_factories_manager 
    FOREIGN KEY (manager_id) REFERENCES users(id);

-- ============================================
-- FARMERS
-- ============================================

CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    phone TEXT,
    address TEXT,
    bank_account TEXT,
    current_milk_price NUMERIC DEFAULT 0,
    payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('daily', 'weekly', 'monthly')),
    is_active BOOLEAN DEFAULT true,
    total_supplied NUMERIC DEFAULT 0,
    total_paid NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farmers_factory ON farmers(factory_id);
CREATE INDEX idx_farmers_code ON farmers(code);
CREATE INDEX idx_farmers_active ON farmers(is_active);

-- ============================================
-- MILK COLLECTION
-- ============================================

CREATE TABLE milk_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    collection_date DATE NOT NULL,
    quantity_liters NUMERIC NOT NULL CHECK (quantity_liters > 0),
    price_per_liter NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    quality_grade TEXT,
    temperature NUMERIC,
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milk_collections_factory ON milk_collections(factory_id);
CREATE INDEX idx_milk_collections_farmer ON milk_collections(farmer_id);
CREATE INDEX idx_milk_collections_date ON milk_collections(collection_date);

-- ============================================
-- FARMER PAYMENTS
-- ============================================

CREATE TABLE farmer_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farmer_payments_farmer ON farmer_payments(farmer_id);
CREATE INDEX idx_farmer_payments_factory ON farmer_payments(factory_id);
CREATE INDEX idx_farmer_payments_date ON farmer_payments(payment_date);

-- ============================================
-- PRODUCTION
-- ============================================

CREATE TABLE production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    batch_number TEXT UNIQUE NOT NULL,
    production_date DATE NOT NULL,
    cheese_type cheese_type NOT NULL,
    milk_used_liters NUMERIC NOT NULL CHECK (milk_used_liters > 0),
    cheese_produced_kg NUMERIC NOT NULL CHECK (cheese_produced_kg > 0),
    conversion_ratio NUMERIC NOT NULL,
    waste_kg NUMERIC DEFAULT 0,
    byproduct_kg NUMERIC DEFAULT 0,
    quality_score NUMERIC CHECK (quality_score BETWEEN 0 AND 100),
    notes TEXT,
    supervisor_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_production_factory ON production_batches(factory_id);
CREATE INDEX idx_production_date ON production_batches(production_date);
CREATE INDEX idx_production_batch_number ON production_batches(batch_number);

-- ============================================
-- INVENTORY/STOCK
-- ============================================

CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    stock_type stock_type NOT NULL,
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    cheese_type cheese_type,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    unit_cost NUMERIC DEFAULT 0,
    total_value NUMERIC DEFAULT 0,
    reorder_level NUMERIC DEFAULT 0,
    location TEXT,
    batch_id UUID REFERENCES production_batches(id),
    expiry_date DATE,
    last_updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(factory_id, item_code)
);

CREATE INDEX idx_stock_factory ON stock(factory_id);
CREATE INDEX idx_stock_type ON stock(stock_type);
CREATE INDEX idx_stock_cheese_type ON stock(cheese_type);
CREATE INDEX idx_stock_item_code ON stock(item_code);

-- ============================================
-- STOCK MOVEMENTS
-- ============================================

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID REFERENCES stock(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_stock ON stock_movements(stock_id);
CREATE INDEX idx_stock_movements_factory ON stock_movements(factory_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    customer_code TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    customer_type TEXT DEFAULT 'retail' CHECK (customer_type IN ('wholesale', 'retail', 'distributor')),
    tax_id TEXT,
    credit_limit NUMERIC DEFAULT 0,
    outstanding_balance NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_active ON customers(is_active);

-- ============================================
-- SALES ORDERS
-- ============================================

CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    order_date DATE NOT NULL,
    delivery_date DATE,
    status order_status DEFAULT 'pending',
    subtotal NUMERIC NOT NULL,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_terms TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_orders_factory ON sales_orders(factory_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX idx_sales_orders_number ON sales_orders(order_number);

-- ============================================
-- SALES ORDER ITEMS
-- ============================================

CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stock(id),
    cheese_type cheese_type NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON sales_order_items(order_id);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC NOT NULL,
    tax NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    amount_paid NUMERIC DEFAULT 0,
    balance NUMERIC NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    received_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- ============================================
-- SUPPLIERS
-- ============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    supplier_code TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    supplier_type TEXT NOT NULL,
    tax_id TEXT,
    payment_terms TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- ============================================
-- EXPENSES
-- ============================================

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    expense_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    supplier_id UUID REFERENCES suppliers(id),
    expense_date DATE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    tax NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    status expense_status DEFAULT 'pending',
    description TEXT NOT NULL,
    receipt_url TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_factory ON expenses(factory_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);

-- ============================================
-- PURCHASE ORDERS
-- ============================================

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT UNIQUE NOT NULL,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    subtotal NUMERIC NOT NULL,
    tax NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_factory ON purchase_orders(factory_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);

-- ============================================
-- DAILY REPORTS
-- ============================================

CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    milk_intake_liters NUMERIC NOT NULL,
    production_output_kg NUMERIC NOT NULL,
    stock_summary JSONB DEFAULT '{}',
    sales_summary JSONB DEFAULT '{}',
    expenses_total NUMERIC DEFAULT 0,
    notes TEXT,
    status report_status DEFAULT 'pending',
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(factory_id, report_date)
);

CREATE INDEX idx_daily_reports_factory ON daily_reports(factory_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_status ON daily_reports(status);

-- ============================================
-- HR MANAGEMENT
-- ============================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT UNIQUE NOT NULL,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    position TEXT NOT NULL,
    department TEXT NOT NULL,
    hire_date DATE NOT NULL,
    salary NUMERIC NOT NULL,
    bank_account TEXT,
    id_number TEXT,
    address TEXT,
    emergency_contact TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_factory ON employees(factory_id);
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_active ON employees(is_active);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    hours_worked NUMERIC,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);

CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary NUMERIC NOT NULL,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    overtime_pay NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    payment_date DATE,
    payment_method TEXT,
    reference_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_factory ON payroll(factory_id);
CREATE INDEX idx_payroll_period ON payroll(pay_period_start, pay_period_end);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    factory_id UUID REFERENCES factories(id),
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    due_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_factory ON tasks(factory_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'alert', 'success')),
    reference_id UUID,
    reference_type TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON factories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milk_collections_updated_at BEFORE UPDATE ON milk_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farmer_payments_updated_at BEFORE UPDATE ON farmer_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON daily_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's factory
CREATE OR REPLACE FUNCTION get_user_factory()
RETURNS UUID AS $$
    SELECT factory_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Senior managers can manage all users" ON users FOR ALL USING (get_user_role() IN ('senior_manager', 'main_boss'));

-- Factories policies
CREATE POLICY "Everyone can view factories" ON factories FOR SELECT USING (true);
CREATE POLICY "Senior managers can manage factories" ON factories FOR ALL USING (get_user_role() IN ('senior_manager', 'main_boss'));

-- Factory-scoped policies (Factory managers see only their factory, others see all)
CREATE POLICY "Factory managers see their factory data" ON farmers FOR SELECT 
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

CREATE POLICY "Factory managers manage their farmers" ON farmers FOR ALL
    USING (get_user_role() = 'factory_manager' AND factory_id = get_user_factory() OR get_user_role() IN ('senior_manager', 'main_boss'));

-- Apply similar patterns to other factory-scoped tables
-- (milk_collections, production_batches, stock, sales_orders, expenses, etc.)

-- Notifications policies
CREATE POLICY "Users see their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Audit log policies (read-only for senior managers)
CREATE POLICY "Senior managers can view audit logs" ON audit_log FOR SELECT 
    USING (get_user_role() IN ('senior_manager', 'main_boss'));
