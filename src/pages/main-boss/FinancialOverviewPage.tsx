import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Calculator,
  CreditCard,
  Target,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

interface FinancialMetrics {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  grossMargin: number
  operatingMargin: number
  cashFlow: number
  outstandingPayables: number
  outstandingReceivables: number
}

interface FactoryFinancials {
  factory_id: string
  factory_name: string
  expenses: number
  production_volume: number // kg of cheese produced
  milk_collected: number // liters
  cost_per_kg: number // expense per kg of cheese
  conversion_rate: number // kg cheese per liter milk
  efficiency_score: number // based on cost and conversion
  topProducts: string[]
}

interface MonthlyFinancials {
  month: string
  revenue: number
  expenses: number
  profit: number
  cashFlow: number
  profitMargin: number
}

interface ExpenseBreakdown {
  category: string
  amount: number
  percentage: number
  color: string
  [key: string]: string | number
}

interface RevenueStream {
  source: string
  amount: number
  percentage: number
  growth: number
}

interface FinancialAlert {
  type: 'warning' | 'danger' | 'info'
  message: string
  factory?: string
  amount?: number
}

export default function FinancialOverviewPage() {
  const { user } = useAuthStore()
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    grossMargin: 0,
    operatingMargin: 0,
    cashFlow: 0,
    outstandingPayables: 0,
    outstandingReceivables: 0
  })
  const [factoryFinancials, setFactoryFinancials] = useState<FactoryFinancials[]>([])
  const [monthlyFinancials, setMonthlyFinancials] = useState<MonthlyFinancials[]>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([])
  const [revenueStreams, setRevenueStreams] = useState<RevenueStream[]>([])
  const [financialAlerts, setFinancialAlerts] = useState<FinancialAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [selectedFactory, setSelectedFactory] = useState<string>('all')
  const [factories, setFactories] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    fetchFinancialData()
  }, [dateFilter, selectedFactory])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchFactories(),
        fetchFinancialMetrics(),
        fetchFactoryFinancials(),
        fetchMonthlyFinancials(),
        fetchExpenseBreakdown(),
        fetchRevenueStreams()
      ])
      generateFinancialAlerts()
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  const refreshFinancialData = async () => {
    setRefreshing(true)
    await fetchFinancialData()
    setRefreshing(false)
    toast.success('Financial data refreshed successfully')
  }

  const fetchFactories = async () => {
    try {
      const { data, error } = await supabase
        .from('factories')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setFactories(data || [])
    } catch (error) {
      console.error('Error fetching factories:', error)
    }
  }

  const fetchFinancialMetrics = async () => {
    try {
      // Get company-wide revenue from all sales (no factory filter - sales recorded from main stock)
      const salesQuery = supabase
        .from('sales_orders')
        .select('total, order_date')
        .gte('order_date', dateFilter.startDate)
        .lte('order_date', dateFilter.endDate)

      // Get expenses - can filter by factory
      let expensesQuery = supabase
        .from('expenses')
        .select('total, expense_date, factory_id')
        .gte('expense_date', dateFilter.startDate)
        .lte('expense_date', dateFilter.endDate)

      if (selectedFactory !== 'all') {
        expensesQuery = expensesQuery.eq('factory_id', selectedFactory)
      }

      const [salesResult, expensesResult] = await Promise.all([
        salesQuery,
        expensesQuery
      ])

      if (salesResult.error) throw salesResult.error
      if (expensesResult.error) throw expensesResult.error

      const totalRevenue = salesResult.data?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0
      const totalExpenses = expensesResult.data?.reduce((sum: number, expense: any) => sum + (expense.total || 0), 0) || 0
      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      // Calculate other metrics
      const grossMargin = totalRevenue > 0 ? ((totalRevenue * 0.7) / totalRevenue) * 100 : 0 // Estimated
      const operatingMargin = totalRevenue > 0 ? ((netProfit + totalExpenses * 0.3) / totalRevenue) * 100 : 0 // Estimated

      setFinancialMetrics({
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        grossMargin,
        operatingMargin,
        cashFlow: netProfit * 1.1, // Estimated cash flow
        outstandingPayables: totalExpenses * 0.15, // Estimated
        outstandingReceivables: totalRevenue * 0.1 // Estimated
      })
    } catch (error) {
      console.error('Error calculating financial metrics:', error)
    }
  }

  const fetchFactoryFinancials = async () => {
    try {
      const { data: factories } = await supabase
        .from('factories')
        .select('id, name')
        .eq('status', 'active')

      if (!factories) return

      const factoryStats = await Promise.all(
        factories.map(async (factory: any) => {
          const [expensesResult, productionResult, milkResult] = await Promise.all([
            supabase
              .from('expenses')
              .select('total')
              .eq('factory_id', factory.id)
              .gte('expense_date', dateFilter.startDate)
              .lte('expense_date', dateFilter.endDate),
            supabase
              .from('production_batches')
              .select('quantity_produced, cheese_type')
              .eq('factory_id', factory.id)
              .gte('production_date', dateFilter.startDate)
              .lte('production_date', dateFilter.endDate)
              .eq('status', 'completed'),
            supabase
              .from('milk_collections')
              .select('quantity')
              .eq('factory_id', factory.id)
              .gte('collection_date', dateFilter.startDate)
              .lte('collection_date', dateFilter.endDate)
          ])

          const expenses = expensesResult.data?.reduce((sum: number, expense: any) => sum + (expense.total || 0), 0) || 0
          const production_volume = productionResult.data?.reduce((sum: number, p: any) => sum + (p.quantity_produced || 0), 0) || 0
          const milk_collected = milkResult.data?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0
          
          const cost_per_kg = production_volume > 0 ? expenses / production_volume : 0
          const conversion_rate = milk_collected > 0 ? production_volume / milk_collected : 0
          
          // Efficiency score: lower cost per kg + higher conversion rate = better
          const cost_score = cost_per_kg > 0 ? Math.max(0, 100 - cost_per_kg) : 0
          const conversion_score = conversion_rate * 100
          const efficiency_score = (cost_score + conversion_score) / 2

          // Get top products
          const productCounts = productionResult.data?.reduce((acc: any, p: any) => {
            acc[p.cheese_type] = (acc[p.cheese_type] || 0) + 1
            return acc
          }, {}) || {}
          const topProducts = Object.keys(productCounts).sort((a, b) => productCounts[b] - productCounts[a]).slice(0, 3)

          return {
            factory_id: factory.id,
            factory_name: factory.name,
            expenses,
            production_volume,
            milk_collected,
            cost_per_kg,
            conversion_rate,
            efficiency_score,
            topProducts
          }
        })
      )

      setFactoryFinancials(factoryStats.sort((a, b) => b.efficiency_score - a.efficiency_score))
    } catch (error) {
      console.error('Error fetching factory financials:', error)
    }
  }

  const fetchMonthlyFinancials = async () => {
    try {
      const startDate = new Date(dateFilter.startDate)
      const endDate = new Date(dateFilter.endDate)
      const monthlyData: { [key: string]: MonthlyFinancials } = {}

      // Get company-wide sales data (no factory filter - sales from main stock)
      const salesQuery = supabase
        .from('sales_orders')
        .select('total, order_date')
        .gte('order_date', dateFilter.startDate)
        .lte('order_date', dateFilter.endDate)

      const { data: sales } = await salesQuery

      // Get expenses data - can filter by factory
      let expensesQuery = supabase
        .from('expenses')
        .select('total, expense_date')
        .gte('expense_date', dateFilter.startDate)
        .lte('expense_date', dateFilter.endDate)

      if (selectedFactory !== 'all') {
        expensesQuery = expensesQuery.eq('factory_id', selectedFactory)
      }

      const { data: expenses } = await expensesQuery

      // Process sales data
      sales?.forEach((sale: any) => {
        const date = new Date(sale.order_date)
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        const monthName = date.toLocaleDateString('en-US', { month: 'short' })

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthName,
            revenue: 0,
            expenses: 0,
            profit: 0,
            cashFlow: 0,
            profitMargin: 0
          }
        }

        monthlyData[monthKey].revenue += sale.total || 0
      })

      // Process expenses data
      expenses?.forEach((expense: any) => {
        const date = new Date(expense.expense_date)
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`

        if (monthlyData[monthKey]) {
          monthlyData[monthKey].expenses += expense.total || 0
        }
      })

      // Calculate derived metrics
      Object.values(monthlyData).forEach(month => {
        month.profit = month.revenue - month.expenses
        month.cashFlow = month.profit * 1.1 // Estimated
        month.profitMargin = month.revenue > 0 ? (month.profit / month.revenue) * 100 : 0
      })

      const sortedMonthly = Object.keys(monthlyData)
        .sort()
        .slice(-12)
        .map(key => monthlyData[key])

      setMonthlyFinancials(sortedMonthly)
    } catch (error) {
      console.error('Error fetching monthly financials:', error)
    }
  }

  const fetchExpenseBreakdown = async () => {
    try {
      let expensesQuery = supabase
        .from('expenses')
        .select('category, total')
        .gte('expense_date', dateFilter.startDate)
        .lte('expense_date', dateFilter.endDate)

      if (selectedFactory !== 'all') {
        expensesQuery = expensesQuery.eq('factory_id', selectedFactory)
      }

      const { data: expenses } = await expensesQuery

      if (!expenses) return

      const categoryTotals: { [key: string]: number } = {}
      let totalExpenses = 0

      expenses.forEach((expense: any) => {
        const category = expense.category || 'Other'
        categoryTotals[category] = (categoryTotals[category] || 0) + (expense.total || 0)
        totalExpenses += expense.total || 0
      })

      const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16']
      
      const breakdown = Object.entries(categoryTotals)
        .map(([category, amount], index) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.amount - a.amount)

      setExpenseBreakdown(breakdown)
    } catch (error) {
      console.error('Error fetching expense breakdown:', error)
    }
  }

  const fetchRevenueStreams = async () => {
    try {
      // For now, we'll simulate revenue streams based on customer types and factory data
      const streams: RevenueStream[] = [
        { source: 'Retail Sales', amount: financialMetrics.totalRevenue * 0.6, percentage: 60, growth: 12.5 },
        { source: 'Wholesale', amount: financialMetrics.totalRevenue * 0.25, percentage: 25, growth: 8.2 },
        { source: 'Export', amount: financialMetrics.totalRevenue * 0.10, percentage: 10, growth: 15.7 },
        { source: 'Direct Sales', amount: financialMetrics.totalRevenue * 0.05, percentage: 5, growth: 22.1 }
      ]

      setRevenueStreams(streams)
    } catch (error) {
      console.error('Error calculating revenue streams:', error)
    }
  }

  const generateFinancialAlerts = () => {
    const alerts: FinancialAlert[] = []

    // Profit margin alerts
    if (financialMetrics.profitMargin < 10) {
      alerts.push({
        type: 'warning',
        message: 'Company-wide profit margin is below 10%',
        amount: financialMetrics.profitMargin
      })
    }

    // Factory-specific alerts (cost efficiency focused)
    factoryFinancials.forEach(factory => {
      if (factory.cost_per_kg > 1000) { // High cost per kg
        alerts.push({
          type: 'warning',
          message: 'Factory has high production cost per kg',
          factory: factory.factory_name,
          amount: factory.cost_per_kg
        })
      }

      if (factory.conversion_rate < 0.1) { // Low conversion efficiency
        alerts.push({
          type: 'warning',
          message: 'Factory showing low milk-to-cheese conversion rate',
          factory: factory.factory_name,
          amount: factory.conversion_rate
        })
      }

      if (factory.efficiency_score < 30) { // Low overall efficiency
        alerts.push({
          type: 'danger',
          message: 'Factory efficiency score is critically low',
          factory: factory.factory_name,
          amount: factory.efficiency_score
        })
      }
    })

    // Cash flow alerts
    if (financialMetrics.cashFlow < 0) {
      alerts.push({
        type: 'danger',
        message: 'Negative cash flow detected - immediate attention required'
      })
    }

    // Outstanding receivables
    if (financialMetrics.outstandingReceivables > financialMetrics.totalRevenue * 0.15) {
      alerts.push({
        type: 'warning',
        message: 'Outstanding receivables are above 15% of total revenue',
        amount: financialMetrics.outstandingReceivables
      })
    }

    setFinancialAlerts(alerts)
  }

  const generateFinancialReport = () => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('NZIZA Factory Management', 20, 30)
    doc.setFontSize(16)
    doc.text('Financial Overview Report', 20, 45)
    doc.setFontSize(12)
    doc.text(`Period: ${dateFilter.startDate} to ${dateFilter.endDate}`, 20, 60)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 70)

    // Key Metrics
    doc.setFontSize(14)
    doc.text('Key Financial Metrics', 20, 90)
    doc.setFontSize(10)
    doc.text(`Total Revenue: ${formatCurrency(financialMetrics.totalRevenue)}`, 25, 105)
    doc.text(`Total Expenses: ${formatCurrency(financialMetrics.totalExpenses)}`, 25, 115)
    doc.text(`Net Profit: ${formatCurrency(financialMetrics.netProfit)}`, 25, 125)
    doc.text(`Profit Margin: ${financialMetrics.profitMargin.toFixed(2)}%`, 25, 135)
    doc.text(`Cash Flow: ${formatCurrency(financialMetrics.cashFlow)}`, 25, 145)

    // Factory Performance Table
    doc.setFontSize(14)
    doc.text('Factory Cost Efficiency & Production', 20, 170)
    
    const tableData = factoryFinancials.slice(0, 5).map(factory => [
      factory.factory_name,
      `${factory.production_volume.toFixed(2)} kg`,
      formatCurrency(factory.expenses),
      formatCurrency(factory.cost_per_kg),
      factory.conversion_rate.toFixed(3),
      factory.efficiency_score.toFixed(1)
    ])

    ;(doc as any).autoTable({
      startY: 180,
      head: [['Factory', 'Production (kg)', 'Expenses', 'Cost/kg', 'Conversion', 'Efficiency']],
      body: tableData,
      styles: { fontSize: 9 }
    })

    doc.save(`NZIZA-Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('Financial report downloaded successfully')
  }

  const formatCurrency = (amount: number) => `${amount.toLocaleString()} RWF`
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-gray-600">Comprehensive financial analysis and performance metrics</p>
      </div>

      {/* Financial Alerts */}
      {financialAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-red-900">Financial Alerts</h3>
          </div>
          <div className="space-y-2">
            {financialAlerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded-lg ${
                alert.type === 'danger' ? 'bg-red-100 text-red-800' : 
                alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-blue-100 text-blue-800'
              }`}>
                <div className="font-medium">{alert.message}</div>
                {alert.factory && <div className="text-sm">Factory: {alert.factory}</div>}
                {alert.amount !== undefined && (
                  <div className="text-sm">
                    Value: {alert.message.includes('margin') ? formatPercentage(alert.amount) : formatCurrency(alert.amount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(financialMetrics.totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(financialMetrics.totalExpenses)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              financialMetrics.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                financialMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Profit</p>
              <p className={`text-xl font-bold ${
                financialMetrics.netProfit >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {formatCurrency(financialMetrics.netProfit)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-xl font-bold text-gray-900">{formatPercentage(financialMetrics.profitMargin)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cash Flow</p>
              <p className={`text-xl font-bold ${
                financialMetrics.cashFlow >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {formatCurrency(financialMetrics.cashFlow)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Factory Filter</label>
            <select
              value={selectedFactory}
              onChange={(e) => setSelectedFactory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Factories</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Financial Trends */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Financial Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyFinancials}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any, name: string) => [
                formatCurrency(value),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]} />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#34d399" />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#f87171" />
              <Area type="monotone" dataKey="profit" stackId="3" stroke="#3b82f6" fill="#60a5fa" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                dataKey="amount"
                label={({ category, percentage }: any) => `${category} (${percentage.toFixed(1)}%)`}
              >
                {expenseBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [formatCurrency(value), 'Amount']} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Factory Performance */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Production Efficiency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={factoryFinancials.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factory_name" />
              <YAxis />
              <Tooltip formatter={(value: any, name: string) => [
                name === 'expenses' ? formatCurrency(value) : 
                name === 'production_volume' ? `${value.toFixed(2)} kg` : value.toFixed(2),
                name === 'production_volume' ? 'Production (kg)' :
                name === 'expenses' ? 'Expenses' : name
              ]} />
              <Bar dataKey="production_volume" fill="#10b981" name="Production (kg)" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Streams */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Streams</h3>
          <div className="space-y-4">
            {revenueStreams.map((stream, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{stream.source}</div>
                  <div className="text-sm text-gray-500">{formatCurrency(stream.amount)}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{stream.percentage}%</div>
                  <div className={`text-sm ${stream.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stream.growth >= 0 ? '+' : ''}{stream.growth}% growth
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Factory Financial Details Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Factory Cost Efficiency & Production</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production (kg)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milk (L)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/kg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {factoryFinancials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No financial data available for the selected period
                  </td>
                </tr>
              ) : (
                factoryFinancials.map((factory) => (
                  <tr key={factory.factory_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{factory.factory_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{factory.production_volume.toFixed(2)} kg</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{factory.milk_collected.toFixed(2)} L</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(factory.expenses)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        factory.cost_per_kg < 500 ? 'text-green-600' : 
                        factory.cost_per_kg < 1000 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(factory.cost_per_kg)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        factory.conversion_rate >= 0.15 ? 'text-green-600' : 
                        factory.conversion_rate >= 0.1 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {factory.conversion_rate.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        factory.efficiency_score >= 60 ? 'text-green-600' : 
                        factory.efficiency_score >= 30 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {factory.efficiency_score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}