import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Array<'main_boss' | 'senior_manager' | 'factory_manager'>
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuthStore()

  // Show loading while checking authentication
  if (loading || user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role permissions
  if (roles && !roles.includes(user.role)) {
    console.log('ProtectedRoute Access Denied:', {
      userRole: user.role,
      requiredRoles: roles,
      userEmail: user.email
    })
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Your role: <strong>{user.role}</strong></p>
            <p>Required roles: <strong>{roles.join(', ')}</strong></p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
