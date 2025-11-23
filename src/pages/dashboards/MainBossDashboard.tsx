import { useState, useEffect } from 'react'
import { 
  Factory, 
  TrendingUp, 
  Package, 
  BarChart3, 
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Milk,
  Target
} from 'lucide-react'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

// Database entity types
interface Factory {
  id: string
  name: string
  code: string
  status: string
  location?: string
}

interface DailyMetrics {
  date: string
  factories: FactoryDailyData[]
}

interface FactoryDailyData {
  factory_id: string
  factory_name: string
  milk_collected: number
  cheese_produced: number
  conversion_rate: number
  sales_revenue: number
}

interface MilkCollectionData {
  date: string
  [factoryName: string]: any // Dynamic factory names as keys
}

interface CheeseProductionData {
  factory_name: string
  production: number
  target?: number
}

interface ConversionEfficiency {
  factory_name: string
  efficiency: number
  milk_used: number
  cheese_produced: number
}

interface StockMovement {
  date: string
  incoming: number
  outgoing: number
  net_change: number
}

interface CustomerRanking {
  customer_name: string
  total_orders: number
  total_revenue: number
  last_order_date: string
}

interface DashboardSummary {
  totalMilkToday: number
  totalCheeseToday: number
  avgConversionRate: number
  totalRevenue: number
  activeFactories: number
}

const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#8b5cf6', '#6366f1']

