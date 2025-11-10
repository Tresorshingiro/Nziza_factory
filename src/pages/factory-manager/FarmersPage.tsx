import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Pagination } from '../../components/ui/pagination'
import toast from 'react-hot-toast'
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  DollarSign, 
  Users, 
  TrendingUp,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Farmer {
  id: string
  name: string
  factory_id: string
  phone: string | null
  address: string | null
  bank_account: string | null
  current_milk_price: number
  payment_frequency: 'weekly' | 'monthly'
  is_active: boolean
  total_supplied: number
  total_paid: number
  balance: number
  created_at: string
  updated_at: string
}

export default function FarmersPage() {
  const { user } = useAuthStore()
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    bank_account: '',
    current_milk_price: '0',
    payment_frequency: 'monthly' as 'weekly' | 'monthly',
    is_active: true
  })

  const fetchFarmers = useCallback(async () => {
    try {
      setLoading(true)
      const query = supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false })

      // If factory manager, only show farmers from their factory
      if (user?.role === 'factory_manager' && user.factory_id) {
        query.eq('factory_id', user.factory_id)
      }

      const { data, error } = await query

      if (error) throw error
      setFarmers(data || [])
    } catch (error: any) {
      console.error('Error fetching farmers:', error)
      toast.error('Failed to load farmers')
    } finally {
      setLoading(false)
    }
  }, [user?.role, user?.factory_id])

  // Fetch farmers
  useEffect(() => {
    if (user?.id) {
      fetchFarmers()
    }
  }, [fetchFarmers, user?.id])

  // Filter farmers
  const filteredFarmers = farmers.filter(farmer =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedFarmers = filteredFarmers.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Calculate stats
  const stats = {
    total: farmers.length,
    active: farmers.filter(f => f.is_active).length,
    totalBalance: farmers.reduce((sum, f) => sum + Number(f.balance), 0),
    totalSupplied: farmers.reduce((sum, f) => sum + Number(f.total_supplied), 0)
  }

  // Handle add/edit farmer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const farmerData = {
        ...formData,
        current_milk_price: parseFloat(formData.current_milk_price),
        factory_id: user?.factory_id,
      }

      if (isEditing && selectedFarmer) {
        const { error } = await supabase
          .from('farmers')
          .update(farmerData as any)
          .eq('id', selectedFarmer.id)

        if (error) throw error
        toast.success('Farmer updated successfully')
      } else {
        const { error } = await supabase
          .from('farmers')
          .insert([farmerData as any])

        if (error) throw error
        toast.success('Farmer added successfully')
      }

      setShowAddModal(false)
      resetForm()
      fetchFarmers()
    } catch (error: any) {
      console.error('Error saving farmer:', error)
      toast.error(error.message || 'Failed to save farmer')
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return

    try {
      const { error } = await supabase
        .from('farmers')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Farmer deleted successfully')
      fetchFarmers()
    } catch (error: any) {
      console.error('Error deleting farmer:', error)
      toast.error('Failed to delete farmer')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      bank_account: '',
      current_milk_price: '0',
      payment_frequency: 'monthly',
      is_active: true
    })
    setIsEditing(false)
    setSelectedFarmer(null)
  }

  // Open edit modal
  const openEditModal = (farmer: Farmer) => {
    setSelectedFarmer(farmer)
    setFormData({
      name: farmer.name,
      phone: farmer.phone || '',
      address: farmer.address || '',
      bank_account: farmer.bank_account || '',
      current_milk_price: farmer.current_milk_price.toString(),
      payment_frequency: farmer.payment_frequency,
      is_active: farmer.is_active
    })
    setIsEditing(true)
    setShowAddModal(true)
  }

  // Open view modal
  const openViewModal = (farmer: Farmer) => {
    setSelectedFarmer(farmer)
    setShowViewModal(true)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Farmer Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage farmers, milk pricing, and payments</p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Farmer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Farmers</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{stats.total}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Active Farmers</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 text-green-600">{stats.active}</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Balance Due</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold mt-1 sm:mt-2 text-red-600">
                  {stats.totalBalance.toLocaleString()} RWF
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Supplied</p>
                <p className="text-2xl font-bold mt-2">{stats.totalSupplied.toLocaleString()} L</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search farmers by name or phone..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farmers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Farmer List ({filteredFarmers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading farmers...</p>
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No farmers found</p>
              <Button 
                onClick={() => setShowAddModal(true)}
                variant="outline"
                className="mt-4"
              >
                Add Your First Farmer
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/L</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Supplied</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedFarmers.map((farmer) => (
                      <tr key={farmer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{farmer.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {farmer.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {farmer.current_milk_price} RWF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={
                            farmer.payment_frequency === 'weekly' ? 'default' :
                            farmer.payment_frequency === 'monthly' ? 'secondary' : 'outline'
                          }>
                            {farmer.payment_frequency}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {farmer.total_supplied.toLocaleString()} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${farmer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {farmer.balance.toLocaleString()} RWF
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={farmer.is_active ? 'success' : 'destructive'}>
                            {farmer.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => openViewModal(farmer)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(farmer)}
                            className="text-amber-600 hover:text-amber-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(farmer.id)}
                            className="text-red-600 hover:text-red-800"
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
                {paginatedFarmers.map((farmer) => (
                  <div key={farmer.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 text-lg">{farmer.name}</h3>
                        <p className="text-sm text-gray-600">{farmer.phone || 'No phone'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={farmer.is_active ? 'success' : 'destructive'}>
                          {farmer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Price per Liter</p>
                        <p className="text-lg font-semibold text-green-600">{farmer.current_milk_price} RWF</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Payment Frequency</p>
                        <Badge variant={
                          farmer.payment_frequency === 'weekly' ? 'default' :
                          farmer.payment_frequency === 'monthly' ? 'secondary' : 'outline'
                        } className="mt-1">
                          {farmer.payment_frequency}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Supplied</p>
                        <p className="text-sm font-medium">{farmer.total_supplied.toLocaleString()} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Balance</p>
                        <p className={`text-sm font-medium ${farmer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {farmer.balance.toLocaleString()} RWF
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openViewModal(farmer)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => openEditModal(farmer)}
                        className="flex items-center space-x-1 text-amber-600 hover:text-amber-800 text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(farmer.id)}
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

      {/* Pagination */}
      {filteredFarmers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredFarmers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Farmer' : 'Add New Farmer'}
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Farmer Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter farmer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+250 788 123 456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Account
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="Bank account number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Milk Price per Liter (RWF) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formData.current_milk_price}
                    onChange={(e) => setFormData({ ...formData, current_milk_price: e.target.value })}
                    placeholder="250"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Frequency *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formData.payment_frequency}
                    onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as 'weekly' | 'monthly' })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-2 border-gray-300 text-amber-500 focus:ring-amber-500"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Active Farmer</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isEditing ? 'Update Farmer' : 'Add Farmer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Farmer Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
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
                    <p className="text-sm text-gray-500">Farmer Name</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedFarmer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={selectedFarmer.is_active ? 'success' : 'destructive'} className="mt-1">
                      {selectedFarmer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedFarmer.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bank Account</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedFarmer.bank_account || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedFarmer.address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Milk Price per Liter</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{selectedFarmer.current_milk_price.toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Frequency</p>
                    <Badge variant="outline" className="mt-1">
                      {selectedFarmer.payment_frequency}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Supply & Payment Stats */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">Total Supplied</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{selectedFarmer.total_supplied.toLocaleString()} L</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700">Total Paid</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{selectedFarmer.total_paid.toLocaleString()} RWF</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg col-span-2">
                    <p className="text-sm text-red-700">Current Balance</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">{selectedFarmer.balance.toLocaleString()} RWF</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created At</p>
                    <p className="text-gray-900 mt-1">{new Date(selectedFarmer.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-gray-900 mt-1">{new Date(selectedFarmer.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false)
                    openEditModal(selectedFarmer)
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Farmer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
