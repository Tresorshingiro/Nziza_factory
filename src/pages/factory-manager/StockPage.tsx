import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, Edit, Trash2, Package, AlertTriangle, TrendingUp, X, Minus } from 'lucide-react'

interface StockItem {
  id: string
  factory_id: string
  stock_type: 'raw_milk' | 'finished_goods' | 'byproduct'
  item_name: string
  item_code: string
  cheese_type?: 'gouda' | 'cheddar' | 'mozzarella' | 'other'
  quantity: number
  unit: string
  unit_cost: number
  total_value: number
  reorder_level: number
  location?: string
  expiry_date?: string
  created_at: string
  updated_at: string
}

interface StockFormData {
  stock_type: 'raw_milk' | 'finished_goods' | 'byproduct'
  item_name: string
  item_code: string
  cheese_type?: 'gouda' | 'cheddar' | 'mozzarella' | 'other'
  quantity: number
  unit: string
  unit_cost: number
  reorder_level: number
  location?: string
  expiry_date?: string
}

export default function StockPage() {
  const { user } = useAuthStore()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<StockFormData>({
    stock_type: 'finished_goods',
    item_name: '',
    item_code: '',
    quantity: 0,
    unit: 'kg',
    unit_cost: 0,
    reorder_level: 0,
  })

  useEffect(() => {
    fetchStockItems()
  }, [user])

  const fetchStockItems = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('stock')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter by factory for factory managers
      if (user.role === 'factory_manager' && user.factory_id) {
        query = query.eq('factory_id', user.factory_id)
      }

      const { data, error } = await query

      if (error) throw error
      setStockItems(data || [])
    } catch (error: any) {
      console.error('Error fetching stock items:', error)
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    try {
      const stockData = {
        ...formData,
        factory_id: user.factory_id || user.id, // Use user's factory or fallback
        total_value: (formData.quantity || 0) * (formData.unit_cost || 0),
        last_updated_by: user.id,
      }

      if (isEditing && selectedItem) {
        const { error } = await supabase
          .from('stock')
          .update(stockData as any)
          .eq('id', selectedItem.id)

        if (error) throw error
        toast.success('Inventory item updated successfully!')
      } else {
        const { error } = await supabase
          .from('stock')
          .insert([stockData as any])

        if (error) throw error
        toast.success('Inventory item added successfully!')
      }

      setShowAddModal(false)
      resetForm()
      fetchStockItems()
    } catch (error: any) {
      console.error('Error saving stock item:', error)
      toast.error('Failed to save inventory item')
    }
  }

  const resetForm = () => {
    setFormData({
      stock_type: 'finished_goods',
      item_name: '',
      item_code: '',
      quantity: 0,
      unit: 'kg',
      unit_cost: 0,
      reorder_level: 0,
    })
    setIsEditing(false)
    setSelectedItem(null)
  }

  const handleEdit = (item: StockItem) => {
    setSelectedItem(item)
    setFormData({
      stock_type: item.stock_type,
      item_name: item.item_name,
      item_code: item.item_code,
      cheese_type: item.cheese_type,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      reorder_level: item.reorder_level,
      location: item.location,
      expiry_date: item.expiry_date?.split('T')[0],
    })
    setIsEditing(true)
    setShowAddModal(true)
  }

  const handleView = (item: StockItem) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const handleDelete = async (item: StockItem) => {
    if (!confirm(`Are you sure you want to delete ${item.item_name}?`)) return

    try {
      const { error } = await supabase
        .from('stock')
        .delete()
        .eq('id', item.id)

      if (error) throw error
      toast.success('Inventory item deleted successfully!')
      fetchStockItems()
    } catch (error: any) {
      console.error('Error deleting stock item:', error)
      toast.error('Failed to delete inventory item')
    }
  }

  const updateNumberField = (field: keyof StockFormData, value: number) => {
    setFormData({ ...formData, [field]: Math.max(0, value) })
  }

  const handleNumberInput = (field: keyof StockFormData, value: string) => {
    // Allow empty string for easier editing
    if (value === '') {
      setFormData({ ...formData, [field]: '' as any })
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        setFormData({ ...formData, [field]: Math.max(0, numValue) })
      }
    }
  }

  const getStockTypeLabel = (type: string) => {
    switch (type) {
      case 'raw_milk': return 'Raw Milk'
      case 'finished_goods': return 'Finished Goods'
      case 'byproduct': return 'Byproduct'
      default: return type
    }
  }

  const getStatusBadge = (item: StockItem) => {
    if (item.quantity <= item.reorder_level) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Low Stock!
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        In Stock
      </span>
    )
  }

  // Filter stock items
  const filteredItems = stockItems.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalValue = stockItems.reduce((sum, item) => sum + item.total_value, 0)
  const lowStockCount = stockItems.filter(item => item.quantity <= item.reorder_level).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory & Stock Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Track all inventory items including raw milk, finished goods, and byproducts</p>
        </div>
        <button 
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Stock Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Inventory Value</p>
              <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 text-green-600">{totalValue.toLocaleString()} RWF</p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Items</p>
              <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 text-blue-600">{stockItems.length}</p>
            </div>
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                Low Stock Alerts
                {lowStockCount > 0 && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
              </p>
              <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 text-red-600">{lowStockCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search inventory by name or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Stock Inventory ({filteredItems.length})</h3>
        </div>
        
        <div className="p-4 sm:p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No inventory items found</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="text-amber-600 hover:text-amber-700 font-medium"
              >
                Add your first inventory item
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className={`hover:bg-gray-50 ${item.quantity <= item.reorder_level ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.item_code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{getStockTypeLabel(item.stock_type)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.quantity.toLocaleString()} {item.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.unit_cost.toLocaleString()} RWF</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">{item.total_value.toLocaleString()} RWF</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{item.reorder_level.toLocaleString()} {item.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-amber-600 hover:text-amber-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleView(item)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className={`border border-gray-200 rounded-lg p-4 shadow-sm ${item.quantity <= item.reorder_level ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.item_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.item_code}</p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(item)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Type</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{getStockTypeLabel(item.stock_type)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Quantity</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{item.quantity.toLocaleString()} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Unit Cost</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{item.unit_cost.toLocaleString()} RWF</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Value</p>
                        <p className="text-sm font-medium text-green-600 mt-1">{item.total_value.toLocaleString()} RWF</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Reorder at: {item.reorder_level} {item.unit}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="flex items-center space-x-1 text-amber-600 hover:text-amber-800 text-sm transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleView(item)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(item)}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stock Type *
                  </label>
                  <select
                    value={formData.stock_type}
                    onChange={(e) => setFormData({...formData, stock_type: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    required
                  >
                    <option value="finished_goods">Finished Goods (Cheese)</option>
                    <option value="raw_milk">Raw Milk</option>
                    <option value="byproduct">Byproduct</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    placeholder="e.g., Gouda Cheese, Raw Milk"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Item Code *
                  </label>
                  <input
                    type="text"
                    value={formData.item_code}
                    onChange={(e) => setFormData({...formData, item_code: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    placeholder="e.g., GOUDA-001, MILK-001"
                    required
                  />
                </div>

                {formData.stock_type === 'finished_goods' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cheese Type
                    </label>
                    <select
                      value={formData.cheese_type || ''}
                      onChange={(e) => setFormData({...formData, cheese_type: e.target.value as any})}
                      className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    >
                      <option value="">Select cheese type</option>
                      <option value="gouda">Gouda</option>
                      <option value="cheddar">Cheddar</option>
                      <option value="mozzarella">Mozzarella</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                {/* Quantity with increment/decrement */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => updateNumberField('quantity', (formData.quantity || 0) - 1)}
                      className="flex items-center justify-center w-10 h-11 bg-gray-50 border-2 border-gray-200 border-r-0 rounded-l-lg text-gray-600 hover:bg-gray-100 focus:border-amber-500 transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity || ''}
                      onChange={(e) => handleNumberInput('quantity', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 text-gray-900 text-center focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                      placeholder="0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => updateNumberField('quantity', (formData.quantity || 0) + 1)}
                      className="flex items-center justify-center w-10 h-11 bg-gray-50 border-2 border-gray-200 border-l-0 rounded-r-lg text-gray-600 hover:bg-gray-100 focus:border-amber-500 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    required
                  >
                    <option value="kg">kg</option>
                    <option value="L">L (liters)</option>
                    <option value="pcs">pieces</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>

                {/* Unit Cost with increment/decrement */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit Cost (RWF) *
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => updateNumberField('unit_cost', (formData.unit_cost || 0) - 10)}
                      className="flex items-center justify-center w-10 h-11 bg-gray-50 border-2 border-gray-200 border-r-0 rounded-l-lg text-gray-600 hover:bg-gray-100 focus:border-amber-500 transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      step="1"
                      value={formData.unit_cost || ''}
                      onChange={(e) => handleNumberInput('unit_cost', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 text-gray-900 text-center focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                      placeholder="0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => updateNumberField('unit_cost', (formData.unit_cost || 0) + 10)}
                      className="flex items-center justify-center w-10 h-11 bg-gray-50 border-2 border-gray-200 border-l-0 rounded-r-lg text-gray-600 hover:bg-gray-100 focus:border-amber-500 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Reorder Level with increment/decrement */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reorder Level *
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => updateNumberField('reorder_level', (formData.reorder_level || 0) - 1)}
                      className="flex items-center justify-center w-10 h-11 bg-gray-50 border-2 border-gray-200 border-r-0 rounded-l-lg text-gray-600 hover:bg-gray-100 focus:border-amber-500 transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reorder_level || ''}
                      onChange={(e) => handleNumberInput('reorder_level', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border-2 border-gray-200 text-gray-900 text-center focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                      placeholder="0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => updateNumberField('reorder_level', (formData.reorder_level || 0) + 1)}
                      className="flex items-center justify-center w-10 h-11 bg-gray-50 border-2 border-gray-200 border-l-0 rounded-r-lg text-gray-600 hover:bg-gray-100 focus:border-amber-500 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    placeholder="e.g., Cold Storage A, Warehouse 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              {(formData.quantity || 0) > 0 && (formData.unit_cost || 0) > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Total Value: {((formData.quantity || 0) * (formData.unit_cost || 0)).toLocaleString()} RWF</strong>
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  {isEditing ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Item Details</h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Item Name</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedItem.item_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Item Code</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedItem.item_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stock Type</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{getStockTypeLabel(selectedItem.stock_type)}</p>
                  </div>
                  {selectedItem.cheese_type && (
                    <div>
                      <p className="text-sm text-gray-500">Cheese Type</p>
                      <p className="text-base font-medium text-gray-900 mt-1 capitalize">{selectedItem.cheese_type}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Storage Location</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedItem.location || 'Not specified'}</p>
                  </div>
                  {selectedItem.expiry_date && (
                    <div>
                      <p className="text-sm text-gray-500">Expiry Date</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{new Date(selectedItem.expiry_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity & Financial Info */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity & Financial Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">Current Quantity</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{selectedItem.quantity.toLocaleString()} {selectedItem.unit}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700">Unit Cost</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{selectedItem.unit_cost.toLocaleString()} RWF</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-700">Total Value</p>
                    <p className="text-2xl font-bold text-amber-900 mt-1">{selectedItem.total_value.toLocaleString()} RWF</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-700">Reorder Level</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">{selectedItem.reorder_level.toLocaleString()} {selectedItem.unit}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(selectedItem)}
                  {selectedItem.quantity <= selectedItem.reorder_level && (
                    <div className="flex items-center text-red-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-sm">Needs restocking</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created At</p>
                    <p className="text-gray-900 mt-1">{new Date(selectedItem.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-gray-900 mt-1">{new Date(selectedItem.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEdit(selectedItem)
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