export default function MainBossDashboard() {
  const { user } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dashboardSummary, setDashboardSummary] = useState({
    totalMilkToday: 0,
    totalCheeseToday: 0,
    avgConversionRate: 0, // Will be repurposed as main stock quantity
    totalRevenue: 0,
    activeFactories: 0,
    mainStockValue: 0
  })
  const [milkCollectionData, setMilkCollectionData] = useState<MilkCollectionData[]>([])
  const [cheeseProductionData, setCheeseProductionData] = useState<CheeseProductionData[]>([])
  const [conversionEfficiency, setConversionEfficiency] = useState<ConversionEfficiency[]>([])
  const [stockMovement, setStockMovement] = useState<StockMovement[]>([])
  const [customerRanking, setCustomerRanking] = useState<CustomerRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [selectedDate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchDashboardSummary(),
        fetchMilkCollectionData(),
        fetchCheeseProductionData(),
        fetchConversionEfficiency(),
        fetchStockMovement(),
        fetchCustomerRanking()
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

  const fetchDashboardSummary = async () => {
    try {
      // Get factories
      const { data: factories } = await supabase
        .from('factories')
        .select('id, name, status')
        .eq('status', 'active')

      const activeFactories = factories?.length || 0

      // Get today's milk collection (using exact date match)
      const { data: milkData, error: milkError } = await supabase
        .from('milk_collections')
        .select('quantity_liters, collection_date')
        .eq('collection_date', selectedDate)

      console.log('Milk collection query:', { selectedDate, milkData, milkError })

      // Also get recent milk collection data for fallback
      const { data: recentMilkData } = await supabase
        .from('milk_collections')
        .select('quantity_liters, collection_date')
        .gte('collection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('collection_date', { ascending: false })

      console.log('Recent milk data (last 7 days):', recentMilkData)

      const totalMilkToday = milkData?.reduce((sum: number, item: any) => sum + (item.quantity_liters || 0), 0) || 0

      // Get today's cheese production (using exact date match)
      const { data: productionData, error: prodError } = await supabase
        .from('production_batches')
        .select('cheese_produced_kg, milk_used_liters, production_date')
        .eq('production_date', selectedDate)

      console.log('Production query:', { selectedDate, productionData, prodError })

      // Also get recent production data for fallback
      const { data: recentProdData } = await supabase
        .from('production_batches')
        .select('cheese_produced_kg, production_date')
        .gte('production_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('production_date', { ascending: false })

      console.log('Recent production data (last 7 days):', recentProdData)

      const totalCheeseToday = productionData?.reduce((sum: number, item: any) => sum + (item.cheese_produced_kg || 0), 0) || 0

      // Get main stock summary
      const { data: mainStockData } = await supabase
        .from('main_stock')
        .select('total_quantity, total_value')

      const totalMainStockQty = mainStockData?.reduce((sum: number, item: any) => sum + (item.total_quantity || 0), 0) || 0
      const totalMainStockValue = mainStockData?.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0) || 0

      // Get today's revenue (using date range)
      const { data: salesData } = await supabase
        .from('sales_orders')
        .select('total')
        .gte('order_date', selectedDate)
        .lt('order_date', new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      const totalRevenue = salesData?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0

      setDashboardSummary({
        totalMilkToday,
        totalCheeseToday,
        avgConversionRate: totalMainStockQty, // Changed to main stock quantity
        totalRevenue,
        activeFactories,
        mainStockValue: totalMainStockValue // Add main stock value
      })
    } catch (error) {
      console.error('Error fetching dashboard summary:', error)
    }
  }

  const fetchMilkCollectionData = async () => {
    try {
      // Get last 7 days of data
      const endDate = new Date(selectedDate)
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 6)

      const { data: factories } = await supabase
        .from('factories')
        .select('id, name')
        .eq('status', 'active')

      const { data: collections } = await supabase
        .from('milk_collections')
        .select(`
          collection_date,
          quantity_liters,
          factories!inner(name)
        `)
        .gte('collection_date', startDate.toISOString().split('T')[0])
        .lte('collection_date', selectedDate)
        .order('collection_date')

      // Group by date and factory
      const groupedData: { [date: string]: { [factory: string]: number } } = {}
      
      collections?.forEach((item: any) => {
        const date = item.collection_date
        const factoryName = item.factories?.name || 'Unknown'
        
        if (!groupedData[date]) {
          groupedData[date] = {}
        }
        
        if (!groupedData[date][factoryName]) {
          groupedData[date][factoryName] = 0
        }
        
        groupedData[date][factoryName] += item.quantity_liters || 0
      })

      // Convert to chart format
      const chartData = Object.keys(groupedData).map(date => ({
        date,
        ...groupedData[date]
      }))

      setMilkCollectionData(chartData)
    } catch (error) {
      console.error('Error fetching milk collection data:', error)
    }
  }

  const fetchCheeseProductionData = async () => {
    try {
      const { data: productionData } = await supabase
        .from('production_batches')
        .select(`
          cheese_produced_kg,
          factories!inner(name)
        `)
        .eq('production_date', selectedDate)

      // Group by factory
      const factoryProduction: { [factory: string]: number } = {}
      
      productionData?.forEach((item: any) => {
        const factoryName = item.factories?.name || 'Unknown'
        if (!factoryProduction[factoryName]) {
          factoryProduction[factoryName] = 0
        }
        factoryProduction[factoryName] += item.cheese_produced_kg || 0
      })

      const chartData = Object.keys(factoryProduction).map(factory => ({
        factory_name: factory,
        production: factoryProduction[factory]
      }))

      setCheeseProductionData(chartData)
    } catch (error) {
      console.error('Error fetching cheese production data:', error)
    }
  }

  const fetchConversionEfficiency = async () => {
    try {
      const { data: productionData } = await supabase
        .from('production_batches')
        .select(`
          cheese_produced_kg,
          milk_used_liters,
          factories!inner(name)
        `)
        .eq('production_date', selectedDate)

      // Group by factory
      const factoryEfficiency: { [factory: string]: { milk: number, cheese: number } } = {}
      
      productionData?.forEach((item: any) => {
        const factoryName = item.factories?.name || 'Unknown'
        if (!factoryEfficiency[factoryName]) {
          factoryEfficiency[factoryName] = { milk: 0, cheese: 0 }
        }
        factoryEfficiency[factoryName].milk += item.milk_used_liters || 0
        factoryEfficiency[factoryName].cheese += item.cheese_produced_kg || 0
      })

      const chartData = Object.keys(factoryEfficiency).map(factory => {
        const data = factoryEfficiency[factory]
        const efficiency = data.milk > 0 ? (data.cheese / data.milk) * 100 : 0
        return {
          factory_name: factory,
          efficiency: Math.round(efficiency * 100) / 100,
          milk_used: data.milk,
          cheese_produced: data.cheese
        }
      })

      setConversionEfficiency(chartData)
    } catch (error) {
      console.error('Error fetching conversion efficiency:', error)
    }
  }

  const fetchStockMovement = async () => {
    try {
      // Get last 7 days of main stock movements
      const endDate = new Date(selectedDate)
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 6)

      // Get main stock movements (transfers in and out)
      const { data: stockMovements } = await supabase
        .from('main_stock_movements')
        .select('movement_type, quantity, created_at, notes')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      console.log('Stock movements data:', { stockMovements, startDate: startDate.toISOString(), endDate: endDate.toISOString() })

      // Group by date
      const movements: { [date: string]: { incoming: number, outgoing: number } } = {}
      
      // Process main stock movements
      stockMovements?.forEach((movement: any) => {
        const date = movement.created_at.split('T')[0] // Extract date part
        if (!movements[date]) {
          movements[date] = { incoming: 0, outgoing: 0 }
        }
        
        // movement_type: 'in' for incoming, 'out' for outgoing
        if (movement.movement_type === 'in') {
          movements[date].incoming += movement.quantity || 0
        } else if (movement.movement_type === 'out') {
          movements[date].outgoing += movement.quantity || 0
        }
      })

      // Fill in missing dates with zero values
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        if (!movements[dateStr]) {
          movements[dateStr] = { incoming: 0, outgoing: 0 }
        }
      }

      const chartData = Object.keys(movements).map(date => ({
        date,
        incoming: movements[date].incoming,
        outgoing: movements[date].outgoing,
        net_change: movements[date].incoming - movements[date].outgoing
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      console.log('Processed stock movement chart data:', chartData)
      setStockMovement(chartData)
    } catch (error) {
      console.error('Error fetching stock movement:', error)
    }
  }

  const fetchCustomerRanking = async () => {
    try {
      const { data: salesData } = await supabase
        .from('sales_orders')
        .select(`
          total,
          order_date,
          customers!inner(name),
          sales_order_items!inner(quantity)
        `)
        .gte('order_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days

      // Group by customer
      const customerStats: { [customer: string]: { orders: number, revenue: number, lastOrder: string } } = {}
      
      salesData?.forEach((item: any) => {
        const customerName = item.customers?.name || 'Unknown Customer'
        if (!customerStats[customerName]) {
          customerStats[customerName] = { orders: 0, revenue: 0, lastOrder: item.order_date }
        }
        customerStats[customerName].orders += 1
        customerStats[customerName].revenue += item.total || 0
        
        // Update last order date if this is more recent
        if (new Date(item.order_date) > new Date(customerStats[customerName].lastOrder)) {
          customerStats[customerName].lastOrder = item.order_date
        }
      })

      const chartData = Object.keys(customerStats)
        .map(customer => ({
          customer_name: customer,
          total_orders: customerStats[customer].orders,
          total_revenue: customerStats[customer].revenue,
          last_order_date: customerStats[customer].lastOrder
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10) // Top 10 customers

      setCustomerRanking(chartData)
    } catch (error) {
      console.error('Error fetching customer ranking:', error)
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
          {[1, 2, 3, 4, 5].map(i => (
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
      {/* Header with Date Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Daily production metrics and factory performance overview
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Milk Collected Today
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {dashboardSummary.totalMilkToday.toLocaleString()}L
              </p>
              <p className="text-xs text-gray-500">{selectedDate}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
              <Droplets className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Cheese Produced Today
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {dashboardSummary.totalCheeseToday.toLocaleString()}kg
              </p>
              <p className="text-xs text-gray-500">{selectedDate}</p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
              <Milk className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Main Stock Quantity</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{dashboardSummary.avgConversionRate.toLocaleString()} kg</p>
              <p className="text-xs text-gray-500 mt-1">
                Value: RWF {dashboardSummary.mainStockValue.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
              <Package className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Sales Revenue</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(dashboardSummary.totalRevenue)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active Factories</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{dashboardSummary.activeFactories}</p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-100 rounded-lg">
              <Factory className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milk Collection Line Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Milk Collection Per Factory (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={milkCollectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any, name: any) => [`${value}L`, name]} />
              <Legend />
              {Object.keys(milkCollectionData[0] || {})
                .filter(key => key !== 'date')
                .map((factory, index) => (
                  <Line 
                    key={factory}
                    type="monotone" 
                    dataKey={factory} 
                    stroke={COLORS[index % COLORS.length]} 
                    strokeWidth={2}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cheese Production Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cheese Production Per Factory (Today)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cheeseProductionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factory_name" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}kg`, 'Production']} />
              <Bar dataKey="production" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Efficiency Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Milk → Cheese Conversion Efficiency
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionEfficiency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factory_name" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Efficiency']} />
              <Bar dataKey="efficiency" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Movement Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Main Stock Movement (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={stockMovement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                label={{ value: 'Cheese Quantity (kg)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={(date) => `Date: ${new Date(date).toLocaleDateString()}`}
                formatter={(value: any, name: string) => {
                  if (name === 'Net Change') return [`${value > 0 ? '+' : ''}${value} kg`, name];
                  return [`${value} kg`, name];
                }}
              />
              <Legend />
              <Bar dataKey="incoming" fill="#06b6d4" name="Cheese In (Production)" />
              <Bar dataKey="outgoing" fill="#ef4444" name="Cheese Out (Sales)" />
              <Line type="monotone" dataKey="net_change" stroke="#8b5cf6" strokeWidth={2} name="Net Stock Change" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Ranking Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Customers (Last 30 Days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Order
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customerRanking.map((customer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-amber-600">{index + 1}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{customer.customer_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.total_orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(customer.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(customer.last_order_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}