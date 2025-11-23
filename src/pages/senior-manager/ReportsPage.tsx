import { useState, useEffect } from 'react'
import { TrendingUp, Droplets, Package, Gauge } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../types/database.types'

type Factory = Database['public']['Tables']['factories']['Row']
type MilkCollection = Database['public']['Tables']['milk_collections']['Row']
type ProductionBatch = Database['public']['Tables']['production_batches']['Row']

interface ProductionReportData {
  factory_id: string
  factory_name: string
  milk_collected_liters: number
  cheese_produced_kg: number
  milk_used_liters: number
  conversion_efficiency: number
  production_batches: number
  active_farmers: number
  avg_quality_score: number
  waste_kg: number
}

export default function SeniorManagerReportsPage() {
  const [selectedFactory, setSelectedFactory] = useState<string>('all')
  const [reportData, setReportData] = useState<ProductionReportData[]>([])
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)

  // Monthly production trend data from database
  const [monthlyData, setMonthlyData] = useState<Array<{
    month: string
    milk_collected: number
    cheese_produced: number
    milk_used: number
    efficiency: number
  }>>([])

  // Format numbers with proper units
  const formatVolume = (liters: number) => {
    return `${liters.toLocaleString()}L`
  }

  const formatWeight = (kg: number) => {
    return `${kg.toLocaleString()}kg`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
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
            ? factories.map((f: any) => f.id)
            : [selectedFactory]

          // Get milk collections
          const { data: milkCollections } = await supabase
            .from('milk_collections')
            .select('quantity_liters')
            .in('factory_id', factoriesToQuery)
            .gte('collection_date', monthStart.toISOString().split('T')[0])
            .lte('collection_date', monthEnd.toISOString().split('T')[0])

          // Get production data
          const { data: production } = await supabase
            .from('production_batches')
            .select('cheese_produced_kg, milk_used_liters')
            .in('factory_id', factoriesToQuery)
            .gte('production_date', monthStart.toISOString().split('T')[0])
            .lte('production_date', monthEnd.toISOString().split('T')[0])
            .eq('status', 'completed')

          const totalMilkCollected = milkCollections?.reduce((sum: number, mc: any) => sum + (mc.quantity_liters || 0), 0) || 0
          const totalCheeseProduced = production?.reduce((sum: number, p: any) => sum + (p.cheese_produced_kg || 0), 0) || 0
          const totalMilkUsed = production?.reduce((sum: number, p: any) => sum + (p.milk_used_liters || 0), 0) || 0
          const efficiency = totalMilkUsed > 0 ? (totalCheeseProduced / totalMilkUsed) * 100 : 0

          return {
            month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            milk_collected: totalMilkCollected,
            cheese_produced: totalCheeseProduced,
            milk_used: totalMilkUsed,
            efficiency: efficiency
          }
        }

        monthlyPromises.push(monthPromise())
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      const results = await Promise.all(monthlyPromises)
      setMonthlyData(results.filter(r => r !== null) as typeof monthlyData)
    } catch (error) {
      console.error('Error fetching monthly production data:', error)
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
        : factories.filter((f: any) => f.id === selectedFactory)

      const reportPromises = factoriesToFetch.map(async (factory: any) => {
        try {
          // Get farmers count
          const { count: farmersCount } = await supabase
            .from('farmers')
            .select('*', { count: 'exact', head: true })
            .eq('factory_id', factory.id)
            .eq('is_active', true)

          // Get milk collections data
          const { data: milkCollections } = await supabase
            .from('milk_collections')
            .select('quantity_liters')
            .eq('factory_id', factory.id)
            .gte('collection_date', dateRange.from)
            .lte('collection_date', dateRange.to)

          // Get production data with quality scores and waste
          const { data: production } = await supabase
            .from('production_batches')
            .select('cheese_produced_kg, milk_used_liters, quality_score, waste_kg')
            .eq('factory_id', factory.id)
            .gte('production_date', dateRange.from)
            .lte('production_date', dateRange.to)
            .eq('status', 'completed')

          // Calculate totals and averages
          const totalMilkCollected = milkCollections?.reduce((sum: number, mc: any) => sum + (mc.quantity_liters || 0), 0) || 0
          const totalCheeseProduced = production?.reduce((sum: number, p: any) => sum + (p.cheese_produced_kg || 0), 0) || 0
          const totalMilkUsed = production?.reduce((sum: number, p: any) => sum + (p.milk_used_liters || 0), 0) || 0
          const totalWaste = production?.reduce((sum: number, p: any) => sum + (p.waste_kg || 0), 0) || 0
          
          // Calculate conversion efficiency (kg cheese per liter milk)
          const conversionEfficiency = totalMilkUsed > 0 ? (totalCheeseProduced / totalMilkUsed) * 100 : 0
          
          // Calculate average quality score
          const qualityScores = production?.filter((p: any) => p.quality_score !== null).map((p: any) => p.quality_score!) || []
          const avgQualityScore = qualityScores.length > 0 
            ? qualityScores.reduce((sum: number, score: number) => sum + score, 0) / qualityScores.length 
            : 0

          return {
            factory_id: factory.id,
            factory_name: factory.name,
            milk_collected_liters: totalMilkCollected,
            cheese_produced_kg: totalCheeseProduced,
            milk_used_liters: totalMilkUsed,
            conversion_efficiency: conversionEfficiency,
            production_batches: production?.length || 0,
            active_farmers: farmersCount || 0,
            avg_quality_score: avgQualityScore,
            waste_kg: totalWaste
          } as ProductionReportData
        } catch (error) {
          console.error(`Error fetching data for factory ${factory.name}:`, error)
          return {
            factory_id: factory.id,
            factory_name: factory.name,
            milk_collected_liters: 0,
            cheese_produced_kg: 0,
            milk_used_liters: 0,
            conversion_efficiency: 0,
            production_batches: 0,
            active_farmers: 0,
            avg_quality_score: 0,
            waste_kg: 0
          } as ProductionReportData
        }
      })

      const results = await Promise.all(reportPromises)
      setReportData(results)
    } catch (error) {
      console.error('Error fetching production report data:', error)
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  const totalStats = reportData.reduce((acc, factory) => ({
    milkCollected: acc.milkCollected + factory.milk_collected_liters,
    cheeseProduced: acc.cheeseProduced + factory.cheese_produced_kg,
    milkUsed: acc.milkUsed + factory.milk_used_liters,
    farmers: acc.farmers + factory.active_farmers,
    batches: acc.batches + factory.production_batches,
    waste: acc.waste + factory.waste_kg
  }), { 
    milkCollected: 0, 
    cheeseProduced: 0, 
    milkUsed: 0, 
    farmers: 0, 
    batches: 0, 
    waste: 0 
  })

  // Calculate overall efficiency
  const overallEfficiency = totalStats.milkUsed > 0 
    ? (totalStats.cheeseProduced / totalStats.milkUsed) * 100 
    : 0

  // Generate factory cheese production distribution
  const factoryProductionData = reportData.map((factory, index) => {
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
    const totalProduction = reportData.reduce((sum, f) => sum + f.cheese_produced_kg, 0)
    const percentage = totalProduction > 0 ? Math.round((factory.cheese_produced_kg / totalProduction) * 100) : 0
    
    return {
      name: factory.factory_name,
      value: percentage,
      production: factory.cheese_produced_kg,
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
              {entry.dataKey === 'milk_collected' && `Milk Collected: ${formatVolume(entry.value)}`}
              {entry.dataKey === 'cheese_produced' && `Cheese Produced: ${formatWeight(entry.value)}`}
              {entry.dataKey === 'milk_used' && `Milk Used: ${formatVolume(entry.value)}`}
              {entry.dataKey === 'efficiency' && `Efficiency: ${formatPercentage(entry.value)}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Production Analytics</h1>
          <p className="text-gray-600">Comprehensive view of milk collection, cheese production, and efficiency metrics</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Milk Collected</p>
                  <p className="text-2xl font-bold text-gray-900">{formatVolume(totalStats.milkCollected)}</p>
                  <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                    <Droplets className="w-4 h-4" />
                    From {totalStats.farmers} farmers
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cheese Produced</p>
                  <p className="text-2xl font-bold text-gray-900">{formatWeight(totalStats.cheeseProduced)}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                    <Package className="w-4 h-4" />
                    {totalStats.batches} batches
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Milk Used in Production</p>
                  <p className="text-2xl font-bold text-gray-900">{formatVolume(totalStats.milkUsed)}</p>
                  <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                    <Gauge className="w-4 h-4" />
                    {formatWeight(totalStats.waste)} waste
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Gauge className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercentage(overallEfficiency)}</p>
                  <p className="text-sm text-purple-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    kg cheese per 100L milk
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Production Trend */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Production Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={customTooltip} />
                  <Area 
                    type="monotone" 
                    dataKey="milk_collected" 
                    stackId="1"
                    stroke="#06b6d4" 
                    fill="#06b6d4" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cheese_produced" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Conversion Efficiency Trend */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Efficiency Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={customTooltip} />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Factory Cheese Production Distribution */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cheese Production by Factory</h3>
              <div className="flex flex-col lg:flex-row items-center gap-4">
                {/* Chart Container */}
                <div className="w-full lg:w-2/3">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={factoryProductionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={false}
                      >
                        {factoryProductionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value}% (${formatWeight(props.payload.production)})`,
                          'Production Share'
                        ]}
                        labelFormatter={(label) => `Factory: ${label}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="w-full lg:w-1/3 space-y-2">
                  {factoryProductionData.map((entry, index) => (
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
                          {entry.value}% ({formatWeight(entry.production)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Factory Production Comparison */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Milk Collection vs Cheese Production</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="factory_name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'milk_collected_liters' ? formatVolume(value as number) : formatWeight(value as number),
                      name === 'milk_collected_liters' ? 'Milk Collected' : 'Cheese Produced'
                    ]}
                  />
                  <Bar dataKey="milk_collected_liters" fill="#06b6d4" name="milk_collected_liters" />
                  <Bar dataKey="cheese_produced_kg" fill="#10b981" name="cheese_produced_kg" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Factory Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Factory Production Details</h3>
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
                      Milk Collected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cheese Produced
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Milk Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efficiency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batches
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
                        {formatVolume(factory.milk_collected_liters)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatWeight(factory.cheese_produced_kg)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatVolume(factory.milk_used_liters)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-medium ${
                          factory.conversion_efficiency >= 10 ? 'text-green-600' : 
                          factory.conversion_efficiency >= 8 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(factory.conversion_efficiency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {factory.avg_quality_score > 0 ? factory.avg_quality_score.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {factory.production_batches}
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
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        factory.conversion_efficiency >= 10 ? 'bg-green-100 text-green-700' : 
                        factory.conversion_efficiency >= 8 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {formatPercentage(factory.conversion_efficiency)} efficiency
                      </span>
                    </div>
                  </div>

                  {/* Production Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Milk Collected</p>
                          <p className="text-lg font-semibold text-gray-900">{formatVolume(factory.milk_collected_liters)}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Droplets className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Cheese Produced</p>
                          <p className="text-lg font-semibold text-gray-900">{formatWeight(factory.cheese_produced_kg)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Package className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Milk Used</p>
                          <p className="text-lg font-semibold text-gray-900">{formatVolume(factory.milk_used_liters)}</p>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Gauge className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Quality Score</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {factory.avg_quality_score > 0 ? factory.avg_quality_score.toFixed(1) : 'N/A'}
                          </p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Batches</p>
                      <p className="text-base font-semibold text-gray-900">{factory.production_batches}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Farmers</p>
                      <p className="text-base font-semibold text-gray-900">{factory.active_farmers}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Waste</p>
                      <p className="text-base font-semibold text-gray-900">{formatWeight(factory.waste_kg)}</p>
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