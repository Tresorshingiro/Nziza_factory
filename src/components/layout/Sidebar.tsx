import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Factory, 
  Users, 
  Milk,
  PackageOpen,
  ShoppingCart,
  UserCircle,
  DollarSign,
  FileText,
  Briefcase,
  Settings,
  Truck,
  X,
  Shield,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['main_boss', 'senior_manager', 'factory_manager'] },
    
    // Main Boss Executive Pages
    { name: 'Analytics & KPIs', path: '/analytics', icon: BarChart3, roles: ['main_boss'] },
    { name: 'Audit Center', path: '/audit-center', icon: Shield, roles: ['main_boss'] },
    { name: 'Financial Overview', path: '/financial-overview', icon: TrendingUp, roles: ['main_boss'] },
    
    // Shared Pages
    { name: 'Factories', path: '/factories', icon: Factory, roles: ['main_boss', 'senior_manager'] },
    { name: 'Users & Permissions', path: '/users', icon: Users, roles: ['main_boss', 'senior_manager'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['main_boss', 'senior_manager', 'factory_manager'] },
    
    // Senior Manager & Factory Manager Pages
    { name: 'Farmers', path: '/farmers', icon: UserCircle, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Milk Collection', path: '/milk-collection', icon: Milk, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Production', path: '/production', icon: PackageOpen, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Inventory', path: '/inventory/stock', icon: PackageOpen, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Sales & Orders', path: '/sales', icon: ShoppingCart, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Expenses', path: '/expenses', icon: DollarSign, roles: ['senior_manager', 'factory_manager'] },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['senior_manager', 'factory_manager'] },
    { name: 'HR & Employees', path: '/hr/employees', icon: Briefcase, roles: ['senior_manager', 'factory_manager'] },
  ]

  const visibleItems = navItems.filter(item => item.roles.includes(user!.role))

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">NZIZA</h1>
                <p className="text-xs text-gray-600">Factory System</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {visibleItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => onClose()} // Close sidebar on mobile when clicking nav item
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <NavLink
            to="/settings"
            onClick={() => onClose()}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Settings</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}
