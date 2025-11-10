import { Bell, User, LogOut, Menu, ChevronDown, Settings } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false)
      
      // Clear auth state first
      logout()
      
      // Clear session from Supabase
      await supabase.auth.signOut({ scope: 'global' })
      
      // Navigate to landing page using navigate instead of window.location
      navigate('/', { replace: true })
      
    } catch (error: any) {
      console.error('Logout error:', error)
      // Force navigation even if there's an error
      navigate('/', { replace: true })
    }
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(false)
    navigate('/profile')
  }

  const getRoleBadge = () => {
    const roleVariants = {
      main_boss: 'default' as const,
      senior_manager: 'secondary' as const,
      factory_manager: 'success' as const,
    }
    
    const roleLabels = {
      main_boss: 'Main Boss',
      senior_manager: 'Senior Manager',
      factory_manager: 'Factory Manager',
    }

    return (
      <Badge variant={roleVariants[user!.role]}>
        {roleLabels[user!.role]}
      </Badge>
    )
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Desktop title */}
          <div className="hidden sm:block">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">NZIZA Factory Management</h2>
            <p className="text-xs sm:text-sm text-gray-600">Cheese Production Excellence</p>
          </div>
          
          {/* Mobile title - just NZIZA */}
          <div className="sm:hidden">
            <h2 className="text-lg font-bold text-gray-900">NZIZA</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
            {/* Desktop: Show user name and role */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <div className="mt-1 flex justify-end">{getRoleBadge()}</div>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {/* Hide chevron on mobile for cleaner look */}
                <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {/* Mobile: Show user info in dropdown */}
                  <div className="sm:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                    <div className="mt-2">{getRoleBadge()}</div>
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
