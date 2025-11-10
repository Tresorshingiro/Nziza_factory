import { useState, useEffect } from 'react'
import { Search, Plus, Building2, Phone, Mail, MapPin, Edit, Trash2, Eye } from 'lucide-react'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import type { Database } from '../../types/database.types'

type SupplierRow = Database['public']['Tables']['suppliers']['Row']

interface SupplierWithFactory extends SupplierRow {
  factory_name?: string
}

export default function SeniorManagerSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithFactory[]>([])
  const [selectedFactory, setSelectedFactory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState<SupplierWithFactory | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithFactory | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    supplier_code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    supplier_type: '',
    factory_id: '',
    tax_id: '',
    payment_terms: '',
    notes: ''
  })

  const supplierTypes = [
    'Raw Materials',
    'Packaging',
    'Equipment',
    'Maintenance',
    'Transportation',
    'Utilities',
    'Services',
    'Other'
  ]

  useEffect(() => {
    fetchSuppliers()
  }, [selectedFactory])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      
      // First, try to fetch suppliers with factory information
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name')

      // Filter by factory if selected
      if (selectedFactory !== 'all') {
        query = query.eq('factory_id', selectedFactory)
      }

      const { data: suppliersData, error: suppliersError } = await query

      if (suppliersError) {
        console.error('Suppliers query error:', suppliersError)
        throw suppliersError
      }

      if (!suppliersData) {
        setSuppliers([])
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
      const suppliersWithFactory: SupplierWithFactory[] = suppliersData.map((supplier: any) => ({
        ...supplier,
        factory_name: supplier.factory_id ? factoryMap.get(supplier.factory_id) || 'Unknown Factory' : 'No Factory Assigned'
      }))

      setSuppliers(suppliersWithFactory)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to fetch suppliers')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingSupplier) {
        // Update existing supplier
        const updateData: any = {
          name: newSupplier.name,
          supplier_code: newSupplier.supplier_code,
          email: newSupplier.email || null,
          phone: newSupplier.phone,
          address: newSupplier.address || null,
          city: newSupplier.city || null,
          supplier_type: newSupplier.supplier_type,
          factory_id: newSupplier.factory_id || null,
          tax_id: newSupplier.tax_id || null,
          payment_terms: newSupplier.payment_terms || null,
          notes: newSupplier.notes || null,
          updated_at: new Date().toISOString()
        }
        const { error } = await (supabase as any)
          .from('suppliers')
          .update(updateData)
          .eq('id', editingSupplier.id)

        if (error) throw error
        toast.success('Supplier updated successfully')
      } else {
        // Create new supplier
        const insertData: any = {
          name: newSupplier.name,
          supplier_code: newSupplier.supplier_code,
          email: newSupplier.email || null,
          phone: newSupplier.phone,
          address: newSupplier.address || null,
          city: newSupplier.city || null,
          supplier_type: newSupplier.supplier_type,
          factory_id: newSupplier.factory_id || null,
          tax_id: newSupplier.tax_id || null,
          payment_terms: newSupplier.payment_terms || null,
          notes: newSupplier.notes || null,
          is_active: true
        }
        const { error } = await (supabase as any)
          .from('suppliers')
          .insert(insertData)

        if (error) throw error
        toast.success('Supplier created successfully')
      }      // Refresh the suppliers list
      fetchSuppliers()
      setIsCreateModalOpen(false)
      setEditingSupplier(null)
      setNewSupplier({
        name: '',
        supplier_code: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        supplier_type: '',
        factory_id: '',
        tax_id: '',
        payment_terms: '',
        notes: ''
      })
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (supplier: SupplierWithFactory) => {
    setEditingSupplier(supplier)
    setNewSupplier({
      name: supplier.name,
      supplier_code: supplier.supplier_code,
      email: supplier.email || '',
      phone: supplier.phone,
      address: supplier.address || '',
      city: supplier.city || '',
      supplier_type: supplier.supplier_type,
      factory_id: supplier.factory_id || '',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '',
      notes: supplier.notes || ''
    })
    setIsCreateModalOpen(true)
  }

  const handleView = (supplier: SupplierWithFactory) => {
    setViewingSupplier(supplier)
    setIsViewModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        const updateData: any = { is_active: false }
        const { error } = await (supabase as any)
          .from('suppliers')
          .update(updateData)
          .eq('id', id)

        if (error) throw error
        
        toast.success('Supplier deactivated successfully')
        fetchSuppliers()
      } catch (error) {
        console.error('Error deactivating supplier:', error)
        toast.error('Failed to deactivate supplier')
      }
    }
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         supplier.supplier_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || supplier.supplier_type === filterCategory
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && supplier.is_active) ||
                         (filterStatus === 'inactive' && !supplier.is_active)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers Management</h1>
          <p className="text-gray-600">Manage suppliers across all factories</p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FactorySelector
            selectedFactoryId={selectedFactory === 'all' ? null : selectedFactory}
            onFactoryChange={(factoryId) => setSelectedFactory(factoryId || 'all')}
            showAllOption={true}
          />
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {supplierTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => s.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">Code: {supplier.supplier_code}</div>
                        {supplier.tax_id && (
                          <div className="text-sm text-gray-500">Tax ID: {supplier.tax_id}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {supplier.email && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {supplier.email}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {supplier.phone}
                        </div>
                        {supplier.address && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {supplier.city ? `${supplier.address}, ${supplier.city}` : supplier.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                        {supplier.factory_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {supplier.supplier_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        supplier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(supplier)}
                          className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Deactivate"
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
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No suppliers found</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{supplier.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Code: {supplier.supplier_code}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        supplier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3 mb-4">
                    {/* Contact Info */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Contact</p>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span className="break-all">{supplier.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{supplier.phone}</span>
                        </div>
                        {supplier.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {supplier.city ? `${supplier.address}, ${supplier.city}` : supplier.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Business Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Factory</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          {supplier.factory_name}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {supplier.supplier_type}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {(supplier.tax_id || supplier.payment_terms) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {supplier.tax_id && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax ID</p>
                            <p className="text-sm text-gray-700">{supplier.tax_id}</p>
                          </div>
                        )}
                        {supplier.payment_terms && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment Terms</p>
                            <p className="text-sm text-gray-700">{supplier.payment_terms}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-300">
                    <button
                      onClick={() => handleView(supplier)}
                      className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
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

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Code
                </label>
                <input
                  type="text"
                  value={newSupplier.supplier_code}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, supplier_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., SUP001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={newSupplier.city}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Type
                </label>
                <select
                  value={newSupplier.supplier_type}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, supplier_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Type</option>
                  {supplierTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Factory
                </label>
                <FactorySelector
                  selectedFactoryId={newSupplier.factory_id || null}
                  onFactoryChange={(factoryId) => setNewSupplier(prev => ({ ...prev, factory_id: factoryId || '' }))}
                  placeholder="Select Factory"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={newSupplier.tax_id}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, tax_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={newSupplier.payment_terms}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, payment_terms: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Net 30 days"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newSupplier.notes}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setEditingSupplier(null)
                    setNewSupplier({
                      name: '',
                      supplier_code: '',
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      supplier_type: '',
                      factory_id: '',
                      tax_id: '',
                      payment_terms: '',
                      notes: ''
                    })
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
                  {submitting ? 'Saving...' : editingSupplier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Supplier Details</h2>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false)
                    setViewingSupplier(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{viewingSupplier.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier Code</label>
                      <p className="text-sm text-gray-900">{viewingSupplier.supplier_code}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="text-sm text-gray-900">{viewingSupplier.supplier_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        viewingSupplier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingSupplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{viewingSupplier.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{viewingSupplier.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="text-sm text-gray-900">
                        {viewingSupplier.address || 'N/A'}
                        {viewingSupplier.city && `, ${viewingSupplier.city}`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Factory</label>
                      <p className="text-sm text-gray-900">{viewingSupplier.factory_name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                    <p className="text-sm text-gray-900">{viewingSupplier.tax_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                    <p className="text-sm text-gray-900">{viewingSupplier.payment_terms || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingSupplier.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{viewingSupplier.notes}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created At</label>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingSupplier.created_at).toLocaleDateString()} at{' '}
                      {new Date(viewingSupplier.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Updated At</label>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingSupplier.updated_at).toLocaleDateString()} at{' '}
                      {new Date(viewingSupplier.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false)
                    setViewingSupplier(null)
                    handleEdit(viewingSupplier)
                  }}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Edit Supplier
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false)
                    setViewingSupplier(null)
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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