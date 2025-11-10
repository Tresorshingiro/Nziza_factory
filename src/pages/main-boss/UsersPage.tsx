import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Building2, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle,
  Crown,
  Star,
  Briefcase,
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  email: string
  full_name: string
  role: 'main_boss' | 'senior_manager' | 'factory_manager'
  factory_id: string | null
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  is_active: boolean
}

interface Factory {
  id: string
  name: string
  code: string
  location: string
}

interface UserStats {
  totalUsers: number
  mainBossCount: number
  seniorManagerCount: number
  factoryManagerCount: number
  activeUsers: number
  inactiveUsers: number
  recentlyCreated: number
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [factories, setFactories] = useState<Factory[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    mainBossCount: 0,
    seniorManagerCount: 0,
    factoryManagerCount: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    recentlyCreated: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [factoryFilter, setFactoryFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    full_name: '',
    role: 'factory_manager' as User['role'],
    factory_id: '',
    password: ''
  })

  const [editUserForm, setEditUserForm] = useState({
    email: '',
    full_name: '',
    role: 'factory_manager' as User['role'],
    factory_id: '',
    is_active: true
  })

  useEffect(() => {
    fetchUsersData()
    fetchFactories()
  }, [])

  const fetchUsersData = async () => {
    setLoading(true)
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        toast.error('Failed to fetch users')
        return
      }

