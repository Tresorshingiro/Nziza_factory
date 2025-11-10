import { useState, useEffect } from 'react'
import { Factory, Plus, Edit, Eye, Trash2, MapPin, Mail, Phone, Save, X, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface FactoryData {
  id: string
  name: string
  code: string
  location: string
  address: string | null
  phone: string | null
  email: string | null
  status: 'active' | 'frozen'
  capacity: number | null
  notes: string | null
  created_at: string
}

interface NewFactoryForm {
  name: string
  code: string
  location: string
  address: string
  phone: string
  email: string
  capacity: string
  notes: string
}

export default function FactoriesPage() {
  const [factories, setFactories] = useState<FactoryData[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingFactory, setEditingFactory] = useState<FactoryData | null>(null)
  
  const [formData, setFormData] = useState<NewFactoryForm>({
    name: '',
    code: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    capacity: '',
    notes: ''
  })

  useEffect(() => {
    fetchFactories()
  }, [])

  const fetchFactories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('factories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFactories(data || [])
    } catch (error) {
      console.error('Error fetching factories:', error)
      toast.error('Failed to fetch factories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const factoryData = {
        name: formData.name,
        code: formData.code,
        location: formData.location,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        notes: formData.notes || null,
        status: 'active' as const
      }

      if (editingFactory) {
        // Update existing factory
        const { error } = await supabase
          .from('factories')
          .update(factoryData)
          .eq('id', editingFactory.id)

        if (error) throw error
        toast.success('Factory updated successfully')
      } else {
        // Create new factory
        const { error } = await supabase
          .from('factories')
          .insert([factoryData])

        if (error) throw error
        toast.success('Factory created successfully')
      }

      setIsModalOpen(false)
      setEditingFactory(null)
      setFormData({
        name: '',
        code: '',
        location: '',
        address: '',
        phone: '',
        email: '',
        capacity: '',
        notes: ''
      })
      fetchFactories()
    } catch (error: any) {
      console.error('Error saving factory:', error)
      toast.error(error.message || 'Failed to save factory')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (factory: FactoryData) => {
    setEditingFactory(factory)
    setFormData({
      name: factory.name,
      code: factory.code,
      location: factory.location,
      address: factory.address || '',
      phone: factory.phone || '',
      email: factory.email || '',
      capacity: factory.capacity?.toString() || '',
      notes: factory.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (factoryId: string) => {
    if (!confirm('Are you sure you want to delete this factory?')) return

    try {
      const { error } = await supabase
        .from('factories')
        .delete()
        .eq('id', factoryId)

      if (error) throw error
      toast.success('Factory deleted successfully')
      fetchFactories()
    } catch (error: any) {
      console.error('Error deleting factory:', error)
      toast.error(error.message || 'Failed to delete factory')
    }
  }

  const handleToggleStatus = async (factory: FactoryData) => {
    try {
      const newStatus = factory.status === 'active' ? 'frozen' : 'active'
      const { error } = await supabase
        .from('factories')
        .update({ status: newStatus })
        .eq('id', factory.id)

      if (error) throw error
      toast.success(`Factory ${newStatus === 'active' ? 'activated' : 'frozen'} successfully`)
      fetchFactories()
    } catch (error: any) {
      console.error('Error toggling status:', error)
      toast.error(error.message || 'Failed to update factory status')
    }
  }

  const openCreateModal = () => {
    setEditingFactory(null)
    setFormData({
      name: '',
      code: '',
      location: '',
      address: '',
      phone: '',
      email: '',
      capacity: '',
      notes: ''
    })
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Factory Management</h1>
          <p className="text-gray-600 mt-1">Manage all factory locations and operations</p>
        </div>
        
        <Button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Factory
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Factories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{factories.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Factories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {factories.filter(f => f.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Factory className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Frozen Factories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {factories.filter(f => f.status === 'frozen').length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Factory className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-amber-600" />
            All Factories ({factories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : factories.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No factories found</p>
              <Button onClick={openCreateModal} variant="outline">
                Create Your First Factory
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 font-medium text-gray-900">Factory</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Code</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Location</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Contact</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Capacity</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {factories.map((factory) => (
                      <tr key={factory.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                              factory.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <Factory className={`w-4 h-4 ${
                                factory.status === 'active' ? 'text-green-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{factory.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-gray-600">{factory.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-3 h-3" />
                            <span>{factory.location}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {factory.phone && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="w-3 h-3" />
                                <span>{factory.phone}</span>
                              </div>
                            )}
                            {factory.email && (
                              <div className="flex items-center gap-1 text-gray-600 mt-1">
                                <Mail className="w-3 h-3" />
                                <span>{factory.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {factory.capacity ? `${factory.capacity.toLocaleString()} L/day` : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={factory.status === 'active' ? 'default' : 'secondary'}>
                            {factory.status === 'active' ? 'Active' : 'Frozen'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(factory)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleToggleStatus(factory)}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs px-2"
                            >
                              {factory.status === 'active' ? 'Freeze' : 'Activate'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(factory.id)}
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

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {factories.map((factory) => (
                  <div key={factory.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          factory.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Factory className={`w-5 h-5 ${
                            factory.status === 'active' ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">{factory.name}</h3>
                          <p className="text-sm text-gray-500 font-mono">{factory.code}</p>
                        </div>
                      </div>
                      <Badge variant={factory.status === 'active' ? 'default' : 'secondary'}>
                        {factory.status === 'active' ? 'Active' : 'Frozen'}
                      </Badge>
                    </div>

                    {/* Factory Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{factory.location}</span>
                      </div>
                      
                      {factory.capacity && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          <span>Capacity: {factory.capacity.toLocaleString()} L/day</span>
                        </div>
                      )}

                      {factory.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{factory.phone}</span>
                        </div>
                      )}

                      {factory.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="break-all">{factory.email}</span>
                        </div>
                      )}

                      {factory.address && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Address: </span>
                          <span>{factory.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-300">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(factory)}
                        className="flex-1 min-w-[70px] bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleToggleStatus(factory)}
                        className="flex-1 min-w-[90px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                      >
                        <span className="text-xs">
                          {factory.status === 'active' ? 'Freeze' : 'Activate'}
                        </span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(factory.id)}
                        className="flex-1 min-w-[80px] bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Factory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingFactory ? 'Edit Factory' : 'Add New Factory'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factory Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., NZIZA North Factory"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factory Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., NZA-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., Kigali, Rwanda"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Capacity (Liters)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., 5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="+250 788 123 456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="factory@nziza.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Physical Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter full address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Additional notes about this factory"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? 'Saving...' : editingFactory ? 'Update Factory' : 'Create Factory'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
