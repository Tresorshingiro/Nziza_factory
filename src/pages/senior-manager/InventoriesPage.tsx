import { useState, useEffect } from 'react'
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertTriangle, Edit, Edit2, Trash2, Eye, Factory, ArrowDownLeft, ArrowUpRight, BarChart3, Minus, XCircle, AlertCircle, MoreVertical, History } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from 'react-hot-toast'
import { getMainStockSummary, distributeFromMainStock } from '../../utils/mainStockUtils'
import type { Database } from '../../types/database.types'

type StockRow = Database['public']['Tables']['stock']['Row']
type MainStockRow = Database['public']['Tables']['main_stock']['Row']
type FactoryProductionSummaryRow = Database['public']['Tables']['factory_production_summary']['Row']

interface StockWithFactory extends StockRow {
  factory_name: string
}

interface MainStockData {
  id: string
  cheese_type: string
  total_quantity: number
  average_unit_cost: number
  price_per_unit: number
  total_value: number
  last_updated: string
  location?: string
  reorder_level?: number
  contributing_factories?: Array<{
    factory_id: string
    factory_name: string
    quantity: number
  }>
}

interface ProductionSummaryData extends FactoryProductionSummaryRow {
  factory_name: string
}

interface StockLoss {
  id: string
  main_stock_id: string
  cheese_type: string
  quantity: number
  unit_cost: number
  total_value: number
  loss_type: 'expired' | 'damaged' | 'destroyed' | 'contaminated' | 'other'
  loss_reason: string
  expiry_date?: string
  batch_reference?: string
  location?: string
  reported_by: string
  approved_by?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  created_at: string
  processed_at?: string
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
  const [mainStock, setMainStock] = useState<MainStockData[]>([])
  const [productionSummary, setProductionSummary] = useState<ProductionSummaryData[]>([])
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'main-stock' | 'factory-inventory'>('main-stock')
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
  
  // Loss tracking states
  const [isLossModalOpen, setIsLossModalOpen] = useState(false)
  const [selectedMainStock, setSelectedMainStock] = useState<MainStockData | null>(null)
  const [stockLosses, setStockLosses] = useState<StockLoss[]>([])
  const [isLossHistoryOpen, setIsLossHistoryOpen] = useState(false)
  
  // Main stock view/edit states
  const [isMainStockViewOpen, setIsMainStockViewOpen] = useState(false)
  const [viewingMainStock, setViewingMainStock] = useState<MainStockData | null>(null)
  const [isEditMainStockOpen, setIsEditMainStockOpen] = useState(false)
  const [editingMainStock, setEditingMainStock] = useState<MainStockData | null>(null)
  const [editMainStockForm, setEditMainStockForm] = useState({
    total_quantity: '',
    average_unit_cost: '',
    location: '',
    reorder_level: ''
  })
  
