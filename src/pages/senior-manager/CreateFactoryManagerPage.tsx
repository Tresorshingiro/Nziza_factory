import { useState, useEffect, useRef } from 'react'
import { UserPlus, Users, Factory, Mail, Phone, Save, X, Eye, Edit, Trash2, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface FactoryManager {
  id: string
  email: string
  full_name: string
  phone: string | null
  factory_id: string | null
  factory_name?: string
  is_active: boolean
  created_at: string
}

interface NewManagerForm {
  email: string
  full_name: string
  phone: string
  factory_id: string
  password: string
}

export default function CreateFactoryManagerPage() {
  const { user } = useAuthStore()
  
  // Debug: Log user information
  console.log('CreateFactoryManagerPage - User:', user)
  console.log('CreateFactoryManagerPage - User Role:', user?.role)
  
  const [managers, setManagers] = useState<FactoryManager[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFactoryFilter, setSelectedFactoryFilter] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [newManager, setNewManager] = useState<NewManagerForm>({
    email: '',
    full_name: '',
    phone: '',
    factory_id: '',
    password: ''
  })

  useEffect(() => {
    fetchManagers()
  }, [])

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

  const fetchManagers = async () => {
    try {
      setLoading(true)
      
      // Fetch all factory managers
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          phone,
          factory_id,
          is_active,
          created_at,
          factories:factory_id (
            name
          )
        `)
        .eq('role', 'factory_manager')
        .order('created_at', { ascending: false })

      if (error) throw error

      const managersWithFactory: FactoryManager[] = (data || []).map((manager: any) => ({
        id: manager.id,
        email: manager.email,
        full_name: manager.full_name,
        phone: manager.phone,
        factory_id: manager.factory_id,
        factory_name: manager.factories?.name || 'Unassigned',
        is_active: manager.is_active,
        created_at: manager.created_at
      }))

      setManagers(managersWithFactory)
    } catch (error) {
      console.error('Error fetching managers:', error)
      toast.error('Failed to fetch factory managers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newManager.full_name || !newManager.email || !newManager.phone || !newManager.factory_id || !newManager.password) {
      toast.error('All fields including password are required')
      return
    }

    // Basic password validation
    if (newManager.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setSubmitting(true)

    try {
      // Check if user already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', newManager.email)
        .single()

      if (existingUser) {
        toast.error('A user with this email already exists')
        setSubmitting(false)
        return
      }

      // Create user account with the custom password set by senior manager
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newManager.email,
        password: newManager.password, // Use the password set by senior manager
        options: {
          data: {
            full_name: newManager.full_name,
            role: 'factory_manager',
            factory_id: newManager.factory_id
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: newManager.email,
            full_name: newManager.full_name,
            phone: newManager.phone,
            role: 'factory_manager',
            factory_id: newManager.factory_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) throw profileError

        toast.success('Factory Manager created successfully!')
        
        // Reset form and close modal
        setNewManager({
          email: '',
          full_name: '',
          phone: '',
          factory_id: '',
          password: ''
        })
        setIsCreateModalOpen(false)
        fetchManagers() // Refresh the managers list
      }
    } catch (error: any) {
      console.error('Error creating factory manager:', error)
      toast.error(error.message || 'Failed to create factory manager')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (managerId: string) => {
    try {
      const manager = managers.find(m => m.id === managerId)
      if (!manager) return

      const newStatus = !manager.is_active
      
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', managerId)

      if (error) throw error

      setManagers(prev => 
        prev.map(m => 
          m.id === managerId 
            ? { ...m, is_active: newStatus }
            : m
        )
      )
      toast.success(`Manager ${newStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error: any) {
      console.error('Error updating manager status:', error)
      toast.error(error.message || 'Failed to update manager status')
    }
  }



  const handleDelete = async (managerId: string) => {
    if (!confirm('Are you sure you want to delete this factory manager? This action cannot be undone.')) return

    try {
      // First, check if the manager has any associated records that would prevent deletion
      const { data: dependencies, error: depError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          production_batches!supervisor_id(count),
          milk_collections!recorded_by(count),
          expenses!recorded_by(count),
          daily_reports!submitted_by(count)
        `)
        .eq('id', managerId)
        .single()

      if (depError) {
        console.error('Error checking dependencies:', depError)
        // Continue with deletion attempt even if dependency check fails
      }

      // Check if manager has critical dependencies
      const hasDependendies = dependencies && (
        (dependencies.production_batches?.[0]?.count || 0) > 0 ||
        (dependencies.milk_collections?.[0]?.count || 0) > 0 ||
        (dependencies.expenses?.[0]?.count || 0) > 0 ||
        (dependencies.daily_reports?.[0]?.count || 0) > 0
      )

      if (hasDependendies) {
        const confirmForce = confirm(
          `This manager has associated records (production batches, milk collections, etc.). ` +
          `Deleting will remove the manager but keep the records. ` +
          `Do you want to proceed?`
        )
        if (!confirmForce) return
      }

      // Attempt to delete from users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', managerId)

      if (error) {
        console.error('Delete error details:', error)
        
        // Handle specific error cases
        if (error.code === '23503') {
          toast.error('Cannot delete manager: There are records that depend on this manager. Please remove or reassign those records first.')
          return
        } else if (error.code === '42501') {
          toast.error('Permission denied: You do not have sufficient privileges to delete this manager.')
          return
        } else {
          throw error
        }
      }

      // Remove from local state
      setManagers(prev => prev.filter(manager => manager.id !== managerId))
      toast.success('Manager deleted successfully')
    } catch (error: any) {
      console.error('Error deleting manager:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete manager'
      
      if (error.message?.includes('foreign key')) {
        errorMessage = 'Cannot delete manager: There are related records that must be handled first'
      } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
        errorMessage = 'Permission denied: Insufficient privileges to delete this manager'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  const filteredManagers = selectedFactoryFilter 
    ? managers.filter(manager => manager.factory_id === selectedFactoryFilter)
    : managers

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Factory Managers</h1>
          <p className="text-gray-600 mt-1">Create and manage factory manager accounts</p>
        </div>
        
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-700 hover:to-blue-700 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Manager
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Managers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{managers.length}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Managers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {managers.filter(m => m.is_active).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {managers.filter(m => !m.factory_id).length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Factory className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <FactorySelector
                selectedFactoryId={selectedFactoryFilter}
                onFactoryChange={setSelectedFactoryFilter}
                placeholder="Filter by factory"
                showAllOption={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Factory Managers ({filteredManagers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No factory managers found</p>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4"
                variant="outline"
              >
                Create Your First Manager
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 font-medium text-gray-900">Manager</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Factory</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Contact</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Created</th>
                      <th className="py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredManagers.map((manager) => (
                      <tr key={manager.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{manager.full_name}</p>
                            <p className="text-sm text-gray-500">{manager.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Factory className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">
                              {manager.factory_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail className="w-3 h-3" />
                              <span>{manager.email}</span>
                            </div>
                            {manager.phone && (
                              <div className="flex items-center gap-1 text-gray-600 mt-1">
                                <Phone className="w-3 h-3" />
                                <span>{manager.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={manager.is_active ? 'default' : 'secondary'}>
                            {manager.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(manager.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative" ref={openDropdown === manager.id ? dropdownRef : null}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenDropdown(openDropdown === manager.id ? null : manager.id)}
                              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            
                            {openDropdown === manager.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      // View functionality can be added later
                                      setOpenDropdown(null)
                                      toast.info('View functionality coming soon')
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Edit functionality can be added later
                                      setOpenDropdown(null)
                                      toast.info('Edit functionality coming soon')
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Manager
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleToggleStatus(manager.id)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    {manager.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDelete(manager.id)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Manager
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
                {filteredManagers.map((manager) => (
                  <div key={manager.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{manager.full_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Factory className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {manager.factory_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <Badge variant={manager.is_active ? 'default' : 'secondary'}>
                        {manager.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="break-all">{manager.email}</span>
                      </div>
                      {manager.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{manager.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>Created {new Date(manager.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-3 border-t border-gray-300">
                      <div className="relative" ref={openDropdown === `mobile-${manager.id}` ? dropdownRef : null}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOpenDropdown(openDropdown === `mobile-${manager.id}` ? null : `mobile-${manager.id}`)}
                          className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4 mr-2" />
                          Actions
                        </Button>
                        
                        {openDropdown === `mobile-${manager.id}` && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setOpenDropdown(null)
                                  toast.info('View functionality coming soon')
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  setOpenDropdown(null)
                                  toast.info('Edit functionality coming soon')
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Manager
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleStatus(manager.id)
                                  setOpenDropdown(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Users className="w-4 h-4 mr-2" />
                                {manager.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(manager.id)
                                  setOpenDropdown(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Manager
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Manager Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Create Factory Manager</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newManager.full_name}
                  onChange={(e) => setNewManager({ ...newManager, full_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newManager.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newManager.phone}
                  onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                  placeholder="+250 788 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Factory *
                </label>
                <FactorySelector
                  selectedFactoryId={newManager.factory_id}
                  onFactoryChange={(factoryId) => setNewManager({ ...newManager, factory_id: factoryId || '' })}
                  placeholder="Select factory"
                  showAllOption={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={newManager.password}
                  onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                  placeholder="Enter password (min. 8 characters)"
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Manager will be prompted to change password on first login
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-700 hover:to-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? 'Creating...' : 'Create Manager'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}