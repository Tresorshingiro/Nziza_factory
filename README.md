# NZIZA Factory Management System

A comprehensive multi-tenant dairy factory management system for cheese production with role-based access control.

## Features

### Core Capabilities
- **Multi-Factory Management**: Manage multiple factories with ability to activate/freeze individual factories
- **Dynamic Multi-Stock System**: No fixed stock limits - create and manage stock dynamically
- **Three-Tier User Hierarchy**: Factory Managers → Senior Manager → Main Boss
- **Role-Based Permissions**: Senior Manager controls all user permissions

### Modules

#### 1. **Sales & Customer Management**
- Order tracking and management
- Invoice and receipt generation
- Customer Relationship Management (CRM)
- Payment status tracking

#### 2. **Inventory & Stock Management**
- Raw milk intake tracking by factory and date
- Dynamic multi-stock records
- Finished cheese stock by type (Gouda, Cheddar, Mozzarella)
- Stock balance dashboard with low-stock alerts
- Factory-specific stock freezing capability

#### 3. **Production Management**
- Milk collection from farmers
- Farmer database with payment tracking
- Flexible milk pricing (set by period: weekly/monthly)
- Automatic farmer payment calculations
- Production batch tracking with conversion ratios:
  - 10 liters milk = 1kg Gouda cheese
  - 5 liters milk = 0.5kg cheese
- Quality control checkpoints
- Waste and byproduct management

#### 4. **Daily Reporting Workflow**
- Factory managers submit daily milk intake + production output
- Senior Manager reviews consolidated multi-factory data
- Main Boss accesses final overview with analytics
- Frozen factories cannot submit new reports

#### 5. **Expense & Procurement**
- Expense tracking by category and factory
- Supplier database management
- Purchase order creation and tracking
- Approval workflows

#### 6. **Finance & Reporting**
- Sales reports (daily/weekly/monthly)
- Expense reports by factory
- Profit & Loss statements
- Tax and compliance reports
- Export to PDF/Excel

#### 7. **HR & User Management**
- Employee database with role assignments
- Permission management panel (Senior Manager only)
- Attendance tracking
- Payroll management
- Task assignment system

#### 8. **Dashboard & Analytics**
- Production vs Sales overview with charts
- Inventory levels across all factories
- Financial overview (revenue, expenses, profit)
- Multi-factory consolidated view
- Real-time alerts and notifications

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Authentication + Row Level Security)
- **Charts**: Chart.js + React-ChartJS-2
- **Tables**: TanStack Table
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Excel Export**: XLSX
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account

### Setup

1. **Clone and install dependencies**:
```bash
cd /home/treasure/Documents/nziza_factory
npm install
```

2. **Environment Variables**:
The `.env.local` file is already configured with Supabase credentials.

3. **Database Setup**:
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Run the migration file: `supabase/migrations/001_initial_schema.sql`

4. **Create Initial Users** (Run in Supabase SQL Editor):
```sql
-- Create auth users first (in Authentication > Users section of Supabase dashboard)
-- Or run this after setting up auth:

INSERT INTO users (id, email, full_name, role, is_active, permissions) VALUES
('your-main-boss-uuid', 'boss@nziza.com', 'Main Boss', 'main_boss', true, '{}'),
('your-senior-manager-uuid', 'manager@nziza.com', 'Senior Manager', 'senior_manager', true, '{}'),
('your-factory-manager-uuid', 'factory@nziza.com', 'Factory Manager', 'factory_manager', true, '{}');
```

5. **Run Development Server**:
```bash
npm run dev
```

The application will start at `http://localhost:3000`

## Default Login Credentials

- **Main Boss**: boss@nziza.com / password123
- **Senior Manager**: manager@nziza.com / password123
- **Factory Manager**: factory@nziza.com / password123

## User Roles & Permissions

### Main Boss
- Full system access
- View all factories consolidated data
- Analytics and reports across all factories
- Read-only access to most operations

### Senior Manager
- Manage all user permissions
- Review and approve factory reports
- Manage factories (create, edit, freeze/activate)
- Access consolidated data
- Approve expenses and purchases

### Factory Manager
- Submit daily reports
- Manage factory operations
- Record milk collections
- Manage production batches
- Handle sales and orders
- Track inventory for their factory
- Record expenses (pending approval)

## Project Structure

```
nziza_factory/
├── src/
│   ├── components/         # Reusable components
│   │   ├── auth/          # Authentication components
│   │   ├── layout/        # Layout components (Nav, Sidebar, etc.)
│   │   ├── dashboard/     # Dashboard widgets
│   │   └── common/        # Common UI components
│   ├── pages/             # Page components
│   │   ├── auth/          # Login, Register
│   │   ├── dashboards/    # Role-specific dashboards
│   │   ├── factories/     # Factory management
│   │   ├── farmers/       # Farmer management
│   │   ├── production/    # Production & milk collection
│   │   ├── inventory/     # Stock management
│   │   ├── sales/         # Sales & orders
│   │   ├── customers/     # Customer management
│   │   ├── expenses/      # Expense tracking
│   │   ├── reports/       # Reports & analytics
│   │   ├── hr/            # HR management
│   │   └── users/         # User & permission management
│   ├── stores/            # Zustand stores
│   ├── lib/               # Utilities & configurations
│   ├── types/             # TypeScript types
│   └── hooks/             # Custom React hooks
├── supabase/
│   └── migrations/        # Database migrations
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Key Features Implementation

### Multi-Factory Management
Factories can be toggled between "active" and "frozen" status. Frozen factories:
- Cannot submit new reports
- Maintain historical data
- Can be reactivated at any time

### Dynamic Stock Management
- No predefined stock items
- Create new stock entries on-the-fly
- Track raw milk, finished goods, and byproducts
- Automatic stock movement logging
- Low-stock alerts

### Hierarchical Reporting
1. **Factory Manager** submits daily report with:
   - Milk intake (liters)
   - Production output (kg)
   - Stock summary
   - Sales summary
   - Expenses

2. **Senior Manager** reviews:
   - All pending reports
   - Can approve/reject with notes
   - Consolidated multi-factory view

3. **Main Boss** views:
   - Approved reports only
   - Analytics and trends
   - Performance comparisons

### Flexible Farmer Pricing
- Set milk price per farmer
- Price can change by period (weekly/monthly)
- Automatic payment calculation based on:
  - Quantity supplied
  - Current price
  - Payment frequency

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Database Schema

The database includes tables for:
- Users & Permissions
- Factories
- Farmers & Milk Collection
- Production Batches
- Stock & Stock Movements
- Customers & Sales Orders
- Invoices & Payments
- Suppliers & Purchase Orders
- Expenses
- Daily Reports
- Employees, Attendance & Payroll
- Tasks & Notifications
- Audit Logs

All tables include:
- Row Level Security (RLS) policies
- Automatic timestamp updates
- Proper foreign key relationships
- Indexes for performance

## Support & Customization

This system is built to be extensible. Key customization points:
- Add new cheese types in database enum
- Modify conversion ratios in production logic
- Add custom report formats
- Extend permission system
- Add new expense categories
- Customize dashboard widgets

## License

Proprietary - NZIZA Factory Management System
