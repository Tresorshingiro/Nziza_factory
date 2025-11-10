import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { 
  Milk, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Factory,
  Users,
  DollarSign,
  Calendar,
  Eye,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  monthly: {
    totalMilk: number
    totalProduction: number
    totalSales: number
    totalExpenses: number
  }
  alerts: {
    lowStock: number
    pendingOrders: number
    overduePayments: number
  }
}

interface ChartData {
  productionChart: Array<{ name: string; milk: number; cheese: number }>
  salesChart: Array<{ name: string; revenue: number; orders: number }>
  expenseChart: Array<{ category: string; amount: number; percentage: number }>
}

export default function FactoryManagerDashboard() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    monthly: { totalMilk: 0, totalProduction: 0, totalSales: 0, totalExpenses: 0 },
    alerts: { lowStock: 0, pendingOrders: 0, overduePayments: 0 }
  })
  const [chartData, setChartData] = useState<ChartData>({
    productionChart: [],
    salesChart: [],
    expenseChart: []
  })

  useEffect(() => {
    if (user?.factory_id) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchMonthlyStats(),
        fetchChartData(),
        fetchAlerts()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthlyStats = async () => {
    if (!user?.factory_id) return

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Monthly totals
    const { data: monthlyMilk } = await supabase
      .from('milk_collections')
      .select('quantity_liters')
      .eq('factory_id', user.factory_id)
      .gte('collection_date', startOfMonth.toISOString())

    const { data: monthlyProduction } = await supabase
      .from('production_batches')
      .select('cheese_produced_kg')
      .eq('factory_id', user.factory_id)
      .gte('production_date', startOfMonth.toISOString().split('T')[0])

    const { data: monthlySales } = await supabase
      .from('sales_orders')
      .select('total')
      .eq('factory_id', user.factory_id)
      .gte('order_date', startOfMonth.toISOString().split('T')[0])

    const { data: monthlyExpenses } = await supabase
      .from('expenses')
      .select('total')
      .eq('factory_id', user.factory_id)
      .gte('expense_date', startOfMonth.toISOString().split('T')[0])

    setStats(prev => ({
      ...prev,
      monthly: {
        totalMilk: monthlyMilk?.reduce((sum: number, item: any) => sum + (item.quantity_liters || 0), 0) || 0,
        totalProduction: monthlyProduction?.reduce((sum: number, item: any) => sum + (item.cheese_produced_kg || 0), 0) || 0,
        totalSales: monthlySales?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
        totalExpenses: monthlyExpenses?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0
      }
    }))
  }

  const fetchChartData = async () => {
    if (!user?.factory_id) return

    // Last 7 days production data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    const productionChart = await Promise.all(
      last7Days.map(async (date) => {
        const { data: milkData } = await supabase
          .from('milk_collections')
          .select('quantity_liters')
          .eq('factory_id', user!.factory_id!)
          .eq('collection_date', date)

        const { data: productionData } = await supabase
          .from('production_batches')
          .select('cheese_produced_kg')
          .eq('factory_id', user!.factory_id!)
          .eq('production_date', date)

        return {
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          milk: milkData?.reduce((sum: number, item: any) => sum + (item.quantity_liters || 0), 0) || 0,
          cheese: productionData?.reduce((sum: number, item: any) => sum + (item.cheese_produced_kg || 0), 0) || 0
        }
      })
    )

    // Last 7 days sales data
    const salesChart = await Promise.all(
      last7Days.map(async (date) => {
        const { data: salesData } = await supabase
          .from('sales_orders')
          .select('total')
          .eq('factory_id', user!.factory_id!)
          .eq('order_date', date)

        const { data: ordersCount } = await supabase
          .from('sales_orders')
          .select('id')
          .eq('factory_id', user!.factory_id!)
          .eq('order_date', date)

        return {
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: salesData?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
          orders: ordersCount?.length || 0
        }
      })
    )

    // Expense breakdown by category
    const { data: expenseBreakdown } = await supabase
      .from('expenses')
      .select('category, total')
      .eq('factory_id', user!.factory_id!)
      .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const expensesByCategory = expenseBreakdown?.reduce((acc: any, expense: any) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.total
      return acc
    }, {}) || {}

    const totalExpenses = Object.values(expensesByCategory).reduce((sum: number, amount: any) => sum + amount, 0)
    const expenseChart = Object.entries(expensesByCategory).map(([category, amount]: [string, any]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))

    setChartData({
      productionChart,
      salesChart,
      expenseChart
    })
  }

  const fetchAlerts = async () => {
    if (!user?.factory_id) return

    // Low stock alerts (assuming stock levels below reorder level)
    const { data: stockData } = await supabase
      .from('stock')
      .select('quantity, reorder_level')
      .eq('factory_id', user!.factory_id!)

    const lowStock = stockData?.filter((item: any) => item.quantity <= item.reorder_level).length || 0

    // Pending orders
    const { data: pendingOrders } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('factory_id', user!.factory_id!)
      .eq('status', 'pending')

    // Overdue payments (assuming 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: overduePayments } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('factory_id', user!.factory_id!)
      .eq('payment_status', 'pending')
      .lte('order_date', thirtyDaysAgo.toISOString().split('T')[0])

    setStats(prev => ({
      ...prev,
      alerts: {
        lowStock,
        pendingOrders: pendingOrders?.length || 0,
        overduePayments: overduePayments?.length || 0
      }
    }))
  }

  const formatCurrency = (amount: number) => {
    return `RWF ${amount.toLocaleString()}`
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Factory Manager Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Real-time insights and operational metrics</p>
        </div>
        <Button 
          onClick={fetchDashboardData}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full sm:w-auto"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Alerts Banner */}
      {(stats.alerts.lowStock > 0 || stats.alerts.pendingOrders > 0 || stats.alerts.overduePayments > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-orange-800 font-medium">Attention Required</p>
                <div className="mt-2 space-y-1">
                  {stats.alerts.lowStock > 0 && (
                    <p className="text-orange-700 text-sm">• {stats.alerts.lowStock} items are low in stock</p>
                  )}
                  {stats.alerts.pendingOrders > 0 && (
                    <p className="text-orange-700 text-sm">• {stats.alerts.pendingOrders} orders awaiting processing</p>
                  )}
                  {stats.alerts.overduePayments > 0 && (
                    <p className="text-orange-700 text-sm">• {stats.alerts.overduePayments} payments are overdue</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Overview
          </CardTitle>
          <CardDescription>Cumulative metrics for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.monthly.totalMilk.toLocaleString()}</p>
              <p className="text-sm text-blue-700">Total Milk (L)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.monthly.totalProduction.toLocaleString()}</p>
              <p className="text-sm text-green-700">Total Production (kg)</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.monthly.totalSales)}</p>
              <p className="text-sm text-purple-700">Total Sales</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.monthly.totalExpenses)}</p>
              <p className="text-sm text-red-700">Total Expenses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Production Trend
            </CardTitle>
            <CardDescription>Milk collection vs cheese production (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {chartData.productionChart.length > 0 ? (
                <div className="relative h-full">
                  {/* Simple Bar Chart Implementation */}
                  <div className="flex items-end justify-between h-full pb-8">
                    {chartData.productionChart.map((day, index) => {
                      const maxMilk = Math.max(...chartData.productionChart.map(d => d.milk))
                      const maxCheese = Math.max(...chartData.productionChart.map(d => d.cheese))
                      const milkHeight = maxMilk > 0 ? (day.milk / maxMilk) * 180 : 0
                      const cheeseHeight = maxCheese > 0 ? (day.cheese / maxCheese) * 180 : 0
                      
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1">
                          <div className="flex gap-1 items-end">
                            <div 
                              className="w-4 bg-blue-500 rounded-t"
                              style={{ height: `${milkHeight}px` }}
                              title={`Milk: ${day.milk}L`}
                            />
                            <div 
                              className="w-4 bg-green-500 rounded-t"
                              style={{ height: `${cheeseHeight}px` }}
                              title={`Cheese: ${day.cheese}kg`}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{day.name}</span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-xs text-gray-600">Milk (L)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-600">Cheese (kg)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No production data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Sales Trend
            </CardTitle>
            <CardDescription>Revenue and order count (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {chartData.salesChart.length > 0 ? (
                <div className="relative h-full">
                  <div className="flex items-end justify-between h-full pb-8">
                    {chartData.salesChart.map((day, index) => {
                      const maxRevenue = Math.max(...chartData.salesChart.map(d => d.revenue))
                      const maxOrders = Math.max(...chartData.salesChart.map(d => d.orders))
                      const revenueHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 180 : 0
                      const ordersHeight = maxOrders > 0 ? (day.orders / maxOrders) * 180 : 0
                      
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1">
                          <div className="flex gap-1 items-end">
                            <div 
                              className="w-4 bg-purple-500 rounded-t"
                              style={{ height: `${revenueHeight}px` }}
                              title={`Revenue: ${formatCurrency(day.revenue)}`}
                            />
                            <div 
                              className="w-4 bg-orange-500 rounded-t"
                              style={{ height: `${ordersHeight}px` }}
                              title={`Orders: ${day.orders}`}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{day.name}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-xs text-gray-600">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-xs text-gray-600">Orders</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No sales data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>Last 30 days by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {chartData.expenseChart.length > 0 ? (
                <div className="flex flex-col h-full">
                  {/* Simple Pie Chart Representation */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-40 h-40">
                      {chartData.expenseChart.map((expense, index) => {
                        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500']
                        const color = colors[index % colors.length]
                        return (
                          <div key={index} className={`absolute inset-0 rounded-full ${color} opacity-80`} 
                               style={{
                                 transform: `rotate(${(chartData.expenseChart.slice(0, index).reduce((sum, e) => sum + e.percentage, 0) * 3.6)}deg)`,
                                 clipPath: `polygon(50% 50%, 50% 0%, ${50 + Math.cos((expense.percentage * 3.6) * Math.PI / 180) * 50}% ${50 - Math.sin((expense.percentage * 3.6) * Math.PI / 180) * 50}%)`
                               }}
                          />
                        )
                      })}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-2">
                    {chartData.expenseChart.map((expense, index) => {
                      const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500']
                      const color = colors[index % colors.length]
                      return (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${color}`}></div>
                            <span className="text-gray-600">{expense.category}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium">{formatCurrency(expense.amount)}</span>
                            <span className="text-gray-500">({expense.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No expense data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales vs Expenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales vs Expenses
            </CardTitle>
            <CardDescription>Revenue comparison with operational costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {(() => {
                const salesTotal = stats.monthly.totalSales
                const expensesTotal = stats.monthly.totalExpenses
                const maxValue = Math.max(salesTotal, expensesTotal)
                
                return (
                  <div className="space-y-6 pt-4">
                    {/* Sales Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-green-500"></div>
                          <span className="font-medium">Sales Revenue</span>
                        </div>
                        <span className="font-semibold">RWF {salesTotal.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div 
                          className="bg-green-500 h-8 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                          style={{ width: `${maxValue > 0 ? (salesTotal / maxValue) * 100 : 0}%` }}
                        >
                          {maxValue > 0 && ((salesTotal / maxValue) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Expenses Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-red-500"></div>
                          <span className="font-medium">Total Expenses</span>
                        </div>
                        <span className="font-semibold">RWF {expensesTotal.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div 
                          className="bg-red-500 h-8 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                          style={{ width: `${maxValue > 0 ? (expensesTotal / maxValue) * 100 : 0}%` }}
                        >
                          {maxValue > 0 && ((expensesTotal / maxValue) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Net Result */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Net Result:</span>
                        <div className="flex items-center gap-2">
                          {salesTotal >= expensesTotal ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span className={`font-bold ${salesTotal >= expensesTotal ? 'text-green-600' : 'text-red-600'}`}>
                            RWF {Math.abs(salesTotal - expensesTotal).toLocaleString()}
                            {salesTotal >= expensesTotal ? ' Profit' : ' Loss'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Profit & Loss Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Profit & Loss Analysis
            </CardTitle>
            <CardDescription>Financial performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {(() => {
                const salesTotal = stats.monthly.totalSales
                const expensesTotal = stats.monthly.totalExpenses
                const profit = salesTotal - expensesTotal
                const isProfit = profit >= 0
                
                return (
                  <div className="space-y-6">
                    {/* Performance Summary */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="text-lg font-bold text-green-600">
                          RWF {salesTotal.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Expenses</p>
                        <p className="text-lg font-bold text-red-600">
                          RWF {expensesTotal.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Net Result</p>
                        <p className={`text-lg font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          RWF {Math.abs(profit).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Visual Profit/Loss Indicator */}
                    <div className="relative">
                      <div className="flex justify-center mb-4">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                          isProfit ? 'bg-green-100 border-4 border-green-500' : 'bg-red-100 border-4 border-red-500'
                        }`}>
                          <div className="text-center">
                            {isProfit ? (
                              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-1" />
                            ) : (
                              <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-1" />
                            )}
                            <p className={`text-sm font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? 'PROFIT' : 'LOSS'}
                            </p>
                            <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {salesTotal > 0 ? ((Math.abs(profit) / salesTotal) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Profit Margin Indicator */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Margin Health</span>
                          <span>{salesTotal > 0 ? ((profit / salesTotal) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              profit > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min(Math.abs(profit / (salesTotal || 1)) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-600">Loss</span>
                          <span className="text-gray-500">Break Even</span>
                          <span className="text-green-600">Profit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for daily operations</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700" size="lg">
            <Milk className="w-5 h-5 mr-2" />
            Record Milk Collection
          </Button>
          <Button variant="outline" className="h-16 border-green-300 text-green-600 hover:bg-green-50" size="lg">
            <Package className="w-5 h-5 mr-2" />
            Log Production
          </Button>
          <Button variant="outline" className="h-16 border-purple-300 text-purple-600 hover:bg-purple-50" size="lg">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Create Sales Order
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Factory className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Production Efficiency</p>
                  <p className="text-sm text-gray-600">
                    {stats.monthly.totalMilk > 0 
                      ? `${((stats.monthly.totalProduction / stats.monthly.totalMilk) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white">
                {stats.monthly.totalMilk > 0 && stats.monthly.totalProduction > 0 ? 'Good' : 'No Data'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">Revenue vs Expenses</p>
                  <p className="text-sm text-gray-600">
                    {stats.monthly.totalSales > 0 && stats.monthly.totalExpenses > 0
                      ? `${((stats.monthly.totalSales - stats.monthly.totalExpenses) / stats.monthly.totalSales * 100).toFixed(1)}% margin`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white">
                {stats.monthly.totalSales > stats.monthly.totalExpenses ? 'Profitable' : 'Review Needed'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="font-medium">Monthly Summary</p>
                  <p className="text-sm text-gray-600">
                    {stats.monthly.totalMilk > 0 
                      ? `${stats.monthly.totalMilk.toLocaleString()} L milk this month`
                      : 'No collections this month'
                    }
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>Tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.alerts.lowStock > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Low Stock Alert</p>
                    <p className="text-sm text-red-700">{stats.alerts.lowStock} items need reordering</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-red-300 text-red-600">
                  View Stock
                </Button>
              </div>
            )}

            {stats.alerts.pendingOrders > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">Pending Orders</p>
                    <p className="text-sm text-yellow-700">{stats.alerts.pendingOrders} orders awaiting processing</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-600">
                  Process
                </Button>
              </div>
            )}

            {stats.alerts.overduePayments > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">Overdue Payments</p>
                    <p className="text-sm text-orange-700">{stats.alerts.overduePayments} payments past due</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-orange-300 text-orange-600">
                  Follow Up
                </Button>
              </div>
            )}

            {stats.alerts.lowStock === 0 && stats.alerts.pendingOrders === 0 && stats.alerts.overduePayments === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-medium">All systems running smoothly!</p>
                <p className="text-sm">No urgent actions required</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
