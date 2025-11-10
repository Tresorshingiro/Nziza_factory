import { useState, useEffect } from 'react'
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertTriangle, Edit, Trash2, Eye, Factory } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from 'react-hot-toast'
import type { Database } from '../../types/database.types'

type StockRow = Database['public']['Tables']['stock']['Row']

interface StockWithFactory extends StockRow {
  factory_name: string
}

const stockCategories = [
  'raw_milk',
  'finished_goods',
  'byproduct'
]

const stockUnits = [
  'Liters',
  'Kilograms', 
  'Pieces',
  'Boxes',
  'Units',
  'Tons',
  'Bottles',
  'Containers'
]

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5a3c', '#ec4899']

export default function SeniorManagerInventoriesPage() {
  const { user } = useAuthStore()
  const [inventory, setInventory] = useState<StockWithFactory[]>([])
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingItem, setViewingItem] = useState<StockWithFactory | null>(null)
  const [editingItem, setEditingItem] = useState<StockWithFactory | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [factories, setFactories] = useState<Array<{id: string; name: string}>>([])
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([])

  const [newItem, setNewItem] = useState({
    item_name: '',
    item_code: '',
    stock_type: '',
    quantity: '',
    unit: '',
    reorder_level: '',
    unit_cost: '',
    factory_id: '',
    cheese_type: '',
    location: '',
    expiry_date: '',
    batch_id: ''
  })

  useEffect(() => {
    fetchInventory()
    fetchFactories()
  }, [selectedFactory])

  // Update chart data whenever inventory changes (optimize chart performance)
  useEffect(() => {
    const categoryData = stockCategories.map(category => ({
      name: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: inventory.filter(item => item.stock_type === category).reduce((sum, item) => sum + item.quantity, 0)
    })).filter(item => item.value > 0)

    setChartData(categoryData)
  }, [inventory])

  const fetchFactories = async () => {
    try {
      const { data: factoriesData, error } = await supabase
        .from('factories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setFactories(factoriesData || [])
    } catch (error) {
      console.error('Error fetching factories:', error)
      setFactories([])
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('stock')
        .select('*')
        .order('item_name')

      if (selectedFactory) {
        query = query.eq('factory_id', selectedFactory)
      }

      const { data: stockData, error: stockError } = await query

      if (stockError) {
        console.error('Stock query error:', stockError)
        throw stockError
      }

      if (!stockData) {
        setInventory([])
        return
      }

      // Get factory information separately
      const { data: factoriesData, error: factoriesError } = await supabase
        .from('factories')
        .select('id, name')

      if (factoriesError) {
        console.error('Factories query error:', factoriesError)
      }

      // Create a factory lookup map
      const factoryMap = new Map()
      if (factoriesData) {
        factoriesData.forEach((factory: any) => {
          factoryMap.set(factory.id, factory.name)
        })
      }

      // Transform data to include factory name
      const inventoryWithFactory: StockWithFactory[] = stockData.map((item: any) => ({
        ...item,
        factory_name: factoryMap.get(item.factory_id) || 'Unknown Factory'
      }))

      setInventory(inventoryWithFactory)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Failed to load inventory data')
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const stockData = {
        item_name: newItem.item_name,
        item_code: newItem.item_code,
        stock_type: newItem.stock_type as 'raw_milk' | 'finished_goods' | 'byproduct',
        quantity: parseFloat(newItem.quantity),
        unit: newItem.unit,
        reorder_level: parseFloat(newItem.reorder_level) || 0,
        unit_cost: parseFloat(newItem.unit_cost) || 0,
        total_value: parseFloat(newItem.quantity) * parseFloat(newItem.unit_cost || '0'),
        factory_id: newItem.factory_id,
        cheese_type: newItem.cheese_type || null,
        location: newItem.location || null,
        expiry_date: newItem.expiry_date || null,
        batch_id: newItem.batch_id || null,
        last_updated_by: user?.id || ''
      }

      if (editingItem) {
        const { error } = await supabase
          .from('stock')
          .update(stockData)
          .eq('id', editingItem.id)

        if (error) throw error
        toast.success('Inventory item updated successfully')
      } else {
        const { error } = await supabase
          .from('stock')
          .insert(stockData)

        if (error) throw error
        toast.success('Inventory item added successfully')
      }

      setIsCreateModalOpen(false)
      setEditingItem(null)
      resetForm()
      fetchInventory()
    } catch (error: any) {
      console.error('Error saving inventory item:', error)
      toast.error(error.message || 'Failed to save inventory item')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewItem({
      item_name: '',
      item_code: '',
      stock_type: '',
      quantity: '',
      unit: '',
      reorder_level: '',
      unit_cost: '',
      factory_id: '',
      cheese_type: '',
      location: '',
      expiry_date: '',
      batch_id: ''
    })
  }

  const handleView = (item: StockWithFactory) => {
    setViewingItem(item)
    setIsViewModalOpen(true)
  }

  const handleEdit = (item: StockWithFactory) => {
    setEditingItem(item)
    setNewItem({
      item_name: item.item_name || '',
      item_code: item.item_code || '',
      stock_type: item.stock_type || '',
      quantity: item.quantity.toString(),
      unit: item.unit || '',
      reorder_level: item.reorder_level?.toString() || '',
      unit_cost: item.unit_cost?.toString() || '',
      factory_id: item.factory_id,
      cheese_type: item.cheese_type || '',
      location: item.location || '',
      expiry_date: item.expiry_date || '',
      batch_id: item.batch_id || ''
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (item: StockWithFactory) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return

    try {
      const { error } = await supabase
        .from('stock')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      toast.success('Inventory item deleted successfully')
      fetchInventory()
    } catch (error) {
      console.error('Error deleting inventory item:', error)
      toast.error('Failed to delete inventory item')
    }
  }

  const getStockStatus = (current: number, reorder: number | null) => {
    if (reorder && current <= reorder) {
      return { status: 'Low Stock', color: 'text-red-600 bg-red-100' }
    }
    return { status: 'Normal', color: 'text-green-600 bg-green-100' }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.stock_type === filterCategory
    
    let matchesStatus = true
    if (filterStatus !== 'all') {
      const stockStatus = getStockStatus(item.quantity, item.reorder_level)
      if (filterStatus === 'low' && stockStatus.status !== 'Low Stock') matchesStatus = false
      if (filterStatus === 'normal' && stockStatus.status !== 'Normal') matchesStatus = false
    }
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Calculate statistics
  const totalItems = inventory.length
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0)
  const lowStockItems = inventory.filter(item => {
    const stockStatus = getStockStatus(item.quantity, item.reorder_level)
    return stockStatus.status === 'Low Stock'
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage inventory across all factories</p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Inventory Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{totalValue.toLocaleString()} RWF</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{totalValue.toLocaleString()} RWF</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Distribution Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Distribution by Category</h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }: any) => `${name}: ${value}`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} units`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No inventory data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Status Overview */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Normal Stock</span>
              <span className="text-green-600 font-bold">
                {inventory.filter(item => getStockStatus(item.quantity, item.reorder_level).status === 'Normal').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <span className="text-red-800 font-medium">Low Stock</span>
              <span className="text-red-600 font-bold">{lowStockItems}</span>
            </div>
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
              onFactoryChange={setSelectedFactory}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="all">All Categories</option>
              {stockCategories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="all">All Status</option>
              <option value="normal">Normal Stock</option>
              <option value="low">Low Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const totalValue = item.quantity * (item.unit_cost || 0)
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          <div className="text-sm text-gray-500">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {item.stock_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          {item.factory_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                        {item.reorder_level && (
                          <div className="text-xs text-gray-500">Reorder: {item.reorder_level}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStockStatus(item.quantity, item.reorder_level).color
                        }`}>
                          {getStockStatus(item.quantity, item.reorder_level).status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.unit_cost ? `${item.unit_cost.toLocaleString()} RWF` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{(item.quantity * (item.unit_cost || 0)).toLocaleString()} RWF</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(item)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
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
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No inventory items found</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.quantity, item.reorder_level)
                const totalValue = item.quantity * (item.unit_cost || 0)
                
                return (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{item.item_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{item.item_code}</span>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-2 mt-1">
                            <Factory className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{item.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-3 mb-4">
                      {/* Quantity & Value Card */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Quantity</p>
                            <p className="text-lg font-semibold text-gray-900">{item.quantity} {item.unit}</p>
                            {item.reorder_level && (
                              <p className="text-xs text-gray-600">Reorder: {item.reorder_level}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
                            <p className="text-lg font-semibold text-green-600">{totalValue.toLocaleString()} RWF</p>
                            {item.unit_cost && (
                              <p className="text-xs text-gray-600">Unit: {item.unit_cost.toLocaleString()} RWF</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Category & Factory */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {item.stock_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Factory</p>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                            {item.factory_name}
                          </span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {(item.cheese_type || item.batch_id || item.expiry_date) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {item.cheese_type && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cheese Type</p>
                              <p className="text-sm text-gray-700">{item.cheese_type.replace(/\b\w/g, l => l.toUpperCase())}</p>
                            </div>
                          )}
                          {item.batch_id && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Batch ID</p>
                              <p className="text-sm text-gray-700">{item.batch_id}</p>
                            </div>
                          )}
                          {item.expiry_date && (
                            <div className={item.cheese_type || item.batch_id ? 'sm:col-span-2' : ''}>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Expiry Date</p>
                              <p className="text-sm text-gray-700">{new Date(item.expiry_date).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-300">
                      <button
                        onClick={() => handleView(item)}
                        className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, item_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code
                  </label>
                  <input
                    type="text"
                    value={newItem.item_code}
                    onChange={(e) => setNewItem(prev => ({ ...prev, item_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Type
                  </label>
                  <select
                    value={newItem.stock_type}
                    onChange={(e) => setNewItem(prev => ({ ...prev, stock_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Stock Type</option>
                    {stockCategories.map(category => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factory
                  </label>
                  <select
                    value={newItem.factory_id}
                    onChange={(e) => setNewItem(prev => ({ ...prev, factory_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Factory</option>
                    {factories.map(factory => (
                      <option key={factory.id} value={factory.id}>{factory.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Unit</option>
                    {stockUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    value={newItem.reorder_level}
                    onChange={(e) => setNewItem(prev => ({ ...prev, reorder_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (RWF)
                  </label>
                  <input
                    type="number"
                    value={newItem.unit_cost}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit_cost: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheese Type
                  </label>
                  <select
                    value={newItem.cheese_type}
                    onChange={(e) => setNewItem(prev => ({ ...prev, cheese_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select Cheese Type (if applicable)</option>
                    <option value="gouda">Gouda</option>
                    <option value="cheddar">Cheddar</option>
                    <option value="mozzarella">Mozzarella</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Storage location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch ID
                  </label>
                  <input
                    type="text"
                    value={newItem.batch_id}
                    onChange={(e) => setNewItem(prev => ({ ...prev, batch_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Batch identifier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newItem.expiry_date}
                  onChange={(e) => setNewItem(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Inventory Item Details</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingItem.item_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Code</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingItem.item_code}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Type</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {viewingItem.stock_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Factory</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingItem.factory_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingItem.quantity} {viewingItem.unit}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Status</label>
                  <span className={`inline-flex px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                    getStockStatus(viewingItem.quantity, viewingItem.reorder_level).color
                  }`}>
                    {getStockStatus(viewingItem.quantity, viewingItem.reorder_level).status}
                  </span>
                </div>
                
                {viewingItem.reorder_level && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reorder Level</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingItem.reorder_level} {viewingItem.unit}</p>
                  </div>
                )}
                
                {viewingItem.unit_cost && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Cost</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingItem.unit_cost.toLocaleString()} RWF</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Value</label>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {(viewingItem.quantity * (viewingItem.unit_cost || 0)).toLocaleString()} RWF
                  </p>
                </div>
                
                {viewingItem.cheese_type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cheese Type</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {viewingItem.cheese_type.replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                )}
                
                {viewingItem.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingItem.location}</p>
                  </div>
                )}

                {viewingItem.batch_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batch ID</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingItem.batch_id}</p>
                  </div>
                )}
                
                {viewingItem.expiry_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <p className="text-sm text-gray-900 mt-1">{new Date(viewingItem.expiry_date).toLocaleDateString()}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(viewingItem.updated_at || viewingItem.created_at || '').toLocaleDateString()}</p>
                </div>
              </div>
              
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