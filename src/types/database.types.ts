export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// User Roles
export type UserRole = 'main_boss' | 'senior_manager' | 'factory_manager'

// Factory Status
export type FactoryStatus = 'active' | 'frozen'

// Report Status
export type ReportStatus = 'pending' | 'reviewed' | 'approved' | 'rejected'

// Payment Status
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'

// Order Status
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

// Expense Status
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid'

// Stock Type
export type StockType = 'raw_milk' | 'finished_goods' | 'byproduct'

// Cheese Type - Now allows any string (no enum constraint)
export type CheeseType = string

// Main Stock Movement Type
export type MainStockMovementType = 'in' | 'out' | 'adjustment' | 'transfer_from_factory' | 'distribution'

// Transfer Status
export type TransferStatus = 'pending' | 'completed' | 'failed'

export interface Database {
  public: {
    Tables: {
      // Users and Permissions
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          factory_id: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          permissions: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: UserRole
          factory_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          permissions?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          factory_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          permissions?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Factories
      factories: {
        Row: {
          id: string
          name: string
          code: string
          location: string
          address: string | null
          phone: string | null
          email: string | null
          manager_id: string | null
          status: FactoryStatus
          capacity: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          location: string
          address?: string | null
          phone?: string | null
          email?: string | null
          manager_id?: string | null
          status?: FactoryStatus
          capacity?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          location?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          manager_id?: string | null
          status?: FactoryStatus
          capacity?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Farmers
      farmers: {
        Row: {
          id: string
          name: string
          code: string
          factory_id: string
          phone: string | null
          address: string | null
          bank_account: string | null
          current_milk_price: number
          payment_frequency: 'weekly' | 'monthly'
          is_active: boolean
          total_supplied: number
          total_paid: number
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          factory_id: string
          phone?: string | null
          address?: string | null
          bank_account?: string | null
          current_milk_price?: number
          payment_frequency?: 'weekly' | 'monthly'
          is_active?: boolean
          total_supplied?: number
          total_paid?: number
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          factory_id?: string
          phone?: string | null
          address?: string | null
          bank_account?: string | null
          current_milk_price?: number
          payment_frequency?: 'weekly' | 'monthly'
          is_active?: boolean
          total_supplied?: number
          total_paid?: number
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      
      // Milk Collection
      milk_collections: {
        Row: {
          id: string
          factory_id: string
          farmer_id: string
          collection_date: string
          quantity_liters: number
          price_per_liter: number
          total_amount: number
          payment_method: string | null
          mobile_number: string | null
          bank_account: string | null
          reference_number: string | null
          quality_grade: string | null
          temperature: number | null
          notes: string | null
          recorded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          farmer_id: string
          collection_date: string
          quantity_liters: number
          price_per_liter: number
          total_amount: number
          payment_method?: string | null
          mobile_number?: string | null
          bank_account?: string | null
          reference_number?: string | null
          quality_grade?: string | null
          temperature?: number | null
          notes?: string | null
          recorded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          farmer_id?: string
          collection_date?: string
          quantity_liters?: number
          price_per_liter?: number
          total_amount?: number
          payment_method?: string | null
          mobile_number?: string | null
          bank_account?: string | null
          reference_number?: string | null
          quality_grade?: string | null
          temperature?: number | null
          notes?: string | null
          recorded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Farmer Payments
      farmer_payments: {
        Row: {
          id: string
          farmer_id: string
          factory_id: string
          payment_date: string
          amount: number
          period_start: string
          period_end: string
          payment_method: string
          reference_number: string | null
          notes: string | null
          processed_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          factory_id: string
          payment_date: string
          amount: number
          period_start: string
          period_end: string
          payment_method: string
          reference_number?: string | null
          notes?: string | null
          processed_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          factory_id?: string
          payment_date?: string
          amount?: number
          period_start?: string
          period_end?: string
          payment_method?: string
          reference_number?: string | null
          notes?: string | null
          processed_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Production Batches
      production_batches: {
        Row: {
          id: string
          factory_id: string
          batch_number: string
          production_date: string
          cheese_type: string
          milk_used_liters: number
          cheese_produced_kg: number
          conversion_ratio: number
          waste_kg: number | null
          byproduct_kg: number | null
          quality_score: number | null
          notes: string | null
          supervisor_id: string
          status: 'in_progress' | 'completed' | 'failed'
          transfer_status: 'pending' | 'transferred'
          transfer_date: string | null
          transferred_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          batch_number: string
          production_date: string
          cheese_type: string
          milk_used_liters: number
          cheese_produced_kg: number
          conversion_ratio: number
          waste_kg?: number | null
          byproduct_kg?: number | null
          quality_score?: number | null
          notes?: string | null
          supervisor_id: string
          status?: 'in_progress' | 'completed' | 'failed'
          transfer_status?: 'pending' | 'transferred'
          transfer_date?: string | null
          transferred_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          batch_number?: string
          production_date?: string
          cheese_type?: string
          milk_used_liters?: number
          cheese_produced_kg?: number
          conversion_ratio?: number
          waste_kg?: number | null
          byproduct_kg?: number | null
          quality_score?: number | null
          notes?: string | null
          supervisor_id?: string
          status?: 'in_progress' | 'completed' | 'failed'
          transfer_status?: 'pending' | 'transferred'
          transfer_date?: string | null
          transferred_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Inventory/Stock
      stock: {
        Row: {
          id: string
          factory_id: string
          stock_type: StockType
          item_name: string
          item_code: string
          cheese_type: CheeseType | null
          quantity: number
          unit: string
          unit_cost: number
          total_value: number
          reorder_level: number
          location: string | null
          batch_id: string | null
          expiry_date: string | null
          last_updated_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          stock_type: StockType
          item_name: string
          item_code: string
          cheese_type?: CheeseType | null
          quantity: number
          unit: string
          unit_cost?: number
          total_value?: number
          reorder_level?: number
          location?: string | null
          batch_id?: string | null
          expiry_date?: string | null
          last_updated_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          stock_type?: StockType
          item_name?: string
          item_code?: string
          cheese_type?: CheeseType | null
          quantity?: number
          unit?: string
          unit_cost?: number
          total_value?: number
          reorder_level?: number
          location?: string | null
          batch_id?: string | null
          expiry_date?: string | null
          last_updated_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Stock Movements
      stock_movements: {
        Row: {
          id: string
          stock_id: string
          factory_id: string
          movement_type: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          recorded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          stock_id: string
          factory_id: string
          movement_type: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          recorded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          stock_id?: string
          factory_id?: string
          movement_type?: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          recorded_by?: string
          created_at?: string
        }
      }
      
      // Customers
      customers: {
        Row: {
          id: string
          name: string
          customer_code: string
          email: string | null
          phone: string
          address: string | null
          city: string | null
          customer_type: 'wholesale' | 'retail' | 'distributor'
          tax_id: string | null
          credit_limit: number
          outstanding_balance: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          customer_code: string
          email?: string | null
          phone: string
          address?: string | null
          city?: string | null
          customer_type?: 'wholesale' | 'retail' | 'distributor'
          tax_id?: string | null
          credit_limit?: number
          outstanding_balance?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          customer_code?: string
          email?: string | null
          phone?: string
          address?: string | null
          city?: string | null
          customer_type?: 'wholesale' | 'retail' | 'distributor'
          tax_id?: string | null
          credit_limit?: number
          outstanding_balance?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Sales Orders
      sales_orders: {
        Row: {
          id: string
          order_number: string
          factory_id: string
          customer_id: string
          order_date: string
          delivery_date: string | null
          status: OrderStatus
          subtotal: number
          tax: number
          discount: number
          total: number
          payment_status: PaymentStatus
          payment_terms: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          factory_id: string
          customer_id: string
          order_date: string
          delivery_date?: string | null
          status?: OrderStatus
          subtotal: number
          tax?: number
          discount?: number
          total: number
          payment_status?: PaymentStatus
          payment_terms?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          factory_id?: string
          customer_id?: string
          order_date?: string
          delivery_date?: string | null
          status?: OrderStatus
          subtotal?: number
          tax?: number
          discount?: number
          total?: number
          payment_status?: PaymentStatus
          payment_terms?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Sales Order Items
      sales_order_items: {
        Row: {
          id: string
          order_id: string
          stock_id: string
          cheese_type: CheeseType
          quantity: number
          unit_price: number
          discount: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          stock_id: string
          cheese_type: CheeseType
          quantity: number
          unit_price: number
          discount?: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          stock_id?: string
          cheese_type?: CheeseType
          quantity?: number
          unit_price?: number
          discount?: number
          subtotal?: number
          created_at?: string
        }
      }
      
      // Invoices
      invoices: {
        Row: {
          id: string
          invoice_number: string
          order_id: string
          factory_id: string
          customer_id: string
          invoice_date: string
          due_date: string
          subtotal: number
          tax: number
          total: number
          amount_paid: number
          balance: number
          payment_status: PaymentStatus
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          order_id: string
          factory_id: string
          customer_id: string
          invoice_date: string
          due_date: string
          subtotal: number
          tax: number
          total: number
          amount_paid?: number
          balance: number
          payment_status?: PaymentStatus
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          order_id?: string
          factory_id?: string
          customer_id?: string
          invoice_date?: string
          due_date?: string
          subtotal?: number
          tax?: number
          total?: number
          amount_paid?: number
          balance?: number
          payment_status?: PaymentStatus
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Payments
      payments: {
        Row: {
          id: string
          invoice_id: string
          customer_id: string
          payment_date: string
          amount: number
          payment_method: string
          reference_number: string | null
          notes: string | null
          received_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          customer_id: string
          payment_date: string
          amount: number
          payment_method: string
          reference_number?: string | null
          notes?: string | null
          received_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          customer_id?: string
          payment_date?: string
          amount?: number
          payment_method?: string
          reference_number?: string | null
          notes?: string | null
          received_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Suppliers
      suppliers: {
        Row: {
          id: string
          name: string
          supplier_code: string
          email: string | null
          phone: string
          address: string | null
          city: string | null
          supplier_type: string
          factory_id: string | null
          tax_id: string | null
          payment_terms: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          supplier_code: string
          email?: string | null
          phone: string
          address?: string | null
          city?: string | null
          supplier_type: string
          factory_id?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          supplier_code?: string
          email?: string | null
          phone?: string
          address?: string | null
          city?: string | null
          supplier_type?: string
          tax_id?: string | null
          payment_terms?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Expenses
      expenses: {
        Row: {
          id: string
          factory_id: string
          expense_number: string
          category: string
          subcategory: string | null
          supplier_id: string | null
          expense_date: string
          amount: number
          tax: number
          total: number
          payment_method: string | null
          reference_number: string | null
          status: ExpenseStatus
          description: string
          receipt_url: string | null
          approved_by: string | null
          approved_at: string | null
          recorded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          expense_number: string
          category: string
          subcategory?: string | null
          supplier_id?: string | null
          expense_date: string
          amount: number
          tax?: number
          total: number
          payment_method?: string | null
          reference_number?: string | null
          status?: ExpenseStatus
          description: string
          receipt_url?: string | null
          approved_by?: string | null
          approved_at?: string | null
          recorded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          expense_number?: string
          category?: string
          subcategory?: string | null
          supplier_id?: string | null
          expense_date?: string
          amount?: number
          tax?: number
          total?: number
          payment_method?: string | null
          reference_number?: string | null
          status?: ExpenseStatus
          description?: string
          receipt_url?: string | null
          approved_by?: string | null
          approved_at?: string | null
          recorded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Purchase Orders
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          factory_id: string
          supplier_id: string
          order_date: string
          expected_delivery: string | null
          status: 'draft' | 'sent' | 'received' | 'cancelled'
          subtotal: number
          tax: number
          total: number
          notes: string | null
          created_by: string
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_number: string
          factory_id: string
          supplier_id: string
          order_date: string
          expected_delivery?: string | null
          status?: 'draft' | 'sent' | 'received' | 'cancelled'
          subtotal: number
          tax?: number
          total: number
          notes?: string | null
          created_by: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_number?: string
          factory_id?: string
          supplier_id?: string
          order_date?: string
          expected_delivery?: string | null
          status?: 'draft' | 'sent' | 'received' | 'cancelled'
          subtotal?: number
          tax?: number
          total?: number
          notes?: string | null
          created_by?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Daily Reports
      daily_reports: {
        Row: {
          id: string
          factory_id: string
          report_date: string
          milk_intake_liters: number
          production_output_kg: number
          stock_summary: Json
          sales_summary: Json
          expenses_total: number
          notes: string | null
          status: ReportStatus
          submitted_by: string
          submitted_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          approved_by: string | null
          approved_at: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          report_date: string
          milk_intake_liters: number
          production_output_kg: number
          stock_summary?: Json
          sales_summary?: Json
          expenses_total?: number
          notes?: string | null
          status?: ReportStatus
          submitted_by: string
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          report_date?: string
          milk_intake_liters?: number
          production_output_kg?: number
          stock_summary?: Json
          sales_summary?: Json
          expenses_total?: number
          notes?: string | null
          status?: ReportStatus
          submitted_by?: string
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Employees
      employees: {
        Row: {
          id: string
          employee_code: string
          factory_id: string
          full_name: string
          email: string | null
          phone: string
          position: string
          department: string
          hire_date: string
          salary: number
          bank_account: string | null
          id_number: string | null
          address: string | null
          emergency_contact: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_code: string
          factory_id: string
          full_name: string
          email?: string | null
          phone: string
          position: string
          department: string
          hire_date: string
          salary: number
          bank_account?: string | null
          id_number?: string | null
          address?: string | null
          emergency_contact?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_code?: string
          factory_id?: string
          full_name?: string
          email?: string | null
          phone?: string
          position?: string
          department?: string
          hire_date?: string
          salary?: number
          bank_account?: string | null
          id_number?: string | null
          address?: string | null
          emergency_contact?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      
      // Attendance
      attendance: {
        Row: {
          id: string
          employee_id: string
          factory_id: string
          attendance_date: string
          check_in: string | null
          check_out: string | null
          hours_worked: number | null
          status: 'present' | 'absent' | 'late' | 'half_day' | 'leave'
          notes: string | null
          recorded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          factory_id: string
          attendance_date: string
          check_in?: string | null
          check_out?: string | null
          hours_worked?: number | null
          status: 'present' | 'absent' | 'late' | 'half_day' | 'leave'
          notes?: string | null
          recorded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          factory_id?: string
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          hours_worked?: number | null
          status?: 'present' | 'absent' | 'late' | 'half_day' | 'leave'
          notes?: string | null
          recorded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Payroll
      payroll: {
        Row: {
          id: string
          employee_id: string
          factory_id: string
          pay_period_start: string
          pay_period_end: string
          basic_salary: number
          allowances: number
          deductions: number
          overtime_pay: number
          net_salary: number
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          status: 'pending' | 'processed' | 'paid'
          processed_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          factory_id: string
          pay_period_start: string
          pay_period_end: string
          basic_salary: number
          allowances?: number
          deductions?: number
          overtime_pay?: number
          net_salary: number
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: 'pending' | 'processed' | 'paid'
          processed_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          factory_id?: string
          pay_period_start?: string
          pay_period_end?: string
          basic_salary?: number
          allowances?: number
          deductions?: number
          overtime_pay?: number
          net_salary?: number
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: 'pending' | 'processed' | 'paid'
          processed_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      
      // Tasks
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          factory_id: string | null
          assigned_to: string
          assigned_by: string
          due_date: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          factory_id?: string | null
          assigned_to: string
          assigned_by: string
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          factory_id?: string | null
          assigned_to?: string
          assigned_by?: string
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // Notifications
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'alert' | 'success'
          reference_id: string | null
          reference_type: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'warning' | 'alert' | 'success'
          reference_id?: string | null
          reference_type?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'warning' | 'alert' | 'success'
          reference_id?: string | null
          reference_type?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      
      // Audit Log
      audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      
      // Main Stock System
      main_stock: {
        Row: {
          id: string
          cheese_type: CheeseType
          total_quantity: number
          unit: string
          average_unit_cost: number
          total_value: number
          location: string
          reorder_level: number
          last_restocked: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cheese_type: CheeseType
          total_quantity?: number
          unit?: string
          average_unit_cost?: number
          total_value?: number
          location?: string
          reorder_level?: number
          last_restocked?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cheese_type?: CheeseType
          total_quantity?: number
          unit?: string
          average_unit_cost?: number
          total_value?: number
          location?: string
          reorder_level?: number
          last_restocked?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      main_stock_movements: {
        Row: {
          id: string
          main_stock_id: string
          movement_type: MainStockMovementType
          quantity: number
          unit_cost: number
          total_value: number
          source_factory_id: string | null
          source_batch_id: string | null
          destination: string | null
          reason: string
          notes: string | null
          processed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          main_stock_id: string
          movement_type: MainStockMovementType
          quantity: number
          unit_cost?: number
          total_value?: number
          source_factory_id?: string | null
          source_batch_id?: string | null
          destination?: string | null
          reason: string
          notes?: string | null
          processed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          main_stock_id?: string
          movement_type?: MainStockMovementType
          quantity?: number
          unit_cost?: number
          total_value?: number
          source_factory_id?: string | null
          source_batch_id?: string | null
          destination?: string | null
          reason?: string
          notes?: string | null
          processed_by?: string
          created_at?: string
        }
      }
      
      main_stock_transfers: {
        Row: {
          id: string
          cheese_type: CheeseType
          quantity: number
          unit_cost: number
          source_factory_id: string | null
          source_batch_id: string | null
          reason: string | null
          notes: string | null
          processed_by: string
          status: TransferStatus
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          cheese_type: CheeseType
          quantity: number
          unit_cost?: number
          source_factory_id?: string | null
          source_batch_id?: string | null
          reason?: string | null
          notes?: string | null
          processed_by: string
          status?: TransferStatus
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          cheese_type?: CheeseType
          quantity?: number
          unit_cost?: number
          source_factory_id?: string | null
          source_batch_id?: string | null
          reason?: string | null
          notes?: string | null
          processed_by?: string
          status?: TransferStatus
          created_at?: string
          processed_at?: string | null
        }
      }
      
      factory_production_summary: {
        Row: {
          id: string
          factory_id: string
          production_date: string
          cheese_type: CheeseType
          total_production_kg: number
          total_batches: number
          transferred_to_main: number
          pending_transfer: number
          average_quality_score: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          production_date: string
          cheese_type: CheeseType
          total_production_kg?: number
          total_batches?: number
          transferred_to_main?: number
          pending_transfer?: number
          average_quality_score?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          production_date?: string
          cheese_type?: CheeseType
          total_production_kg?: number
          total_batches?: number
          transferred_to_main?: number
          pending_transfer?: number
          average_quality_score?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      factory_status: FactoryStatus
      report_status: ReportStatus
      payment_status: PaymentStatus
      order_status: OrderStatus
      expense_status: ExpenseStatus
      stock_type: StockType
      cheese_type: CheeseType
      main_stock_movement_type: MainStockMovementType
      transfer_status: TransferStatus
    }
  }
}
