import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Factory, 
  Users, 
  Building2,
  UserPlus,
  BarChart3,
  Package,
  DollarSign,
  X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface SeniorManagerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function SeniorManagerSidebar({ isOpen, onClose }: SeniorManagerSidebarProps) {
  const { user } = useAuthStore()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Manage Factories', path: '/factories', icon: Factory },
    { name: 'Factory Managers', path: '/create-factory-manager', icon: UserPlus },
    { name: 'Payroll Management', path: '/payroll', icon: DollarSign },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Suppliers', path: '/suppliers', icon: Building2 },
    { name: 'Sales', path: '/sales', icon: BarChart3 },
    { name: 'Expenses', path: '/expenses', icon: BarChart3 },
    { name: 'Inventories', path: '/inventories', icon: Package },
  ]

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
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">NZIZA</h1>
                <p className="text-xs text-amber-600 font-medium">Senior Manager</p>
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
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-amber-50 text-amber-700 font-medium'
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

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-amber-600 font-medium">Senior Manager</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}