      setUsers(usersData || [])
      calculateUserStats(usersData || [])
    } catch (error) {
      console.error('Error fetching users data:', error)
      toast.error('Failed to load users data')
    } finally {
      setLoading(false)
    }
  }

  const fetchFactories = async () => {
    try {
      const { data: factoriesData, error } = await supabase
        .from('factories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching factories:', error)
        return
      }

      setFactories(factoriesData || [])
    } catch (error) {
      console.error('Error fetching factories:', error)
    }
  }

  const calculateUserStats = (usersData: User[]) => {
    const stats = usersData.reduce((acc, user) => {
      acc.totalUsers++
      if (user.role === 'main_boss') acc.mainBossCount++
      if (user.role === 'senior_manager') acc.seniorManagerCount++
      if (user.role === 'factory_manager') acc.factoryManagerCount++
      if (user.is_active) acc.activeUsers++
      else acc.inactiveUsers++
      
      // Check if created in last 7 days
      const createdDate = new Date(user.created_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      if (createdDate > weekAgo) acc.recentlyCreated++
      
      return acc
    }, {
      totalUsers: 0,
      mainBossCount: 0,
      seniorManagerCount: 0,
      factoryManagerCount: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      recentlyCreated: 0
    })

    setUserStats(stats)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createUserForm.email || !createUserForm.full_name || !createUserForm.password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (createUserForm.role === 'factory_manager' && !createUserForm.factory_id) {
      toast.error('Please select a factory for factory manager role')
      return
    }

    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createUserForm.email,
        password: createUserForm.password,
        options: {
          data: {
            full_name: createUserForm.full_name,
            role: createUserForm.role
          }
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        toast.error(`Failed to create user: ${authError.message}`)
        return
      }

      // Insert user into users table
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user?.id,
            email: createUserForm.email,
            full_name: createUserForm.full_name,
            role: createUserForm.role,
            factory_id: createUserForm.role === 'factory_manager' ? createUserForm.factory_id : null,
            is_active: true
          }
        ])

      if (insertError) {
        console.error('Insert error:', insertError)
        toast.error(`Failed to save user data: ${insertError.message}`)
        return
      }

      toast.success('User created successfully!')
      setShowCreateModal(false)
      setCreateUserForm({
        email: '',
        full_name: '',
        role: 'factory_manager',
        factory_id: '',
        password: ''
      })
      await fetchUsersData()
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Failed to create user')
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser || !editUserForm.email || !editUserForm.full_name) {
      toast.error('Please fill in all required fields')
      return
    }

    if (editUserForm.role === 'factory_manager' && !editUserForm.factory_id) {
      toast.error('Please select a factory for factory manager role')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          email: editUserForm.email,
          full_name: editUserForm.full_name,
          role: editUserForm.role,
          factory_id: editUserForm.role === 'factory_manager' ? editUserForm.factory_id : null,
          is_active: editUserForm.is_active
        })
        .eq('id', selectedUser.id)

      if (error) {
        console.error('Update error:', error)
        toast.error(`Failed to update user: ${error.message}`)
        return
      }

      toast.success('User updated successfully!')
      setShowEditModal(false)
      setSelectedUser(null)
      await fetchUsersData()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) {
        console.error('Toggle status error:', error)
        toast.error(`Failed to ${!currentStatus ? 'activate' : 'deactivate'} user`)
        return
      }

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      await fetchUsersData()
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Delete error:', error)
        toast.error(`Failed to delete user: ${error.message}`)
        return
      }

      toast.success('User deleted successfully')
      await fetchUsersData()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditUserForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      factory_id: user.factory_id || '',
      is_active: user.is_active
    })
    setShowEditModal(true)
  }

  const refreshUsers = async () => {
    setRefreshing(true)
    await fetchUsersData()
    setRefreshing(false)
    toast.success('Users refreshed successfully')
  }

  const getRoleBadge = (role: User['role']) => {
    const roleConfig = {
      main_boss: { label: 'Main Boss', color: 'bg-purple-100 text-purple-800', icon: Crown },
      senior_manager: { label: 'Senior Manager', color: 'bg-blue-100 text-blue-800', icon: Star },
      factory_manager: { label: 'Factory Manager', color: 'bg-green-100 text-green-800', icon: Briefcase }
    }

    const config = roleConfig[role]
    const Icon = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getFactoryName = (factoryId: string | null) => {
    if (!factoryId) return 'N/A'
    const factory = factories.find(f => f.id === factoryId)
    return factory ? factory.name : 'Unknown Factory'
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesFactory = factoryFilter === 'all' || user.factory_id === factoryFilter
    
    return matchesSearch && matchesRole && matchesFactory
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User & Performance Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage users, roles, and system performance monitoring</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={refreshUsers}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Users</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{userStats.totalUsers}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Active Users</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{userStats.activeUsers}</p>
              </div>
              <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Factory Managers</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{userStats.factoryManagerCount}</p>
              </div>
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Recent Users</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{userStats.recentlyCreated}</p>
              </div>
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">User Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Main Boss</p>
                  <p className="text-2xl font-bold text-purple-900">{userStats.mainBossCount}</p>
                  <p className="text-xs text-purple-600">Full system access</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Senior Managers</p>
                  <p className="text-2xl font-bold text-blue-900">{userStats.seniorManagerCount}</p>
                  <p className="text-xs text-blue-600">Manage users & reports</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Factory Managers</p>
                  <p className="text-2xl font-bold text-green-900">{userStats.factoryManagerCount}</p>
                  <p className="text-xs text-green-600">Factory operations</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filters:</span>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm w-full sm:w-64"
              />
            </div>
            
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            >
              <option value="all">All Roles</option>
              <option value="main_boss">Main Boss</option>
              <option value="senior_manager">Senior Manager</option>
              <option value="factory_manager">Factory Manager</option>
            </select>
            
            <select 
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            >
              <option value="all">All Factories</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>
                  {factory.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              All Users ({filteredUsers.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || roleFilter !== 'all' || factoryFilter !== 'all' 
                  ? 'No users match your current filters.' 
                  : 'No users have been created yet.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factory
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-amber-700 font-semibold text-sm">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getFactoryName(user.factory_id)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge className={user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        }>
                          {user.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-50"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                            className={`p-1 rounded ${
                              user.is_active 
                                ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                                : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                            }`}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          
                          {user.role !== 'main_boss' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={createUserForm.full_name}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  minLength={6}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm(prev => ({ 
                    ...prev, 
                    role: e.target.value as User['role'],
                    factory_id: e.target.value !== 'factory_manager' ? '' : prev.factory_id
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="factory_manager">Factory Manager</option>
                  <option value="senior_manager">Senior Manager</option>
                  <option value="main_boss">Main Boss</option>
                </select>
              </div>
              
              {createUserForm.role === 'factory_manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factory *
                  </label>
                  <select
                    value={createUserForm.factory_id}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, factory_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Factory</option>
                    {factories.map(factory => (
                      <option key={factory.id} value={factory.id}>
                        {factory.name} - {factory.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editUserForm.full_name}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm(prev => ({ 
                    ...prev, 
                    role: e.target.value as User['role'],
                    factory_id: e.target.value !== 'factory_manager' ? '' : prev.factory_id
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="factory_manager">Factory Manager</option>
                  <option value="senior_manager">Senior Manager</option>
                  <option value="main_boss">Main Boss</option>
                </select>
              </div>
              
              {editUserForm.role === 'factory_manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factory *
                  </label>
                  <select
                    value={editUserForm.factory_id}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, factory_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Factory</option>
                    {factories.map(factory => (
                      <option key={factory.id} value={factory.id}>
                        {factory.name} - {factory.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editUserForm.is_active}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active User</span>
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
