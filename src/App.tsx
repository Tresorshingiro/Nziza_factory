import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'

// Auth pages
import LandingPage from './pages/LandingPage'
import Login from './pages/auth/Login'
import ProfilePage from './pages/ProfilePage'

// Dashboard pages
import MainBossDashboard from './pages/dashboards/MainBossDashboard'
import SeniorManagerDashboard from './pages/dashboards/SeniorManagerDashboard'
import FactoryManagerDashboard from './pages/dashboards/FactoryManagerDashboard'

// Management pages - Main Boss
import FactoriesPage from './pages/main-boss/FactoriesPage'
import UsersPage from './pages/main-boss/UsersPage'

// Management pages - Factory Manager
import MilkCollectionPage from './pages/factory-manager/MilkCollectionPage'
import ProductionPage from './pages/factory-manager/ProductionPage'
import StockPage from './pages/factory-manager/StockPage'
import EmployeesPage from './pages/factory-manager/EmployeesPage'
import FarmersPage from './pages/factory-manager/FarmersPage'
import ReportsPage from './pages/factory-manager/ReportsPage'

// Management pages - Factory Manager
import CustomersPage from './pages/factory-manager/CustomersPage'

// Senior Manager specific pages
import CreateFactoryManagerPage from './pages/senior-manager/CreateFactoryManagerPage'
import SeniorReportsPage from './pages/senior-manager/ReportsPage'
import SeniorSalesPage from './pages/senior-manager/SalesPage'
import SeniorExpensesPage from './pages/senior-manager/ExpensesPage'
import SeniorSuppliersPage from './pages/senior-manager/SuppliersPage'
import SeniorInventoriesPage from './pages/senior-manager/InventoriesPage'

// Components
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  const { user, setUser, setSession, loading, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let isInitializing = true

    console.log('App useEffect running - initialization started')

    // Initialize auth
    const initAuth = async () => {
      try {
        console.log('Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.log('Session error:', error)
          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }

        setSession(session)
        
        if (session?.user) {
          console.log('Session found, fetching user data...')
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (!mounted) return
          
          if (userError) {
            console.log('User fetch error:', userError)
            setUser(null)
          } else if (userData) {
            console.log('User data loaded')
            setUser(userData)
          } else {
            setUser(null)
          }
        } else {
          console.log('No session found')
          setUser(null)
        }
        
        setLoading(false)
        isInitializing = false
        console.log('Auth initialization complete')
        
      } catch (error: any) {
        console.log('Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
          setLoading(false)
          isInitializing = false
        }
      }
    }

    initAuth()

    // Listen for auth changes (skip events during initialization)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isInitializing) return
      
      console.log('Auth state change:', event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          
        if (mounted && userData) {
          setUser(userData)
          setSession(session)
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null)
          setSession(null)
        }
      }
    })

    return () => {
      console.log('App useEffect cleanup')
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array to prevent re-runs

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Dashboard routes based on role */}
        <Route path="/dashboard" element={
          user?.role === 'main_boss' ? <MainBossDashboard /> :
          user?.role === 'senior_manager' ? <SeniorManagerDashboard /> :
          <FactoryManagerDashboard />
        } />
        
        {/* Profile route - accessible to all authenticated users */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Management routes - Role-based access */}
        
        {/* Main Boss routes */}
        <Route path="/factories" element={<ProtectedRoute roles={['main_boss', 'senior_manager']}><FactoriesPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['main_boss']}><UsersPage /></ProtectedRoute>} />
        
        {/* Factory Manager routes */}
        <Route path="/farmers" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}><FarmersPage /></ProtectedRoute>} />
        <Route path="/milk-collection" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}><MilkCollectionPage /></ProtectedRoute>} />
        <Route path="/production" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}><ProductionPage /></ProtectedRoute>} />
        <Route path="/inventory/stock" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}><StockPage /></ProtectedRoute>} />
        <Route path="/hr/employees" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}><EmployeesPage /></ProtectedRoute>} />
        
        {/* Senior Manager routes (with role-specific pages) */}
        <Route path="/reports" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}>
          {user?.role === 'senior_manager' ? <SeniorReportsPage /> : <ReportsPage />}
        </ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}>
          {user?.role === 'senior_manager' ? <SeniorSalesPage /> : <CustomersPage />}
        </ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}>
          {user?.role === 'senior_manager' ? <SeniorExpensesPage /> : <CustomersPage />}
        </ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute roles={['factory_manager', 'senior_manager', 'main_boss']}>
          {user?.role === 'senior_manager' ? <SeniorSuppliersPage /> : <CustomersPage />}
        </ProtectedRoute>} />
        <Route path="/inventories" element={<ProtectedRoute roles={['senior_manager', 'main_boss']}>
          <SeniorInventoriesPage />
        </ProtectedRoute>} />
        
        {/* Factory Manager routes */}
        <Route path="/customers" element={<ProtectedRoute roles={['factory_manager', 'main_boss']}><CustomersPage /></ProtectedRoute>} />
        
        {/* Senior Manager exclusive routes */}
        <Route path="/create-factory-manager" element={<ProtectedRoute roles={['senior_manager', 'main_boss']}><CreateFactoryManagerPage /></ProtectedRoute>} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  )
}

export default App