  const [newLoss, setNewLoss] = useState({
    cheese_type: '',
    quantity: '',
    loss_type: '',
    loss_reason: '',
    expiry_date: '',
    batch_reference: '',
    location: '',
    notes: ''
  })

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
    fetchMainStock()
    fetchProductionSummary()
    fetchStockLosses()
  }, [selectedFactory])

  useEffect(() => {
    if (activeTab === 'main-stock') {
      fetchMainStock()
      fetchProductionSummary()
      fetchStockLosses()
    } else {
      fetchInventory()
    }
  }, [activeTab])

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

  const fetchMainStock = async () => {
    try {
      console.log('🔍 Fetching main stock data...')
      const summary = await getMainStockSummary()
      console.log('📦 Main stock summary result:', summary)
      
      if (summary.success && summary.data) {
        console.log('✅ Main stock data loaded:', summary.data.length, 'items')
        setMainStock(summary.data)
      } else {
        console.error('❌ Error fetching main stock:', summary.error)
        setMainStock([])
      }
    } catch (error) {
      console.error('💥 Exception fetching main stock:', error)
      setMainStock([])
    }
  }

  const fetchProductionSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('factory_production_summary')
        .select(`
          *,
          factory:factories(name)
        `)
        .gte('production_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('production_date', { ascending: false })

      if (error) throw error

      const summaryWithFactoryNames = (data || []).map((item: any) => ({
        ...item,
        factory_name: (item.factory as any)?.name || 'Unknown Factory'
      }))

      setProductionSummary(summaryWithFactoryNames)
    } catch (error) {
      console.error('Error fetching production summary:', error)
      setProductionSummary([])
    }
  }

  const fetchStockLosses = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('stock_losses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setStockLosses(data || [])
    } catch (error) {
      console.error('Error fetching stock losses:', error)
      setStockLosses([])
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
        const { error } = await (supabase as any)
          .from('stock')
          .update(stockData)
          .eq('id', editingItem.id)

        if (error) throw error
        toast.success('Inventory item updated successfully')
      } else {
        const { error } = await (supabase as any)
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

  const handleMainStockLoss = (mainStockItem: MainStockData) => {
    console.log('🧀 Opening loss modal for:', mainStockItem.cheese_type, 'ID:', mainStockItem.id)
    setSelectedMainStock(mainStockItem)
    setNewLoss({
      cheese_type: mainStockItem.cheese_type.trim(),
      quantity: '',
      loss_type: '',
      loss_reason: '',
      expiry_date: '',
      batch_reference: '',
      location: '',
      notes: ''
    })
    setIsLossModalOpen(true)
  }

  const handleLossSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMainStock || !user) return

    setSubmitting(true)
    
    try {
      const quantity = parseFloat(newLoss.quantity)
      const unitCost = selectedMainStock.average_unit_cost || selectedMainStock.price_per_unit || 0
      const totalValue = quantity * unitCost

      // Check if we have enough stock
      if (quantity > selectedMainStock.total_quantity) {
        toast.error(`Insufficient stock. Available: ${selectedMainStock.total_quantity} kg`)
        return
      }

      if (quantity <= 0) {
        toast.error('Quantity must be greater than 0')
        return
      }

      // Clean up cheese_type (trim whitespace, preserve original case)
      const cleanCheeseType = newLoss.cheese_type.trim()
      
      // Basic validation - just ensure it's not empty
      if (!cleanCheeseType) {
        console.error('❌ Empty cheese type')
        toast.error('Cheese type cannot be empty')
        return
      }

      // Validate main stock ID exists
      if (!selectedMainStock.id) {
        console.error('❌ Missing main stock ID:', selectedMainStock)
        toast.error('Error: Main stock ID is missing. Please refresh and try again.')
        return
      }

      const lossData = {
        main_stock_id: selectedMainStock.id,
        cheese_type: cleanCheeseType,
        quantity,
        unit_cost: unitCost,
        total_value: totalValue,
        loss_type: newLoss.loss_type,
        loss_reason: newLoss.loss_reason,
        expiry_date: newLoss.expiry_date || null,
        batch_reference: newLoss.batch_reference || null,
        location: newLoss.location || null,
        notes: newLoss.notes || null,
        reported_by: user.id,
        status: 'pending'
      }

      console.log('📝 Submitting loss data:', lossData)
      
      const { data, error } = await (supabase as any)
        .from('stock_losses')
        .insert(lossData)
        .select()

      if (error) {
        console.error('Database error details:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      toast.success('Stock loss reported successfully and is pending approval')
      setIsLossModalOpen(false)
      resetLossForm()
      fetchStockLosses()
    } catch (error: any) {
      console.error('Error reporting stock loss:', error)
      toast.error(error.message || 'Failed to report stock loss')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLossApproval = async (lossId: string, action: 'approved' | 'rejected') => {
    if (!user) return

    try {
      const { error } = await (supabase as any)
        .from('stock_losses')
        .update({
          status: action,
          approved_by: user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', lossId)

      if (error) throw error

      toast.success(`Stock loss ${action} successfully`)
      fetchStockLosses()
      fetchMainStock() // Refresh main stock to show updated quantities
    } catch (error: any) {
      console.error('Error updating stock loss:', error)
      toast.error(error.message || 'Failed to update stock loss')
    }
  }

  const resetLossForm = () => {
    setNewLoss({
      cheese_type: '',
      quantity: '',
      loss_type: '',
      loss_reason: '',
      expiry_date: '',
      batch_reference: '',
      location: '',
      notes: ''
    })
    setSelectedMainStock(null)
  }

  // Main stock actions
  const handleViewMainStock = (item: MainStockData) => {
    setViewingMainStock(item)
    setIsMainStockViewOpen(true)
  }

  const handleEditMainStock = (item: MainStockData) => {
    setEditingMainStock(item)
    setEditMainStockForm({
      total_quantity: item.total_quantity.toString(),
      average_unit_cost: item.average_unit_cost.toString(),
      location: item.location || '',
      reorder_level: item.reorder_level?.toString() || '0'
    })
    setIsEditMainStockOpen(true)
  }

  const handleMainStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMainStock || !user) return

    setSubmitting(true)
    try {
      const updateData = {
        total_quantity: parseFloat(editMainStockForm.total_quantity),
        average_unit_cost: parseFloat(editMainStockForm.average_unit_cost),
        total_value: parseFloat(editMainStockForm.total_quantity) * parseFloat(editMainStockForm.average_unit_cost),
        location: editMainStockForm.location,
        reorder_level: parseFloat(editMainStockForm.reorder_level) || 0,
        updated_at: new Date().toISOString()
      }

      const { error } = await (supabase as any)
        .from('main_stock')
        .update(updateData)
        .eq('id', editingMainStock.id)

      if (error) throw error

      toast.success(`${editingMainStock.cheese_type} stock updated successfully`)
      setIsEditMainStockOpen(false)
      setEditingMainStock(null)
      fetchMainStock()
    } catch (error: any) {
      console.error('Error updating main stock:', error)
      toast.error(error.message || 'Failed to update main stock')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMainStock = async (item: MainStockData) => {
    if (!confirm(`Are you sure you want to delete all ${item.cheese_type} stock (${item.total_quantity} kg)?`)) return

    try {
      const { error } = await supabase
        .from('main_stock')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      toast.success(`${item.cheese_type} stock deleted successfully`)
      fetchMainStock()
    } catch (error: any) {
      console.error('Error deleting main stock:', error)
      toast.error(error.message || 'Failed to delete main stock')
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
          <p className="text-gray-600">Track main stock and factory inventory across all locations</p>
        </div>
        
        <div className="flex gap-3">
          {activeTab === 'factory-inventory' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Inventory Item
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('main-stock')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'main-stock'
                  ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Main Stock Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('factory-inventory')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'factory-inventory'
                  ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Factory Inventory
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Stock Overview */}
      {activeTab === 'main-stock' && (
        <>
          {/* Main Stock Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Cheese Types</p>
                  <p className="text-2xl font-bold text-gray-900">{mainStock.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mainStock.reduce((sum, item) => sum + item.total_quantity, 0).toLocaleString()}kg
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mainStock.reduce((sum, item) => sum + item.total_value, 0).toLocaleString()} RWF
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Factory className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Factories</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(productionSummary.map(p => p.factory_id)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Stock Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Main Stock Inventory</h3>
              <p className="text-sm text-gray-600 mt-1">Centralized cheese inventory from all factories</p>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : mainStock.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No main stock available</p>
                <p className="text-xs text-gray-400 mt-2">
                  Check browser console for debug information
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      console.log('🔄 Manually refreshing main stock...')
                      fetchMainStock()
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                  >
                    Refresh Main Stock
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🧪 Testing direct main_stock query...')
                      try {
                        const { data, error } = await supabase
                          .from('main_stock')
                          .select('*')
                        console.log('Direct query result:', { data, error })
                        if (data && data.length > 0) {
                          console.log('✅ Direct query found', data.length, 'records')
                        } else {
                          console.log('❌ Direct query found no records')
                        }
                      } catch (err) {
                        console.error('Direct query failed:', err)
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Test Direct Query
                  </button>
                </div>
              </div>
            ) : (
              <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cheese Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contributing Factories</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mainStock.map((item) => (
                      <tr key={item.cheese_type} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 capitalize text-base">
                                {item.cheese_type.replace('_', ' ')} Cheese
                              </div>
                              <div className="text-xs text-gray-500">
                                Updated: {new Date(item.last_updated).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-semibold text-gray-900">
                            {item.total_quantity.toLocaleString()} kg
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.total_quantity > 1000 ? 'High Stock' : item.total_quantity > 100 ? 'Normal Stock' : 'Low Stock'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.average_unit_cost.toLocaleString()} RWF/kg
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg font-semibold text-green-700">
                            {item.total_value.toLocaleString()} RWF
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.contributing_factories && item.contributing_factories.length > 0 ? (
                              item.contributing_factories.slice(0, 3).map((factory) => (
                                <span key={factory.factory_id} className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {factory.factory_name} ({factory.quantity}kg)
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">No contributions</span>
                            )}
                            {item.contributing_factories && item.contributing_factories.length > 3 && (
                              <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                +{item.contributing_factories.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative group">
                            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[140px]">
                              <button
                                onClick={() => handleViewMainStock(item)}
                                className="w-full px-3 py-1 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                              >
                                <Eye className="w-3 h-3" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleEditMainStock(item)}
                                className="w-full px-3 py-1 text-left text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit Stock
                              </button>
                              <button
                                onClick={() => handleMainStockLoss(item)}
                                className="w-full px-3 py-1 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Minus className="w-3 h-3" />
                                Report Loss
                              </button>
                              <button
                                onClick={() => setIsLossHistoryOpen(true)}
                                className="w-full px-3 py-1 text-left text-xs text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                              >
                                <History className="w-3 h-3" />
                                Loss History
                              </button>
                              <button
                                onClick={() => handleDeleteMainStock(item)}
                                className="w-full px-3 py-1 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete Stock
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {mainStock.map((item) => (
                  <div key={item.cheese_type} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg capitalize">
                          {item.cheese_type.replace('_', ' ')} Cheese
                        </h3>
                        <p className="text-sm text-gray-500">
                          Updated: {new Date(item.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Available Quantity</p>
                        <p className="text-xl font-bold text-gray-900">{item.total_quantity.toLocaleString()} kg</p>
                        <p className="text-xs text-gray-500">
                          {item.total_quantity > 1000 ? 'High Stock' : item.total_quantity > 100 ? 'Normal Stock' : 'Low Stock'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Value</p>
                        <p className="text-xl font-bold text-green-700">{item.total_value.toLocaleString()} RWF</p>
                        <p className="text-xs text-gray-500">{item.average_unit_cost.toLocaleString()} RWF/kg</p>
                      </div>
                    </div>

                    {item.contributing_factories && item.contributing_factories.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-2">Contributing Factories</p>
                        <div className="flex flex-wrap gap-1">
                          {item.contributing_factories.slice(0, 2).map((factory) => (
                            <span key={factory.factory_id} className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {factory.factory_name} ({factory.quantity}kg)
                            </span>
                          ))}
                          {item.contributing_factories.length > 2 && (
                            <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{item.contributing_factories.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mobile Actions */}
                    <div className="flex justify-end pt-3 border-t border-gray-300 mt-3">
                      <div className="relative group">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 bottom-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[140px]">
                          <button
                            onClick={() => handleViewMainStock(item)}
                            className="w-full px-3 py-1 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Eye className="w-3 h-3" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleEditMainStock(item)}
                            className="w-full px-3 py-1 text-left text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit Stock
                          </button>
                          <button
                            onClick={() => handleMainStockLoss(item)}
                            className="w-full px-3 py-1 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Minus className="w-3 h-3" />
                            Report Loss
                          </button>
                          <button
                            onClick={() => setIsLossHistoryOpen(true)}
                            className="w-full px-3 py-1 text-left text-xs text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                          >
                            <History className="w-3 h-3" />
                            Loss History
                          </button>
                          <button
                            onClick={() => handleDeleteMainStock(item)}
                            className="w-full px-3 py-1 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Stock
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>

          {/* Recent Production Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Production Summary</h3>
              <p className="text-sm text-gray-600 mt-1">Daily production from all factories (Last 30 days)</p>
            </div>
            
            {productionSummary.length === 0 ? (
              <div className="text-center py-12 px-6">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No production data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cheese Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milk Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productionSummary.slice(0, 10).map((item, index) => (
                      <tr key={`${item.factory_id}-${item.production_date}-${item.cheese_type}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(item.production_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                            {item.factory_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 capitalize">
                            {item.cheese_type.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-green-600">
                            {(item as any).total_quantity_produced?.toLocaleString() || 0} kg
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {(item as any).total_milk_used?.toLocaleString() || 0} L
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Factory Inventory Tab */}
      {activeTab === 'factory-inventory' && (
        <>
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
                  <input
                    type="text"
                    value={newItem.cheese_type}
                    onChange={(e) => setNewItem(prev => ({ ...prev, cheese_type: e.target.value }))}
                    placeholder="Enter cheese type (e.g., Gouda, Cheddar, Mozzarella, etc.)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
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
      </>
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

      {/* Stock Loss Modal */}
      {isLossModalOpen && selectedMainStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Report Stock Loss</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedMainStock.cheese_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Cheese - 
                Available: {selectedMainStock.total_quantity} kg
              </p>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <strong>Note:</strong> Stock quantity will only be reduced after a senior manager approves this loss report.
                </p>
              </div>
            </div>
            
            <form onSubmit={handleLossSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loss Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newLoss.loss_type}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, loss_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Loss Type</option>
                    <option value="expired">Expired</option>
                    <option value="damaged">Damaged</option>
                    <option value="destroyed">Destroyed</option>
                    <option value="contaminated">Contaminated</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newLoss.quantity}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    min="0.1"
                    max={selectedMainStock.total_quantity}
                    step="0.1"
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loss Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLoss.loss_reason}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, loss_reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    placeholder="Describe the reason for the loss"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newLoss.expiry_date}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Reference
                  </label>
                  <input
                    type="text"
                    value={newLoss.batch_reference}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, batch_reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Batch ID or reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newLoss.location}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Storage location"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={newLoss.notes}
                    onChange={(e) => setNewLoss(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Additional details about the loss"
                  />
                </div>
              </div>

              {/* Cost Summary */}
              {newLoss.quantity && !isNaN(parseFloat(newLoss.quantity)) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Loss Impact</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-red-700">Quantity:</span>
                      <span className="font-medium text-red-900 ml-2">{parseFloat(newLoss.quantity).toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-red-700">Estimated Value:</span>
                      <span className="font-medium text-red-900 ml-2">
                        {(parseFloat(newLoss.quantity) * selectedMainStock.average_unit_cost).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLossModalOpen(false)
                    resetLossForm()
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Reporting...' : 'Report Loss'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Loss History Modal */}
      {isLossHistoryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Stock Loss History</h2>
              <p className="text-sm text-gray-600 mt-1">Track all reported stock losses</p>
            </div>
            
            <div className="p-6">
              {stockLosses.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No stock losses reported</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cheese Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loss Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stockLosses.map((loss) => (
                        <tr key={loss.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(loss.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                              {loss.cheese_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              loss.loss_type === 'expired' ? 'bg-orange-100 text-orange-800' :
                              loss.loss_type === 'damaged' ? 'bg-red-100 text-red-800' :
                              loss.loss_type === 'destroyed' ? 'bg-red-100 text-red-800' :
                              loss.loss_type === 'contaminated' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {loss.loss_type.replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {loss.quantity.toLocaleString()} kg
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-red-600">
                            {loss.total_value.toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                            {loss.loss_reason}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              loss.status === 'approved' ? 'bg-green-100 text-green-800' :
                              loss.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {loss.status.replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {loss.status === 'pending' && user?.role && ['senior_manager', 'main_boss'].includes(user.role) && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleLossApproval(loss.id, 'approved')}
                                  className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleLossApproval(loss.id, 'rejected')}
                                  className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsLossHistoryOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stock View Modal */}
      {isMainStockViewOpen && viewingMainStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {viewingMainStock.cheese_type} Stock Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">Complete stock information and analytics</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Stock Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Quantity</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{viewingMainStock.total_quantity} kg</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Unit Cost</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">RWF {viewingMainStock.average_unit_cost?.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Total Value</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">RWF {viewingMainStock.total_value?.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Reorder Level</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{viewingMainStock.reorder_level || 0} kg</p>
                </div>
              </div>

              {/* Stock Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Stock Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cheese Type</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">{viewingMainStock.cheese_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="text-sm text-gray-900 mt-1">{viewingMainStock.location}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                      <p className="text-sm text-gray-900 mt-1">{new Date(viewingMainStock.last_updated).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contributing Factories</h3>
                  <div className="space-y-2">
                    {viewingMainStock.contributing_factories?.length ? (
                      viewingMainStock.contributing_factories.map((factory, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">{factory.factory_name}</span>
                            <span className="text-sm text-gray-600">{factory.quantity} kg</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No factory contributions recorded</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsMainStockViewOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsMainStockViewOpen(false)
                    handleEditMainStock(viewingMainStock)
                  }}
                  className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Edit Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stock Edit Modal */}
      {isEditMainStockOpen && editingMainStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit {editingMainStock.cheese_type} Stock
              </h2>
              <p className="text-sm text-gray-600 mt-1">Update stock quantities and details</p>
            </div>
            
            <form onSubmit={handleMainStockUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Quantity (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMainStockForm.total_quantity}
                    onChange={(e) => setEditMainStockForm(prev => ({ ...prev, total_quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Cost (RWF) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMainStockForm.average_unit_cost}
                    onChange={(e) => setEditMainStockForm(prev => ({ ...prev, average_unit_cost: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editMainStockForm.location}
                    onChange={(e) => setEditMainStockForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Central Warehouse"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reorder Level (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMainStockForm.reorder_level}
                    onChange={(e) => setEditMainStockForm(prev => ({ ...prev, reorder_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Calculated Total Value */}
              {editMainStockForm.total_quantity && editMainStockForm.average_unit_cost && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Calculated Total Value:</strong> RWF {(parseFloat(editMainStockForm.total_quantity) * parseFloat(editMainStockForm.average_unit_cost)).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditMainStockOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}