import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import SeniorManagerSidebar from './SeniorManagerSidebar'
import Header from './Header'
import { useAuthStore } from '../../stores/authStore'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuthStore()

  // Choose sidebar based on user role
  const SidebarComponent = user?.role === 'senior_manager' ? SeniorManagerSidebar : Sidebar

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
