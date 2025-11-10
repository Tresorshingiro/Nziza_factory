import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Clock, 
  Users, 
  Factory, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  Calendar,
  Target,
  Eye,
  RefreshCw
} from 'lucide-react'
import FactorySelector from '../../components/ui/FactorySelector'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalFactories: number
  activeFactories: number
  totalProduction: number
  totalSales: number
  totalExpenses: number
  totalRevenue: number
  lowStockItems: number
  pendingReports: number
  totalEmployees: number
}

interface FactoryPerformance {
  id: string
  name: string
  production: number
  sales: number
  expenses: number
  revenue: number
  efficiency: number
  status: string
}

interface MonthlyTrend {
  month: string
  production: number
  sales: number
  expenses: number
  revenue: number
}

interface RecentActivity {
  id: string
  type: string
  description: string
  factory_name: string
  user_name: string
  created_at: string
  status?: string
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#f3ab3c', '#ef4444', '#6366f1', '#8b5a3c', '#ec4899']

export default function SeniorManagerDashboard() {
  const { user } = useAuthStore()
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalFactories: 0,
    activeFactories: 0,
    totalProduction: 0,
    totalSales: 0,
    totalExpenses: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    pendingReports: 0,
    totalEmployees: 0
  })
  const [factoryPerformance, setFactoryPerformance] = useState<FactoryPerformance[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [selectedFactoryId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchDashboardStats(),
        fetchFactoryPerformance(),
        fetchMonthlyTrends(),
        fetchRecentActivities(),
        fetchTopProducts()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboard = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
    toast.success('Dashboard refreshed successfully')
  }

  const fetchDashboardStats = async () => {
    try {
      // Fetch factory stats
      let factoryQuery = supabase.from('factories').select('*')
      if (selectedFactoryId) {
        factoryQuery = factoryQuery.eq('id', selectedFactoryId)
      }
      const { data: factories } = await factoryQuery

      // Fetch production stats
      let productionQuery = supabase.from('production_batches').select('cheese_produced_kg')
      if (selectedFactoryId) {
        productionQuery = productionQuery.eq('factory_id', selectedFactoryId)
      }
      const { data: production } = await productionQuery

      // Fetch sales stats
      let salesQuery = supabase.from('sales_orders').select('total')
      if (selectedFactoryId) {
        salesQuery = salesQuery.eq('factory_id', selectedFactoryId)
      }
      const { data: sales } = await salesQuery

      // Fetch expenses stats
      let expensesQuery = supabase.from('expenses').select('amount')
      if (selectedFactoryId) {
        expensesQuery = expensesQuery.eq('factory_id', selectedFactoryId)
      }
      const { data: expenses } = await expensesQuery

      // Fetch stock stats
      let stockQuery = supabase.from('stock').select('quantity, reorder_level')
      if (selectedFactoryId) {
        stockQuery = stockQuery.eq('factory_id', selectedFactoryId)
      }
      const { data: stock } = await stockQuery

      // Fetch employee stats
      let employeeQuery = supabase.from('employees').select('id')
      if (selectedFactoryId) {
        employeeQuery = employeeQuery.eq('factory_id', selectedFactoryId)
      }
      const { data: employees } = await employeeQuery

      // Calculate stats
      const totalProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
      const totalSales = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
      const lowStockItems = stock?.filter(s => s.quantity <= (s.reorder_level || 0)).length || 0

      setDashboardStats({
        totalFactories: factories?.length || 0,
        activeFactories: factories?.filter(f => f.status === 'active').length || 0,
        totalProduction,
        totalSales: sales?.length || 0, // Number of orders instead of quantity
        totalExpenses,
        totalRevenue: totalSales,
        lowStockItems,
        pendingReports: 0, // Would need a reports table
        totalEmployees: employees?.length || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const fetchFactoryPerformance = async () => {
    try {
      // Get all factories
      const { data: factories } = await supabase
        .from('factories')
        .select('id, name, status')

      if (!factories) return

      const performance: FactoryPerformance[] = []

      for (const factory of factories) {
        // Get production for this factory
        const { data: production } = await supabase
          .from('production_batches')
          .select('cheese_produced_kg')
          .eq('factory_id', factory.id)

        // Get sales for this factory
        const { data: sales } = await supabase
          .from('sales_orders')
          .select('total')
          .eq('factory_id', factory.id)

        // Get expenses for this factory
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('factory_id', factory.id)

        const factoryProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
        const factorySales = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
        const factoryExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
        const factoryRevenue = factorySales
        const efficiency = factoryRevenue > 0 && factoryExpenses > 0 ? 
          Math.min(100, Math.round((factoryRevenue / (factoryRevenue + factoryExpenses)) * 100)) : 0

        performance.push({
          id: factory.id,
          name: factory.name,
          production: factoryProduction,
          sales: sales?.length || 0, // Number of orders instead of quantity
          expenses: factoryExpenses,
          revenue: factoryRevenue,
          efficiency,
          status: factory.status
        })
      }

      if (selectedFactoryId) {
        setFactoryPerformance(performance.filter(p => p.id === selectedFactoryId))
      } else {
        setFactoryPerformance(performance)
      }
    } catch (error) {
      console.error('Error fetching factory performance:', error)
    }
  }

  const fetchMonthlyTrends = async () => {
    try {
      // Get last 6 months of data
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)

      const trends: MonthlyTrend[] = []
      
      for (let i = 0; i < 6; i++) {
        const currentMonth = new Date()
        currentMonth.setMonth(currentMonth.getMonth() - i)
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        let productionQuery = supabase
          .from('production_batches')
          .select('cheese_produced_kg')
          .gte('production_date', monthStart.toISOString())
          .lte('production_date', monthEnd.toISOString())

        let salesQuery = supabase
          .from('sales_orders')
          .select('total')
          .gte('order_date', monthStart.toISOString())
          .lte('order_date', monthEnd.toISOString())

        let expensesQuery = supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', monthStart.toISOString())
          .lte('expense_date', monthEnd.toISOString())

        if (selectedFactoryId) {
          productionQuery = productionQuery.eq('factory_id', selectedFactoryId)
          salesQuery = salesQuery.eq('factory_id', selectedFactoryId)
          expensesQuery = expensesQuery.eq('factory_id', selectedFactoryId)
        }

        const [productionData, salesData, expensesData] = await Promise.all([
          productionQuery,
          salesQuery,
          expensesQuery
        ])

        const production = productionData.data?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
        const salesAmount = salesData.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
        const salesCount = salesData.data?.length || 0 // Number of orders instead of quantity
        const expenses = expensesData.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

        trends.unshift({
          month: currentMonth.toLocaleDateString('en-US', { month: 'short' }),
          production,
          sales: salesCount,
          expenses,
          revenue: salesAmount
        })
      }

      setMonthlyTrends(trends)
    } catch (error) {
      console.error('Error fetching monthly trends:', error)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      // This would ideally come from an activity log table
      // For now, we'll get recent records from various tables
      const activities: RecentActivity[] = []

      // Recent sales orders
      let salesQuery = supabase
        .from('sales_orders')
        .select('id, total, order_date, factory_id, factories(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (selectedFactoryId) {
        salesQuery = salesQuery.eq('factory_id', selectedFactoryId)
      }

      const { data: recentSales } = await salesQuery

      if (recentSales) {
        recentSales.forEach(sale => {
          activities.push({
            id: sale.id,
            type: 'sale',
            description: `New sales order - ${sale.total?.toLocaleString()} RWF`,
            factory_name: (sale.factories as any)?.name || 'Unknown Factory',
            user_name: 'System',
            created_at: sale.order_date || sale.created_at,
            status: 'completed'
          })
        })
      }

      // Recent expenses
      let expensesQuery = supabase
        .from('expenses')
        .select('id, description, amount, expense_date, factory_id, factories(name)')
        .order('created_at', { ascending: false })
        .limit(3)

      if (selectedFactoryId) {
        expensesQuery = expensesQuery.eq('factory_id', selectedFactoryId)
      }

      const { data: recentExpenses } = await expensesQuery

      if (recentExpenses) {
        recentExpenses.forEach(expense => {
          activities.push({
            id: expense.id,
            type: 'expense',
            description: `${expense.description} - ${expense.amount?.toLocaleString()} RWF`,
            factory_name: (expense.factories as any)?.name || 'Unknown Factory',
            user_name: 'System',
            created_at: expense.expense_date || expense.created_at,
            status: 'completed'
          })
        })
      }

      // Sort by date
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentActivities(activities.slice(0, 10))
    } catch (error) {
      console.error('Error fetching recent activities:', error)
    }
  }

  const fetchTopProducts = async () => {
    try {
      let query = supabase
        .from('production_batches')
        .select('cheese_type, cheese_produced_kg')
        .order('cheese_produced_kg', { ascending: false })

      if (selectedFactoryId) {
        query = query.eq('factory_id', selectedFactoryId)
      }

      const { data: products } = await query

      if (products) {
        const productMap = new Map<string, { quantity: number; revenue: number }>()
        
        products.forEach(product => {
          const existing = productMap.get(product.cheese_type) || { quantity: 0, revenue: 0 }
          existing.quantity += product.cheese_produced_kg || 0
          existing.revenue += (product.cheese_produced_kg || 0) * 500 // Assuming 500 RWF per kg
          productMap.set(product.cheese_type, existing)
        })

        const topProducts = Array.from(productMap.entries())
          .map(([name, data]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        setTopProducts(topProducts)
      }
    } catch (error) {
      console.error('Error fetching top products:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Senior Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor and manage all factory operations</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Factory Selector and Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Senior Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all factory operations in real-time</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={refreshDashboard}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="w-80">
            <FactorySelector
              selectedFactoryId={selectedFactoryId}
              onFactoryChange={setSelectedFactoryId}
              placeholder="All Factories"
              showAllOption={true}
            />
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Factories</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats.totalFactories}</p>
              <p className="text-sm text-green-600 mt-1">{dashboardStats.activeFactories} Active</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Factory className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Production</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats.totalProduction.toLocaleString()}</p>
              <p className="text-sm text-blue-600 mt-1">Liters this month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">RWF this month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardStats.lowStockItems}</p>
              <p className="text-sm text-amber-600 mt-1">Items need restocking</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales Units</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats.totalSales.toLocaleString()}</p>
              <p className="text-sm text-amber-600 mt-1">Units sold this month</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats.totalExpenses.toLocaleString()}</p>
              <p className="text-sm text-red-600 mt-1">RWF this month</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats.totalEmployees}</p>
              <p className="text-sm text-indigo-600 mt-1">Across all factories</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trends */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            Monthly Revenue Trends
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value.toLocaleString()} RWF`, 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Factory Performance Comparison */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" />
            Factory Performance
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factoryPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [value.toLocaleString(), '']} />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue (RWF)" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses (RWF)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Production vs Sales Trends */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          Production vs Sales Trends (Last 6 Months)
        </h3>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="production" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Production (Liters)"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Sales (Units)"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Expenses (RWF)"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section: Factory Details and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factory Performance Details */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Factory className="w-5 h-5 text-amber-600" />
            Factory Performance Details
          </h3>
          <div className="space-y-4">
            {factoryPerformance.length > 0 ? factoryPerformance.map((factory) => (
              <div key={factory.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{factory.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      factory.efficiency >= 80 ? 'bg-green-100 text-green-800' :
                      factory.efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {factory.efficiency}% Efficiency
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      factory.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {factory.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Production:</span>
                    <div className="font-medium">{factory.production.toLocaleString()} L</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Sales:</span>
                    <div className="font-medium">{factory.sales.toLocaleString()} units</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Revenue:</span>
                    <div className="font-medium text-green-600">{factory.revenue.toLocaleString()} RWF</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Expenses:</span>
                    <div className="font-medium text-red-600">{factory.expenses.toLocaleString()} RWF</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Factory className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No factory data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Recent Activities
          </h3>
          <div className="space-y-3">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      activity.type === 'sale' ? 'bg-green-100 text-green-800' :
                      activity.type === 'expense' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-500">{activity.factory_name}</span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.created_at).toLocaleDateString()} • {activity.user_name}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Performance */}
      {topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Top Performing Products
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="text-center p-4 border border-gray-200 rounded-lg">
                <div className={`text-2xl font-bold mb-1 ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-500' :
                  'text-amber-600'
                }`}>
                  #{index + 1}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{product.name}</h4>
                <p className="text-sm text-gray-600">Qty: {product.quantity.toLocaleString()}</p>
                <p className="text-sm font-medium text-green-600">{product.revenue.toLocaleString()} RWF</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
