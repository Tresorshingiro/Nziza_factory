import { useState } from 'react'
import { User, Mail, Phone, Shield, Calendar, Camera, Save, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface ProfileData {
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || null
  })

  const getRoleBadge = () => {
    const roleVariants = {
      main_boss: 'default' as const,
      senior_manager: 'secondary' as const,
      factory_manager: 'destructive' as const,
    }
    
    const roleLabels = {
      main_boss: 'Main Boss',
      senior_manager: 'Senior Manager',
      factory_manager: 'Factory Manager',
    }

    return (
      <Badge variant={roleVariants[user!.role]} className="text-sm">
        {roleLabels[user!.role]}
      </Badge>
    )
  }

  const handleSave = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error }: any = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone || null,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      // Update the auth store with new data
      setUser({ ...user, ...data })
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setProfileData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar_url: user?.avatar_url || null
    })
    setIsEditing(false)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-white text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Camera className="w-3 h-3" />
            </button>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.full_name}</h1>
            <p className="text-white/80 mb-2">{user.email}</p>
            <div className="flex items-center gap-2">
              {getRoleBadge()}
              <Badge variant="outline" className="text-white border-white/30">
                Active
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="secondary"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <p className="text-gray-900">{user.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.phone || ''}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone || 'Not provided'}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              {getRoleBadge()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Factory Assignment
              </label>
              <p className="text-gray-600">
                {user.factory_id ? `Factory ID: ${user.factory_id}` : 'No factory assigned'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Status
              </label>
              <Badge variant={user.is_active ? 'default' : 'destructive'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <p className="text-xs font-mono text-gray-500 break-all">{user.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            Account Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Permissions</h4>
              <div className="space-y-2">
                {Object.keys(user.permissions || {}).length > 0 ? (
                  Object.entries(user.permissions).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                      <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
                        {value ? 'Allowed' : 'Denied'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No specific permissions set</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Security</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Two-Factor Auth</span>
                  <Badge variant="secondary">Not Enabled</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Login</span>
                  <span className="text-gray-900">Today</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password</span>
                  <Button variant="outline" size="sm">Change</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}