import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../types/database.types'

type Factory = Database['public']['Tables']['factories']['Row']
type MilkCollection = Database['public']['Tables']['milk_collections']['Row']
type ProductionBatch = Database['public']['Tables']['production_batches']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

interface ReportData {
  factory_id: string
  factory_name: string
  total_revenue: number
  total_expenses: number
  profit: number
  milk_collected: number
  production_volume: number
  active_farmers: number
  total_sales_orders: number
  avg_milk_price: number
}

export default function SeniorManagerReportsPage() {
  const [selectedFactory, setSelectedFactory] = useState<string>('all')
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)

  // Monthly trend data from database
  const [monthlyData, setMonthlyData] = useState<Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>>([])

  // Format currency in RWF
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('rw-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  useEffect(() => {
    fetchReportData()
    fetchMonthlyData()
  }, [selectedFactory, dateRange])

  const fetchMonthlyData = async () => {
    try {
      // Get the last 6 months of data for trend analysis
      const endDate = new Date(dateRange.to)
      const startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - 5)
      
      const monthlyPromises = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        const monthPromise = async () => {
          // Get factories to query
          const { data: factories } = await supabase
            .from('factories')
            .select('id')
            .eq('status', 'active')

          if (!factories) return null

          const factoriesToQuery = selectedFactory === 'all' 
            ? factories.map(f => f.id)
            : [selectedFactory]

          // Get milk collections revenue
          const { data: milkCollections } = await supabase
            .from('milk_collections')
            .select('total_amount')
            .in('factory_id', factoriesToQuery)
            .gte('collection_date', monthStart.toISOString().split('T')[0])
            .lte('collection_date', monthEnd.toISOString().split('T')[0])

          // Get sales revenue
          const { data: salesOrders } = await supabase
            .from('sales_orders')
            .select('total')
            .in('factory_id', factoriesToQuery)
            .gte('order_date', monthStart.toISOString().split('T')[0])
            .lte('order_date', monthEnd.toISOString().split('T')[0])

          // Get expenses
          const { data: expenses } = await supabase
            .from('expenses')
            .select('total')
            .in('factory_id', factoriesToQuery)
            .gte('expense_date', monthStart.toISOString().split('T')[0])
            .lte('expense_date', monthEnd.toISOString().split('T')[0])

          const totalMilkRevenue = milkCollections?.reduce((sum, mc) => sum + ((mc as any).total_amount || 0), 0) || 0
          const totalSalesRevenue = salesOrders?.reduce((sum, so) => sum + ((so as any).total || 0), 0) || 0
          const totalExpenses = expenses?.reduce((sum, e) => sum + ((e as any).total || 0), 0) || 0
          const totalRevenue = totalMilkRevenue + totalSalesRevenue

          return {
            month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: totalRevenue - totalExpenses
          }
        }

        monthlyPromises.push(monthPromise())
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      const results = await Promise.all(monthlyPromises)
      setMonthlyData(results.filter(r => r !== null) as typeof monthlyData)
    } catch (error) {
      console.error('Error fetching monthly data:', error)
      setMonthlyData([])
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // Get factories
      const { data: factories, error: factoriesError } = await supabase
        .from('factories')
        .select('id, name')
        .eq('status', 'active')

      if (factoriesError) throw factoriesError

      if (!factories || factories.length === 0) {
        setReportData([])
        return
      }

      // Filter factories based on selection
      const factoriesToFetch = selectedFactory === 'all' 
        ? factories 
        : factories.filter(f => f.id === selectedFactory)

      const reportPromises = factoriesToFetch.map(async (factory) => {
        try {
          // Get farmers count
          const { count: farmersCount } = await supabase
            .from('farmers')
            .select('*', { count: 'exact', head: true })
            .eq('factory_id', (factory as any).id)
            .eq('is_active', true)

          // Get milk collections data
          const { data: milkCollections } = await supabase
            .from('milk_collections')
            .select('quantity_liters, total_amount')
            .eq('factory_id', (factory as any).id)
            .gte('collection_date', dateRange.from)
            .lte('collection_date', dateRange.to)

          // Get production data
          const { data: production } = await supabase
            .from('production_batches')
            .select('cheese_produced_kg, milk_used_liters')
            .eq('factory_id', (factory as any).id)
            .gte('production_date', dateRange.from)
            .lte('production_date', dateRange.to)

          // Get expenses data
          const { data: expenses } = await supabase
            .from('expenses')
            .select('total')
            .eq('factory_id', (factory as any).id)
            .gte('expense_date', dateRange.from)
            .lte('expense_date', dateRange.to)

          // Get sales orders data
          const { data: salesOrders } = await supabase
            .from('sales_orders')
            .select('total')
            .eq('factory_id', (factory as any).id)
            .gte('order_date', dateRange.from)
            .lte('order_date', dateRange.to)

          // Calculate totals
          const totalMilkCollected = milkCollections?.reduce((sum, mc) => sum + ((mc as any).quantity_liters || 0), 0) || 0
          const totalMilkRevenue = milkCollections?.reduce((sum, mc) => sum + ((mc as any).total_amount || 0), 0) || 0
          const totalProduction = production?.reduce((sum, p) => sum + ((p as any).cheese_produced_kg || 0), 0) || 0
          const totalExpenses = expenses?.reduce((sum, e) => sum + ((e as any).total || 0), 0) || 0
          const totalSalesRevenue = salesOrders?.reduce((sum, so) => sum + ((so as any).total || 0), 0) || 0
          const totalRevenue = totalMilkRevenue + totalSalesRevenue
          const avgMilkPrice = totalMilkCollected > 0 ? totalMilkRevenue / totalMilkCollected : 0

          return {
            factory_id: (factory as any).id,
            factory_name: (factory as any).name,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            profit: totalRevenue - totalExpenses,
            milk_collected: totalMilkCollected,
            production_volume: totalProduction,
            active_farmers: farmersCount || 0,
            total_sales_orders: salesOrders?.length || 0,
            avg_milk_price: avgMilkPrice
          } as ReportData
        } catch (error) {
          console.error(`Error fetching data for factory ${(factory as any).name}:`, error)
          return {
            factory_id: (factory as any).id,
            factory_name: (factory as any).name,
            total_revenue: 0,
            total_expenses: 0,
            profit: 0,
            milk_collected: 0,
            production_volume: 0,
            active_farmers: 0,
            total_sales_orders: 0,
            avg_milk_price: 0
          } as ReportData
        }
      })

      const results = await Promise.all(reportPromises)
      setReportData(results)
    } catch (error) {
      console.error('Error fetching report data:', error)
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  const totalStats = reportData.reduce((acc, factory) => ({
    revenue: acc.revenue + factory.total_revenue,
    expenses: acc.expenses + factory.total_expenses,
    profit: acc.profit + factory.profit,
    milk: acc.milk + factory.milk_collected,
    production: acc.production + factory.production_volume,
    farmers: acc.farmers + factory.active_farmers
  }), { revenue: 0, expenses: 0, profit: 0, milk: 0, production: 0, farmers: 0 })

  // Generate dynamic performance data from reportData
  const factoryPerformance = reportData.map((factory, index) => {
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
    const totalRevenue = reportData.reduce((sum, f) => sum + f.total_revenue, 0)
    const percentage = totalRevenue > 0 ? Math.round((factory.total_revenue / totalRevenue) * 100) : 0
    
    return {
      name: factory.factory_name,
      value: percentage,
      color: colors[index % colors.length]
    }
  })

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive view of factory performance and metrics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <FactorySelector
            selectedFactoryId={selectedFactory === 'all' ? null : selectedFactory}
            onFactoryChange={(factoryId) => setSelectedFactory(factoryId || 'all')}
            showAllOption={true}
          />
          
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalStats.revenue)}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    +12.5% from last month
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalStats.profit)}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    +8.2% from last month
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Milk Collected</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.milk.toLocaleString()}L</p>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    +5.8% from last month
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue vs Expenses (Real Data) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue vs Expenses (Real Data)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="revenue" fill="#8b5cf6" />
                  <Bar dataKey="expenses" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Trend (Real Data) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Trend (Real Data)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={customTooltip} />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Factory Performance Distribution */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Performance Distribution</h3>
              <div className="flex flex-col lg:flex-row items-center gap-4">
                {/* Chart Container */}
                <div className="w-full lg:w-2/3">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={factoryPerformance}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={false} // Disable default labels for better mobile experience
                      >
                        {factoryPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Revenue Share']}
                        labelFormatter={(label) => `Factory: ${label}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend for mobile-friendly display */}
                <div className="w-full lg:w-1/3 space-y-2">
                  {factoryPerformance.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {entry.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.value}% of total revenue
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Factory Revenue Comparison */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Revenue Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="factory_name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="total_revenue" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Factory Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Factory Performance Details</h3>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expenses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Milk Collected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Production
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farmers
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((factory, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {factory.factory_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatCurrency(factory.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatCurrency(factory.total_expenses)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-green-600 font-medium">
                          {formatCurrency(factory.profit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {factory.milk_collected.toLocaleString()}L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {factory.production_volume.toLocaleString()}kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {factory.active_farmers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-6 space-y-4">
              {reportData.map((factory, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Factory Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 text-lg">{factory.factory_name}</h4>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Revenue</p>
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(factory.total_revenue)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Expenses</p>
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(factory.total_expenses)}</p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-red-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Profit</p>
                          <p className="text-lg font-semibold text-green-600">{formatCurrency(factory.profit)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Farmers</p>
                          <p className="text-lg font-semibold text-gray-900">{factory.active_farmers}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Production Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Milk Collected</p>
                      <p className="text-base font-semibold text-gray-900">{factory.milk_collected.toLocaleString()}L</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Production</p>
                      <p className="text-base font-semibold text-gray-900">{factory.production_volume.toLocaleString()}kg</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}