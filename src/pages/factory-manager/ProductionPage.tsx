import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { reduceMilkInventoryOnProduction } from '../../utils/inventoryUtils'
import { Plus, Package, Milk, TrendingUp, AlertCircle, Edit, Eye, Trash2, X, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '../../components/ui/pagination'
import type { Database } from '../../types/database.types'
import toast from 'react-hot-toast'

type ProductionBatch = Database['public']['Tables']['production_batches']['Row'] & {
  supervisor?: {
    full_name: string
  }
}

type ProductionBatchInsert = Database['public']['Tables']['production_batches']['Insert']

interface ProductionStats {
  todayProduction: number
  todayMilkUsed: number
  averageConversion: number
  todayBatches: number
  totalBatches: number
  completedBatches: number
  inProgressBatches: number
}

export default function ProductionPage() {
  const { user } = useAuthStore()
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [stats, setStats] = useState<ProductionStats>({
    todayProduction: 0,
    todayMilkUsed: 0,
    averageConversion: 0,
    todayBatches: 0,
    totalBatches: 0,
    completedBatches: 0,
    inProgressBatches: 0
  })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)

  // Date filter state
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0] // Today
  })

  // Form state
  const [formData, setFormData] = useState<{
    cheese_type: string
    milk_used_liters: string
    cheese_produced_kg: string
    production_date: string
    notes: string
  }>({
    cheese_type: '',
    milk_used_liters: '',
    cheese_produced_kg: '',
    production_date: new Date().toISOString().split('T')[0], // Default to today
    notes: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch production data
  const fetchProductionData = async () => {
    try {
      setLoading(true)
      
      // Fetch production batches with date filter
      const { data: batchesData, error: batchesError } = await supabase
        .from('production_batches')
        .select(`
          *,
          supervisor:users!production_batches_supervisor_id_fkey(full_name)
        `)
        .eq('factory_id', user?.factory_id || '11111111-1111-1111-1111-111111111111')
        .gte('production_date', dateFilter.startDate)
        .lte('production_date', dateFilter.endDate)
        .order('production_date', { ascending: false })
        .limit(50)

      if (batchesError) throw batchesError

      const batches = (batchesData as ProductionBatch[]) || []
      setBatches(batches)

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayBatches = batches.filter(b => b.production_date === today)
      const completedBatches = batches.filter(b => b.status === 'completed')
      const inProgressBatches = batches.filter(b => b.status === 'in_progress')

      setStats({
        todayProduction: todayBatches.reduce((sum, b) => sum + (b.cheese_produced_kg || 0), 0),
        todayMilkUsed: todayBatches.reduce((sum, b) => sum + (b.milk_used_liters || 0), 0),
        averageConversion: completedBatches.length > 0 
          ? completedBatches.reduce((sum, b) => sum + b.conversion_ratio, 0) / completedBatches.length 
          : 0,
        todayBatches: todayBatches.length,
        totalBatches: batches.length,
        completedBatches: completedBatches.length,
        inProgressBatches: inProgressBatches.length
      })

    } catch (error: any) {
      console.error('Error fetching production data:', error)
      toast.error('Failed to load production data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductionData()
  }, [user?.factory_id, dateFilter.startDate, dateFilter.endDate])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter batches by date range
  const filteredBatches = batches.filter(batch => {
    const batchDate = new Date(batch.production_date)
    const start = new Date(dateFilter.startDate)
    const end = new Date(dateFilter.endDate)
    return batchDate >= start && batchDate <= end
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Reset pagination when date filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter.startDate, dateFilter.endDate])

  // Generate batch number
  const generateBatchNumber = (cheeseType: string) => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${cheeseType.toUpperCase()}-${year}-${month}-${day}-${random}`
  }

  // Calculate conversion ratios and outputs
  const calculateProduction = (cheeseType: string, milkLiters: number) => {
    const ratios = {
      gouda: 10,      // 10L milk = 1kg cheese
      cheddar: 8,     // 8L milk = 1kg cheese  
      mozzarella: 6,  // 6L milk = 1kg cheese
      other: 9        // 9L milk = 1kg cheese (average)
    }
    
    const ratio = ratios[cheeseType as keyof typeof ratios] || 9
    const cheeseProduced = milkLiters / ratio
    
    // Waste calculation: Typically 1-3% of milk weight becomes waste during processing
    // This includes spillage, cleaning losses, and quality control samples
    const wasteKg = (milkLiters * 1.03) * 0.02 // 2% of milk weight (milk density ~1.03 kg/L)
    
    // Byproduct calculation: Whey and other byproducts are ~80-85% of original milk volume
    const byproductKg = milkLiters * 0.85 // 85% whey recovery
    
    return {
      cheese_produced_kg: Math.round(cheeseProduced * 100) / 100,
      conversion_ratio: ratio,
      waste_kg: Math.round(wasteKg * 100) / 100,
      byproduct_kg: Math.round(byproductKg * 100) / 100,
      quality_score: Math.floor(Math.random() * 10) + 90 // 90-99%
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const milkLiters = parseFloat(formData.milk_used_liters)
      const cheeseProduced = parseFloat(formData.cheese_produced_kg)
      
      // Validate inputs
      if (!milkLiters || milkLiters <= 0) {
        toast.error('Please enter a valid milk quantity')
        return
      }
      if (!cheeseProduced || cheeseProduced <= 0) {
        toast.error('Please enter a valid cheese quantity')
        return
      }
      if (!formData.cheese_type.trim()) {
        toast.error('Please enter a cheese type')
        return
      }

      const batchNumber = generateBatchNumber(formData.cheese_type)

      // Calculate conversion ratio from user inputs
      const conversionRatio = milkLiters / cheeseProduced

      // Production batch data - no transfer_status needed since we're recording to factory stock directly
      const insertData = {
        factory_id: user?.factory_id || '11111111-1111-1111-1111-111111111111',
        batch_number: batchNumber,
        production_date: formData.production_date,
        cheese_type: formData.cheese_type.trim(),
        milk_used_liters: milkLiters,
        cheese_produced_kg: cheeseProduced,
        conversion_ratio: conversionRatio,
        waste_kg: 0, // User can add this manually if needed
        byproduct_kg: 0, // User can add this manually if needed
        quality_score: 85, // Default quality score
        notes: formData.notes || null,
        supervisor_id: user?.id || '',
        status: 'completed'
      }

      console.log('Creating production batch:', insertData)
      
      const { data: newBatch, error } = await (supabase
        .from('production_batches') as any)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Database error details:', error)
        throw error
      }

      // Immediately record production to factory stock
      if (newBatch) {
        await handleRecordToFactoryStock(newBatch)
      }

      toast.success(`Production batch created and recorded to factory stock! Batch #${batchNumber}`)

      setShowForm(false)
      setFormData({ cheese_type: '', milk_used_liters: '', cheese_produced_kg: '', production_date: new Date().toISOString().split('T')[0], notes: '' })
      fetchProductionData()

    } catch (error: any) {
      console.error('Error creating production batch:', error)
      toast.error('Failed to create production batch')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle recording production to factory stock
  const handleRecordToFactoryStock = async (batch: ProductionBatch) => {
    if (!user?.factory_id) {
      toast.error('Factory information not available')
      return
    }

    try {
      // Calculate estimated unit cost based on milk cost
      const estimatedCheeseUnitCost = (batch.milk_used_liters * 400) / batch.cheese_produced_kg // Assuming 400 RWF per liter milk cost
      
      // Generate unique item code for this production batch
      const itemCode = `${batch.cheese_type.toUpperCase()}-${batch.batch_number}`
      
      // Check if stock item already exists for this cheese type in the factory
      const { data: existingStock, error: checkError } = await (supabase
        .from('stock') as any)
        .select('*')
        .eq('factory_id', user.factory_id)
        .eq('stock_type', 'finished_goods')
        .eq('cheese_type', batch.cheese_type)
        .single()

      if (existingStock && !checkError) {
        // Update existing stock quantity and weighted average cost
        const newQuantity = existingStock.quantity + batch.cheese_produced_kg
        const newAverageUnitCost = ((existingStock.quantity * existingStock.unit_cost) + (batch.cheese_produced_kg * estimatedCheeseUnitCost)) / newQuantity
        const newTotalValue = newQuantity * newAverageUnitCost

        const { error: updateError } = await (supabase
          .from('stock') as any)
          .update({
            quantity: newQuantity,
            unit_cost: newAverageUnitCost,
            total_value: newTotalValue,
            last_updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id)

        if (updateError) throw updateError
      } else {
        // Create new stock item for this cheese type
        const stockData = {
          factory_id: user.factory_id,
          stock_type: 'finished_goods' as const,
          item_name: `${batch.cheese_type.charAt(0).toUpperCase() + batch.cheese_type.slice(1)} Cheese`,
          item_code: itemCode,
          cheese_type: batch.cheese_type,
          quantity: batch.cheese_produced_kg,
          unit: 'kg',
          unit_cost: estimatedCheeseUnitCost,
          total_value: batch.cheese_produced_kg * estimatedCheeseUnitCost,
          reorder_level: 50, // Default reorder level
          location: 'Factory Storage',
          batch_id: batch.id,
          last_updated_by: user.id
        }

        const { error: insertError } = await (supabase
          .from('stock') as any)
          .insert([stockData])

        if (insertError) throw insertError
      }

      // Record stock movement (use the latest stock record for movement tracking)
      const { data: stockRecord } = await (supabase
        .from('stock') as any)
        .select('id')
        .eq('factory_id', user.factory_id)
        .eq('stock_type', 'finished_goods')
        .eq('cheese_type', batch.cheese_type)
        .single()

      if (stockRecord) {
        const { error: movementError } = await (supabase
          .from('stock_movements') as any)
          .insert([{
            stock_id: stockRecord.id,
            factory_id: user.factory_id,
            movement_type: 'in',
            quantity: batch.cheese_produced_kg,
            reason: 'Production completion',
            reference_id: batch.id,
            reference_type: 'production_batch',
            notes: `Production batch #${batch.batch_number}`,
            recorded_by: user.id
          }])

        if (movementError) {
          console.error('Error creating stock movement:', movementError)
        }
      }

      // Update batch status to 'recorded'
      const { error: updateError } = await (supabase
        .from('production_batches') as any)
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id)

      if (updateError) {
        console.error('Error updating batch status:', updateError)
        toast.error('Production recorded but failed to update batch status')
      } else {
        toast.success(`Successfully recorded ${batch.cheese_produced_kg}kg of ${batch.cheese_type} to factory stock!`)
      }

      // Refresh data
      fetchProductionData()

    } catch (error: any) {
      console.error('Error recording to factory stock:', error)
      toast.error('Failed to record to factory stock')
    }
  }

  const handleView = (batch: ProductionBatch) => {
    setSelectedBatch(batch)
    setIsViewModalOpen(true)
  }

  const handleDelete = async (batch: ProductionBatch) => {
    if (!confirm(`Are you sure you want to delete batch ${batch.batch_number}?`)) return

    try {
      const { error } = await supabase
        .from('production_batches')
        .delete()
        .eq('id', batch.id)

      if (error) throw error
      toast.success('Production batch deleted successfully!')
      fetchProductionData()
    } catch (error: any) {
      console.error('Error deleting production batch:', error)
      toast.error('Failed to delete production batch')
    }
  }



  const formatCheeseType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading production data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Track production batches with conversion ratios (Gouda 10:1, Cheddar 8:1, Mozzarella 6:1)</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span className="sm:inline">New Production Batch</span>
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setDateFilter({ startDate: today, endDate: today })
                }}
              >
                Today
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  const today = new Date()
                  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                  setDateFilter({ 
                    startDate: lastWeek.toISOString().split('T')[0], 
                    endDate: today.toISOString().split('T')[0] 
                  })
                }}
              >
                Last 7 Days
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  const today = new Date()
                  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                  setDateFilter({ 
                    startDate: lastMonth.toISOString().split('T')[0], 
                    endDate: today.toISOString().split('T')[0] 
                  })
                }}
              >
                Last 30 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Production</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.todayProduction} kg</div>
            <p className="text-xs text-gray-600 mt-1">{stats.todayBatches} batches today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Milk Used Today</CardTitle>
            <Milk className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats.todayMilkUsed.toLocaleString()} L</div>
            <p className="text-xs text-gray-600 mt-1">Raw material consumption</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats.averageConversion.toFixed(1)}:1</div>
            <p className="text-xs text-gray-600 mt-1">Liters to kg ratio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Batches</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{stats.inProgressBatches}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.completedBatches} completed total</p>
          </CardContent>
        </Card>
      </div>

      {/* New Production Batch Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Production Batch</CardTitle>
            <CardDescription>Create a new cheese production batch</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheese Type
                  </label>
                  <input
                    type="text"
                    value={formData.cheese_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, cheese_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                    placeholder="e.g. Gouda, Cheddar, Mozzarella..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    value={formData.production_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, production_date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Milk Used (Liters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.milk_used_liters}
                    onChange={(e) => setFormData(prev => ({ ...prev, milk_used_liters: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                    placeholder="Enter milk quantity"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheese Produced (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.cheese_produced_kg}
                    onChange={(e) => setFormData(prev => ({ ...prev, cheese_produced_kg: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                    placeholder="Enter cheese quantity produced"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                  rows={3}
                  placeholder="Add any production notes..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
                  {formLoading ? 'Creating...' : 'Create Batch'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Production Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Batches</CardTitle>
          <CardDescription>Recent production batch history</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No production batches yet</h3>
              <p className="text-gray-600 mb-4">Start by creating your first production batch</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Batch
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Batch Number</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Cheese Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Milk Used</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Produced</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Supervisor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{batch.batch_number}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(batch.production_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{formatCheeseType(batch.cheese_type)}</Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{batch.milk_used_liters.toLocaleString()} L</td>
                        <td className="py-3 px-4 text-gray-600">{batch.cheese_produced_kg} kg</td>
                        <td className="py-3 px-4">{getStatusBadge(batch.status)}</td>
                        <td className="py-3 px-4 text-gray-600">{batch.supervisor?.full_name || 'Unknown'}</td>
                        <td className="py-3 px-4">
                          <div className="relative" ref={openDropdown === batch.id ? dropdownRef : null}>
                            <button
                              onClick={() => setOpenDropdown(openDropdown === batch.id ? null : batch.id)}
                              className="text-gray-600 hover:text-gray-800 transition-colors"
                              title="Actions"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {openDropdown === batch.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      handleView(batch)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Eye className="w-4 h-4 mr-3" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedBatch(batch)
                                      setIsEditModalOpen(true)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 w-full text-left"
                                  >
                                    <Edit className="w-4 h-4 mr-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDelete(batch)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                  >
                                    <Trash2 className="w-4 h-4 mr-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {paginatedBatches.map((batch) => (
                  <div key={batch.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{batch.batch_number}</h3>
                        <p className="text-sm text-gray-600">{new Date(batch.production_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {getStatusBadge(batch.status)}
                        <Badge variant="outline" className="text-xs">{formatCheeseType(batch.cheese_type)}</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Milk Used</p>
                        <p className="text-lg font-semibold text-blue-600">{batch.milk_used_liters.toLocaleString()} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Cheese Produced</p>
                        <p className="text-lg font-semibold text-green-600">{batch.cheese_produced_kg} kg</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Supervisor</p>
                        <p className="text-sm font-medium text-gray-900">{batch.supervisor?.full_name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-xs text-gray-500">
                          Conversion: {batch.conversion_ratio}:1
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(batch)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBatch(batch);
                              setIsEditModalOpen(true);
                            }}
                            className="text-orange-600 hover:text-orange-800 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(batch)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredBatches.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredBatches.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Production Batch Details</h2>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Batch Number</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedBatch.batch_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Production Date</label>
                      <p className="text-gray-900">{new Date(selectedBatch.production_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cheese Type</label>
                      <p className="text-gray-900">{formatCheeseType(selectedBatch.cheese_type)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedBatch.status)}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Supervisor</label>
                      <p className="text-gray-900">{selectedBatch.supervisor?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Conversion Ratio</label>
                      <p className="text-gray-900">{selectedBatch.conversion_ratio}:1</p>
                    </div>
                  </div>
                </div>

                {/* Production Metrics */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Production Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-blue-700">Milk Used</label>
                      <p className="text-2xl font-bold text-blue-600">{selectedBatch.milk_used_liters.toLocaleString()}</p>
                      <p className="text-sm text-blue-600">Liters</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-green-700">Cheese Produced</label>
                      <p className="text-2xl font-bold text-green-600">{selectedBatch.cheese_produced_kg}</p>
                      <p className="text-sm text-green-600">Kilograms</p>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedBatch.notes && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">{selectedBatch.notes}</p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Timestamps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-500">Created At</label>
                      <p className="text-gray-700">{new Date(selectedBatch.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Last Updated</label>
                      <p className="text-gray-700">{new Date(selectedBatch.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8 pt-6 border-t">
                <Button
                  onClick={() => setIsViewModalOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
