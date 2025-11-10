import { useState, useEffect } from 'react'
import { Search, DollarSign, ShoppingCart, TrendingUp, Calendar, Trash2, Eye } from 'lucide-react'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import type { Database } from '../../types/database.types'

type SalesOrderRow = Database['public']['Tables']['sales_orders']['Row']

interface SalesOrderWithDetails extends SalesOrderRow {
  customer_name: string
  customer_email: string | null
  customer_phone: string
  factory_name: string
}

export default function SeniorManagerSalesPage() {
  const [sales, setSales] = useState<SalesOrderWithDetails[]>([])
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingSale, setViewingSale] = useState<SalesOrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [chartData, setChartData] = useState<Array<{ name: string; revenue: number; orders: number }>>([])

  useEffect(() => {
    fetchSales()
    fetchChartData()
  }, [selectedFactory])

  const fetchChartData = async () => {
    try {
      // Last 7 days sales data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const salesChart = await Promise.all(
        last7Days.map(async (date) => {
          let query = supabase
            .from('sales_orders')
            .select('total, id')
            .eq('order_date', date)

          if (selectedFactory) {
            query = query.eq('factory_id', selectedFactory)
          }

          const { data: salesData } = await query

          return {
            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: salesData?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
            orders: salesData?.length || 0
          }
        })
      )

      setChartData(salesChart)
    } catch (error) {
      console.error('Error fetching chart data:', error)
      setChartData([])
    }
  }

  const fetchSales = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('sales_orders')
        .select('*')
        .order('order_date', { ascending: false })

      if (selectedFactory) {
        query = query.eq('factory_id', selectedFactory)
      }

      const { data: salesData, error: salesError } = await query

      if (salesError) {
        console.error('Sales query error:', salesError)
        throw salesError
      }

      if (!salesData) {
        setSales([])
        return
      }

      // Get customer and factory information separately
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, email, phone')

      const { data: factoriesData, error: factoriesError } = await supabase
        .from('factories')
        .select('id, name')

      if (customersError) console.error('Customers query error:', customersError)
      if (factoriesError) console.error('Factories query error:', factoriesError)

      // Create lookup maps
      const customerMap = new Map()
      const factoryMap = new Map()
      
      if (customersData) {
        customersData.forEach((customer: any) => {
          customerMap.set(customer.id, customer)
        })
      }
      
      if (factoriesData) {
        factoriesData.forEach((factory: any) => {
          factoryMap.set(factory.id, factory.name)
        })
      }

      // Transform data to include customer and factory names
      const salesWithDetails: SalesOrderWithDetails[] = salesData.map((sale: any) => {
        const customer = customerMap.get(sale.customer_id)
        return {
          ...sale,
          customer_name: customer?.name || 'Unknown Customer',
          customer_email: customer?.email || null,
          customer_phone: customer?.phone || 'No phone',
          factory_name: factoryMap.get(sale.factory_id) || 'Unknown Factory'
        }
      })

      setSales(salesWithDetails)
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast.error('Failed to load sales data')
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const handleView = (sale: SalesOrderWithDetails) => {
    setViewingSale(sale)
    setIsViewModalOpen(true)
  }

  const handleDelete = async (sale: SalesOrderWithDetails) => {
    if (!confirm('Are you sure you want to delete this sale order?')) return

    try {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', sale.id)

      if (error) throw error

      toast.success('Sale order deleted successfully')
      fetchSales()
    } catch (error) {
      console.error('Error deleting sale:', error)
      toast.error('Failed to delete sale order')
    }
  }

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sale.customer_email && sale.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesPaymentStatus = filterPaymentStatus === 'all' || sale.payment_status === filterPaymentStatus
    const matchesStatus = filterStatus === 'all' || sale.status === filterStatus
    
    return matchesSearch && matchesPaymentStatus && matchesStatus
  })

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalOrders = sales.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const paidSales = sales.filter(s => s.payment_status === 'paid')
  const pendingSales = sales.filter(s => s.payment_status === 'pending')
  const overdueSales = sales.filter(s => s.payment_status === 'overdue')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600">Track and manage sales across all factories</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} RWF</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{avgOrderValue.toLocaleString()} RWF</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {sales.filter(s => new Date(s.order_date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Overview & Weekly Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Overview */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Paid ({paidSales.length})</span>
              <span className="text-green-600 font-bold">
                {paidSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} RWF
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-800 font-medium">Pending ({pendingSales.length})</span>
              <span className="text-yellow-600 font-bold">
                {pendingSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} RWF
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-red-800 font-medium">Overdue ({overdueSales.length})</span>
              <span className="text-red-600 font-bold">
                {overdueSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} RWF
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Sales Trend Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Sales Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Revenue and order count (last 7 days)</p>
          
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <div className="relative h-full">
                <div className="flex items-end justify-between h-full pb-8">
                  {chartData.map((day, index) => {
                    const maxRevenue = Math.max(...chartData.map(d => d.revenue))
                    const maxOrders = Math.max(...chartData.map(d => d.orders))
                    const revenueHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 180 : 0
                    const ordersHeight = maxOrders > 0 ? (day.orders / maxOrders) * 180 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1">
                        <div className="flex gap-1 items-end">
                          <div 
                            className="w-4 bg-amber-500 rounded-t"
                            style={{ height: `${revenueHeight}px` }}
                            title={`Revenue: ${day.revenue.toLocaleString()} RWF`}
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
                    <div className="w-3 h-3 bg-amber-500 rounded"></div>
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
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Factory</label>
            <FactorySelector
              selectedFactoryId={selectedFactory}
              onFactoryChange={(factoryId) => setSelectedFactory(factoryId)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading sales...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No sales found
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{sale.order_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{sale.customer_name}</div>
                        <div className="text-sm text-gray-500">{sale.customer_email}</div>
                        <div className="text-sm text-gray-500">{sale.customer_phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                        {sale.factory_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{sale.total.toLocaleString()} RWF</div>
                      <div className="text-xs text-gray-500">Subtotal: {sale.subtotal} RWF</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : sale.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : sale.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : sale.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(sale.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(sale)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12 px-6">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No sales found</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{sale.order_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(sale.order_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : sale.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.payment_status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : sale.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : sale.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Factory Info */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                      <div>
                        <p className="font-medium text-gray-900">{sale.customer_name}</p>
                        {sale.customer_email && (
                          <p className="text-sm text-gray-600">{sale.customer_email}</p>
                        )}
                        <p className="text-sm text-gray-600">{sale.customer_phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Factory</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          {sale.factory_name}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Amount</p>
                        <div>
                          <p className="font-semibold text-gray-900">{sale.total.toLocaleString()} RWF</p>
                          <p className="text-xs text-gray-500">Subtotal: {sale.subtotal.toLocaleString()} RWF</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional details if available */}
                    {(sale.tax || sale.discount) && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {sale.tax && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax</p>
                            <p className="text-gray-700">{sale.tax.toLocaleString()} RWF</p>
                          </div>
                        )}
                        {sale.discount && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Discount</p>
                            <p className="text-gray-700">{sale.discount.toLocaleString()} RWF</p>
                          </div>
                        )}
                      </div>
                    )}

                    {(sale.delivery_date || sale.payment_terms) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {sale.delivery_date && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Delivery Date</p>
                            <p className="text-gray-700">{new Date(sale.delivery_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {sale.payment_terms && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment Terms</p>
                            <p className="text-gray-700">{sale.payment_terms}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-300">
                    <button
                      onClick={() => handleView(sale)}
                      className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                    <button
                      onClick={() => handleDelete(sale)}
                      className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isViewModalOpen && viewingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Sale Order Details</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.order_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.customer_name}</p>
                  <p className="text-xs text-gray-500">{viewingSale.customer_email}</p>
                  <p className="text-xs text-gray-500">{viewingSale.customer_phone}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Factory</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.factory_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(viewingSale.order_date).toLocaleDateString()}</p>
                </div>
                
                {viewingSale.delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                    <p className="text-sm text-gray-900 mt-1">{new Date(viewingSale.delivery_date).toLocaleDateString()}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.subtotal.toLocaleString()} RWF</p>
                </div>
                
                {viewingSale.tax && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingSale.tax.toLocaleString()} RWF</p>
                  </div>
                )}
                
                {viewingSale.discount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Discount</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingSale.discount.toLocaleString()} RWF</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total</label>
                  <p className="text-sm font-bold text-gray-900 mt-1">{viewingSale.total.toLocaleString()} RWF</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                  <span className={`inline-flex px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                    viewingSale.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : viewingSale.payment_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSale.payment_status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                    viewingSale.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : viewingSale.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : viewingSale.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSale.status}
                  </span>
                </div>
                
                {viewingSale.payment_terms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingSale.payment_terms}</p>
                  </div>
                )}
              </div>
              
              {viewingSale.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}