import { useState, useEffect } from 'react'
import { 
  Factory, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  BarChart3, 
  Calendar,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface ExecutiveStats {
  totalFactories: number
  activeFactories: number
  frozenFactories: number
  totalUsers: number
  totalProduction: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  lowStockAlerts: number
  pendingReports: number
}

interface FactoryPerformance {
  id: string
  name: string
  code: string
  production: number
  revenue: number
  expenses: number
  profit: number
  efficiency: number
  status: string
}

interface MonthlyTrend {
  month: string
  production: number
  revenue: number
  expenses: number
  profit: number
}

interface TopFactory {
  name: string
  production: number
  revenue: number
  efficiency: number
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

const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#8b5cf6', '#6366f1']

export default function MainBossDashboard() {
  const { user } = useAuthStore()
  const [executiveStats, setExecutiveStats] = useState<ExecutiveStats>({
    totalFactories: 0,
    activeFactories: 0,
    frozenFactories: 0,
    totalUsers: 0,
    totalProduction: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockAlerts: 0,
    pendingReports: 0
  })
  const [factoryPerformance, setFactoryPerformance] = useState<FactoryPerformance[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [topFactories, setTopFactories] = useState<TopFactory[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchExecutiveDashboard()
  }, [])

  const fetchExecutiveDashboard = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchExecutiveStats(),
        fetchFactoryPerformance(),
        fetchMonthlyTrends(),
        fetchTopFactories(),
        fetchRecentActivities()
      ])
    } catch (error) {
      console.error('Error fetching executive dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboard = async () => {
    setRefreshing(true)
    await fetchExecutiveDashboard()
    setRefreshing(false)
    toast.success('Dashboard refreshed successfully')
  }

  const fetchExecutiveStats = async () => {
    try {
      // Fetch all factories
      const { data: factories } = await supabase.from('factories').select('*')
      
      // Fetch all users
      const { data: users } = await supabase.from('users').select('*')
      
      // Fetch production data
      const { data: production } = await supabase.from('production_batches').select('cheese_produced_kg')
      
      // Fetch sales data
      const { data: sales } = await supabase.from('sales_orders').select('total')
      
      // Fetch expenses data
      const { data: expenses } = await supabase.from('expenses').select('total')
      
      // Fetch stock data for alerts
      const { data: stock } = await supabase.from('stock').select('quantity, reorder_level')
      
      // Calculate totals
      const totalProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
      const totalRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0
      const lowStockAlerts = stock?.filter(s => s.quantity <= (s.reorder_level || 0)).length || 0

      setExecutiveStats({
        totalFactories: factories?.length || 0,
        activeFactories: factories?.filter(f => f.status === 'active').length || 0,
        frozenFactories: factories?.filter(f => f.status === 'frozen').length || 0,
        totalUsers: users?.length || 0,
        totalProduction,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        lowStockAlerts,
        pendingReports: 0 // This would come from daily_reports table
      })
    } catch (error) {
      console.error('Error fetching executive stats:', error)
    }
  }

  const fetchFactoryPerformance = async () => {
    try {
      const { data: factories } = await supabase.from('factories').select('id, name, code, status')
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
          .select('total')
          .eq('factory_id', factory.id)

        const totalProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
        const totalRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
        const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0
        const profit = totalRevenue - totalExpenses
        const efficiency = totalProduction > 0 ? Math.round((profit / totalProduction) * 100) : 0

        performance.push({
          id: factory.id,
          name: factory.name,
          code: factory.code,
          production: totalProduction,
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit,
          efficiency,
          status: factory.status
        })
      }

      setFactoryPerformance(performance.sort((a, b) => b.revenue - a.revenue))
    } catch (error) {
      console.error('Error fetching factory performance:', error)
    }
  }

  const fetchMonthlyTrends = async () => {
    try {
      // Get last 6 months data
      const months = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          year: date.getFullYear(),
          monthNum: date.getMonth() + 1
        })
      }

      const trends = await Promise.all(
        months.map(async ({ month, year, monthNum }) => {
          // Production for the month
          const { data: production } = await supabase
            .from('production_batches')
            .select('cheese_produced_kg')
            .gte('production_date', `${year}-${monthNum.toString().padStart(2, '0')}-01`)
            .lt('production_date', `${year}-${(monthNum + 1).toString().padStart(2, '0')}-01`)

          // Sales for the month
          const { data: sales } = await supabase
            .from('sales_orders')
            .select('total')
            .gte('order_date', `${year}-${monthNum.toString().padStart(2, '0')}-01`)
            .lt('order_date', `${year}-${(monthNum + 1).toString().padStart(2, '0')}-01`)

          // Expenses for the month
          const { data: expenses } = await supabase
            .from('expenses')
            .select('total')
            .gte('expense_date', `${year}-${monthNum.toString().padStart(2, '0')}-01`)
            .lt('expense_date', `${year}-${(monthNum + 1).toString().padStart(2, '0')}-01`)

          const totalProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
          const totalRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
          const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0

          return {
            month,
            production: totalProduction,
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: totalRevenue - totalExpenses
          }
        })
      )

      setMonthlyTrends(trends)
    } catch (error) {
      console.error('Error fetching monthly trends:', error)
    }
  }

  const fetchTopFactories = async () => {
    try {
      const topPerformers = factoryPerformance
        .filter(f => f.status === 'active')
        .slice(0, 5)
        .map(f => ({
          name: f.name,
          production: f.production,
          revenue: f.revenue,
          efficiency: f.efficiency
        }))
      
      setTopFactories(topPerformers)
    } catch (error) {
      console.error('Error fetching top factories:', error)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      // This would typically come from an audit log or activity table
      // For now, we'll simulate with recent data from various tables
      const activities: RecentActivity[] = []
      
      // Get recent production batches
      const { data: recentProduction } = await supabase
        .from('production_batches')
        .select(`
          id, production_date, cheese_produced_kg,
          factories(name),
          users(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      recentProduction?.forEach((prod: any) => {
        activities.push({
          id: prod.id,
          type: 'production',
          description: `Produced ${prod.cheese_produced_kg}kg of cheese`,
          factory_name: prod.factories?.name || 'Unknown Factory',
          user_name: prod.users?.full_name || 'System',
          created_at: prod.production_date
        })
      })

      setRecentActivities(activities.slice(0, 10))
    } catch (error) {
      console.error('Error fetching recent activities:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Strategic overview of all factories and operations
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Executive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        <StatsCard
          title="Total Factories"
          value={executiveStats.totalFactories.toString()}
          icon={Factory}
          color="blue"
          change={`${executiveStats.activeFactories} active, ${executiveStats.frozenFactories} frozen`}
          trend="neutral"
        />
        <StatsCard
          title="Total Production"
          value={`${executiveStats.totalProduction.toLocaleString()} kg`}
          icon={Package}
          color="green"
          change="All factories combined"
          trend="up"
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(executiveStats.totalRevenue)}
          icon={DollarSign}
          color="purple"
          change="Gross revenue"
          trend="up"
        />
        <StatsCard
          title="Net Profit"
          value={formatCurrency(executiveStats.netProfit)}
          icon={TrendingUp}
          color={executiveStats.netProfit >= 0 ? "green" : "red"}
          change={`${((executiveStats.netProfit / Math.max(executiveStats.totalRevenue, 1)) * 100).toFixed(1)}% margin`}
          trend={executiveStats.netProfit >= 0 ? "up" : "down"}
        />
        <StatsCard
          title="Active Users"
          value={executiveStats.totalUsers.toString()}
          icon={Users}
          color="orange"
          change={`${executiveStats.lowStockAlerts} stock alerts`}
          trend="neutral"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Performance Trends */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            Monthly Performance Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'production' ? `${value.toLocaleString()} kg` : formatCurrency(value),
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]} 
              />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#f59e0b" fill="#fbbf24" />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#f87171" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Factory Performance Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Factory className="w-5 h-5 text-amber-600" />
            Factory Performance Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={factoryPerformance.slice(0, 6)}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="revenue"
                label={({ name, value }: any) => `${name}: ${formatCurrency(value)}`}
              >
                {factoryPerformance.slice(0, 6).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Factory Performance Table & Quick Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Factory Performance - Responsive Design */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              Factory Performance Overview
            </h3>
            <p className="text-sm text-gray-600 mt-1">Real-time performance metrics across all facilities</p>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {factoryPerformance.map((factory) => (
                  <tr key={factory.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{factory.name}</div>
                        <div className="text-sm text-gray-500">{factory.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {factory.production.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatCurrency(factory.revenue)}
                    </td>
                    <td className="px-4 py-4">
                      <div className={`text-sm font-medium ${
                        factory.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {factory.profit >= 0 ? (
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {formatCurrency(factory.profit)}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" />
                            {formatCurrency(Math.abs(factory.profit))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              factory.efficiency >= 70 ? 'bg-green-500' :
                              factory.efficiency >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(Math.abs(factory.efficiency), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{factory.efficiency}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        factory.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {factory.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden p-4 space-y-4">
            {factoryPerformance.map((factory) => (
              <div key={factory.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{factory.name}</h4>
                    <p className="text-sm text-gray-500">{factory.code}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    factory.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {factory.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Production</p>
                      <p className="text-sm font-medium text-gray-900">{factory.production.toLocaleString()} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Revenue</p>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(factory.revenue)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Profit</p>
                      <div className={`text-sm font-medium ${
                        factory.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <div className="flex items-center gap-1">
                          {factory.profit >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {formatCurrency(Math.abs(factory.profit))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Efficiency</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              factory.efficiency >= 70 ? 'bg-green-500' :
                              factory.efficiency >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(Math.abs(factory.efficiency), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">{factory.efficiency}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {factoryPerformance.length === 0 && (
              <div className="text-center py-8">
                <Factory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No factory data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Insights & Alerts */}
        <div className="space-y-6">
          {/* Performance Insights */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Performance Insights
            </h3>
            <div className="space-y-4">
              {/* Best Performing Factory */}
              {factoryPerformance.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-1">Top Revenue Generator</h4>
                      <p className="text-sm text-green-800">
                        <span className="font-medium">{factoryPerformance[0]?.name}</span> leads with{' '}
                        <span className="font-semibold">{formatCurrency(factoryPerformance[0]?.revenue || 0)}</span> revenue
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {factoryPerformance[0]?.efficiency || 0}% efficiency • {factoryPerformance[0]?.production.toLocaleString() || 0}kg produced
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Summary */}
              {factoryPerformance.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">System Performance</h4>
                      <div className="space-y-1">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">
                            {factoryPerformance.filter(f => f.profit > 0).length}/{factoryPerformance.length}
                          </span> factories profitable
                        </p>
                        <p className="text-sm text-blue-800">
                          Average efficiency: <span className="font-medium">
                            {factoryPerformance.length > 0 
                              ? Math.round(factoryPerformance.reduce((sum, f) => sum + f.efficiency, 0) / factoryPerformance.length)
                              : 0}%
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Improvement Opportunity */}
              {factoryPerformance.length > 0 && (
                (() => {
                  const underperforming = factoryPerformance.filter(f => f.efficiency < 50 || f.profit < 0)
                  return underperforming.length > 0 ? (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-orange-900 mb-1">Needs Attention</h4>
                          <p className="text-sm text-orange-800">
                            <span className="font-medium">{underperforming.length}</span> factories need improvement
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            Focus on: {underperforming[0]?.name} • {underperforming[0]?.efficiency}% efficiency
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-emerald-900 mb-1">Excellent Performance</h4>
                          <p className="text-sm text-emerald-800">
                            All factories operating efficiently
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            Continue current strategies for optimal results
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}

              {factoryPerformance.length === 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600">No factory data available for analysis</p>
                </div>
              )}
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              System Alerts
            </h3>
            <div className="space-y-3">
              {executiveStats.lowStockAlerts > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-red-800">
                      {executiveStats.lowStockAlerts} Low Stock Items
                    </p>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Items below reorder level across all factories
                  </p>
                </div>
              )}
              
              {executiveStats.frozenFactories > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">
                      {executiveStats.frozenFactories} Frozen Factories
                    </p>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    Factories currently not operational
                  </p>
                </div>
              )}

              {executiveStats.pendingReports > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-800">
                      {executiveStats.pendingReports} Pending Reports
                    </p>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Daily reports awaiting review
                  </p>
                </div>
              )}
              
              {executiveStats.lowStockAlerts === 0 && executiveStats.frozenFactories === 0 && executiveStats.pendingReports === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-800 font-medium">All Systems Operational</p>
                  <p className="text-xs text-green-600">No alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  icon: any
  color: string
  change: string
  trend?: 'up' | 'down' | 'neutral'
}

function StatsCard({ title, value, icon: Icon, color, change, trend = 'neutral' }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 text-gray-900">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {TrendIcon && (
              <TrendIcon className={`w-3 h-3 ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'
              }`} />
            )}
            <p className="text-xs text-gray-500 truncate">{change}</p>
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex-shrink-0 ml-2`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  )
}
