import { useState, useEffect } from 'react'
import { 
  Shield, 
  Users, 
  UserCheck, 
  Factory, 
  Package, 
  TrendingUp,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  position: string
  department: string
  salary: number
  hire_date: string
  factory_id: string
  factory_name: string
  status: 'active' | 'inactive' | 'on_leave'
}

interface Customer {
  id: string
  customer_code: string
  name: string
  email: string
  phone: string
  address: string
  customer_type: string
  credit_limit: number
  factory_id: string
  factory_name: string
  total_orders: number
  total_spent: number
  last_order_date: string
}

interface ProductionBatch {
  id: string
  batch_number: string
  production_date: string
  cheese_type: string
  milk_used_liters: number
  cheese_produced_kg: number
  quality_grade: string
  production_cost: number
  factory_id: string
  factory_name: string
  status: 'in_progress' | 'completed' | 'quality_check' | 'shipped'
}

interface AuditStats {
  totalEmployees: number
  activeEmployees: number
  totalCustomers: number
  activeCustomers: number
  totalProduction: number
  completedBatches: number
  totalRevenue: number
  averageQuality: number
}

interface FactoryOverview {
  factory_name: string
  employees: number
  customers: number
  production: number
  revenue: number
}

export default function AuditCenterPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([])
  const [auditStats, setAuditStats] = useState<AuditStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    totalProduction: 0,
    completedBatches: 0,
    totalRevenue: 0,
    averageQuality: 0
  })
  const [factoryOverview, setFactoryOverview] = useState<FactoryOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'customers' | 'production' | 'overview'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [factoryFilter, setFactoryFilter] = useState<string>('all')
  const [factories, setFactories] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    fetchAuditData()
  }, [])

  // Recalculate stats when data changes
  useEffect(() => {
    if (employees.length > 0 || customers.length > 0 || productionBatches.length > 0) {
      calculateAuditStats()
    }
  }, [employees, customers, productionBatches])

  // Recalculate factory overview when data changes
  useEffect(() => {
    if (factories.length > 0 && (employees.length > 0 || customers.length > 0 || productionBatches.length > 0)) {
      calculateFactoryOverview()
    }
  }, [factories, employees, customers, productionBatches])

  const fetchAuditData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchFactories(),
        fetchEmployees(),
        fetchCustomers(),
        fetchProductionBatches()
      ])
    } catch (error) {
      console.error('Error fetching audit data:', error)
      toast.error('Failed to load audit data')
    } finally {
      setLoading(false)
    }
  }

  const refreshAuditData = async () => {
    setRefreshing(true)
    await fetchAuditData()
    setRefreshing(false)
    toast.success('Audit data refreshed successfully')
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

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          factories:factory_id (
            name
          )
        `)
        .order('hire_date', { ascending: false })

      if (error) throw error
      
      const formattedEmployees: Employee[] = (data || []).map((emp: any) => ({
        id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        department: emp.department,
        salary: emp.salary,
        hire_date: emp.hire_date,
        factory_id: emp.factory_id,
        factory_name: emp.factories?.name || 'Unknown Factory',
        status: emp.status || 'active'
      }))

      setEmployees(formattedEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get customer order statistics and associate with factories through sales_orders
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer: any) => {
          const { data: orders } = await supabase
            .from('sales_orders')
            .select(`
              total, 
              order_date, 
              factory_id,
              factories:factory_id (name)
            `)
            .eq('customer_id', customer.id)

          const totalOrders = orders?.length || 0
          const totalSpent = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
          const lastOrderDate = orders?.length > 0 
            ? orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0].order_date
            : null

          // Get the most common factory from orders (where customer places most orders)
          const factoryIds = orders?.map(order => order.factory_id).filter(Boolean) || []
          const factoryCount = factoryIds.reduce((acc: {[key: string]: number}, id: string) => {
            acc[id] = (acc[id] || 0) + 1
            return acc
          }, {})
          const mostCommonFactoryId = Object.keys(factoryCount).reduce((a, b) => 
            factoryCount[a] > factoryCount[b] ? a : b, ''
          )
          
          const factoryName = orders?.find(order => order.factory_id === mostCommonFactoryId)?.factories?.name || 'No Factory Association'

          return {
            id: customer.id,
            customer_code: customer.customer_code,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            customer_type: customer.customer_type,
            credit_limit: customer.credit_limit,
            factory_id: mostCommonFactoryId || 'unassigned',
            factory_name: factoryName,
            total_orders: totalOrders,
            total_spent: totalSpent,
            last_order_date: lastOrderDate
          }
        })
      )

      setCustomers(customersWithStats)
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchProductionBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          *,
          factories:factory_id (
            name
          )
        `)
        .order('production_date', { ascending: false })
        .limit(100)

      if (error) throw error
      
      const formattedBatches: ProductionBatch[] = (data || []).map((batch: any) => ({
        id: batch.id,
        batch_number: batch.batch_number,
        production_date: batch.production_date,
        cheese_type: batch.cheese_type,
        milk_used_liters: batch.milk_used_liters,
        cheese_produced_kg: batch.cheese_produced_kg,
        quality_grade: batch.quality_grade,
        production_cost: batch.production_cost,
        factory_id: batch.factory_id,
        factory_name: batch.factories?.name || 'Unknown Factory',
        status: batch.status || 'completed'
      }))

      setProductionBatches(formattedBatches)
    } catch (error) {
      console.error('Error fetching production batches:', error)
    }
  }

  const calculateAuditStats = () => {
    const stats = {
      totalEmployees: employees?.length || 0,
      activeEmployees: employees?.filter(emp => emp.status === 'active').length || 0,
      totalCustomers: customers?.length || 0,
      activeCustomers: customers?.filter(cust => (cust.total_orders || 0) > 0).length || 0,
      totalProduction: productionBatches?.reduce((sum, batch) => sum + (batch.cheese_produced_kg || 0), 0) || 0,
      completedBatches: productionBatches?.filter(batch => batch.status === 'completed').length || 0,
      totalRevenue: customers?.reduce((sum, cust) => sum + (cust.total_spent || 0), 0) || 0,
      averageQuality: productionBatches?.length > 0 
        ? (productionBatches.filter(batch => batch.quality_grade).length / productionBatches.length) * 100 
        : 0
    }

    setAuditStats(stats)
  }

  const calculateFactoryOverview = () => {
    if (!factories || !employees || !customers || !productionBatches) {
      setFactoryOverview([])
      return
    }

    const overview = factories.map(factory => {
      const factoryEmployees = employees.filter(emp => emp.factory_id === factory.id)
      const factoryCustomers = customers.filter(cust => cust.factory_id === factory.id && cust.factory_id !== 'unassigned')
      const factoryProduction = productionBatches
        .filter(batch => batch.factory_id === factory.id)
        .reduce((sum, batch) => sum + (batch.cheese_produced_kg || 0), 0)
      
      // Calculate revenue from customers for this factory
      const factoryRevenue = factoryCustomers.reduce((sum, cust) => sum + (cust.total_spent || 0), 0)

      return {
        factory_name: factory.name || 'Unknown Factory',
        employees: factoryEmployees.length || 0,
        customers: factoryCustomers.length || 0,
        production: factoryProduction || 0,
        revenue: factoryRevenue || 0
      }
    })

    setFactoryOverview(overview.sort((a, b) => (b.revenue || 0) - (a.revenue || 0)))
  }

  const getFilteredData = () => {
    let filteredEmployees = employees
    let filteredCustomers = customers
    let filteredProduction = productionBatches

    if (factoryFilter !== 'all') {
      filteredEmployees = employees.filter(emp => emp.factory_id === factoryFilter)
      filteredCustomers = customers.filter(cust => cust.factory_id === factoryFilter)
      filteredProduction = productionBatches.filter(batch => batch.factory_id === factoryFilter)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.first_name.toLowerCase().includes(search) ||
        emp.last_name.toLowerCase().includes(search) ||
        emp.employee_code.toLowerCase().includes(search) ||
        emp.position.toLowerCase().includes(search)
      )
      filteredCustomers = filteredCustomers.filter(cust =>
        cust.name.toLowerCase().includes(search) ||
        cust.customer_code.toLowerCase().includes(search) ||
        cust.customer_type.toLowerCase().includes(search)
      )
      filteredProduction = filteredProduction.filter(batch =>
        batch.batch_number.toLowerCase().includes(search) ||
        batch.cheese_type.toLowerCase().includes(search)
      )
    }

    return { filteredEmployees, filteredCustomers, filteredProduction }
  }

  const { filteredEmployees, filteredCustomers, filteredProduction } = getFilteredData()

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0 RWF'
    }
    return `${amount.toLocaleString()} RWF`
  }

  const productionStatusData = [
    { name: 'Completed', value: productionBatches?.filter(b => b.status === 'completed').length || 0, color: '#10b981' },
    { name: 'In Progress', value: productionBatches?.filter(b => b.status === 'in_progress').length || 0, color: '#f59e0b' },
    { name: 'Quality Check', value: productionBatches?.filter(b => b.status === 'quality_check').length || 0, color: '#3b82f6' },
    { name: 'Shipped', value: productionBatches?.filter(b => b.status === 'shipped').length || 0, color: '#8b5cf6' }
  ]

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Center</h1>
          <p className="text-gray-600">Comprehensive monitoring of employees, customers, and production across all factories</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refreshAuditData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Audit Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{auditStats.totalEmployees}</p>
              <p className="text-sm text-green-600">{auditStats.activeEmployees} active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{auditStats.totalCustomers}</p>
              <p className="text-sm text-blue-600">{auditStats.activeCustomers} active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Production</p>
              <p className="text-2xl font-bold text-gray-900">{auditStats.totalProduction.toLocaleString()} kg</p>
              <p className="text-sm text-purple-600">{auditStats.completedBatches} batches</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(auditStats.totalRevenue)}</p>
              <p className="text-sm text-green-600">{auditStats.averageQuality.toFixed(1)}% quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Performance Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={factoryOverview}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factory_name" />
              <YAxis />
              <Tooltip formatter={(value: any, name: string) => [
                name === 'production' ? `${(value || 0).toLocaleString()} kg` :
                name === 'revenue' ? formatCurrency(value || 0) : (value || 0),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]} />
              <Bar dataKey="employees" fill="#3b82f6" />
              <Bar dataKey="customers" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productionStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {productionStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'employees', label: `Employees (${filteredEmployees.length})`, icon: Users },
              { key: 'customers', label: `Customers (${filteredCustomers.length})`, icon: UserCheck },
              { key: 'production', label: `Production (${filteredProduction.length})`, icon: Package }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factory Filter</label>
              <select
                value={factoryFilter}
                onChange={(e) => setFactoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">All Factories</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>{factory.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Desktop Grid View */}
              <div className="hidden md:grid md:grid-cols-3 gap-6">
                <div className="text-center bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">{auditStats.totalEmployees}</div>
                  <div className="text-sm text-gray-600">Total Employees</div>
                  <div className="text-xs text-green-600 mt-1">{auditStats.activeEmployees} Active</div>
                </div>
                <div className="text-center bg-green-50 p-6 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-600">{auditStats.totalCustomers}</div>
                  <div className="text-sm text-gray-600">Total Customers</div>
                  <div className="text-xs text-blue-600 mt-1">{auditStats.activeCustomers} Active</div>
                </div>
                <div className="text-center bg-amber-50 p-6 rounded-xl border border-amber-200">
                  <div className="text-3xl font-bold text-amber-600">{auditStats.completedBatches}</div>
                  <div className="text-sm text-gray-600">Completed Batches</div>
                  <div className="text-xs text-purple-600 mt-1">{auditStats.totalProduction.toLocaleString()} kg</div>
                </div>
              </div>

              {/* Mobile Stacked View */}
              <div className="md:hidden space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{auditStats.totalEmployees}</div>
                      <div className="text-sm text-gray-600">Total Employees</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-600">{auditStats.activeEmployees} Active</div>
                      <div className="text-xs text-gray-500">{auditStats.totalEmployees - auditStats.activeEmployees} Inactive</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{auditStats.totalCustomers}</div>
                      <div className="text-sm text-gray-600">Total Customers</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-600">{auditStats.activeCustomers} Active</div>
                      <div className="text-xs text-gray-500">{auditStats.totalCustomers - auditStats.activeCustomers} Inactive</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{auditStats.completedBatches}</div>
                      <div className="text-sm text-gray-600">Completed Batches</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-purple-600">{auditStats.totalProduction.toLocaleString()} kg</div>
                      <div className="text-xs text-gray-500">Total Production</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(auditStats.totalRevenue)}</div>
                      <div className="text-sm text-gray-600">Total Revenue</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-600">{auditStats.averageQuality.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">Average Quality</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">System Health Summary</h4>
                
                {/* Desktop Grid View */}
                <div className="hidden md:grid md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Employee Management: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Customer Relations: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Production Monitoring: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Quality Control: Active</span>
                  </div>
                </div>
                
                {/* Mobile Stacked View */}
                <div className="md:hidden space-y-3 text-sm">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="font-medium">Employee Management</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="font-medium">Customer Relations</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="font-medium">Production Monitoring</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="font-medium">Quality Control</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Position</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Factory</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Salary</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Hire Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No employees found for the selected criteria
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{employee.employee_code}</div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-gray-900">{employee.position}</div>
                            <div className="text-sm text-gray-500">{employee.department}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{employee.factory_name}</td>
                          <td className="py-3 px-4 text-gray-900">{formatCurrency(employee.salary)}</td>
                          <td className="py-3 px-4 text-gray-900">
                            {new Date(employee.hire_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              employee.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : employee.status === 'on_leave'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No employees found for the selected criteria
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div key={employee.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </h4>
                          <p className="text-sm text-gray-500">{employee.employee_code}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : employee.status === 'on_leave'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Position</p>
                          <p className="text-sm text-gray-900">{employee.position}</p>
                          <p className="text-xs text-gray-500">{employee.department}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Factory</p>
                          <p className="text-sm text-gray-900">{employee.factory_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Salary</p>
                          <p className="text-sm text-gray-900">{formatCurrency(employee.salary)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Hire Date</p>
                          <p className="text-sm text-gray-900">
                            {new Date(employee.hire_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Contact</p>
                        <p className="text-sm text-gray-900">{employee.email}</p>
                        <p className="text-sm text-gray-900">{employee.phone}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Factory Association</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Orders</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Spent</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No customers found for the selected criteria
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.customer_code}</div>
                              <div className="text-sm text-gray-500">{customer.email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{customer.customer_type}</td>
                          <td className="py-3 px-4 text-gray-900">{customer.factory_name}</td>
                          <td className="py-3 px-4 text-gray-900">{customer.total_orders}</td>
                          <td className="py-3 px-4 text-gray-900">{formatCurrency(customer.total_spent)}</td>
                          <td className="py-3 px-4 text-gray-900">
                            {customer.last_order_date 
                              ? new Date(customer.last_order_date).toLocaleDateString()
                              : 'No orders'
                            }
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No customers found for the selected criteria
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                          <p className="text-sm text-gray-500">{customer.customer_code}</p>
                        </div>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {customer.customer_type}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Factory Association</p>
                          <p className="text-sm text-gray-900">{customer.factory_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Total Orders</p>
                          <p className="text-sm text-gray-900">{customer.total_orders}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Total Spent</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(customer.total_spent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Last Order</p>
                          <p className="text-sm text-gray-900">
                            {customer.last_order_date 
                              ? new Date(customer.last_order_date).toLocaleDateString()
                              : 'No orders'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Contact Information</p>
                        <p className="text-sm text-gray-900">{customer.email}</p>
                        <p className="text-sm text-gray-900">{customer.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">{customer.address}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'production' && (
            <div>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Batch</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Cheese Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Factory</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Production</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Quality</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProduction.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No production batches found for the selected criteria
                        </td>
                      </tr>
                    ) : (
                      filteredProduction.map((batch) => (
                        <tr key={batch.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{batch.batch_number}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(batch.production_date).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{batch.cheese_type}</td>
                          <td className="py-3 px-4 text-gray-900">{batch.factory_name}</td>
                          <td className="py-3 px-4">
                            <div className="text-gray-900">{batch.cheese_produced_kg} kg</div>
                            <div className="text-sm text-gray-500">{batch.milk_used_liters}L milk</div>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{batch.quality_grade || 'Pending'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              batch.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : batch.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : batch.status === 'quality_check'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {batch.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredProduction.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No production batches found for the selected criteria
                  </div>
                ) : (
                  filteredProduction.map((batch) => (
                    <div key={batch.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{batch.batch_number}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(batch.production_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          batch.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : batch.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : batch.status === 'quality_check'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {batch.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Cheese Type</p>
                          <p className="text-sm text-gray-900">{batch.cheese_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Factory</p>
                          <p className="text-sm text-gray-900">{batch.factory_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Production Output</p>
                          <p className="text-sm font-medium text-gray-900">{batch.cheese_produced_kg} kg cheese</p>
                          <p className="text-xs text-gray-500">{batch.milk_used_liters}L milk used</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">Quality Grade</p>
                          <p className="text-sm text-gray-900">{batch.quality_grade || 'Pending'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Production Cost</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(batch.production_cost)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}