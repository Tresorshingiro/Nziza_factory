import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Pagination } from '../../components/ui/pagination'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Package,
  Users,
  Truck,
  Building,
  X
} from 'lucide-react'

// Types
interface Supplier {
  id: string
  name: string
  supplier_code: string
  email?: string
  phone: string
  address?: string
  city?: string
  supplier_type: string
  tax_id?: string
  payment_terms?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

// Supplier types
const SUPPLIER_TYPES = [
  'Farmer',
  'Equipment Supplier',
  'Packaging Supplier',
  'Chemical Supplier',
  'Feed Supplier',
  'Maintenance Service',
  'Transport Service',
  'Utilities',
  'Professional Service',
  'Other'
]

const PAYMENT_TERMS = [
  'Cash on Delivery (COD)',
  'Net 15 Days',
  'Net 30 Days',
  'Net 60 Days',
  'Monthly',
  'Weekly',
  'Daily'
]

export default function SuppliersPage() {
  const { user } = useAuthStore()
  
  // State management
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    farmerSuppliers: 0,
    otherSuppliers: 0,
    lastUpdated: new Date()
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    supplier_code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    supplier_type: '',
    tax_id: '',
    payment_terms: '',
    notes: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadSuppliers()
  }, [])

  // Calculate analytics whenever suppliers change
  useEffect(() => {
    calculateAnalytics()
  }, [suppliers])

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = () => {
    const totalSuppliers = suppliers.length
    const activeSuppliers = suppliers.filter(s => s.is_active).length
    const farmerSuppliers = suppliers.filter(s => s.supplier_type === 'Farmer').length
    const otherSuppliers = suppliers.filter(s => s.supplier_type !== 'Farmer').length

    setAnalytics({
      totalSuppliers,
      activeSuppliers,
      farmerSuppliers,
      otherSuppliers,
      lastUpdated: new Date()
    })
  }

  const generateSupplierCode = (name: string, type: string) => {
    const prefix = type === 'Farmer' ? 'FARM' : 'SUPP'
    const namePart = name.replace(/\s+/g, '').toUpperCase().substring(0, 4)
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}-${namePart}${randomNum}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      setLoading(true)
      
      const supplierData = {
        name: formData.name,
        supplier_code: formData.supplier_code || generateSupplierCode(formData.name, formData.supplier_type),
        email: formData.email || null,
        phone: formData.phone,
        address: formData.address || null,
        city: formData.city || null,
        supplier_type: formData.supplier_type,
        tax_id: formData.tax_id || null,
        payment_terms: formData.payment_terms || null,
        is_active: true,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      }

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData])

        if (error) throw error
      }

      await loadSuppliers()
      setShowForm(false)
      setEditingSupplier(null)
      resetForm()
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert('Error saving supplier. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (supplierId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId)

      if (error) throw error
      await loadSuppliers()
    } catch (error) {
      console.error('Error updating supplier status:', error)
      alert('Error updating supplier status. Please try again.')
    }
  }

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)

      if (error) throw error
      await loadSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      alert('Error deleting supplier. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      supplier_code: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      supplier_type: '',
      tax_id: '',
      payment_terms: '',
      notes: ''
    })
  }

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      supplier_code: supplier.supplier_code,
      email: supplier.email || '',
      phone: supplier.phone,
      address: supplier.address || '',
      city: supplier.city || '',
      supplier_type: supplier.supplier_type,
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '',
      notes: supplier.notes || ''
    })
    setShowForm(true)
  }

  const openViewModal = (supplier: Supplier) => {
    setViewingSupplier(supplier)
    setIsViewModalOpen(true)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Farmer': return 'bg-green-100 text-green-800'
      case 'Equipment Supplier': return 'bg-blue-100 text-blue-800'
      case 'Packaging Supplier': return 'bg-purple-100 text-purple-800'
      case 'Chemical Supplier': return 'bg-orange-100 text-orange-800'
      case 'Transport Service': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplier_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplier_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone.includes(searchTerm)
    
    const matchesType = typeFilter === 'all' || supplier.supplier_type === typeFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && supplier.is_active) ||
      (statusFilter === 'inactive' && !supplier.is_active)
    
    return matchesSearch && matchesType && matchesStatus
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, statusFilter])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage suppliers and vendor relationships</p>
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {analytics.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold">{analytics.totalSuppliers}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Suppliers</p>
              <p className="text-2xl font-bold text-green-600">{analytics.activeSuppliers}</p>
            </div>
            <Building className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Farmer Suppliers</p>
              <p className="text-2xl font-bold text-amber-600">{analytics.farmerSuppliers}</p>
            </div>
            <Users className="w-8 h-8 text-amber-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Other Suppliers</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.otherSuppliers}</p>
            </div>
            <Truck className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {SUPPLIER_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.email || 'No email'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {supplier.supplier_code}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeColor(supplier.supplier_type)}`}>
                      {supplier.supplier_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{supplier.phone}</div>
                    <div className="text-sm text-gray-500">{supplier.city || 'No city'}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplier.payment_terms || 'Not set'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={`text-xs font-semibold px-2 py-1 rounded-full ${supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {supplier.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewModal(supplier)}
                        className="p-2"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(supplier)}
                        className="p-2"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(supplier.id, supplier.is_active)}
                        className={`p-2 ${supplier.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                      >
                        {supplier.is_active ? '🚫' : '✅'}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No suppliers found matching your criteria.
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {filteredSuppliers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredSuppliers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      )}

      {/* Add/Edit Supplier Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code</label>
                  <input
                    type="text"
                    value={formData.supplier_code}
                    onChange={(e) => setFormData({...formData, supplier_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.supplier_type}
                    onChange={(e) => setFormData({...formData, supplier_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select type</option>
                    {SUPPLIER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select payment terms</option>
                    {PAYMENT_TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Add Supplier')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingSupplier(null)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Supplier Modal */}
      {isViewModalOpen && viewingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Supplier Details</h2>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Supplier Name</label>
                  <p className="text-lg font-semibold">{viewingSupplier.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Supplier Code</label>
                  <p className="font-mono">{viewingSupplier.supplier_code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Type</label>
                  <Badge className={`${getTypeColor(viewingSupplier.supplier_type)} text-xs px-2 py-1 rounded-full`}>
                    {viewingSupplier.supplier_type}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <Badge className={`text-xs px-2 py-1 rounded-full ${viewingSupplier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {viewingSupplier.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p>{viewingSupplier.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p>{viewingSupplier.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">City</label>
                  <p>{viewingSupplier.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Terms</label>
                  <p>{viewingSupplier.payment_terms || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tax ID</label>
                  <p>{viewingSupplier.tax_id || 'N/A'}</p>
                </div>
              </div>

              {viewingSupplier.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Address</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{viewingSupplier.address}</p>
                </div>
              )}

              {viewingSupplier.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{viewingSupplier.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p>{new Date(viewingSupplier.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p>{new Date(viewingSupplier.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                onClick={() => {
                  setIsViewModalOpen(false)
                  openEditModal(viewingSupplier)
                }}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Supplier
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsViewModalOpen(false)}
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}