import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { updateMilkInventoryOnCollection } from '../../utils/inventoryUtils'
import toast from 'react-hot-toast'
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Droplets,
  TrendingUp,
  Calendar,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Types
type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'check'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'check', label: 'Check' }
]

interface Farmer {
  id: string
  name: string
  current_milk_price: number
}

interface MilkCollection {
  id: string
  factory_id: string
  farmer_id: string
  collection_date: string
  quantity_liters: number
  price_per_liter: number
  total_amount: number
  payment_method?: PaymentMethod
  mobile_number?: string
  bank_account?: string
  reference_number?: string
  notes: string | null
  created_at: string
  farmers?: {
    name: string
  }
}

export default function MilkCollectionPage() {
  const { user } = useAuthStore()
  const [collections, setCollections] = useState<MilkCollection[]>([])
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<MilkCollection | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [dateFilter, setDateFilter] = useState('')

  const [formData, setFormData] = useState({
    farmer_id: '',
    collection_date: new Date().toISOString().split('T')[0],
    quantity_liters: '',
    price_per_liter: '',
    payment_method: '' as PaymentMethod | '',
    mobile_number: '',
    bank_account: '',
    reference_number: '',
    notes: ''
  })

  const handleFarmerChange = (farmerId: string) => {
    const selectedFarmer = farmers.find(f => f.id === farmerId)
    setFormData(prev => ({
      ...prev,
      farmer_id: farmerId,
      price_per_liter: selectedFarmer ? selectedFarmer.current_milk_price.toString() : ''
    }))
  }

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity_liters) || 0
    const price = parseFloat(formData.price_per_liter) || 0
    return quantity * price
  }

  const generateExpenseNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EXP-${year}${month}-${randomNum}`
  }

  const createExpenseForMilkCollection = async (collection: any, userId: string) => {
    try {
      // Get farmer details to create/find supplier
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('*')
        .eq('id', collection.farmer_id)
        .single()

      if (farmerError) throw farmerError

      // Check if supplier exists for this farmer
      let supplierId = null
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', farmer.name)
        .eq('supplier_type', 'Farmer')
        .single()

      if (existingSupplier) {
        supplierId = existingSupplier.id
      } else {
        // Create new supplier from farmer data
        const { data: newSupplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert([{
            name: farmer.name,
            supplier_code: `FARM-${farmer.name.replace(/\s+/g, '').toUpperCase().substring(0, 6)}`,
            phone: farmer.phone || '',
            address: farmer.address || '',
            supplier_type: 'Farmer',
            payment_terms: farmer.payment_frequency || 'monthly',
            is_active: farmer.is_active,
            notes: `Auto-created from farmer: ${farmer.name}`
          }])
          .select('id')
          .single()

        if (supplierError) {
          console.error('Error creating supplier:', supplierError)
        } else {
          supplierId = newSupplier.id
        }
      }

      const expenseData = {
        factory_id: collection.factory_id,
        expense_number: generateExpenseNumber(),
        category: 'Raw Materials',
        subcategory: 'Milk Purchase',
        supplier_id: supplierId,
        expense_date: collection.collection_date,
        amount: collection.total_amount,
        tax: 0,
        total: collection.total_amount,
        payment_method: collection.payment_method,
        reference_number: collection.reference_number,
        status: 'approved', // Auto-approve milk collection expenses
        description: `Milk collection payment from ${farmer.name} - ${collection.quantity_liters}L at ${collection.price_per_liter} RWF/L`,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        recorded_by: userId
      }

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData])

      if (error) throw error
    } catch (error) {
      console.error('Error creating expense for milk collection:', error)
      // Don't throw the error as we don't want to block the milk collection creation
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.factory_id) return

    const collectionData = {
      farmer_id: formData.farmer_id,
      factory_id: user.factory_id,
      collection_date: formData.collection_date,
      quantity_liters: parseFloat(formData.quantity_liters),
      price_per_liter: parseFloat(formData.price_per_liter),
      total_amount: calculateTotal(),
      payment_method: formData.payment_method || null,
      mobile_number: formData.mobile_number || null,
      bank_account: formData.bank_account || null,
      reference_number: formData.reference_number || null,
      notes: formData.notes || null
    }

    try {
      if (isEditing && selectedCollection) {
        const { error } = await supabase
          .from('milk_collections')
          .update(collectionData as any)
          .eq('id', selectedCollection.id)
        
        if (error) throw error
        toast.success('Collection updated successfully!')
      } else {
        // Insert new milk collection
        const { data: newCollection, error } = await supabase
          .from('milk_collections')
          .insert([collectionData as any])
          .select()
          .single()
        
        if (error) throw error

        // Create corresponding expense entry
        await createExpenseForMilkCollection(newCollection, user.id)

        // Auto-update milk inventory
        if (user?.factory_id) {
          const inventoryResult = await updateMilkInventoryOnCollection(
            user.factory_id,
            parseFloat(formData.quantity_liters),
            parseFloat(formData.price_per_liter),
            user.id
          )

          if (inventoryResult.success) {
            toast.success(`Collection recorded, expense created, and ${inventoryResult.message}`)
          } else {
            toast.success('Collection recorded and expense created successfully!')
            toast.error(`Inventory update failed: ${inventoryResult.message}`)
          }
        } else {
          toast.success('Collection recorded and expense created successfully!')
        }
      }

      setShowAddModal(false)
      resetForm()
      fetchCollections()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const resetForm = () => {
    setFormData({
      farmer_id: '',
      collection_date: new Date().toISOString().split('T')[0],
      quantity_liters: '',
      price_per_liter: '',
      payment_method: '',
      mobile_number: '',
      bank_account: '',
      reference_number: '',
      notes: ''
    })
    setIsEditing(false)
    setSelectedCollection(null)
  }

  const openEditModal = (collection: MilkCollection) => {
    setFormData({
      farmer_id: collection.farmer_id,
      collection_date: collection.collection_date,
      quantity_liters: collection.quantity_liters.toString(),
      price_per_liter: collection.price_per_liter.toString(),
      payment_method: collection.payment_method || '',
      mobile_number: collection.mobile_number || '',
      bank_account: collection.bank_account || '',
      reference_number: collection.reference_number || '',
      notes: collection.notes || ''
    })
    setSelectedCollection(collection)
    setIsEditing(true)
    setShowAddModal(true)
  }

  const openViewModal = (collection: MilkCollection) => {
    setSelectedCollection(collection)
    setShowViewModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection record?')) return

    try {
      const { error } = await supabase
        .from('milk_collections')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Collection deleted successfully!')
      fetchCollections()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const fetchCollections = async () => {
    if (!user?.factory_id) return

    try {
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          *,
          farmers (
            name
          )
        `)
        .eq('factory_id', user.factory_id)
        .order('collection_date', { ascending: false })

      if (error) throw error
      setCollections(data || [])
    } catch (error: any) {
      console.error('Error fetching collections:', error)
      toast.error('Failed to fetch collections')
    }
  }

  const fetchFarmers = async () => {
    if (!user?.factory_id) return

    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, name, current_milk_price')
        .eq('factory_id', user.factory_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setFarmers(data || [])
    } catch (error: any) {
      console.error('Error fetching farmers:', error)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      await Promise.all([fetchCollections(), fetchFarmers()])
      setLoading(false)
    }

    initializeData()
  }, [user?.factory_id])

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = !searchTerm || 
      collection.farmers?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDate = !dateFilter || collection.collection_date === dateFilter
    
    return matchesSearch && matchesDate
  })

  const totalQuantity = filteredCollections.reduce((sum, collection) => sum + collection.quantity_liters, 0)
  const totalValue = filteredCollections.reduce((sum, collection) => sum + collection.total_amount, 0)
  const averagePrice = filteredCollections.length > 0 
    ? filteredCollections.reduce((sum, collection) => sum + collection.price_per_liter, 0) / filteredCollections.length 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading milk collections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Milk Collection</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Record and track daily milk collection from farmers</p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Record Collection
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Collected Today</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{totalQuantity.toLocaleString()} L</p>
              </div>
              <Droplets className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Value</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{totalValue.toLocaleString()} RWF</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Average Price</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{averagePrice.toFixed(0)} RWF/L</p>
              </div>
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by farmer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

        {/* Collections Table/Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Milk Collections ({filteredCollections.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCollections.length === 0 ? (
              <div className="text-center py-12">
                <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No collections found</h3>
                <p className="text-gray-500 mb-6">Start by recording your first milk collection</p>
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Record Collection
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Farmer</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Quantity (L)</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Price/L</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCollections.map((collection) => (
                        <tr key={collection.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">
                            {new Date(collection.collection_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {collection.farmers?.name}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {collection.quantity_liters.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {collection.price_per_liter.toLocaleString()} RWF
                          </td>
                          <td className="py-3 px-4 font-semibold text-amber-600">
                            {collection.total_amount.toLocaleString()} RWF
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openViewModal(collection)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(collection)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(collection.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {filteredCollections.map((collection) => (
                    <div key={collection.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{collection.farmers?.name}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(collection.collection_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium">Quantity</p>
                          <p className="text-lg font-semibold text-amber-600">{collection.quantity_liters.toLocaleString()} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium">Price per Liter</p>
                          <p className="text-lg font-semibold text-gray-900">{collection.price_per_liter.toLocaleString()} RWF</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase font-medium">Total Amount</p>
                          <p className="text-xl font-bold text-amber-600">{collection.total_amount.toLocaleString()} RWF</p>
                        </div>
                      </div>
                      
                      {collection.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{collection.notes}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => openViewModal(collection)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => openEditModal(collection)}
                          className="flex items-center space-x-1 text-orange-600 hover:text-orange-800 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(collection.id)}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Collection' : 'Record Milk Collection'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Farmer
                    </label>
                    <select
                      required
                      value={formData.farmer_id}
                      onChange={(e) => handleFarmerChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select a farmer</option>
                      {farmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.id}>
                          {farmer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.collection_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, collection_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (Liters)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.quantity_liters}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_liters: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price per Liter (RWF)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price_per_liter}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_liter: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Payment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Payment Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        required
                        value={formData.payment_method}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">Select payment method</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.payment_method === 'mobile_money' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.mobile_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                          placeholder="e.g., +250788123456"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {formData.payment_method === 'bank_transfer' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Account *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.bank_account}
                          onChange={(e) => setFormData(prev => ({ ...prev, bank_account: e.target.value }))}
                          placeholder="Bank account number or IBAN"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {(formData.payment_method === 'check' || formData.payment_method === 'bank_transfer' || formData.payment_method === 'mobile_money') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reference Number
                        </label>
                        <input
                          type="text"
                          value={formData.reference_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                          placeholder="Transaction/Check/Reference number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any additional notes about this collection..."
                  />
                </div>

                {formData.quantity_liters && formData.price_per_liter && (
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-700">Total Amount:</span>
                        <span className="text-2xl font-bold text-amber-600">
                          {calculateTotal().toLocaleString()} RWF
                        </span>
                      </div>
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isEditing ? 'Update Collection' : 'Record Collection'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedCollection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-2xl font-bold text-gray-900">Collection Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Farmer</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCollection.farmers?.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Collection Date</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedCollection.collection_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Quantity</label>
                    <p className="text-lg font-semibold text-amber-600">
                      {selectedCollection.quantity_liters.toLocaleString()} Liters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Price per Liter</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCollection.price_per_liter.toLocaleString()} RWF
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Total Amount</label>
                    <p className="text-2xl font-bold text-amber-600">
                      {selectedCollection.total_amount.toLocaleString()} RWF
                    </p>
                  </div>

                  {/* Payment Information */}
                  {selectedCollection.payment_method && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {PAYMENT_METHODS.find(m => m.value === selectedCollection.payment_method)?.label}
                        </p>
                      </div>

                      {selectedCollection.mobile_number && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Mobile Number</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedCollection.mobile_number}
                          </p>
                        </div>
                      )}

                      {selectedCollection.bank_account && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Bank Account</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedCollection.bank_account}
                          </p>
                        </div>
                      )}

                      {selectedCollection.reference_number && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Reference Number</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedCollection.reference_number}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedCollection.notes && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {selectedCollection.notes}
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Recorded On</label>
                    <p className="text-gray-700">
                      {new Date(selectedCollection.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowViewModal(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowViewModal(false)
                      openEditModal(selectedCollection)
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Edit Collection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}