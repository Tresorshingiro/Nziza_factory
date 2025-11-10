import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  User, 
  Eye, 
  Edit, 
  Camera,
  Download
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Database } from '../../types/database.types'
import toast, { Toaster } from 'react-hot-toast'

type Employee = Database['public']['Tables']['employees']['Row'] & {
  avatar_url?: string
}

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Form state for adding new employee
  const [newEmployee, setNewEmployee] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hire_date: '',
    salary: '',
    bank_account: '',
    id_number: '',
    address: '',
    emergency_contact: '',
    avatar_url: ''
  })

  const departments = [
    'Production',
    'Quality Control',
    'Administration',
    'Sales & Marketing',
    'Maintenance',
    'Security',
    'Finance'
  ]

  useEffect(() => {
    if (user?.factory_id) {
      fetchEmployees()
      generateEmployeeCode()
    }
  }, [user])

  const generateEmployeeCode = () => {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const code = `EMP${randomNum}`
    setNewEmployee(prev => ({ ...prev, employee_code: code }))
  }

  const handleImageUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Image size should be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64String = e.target?.result as string
      setImagePreview(base64String)
      setNewEmployee(prev => ({ ...prev, avatar_url: base64String }))
    }
    reader.readAsDataURL(file)
    setSelectedFile(file)
  }

  const resetImageUpload = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setNewEmployee(prev => ({ ...prev, avatar_url: '' }))
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      if (!user?.factory_id) {
        console.error('No factory_id found for user')
        setLoading(false)
        return
      }
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('factory_id', user.factory_id)
        .order('created_at', { ascending: false })

      if (employeesError) {
        console.error('Error fetching employees:', employeesError)
        toast.error('Failed to fetch employees')
        setLoading(false)
        return
      }

      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const loadingToast = toast.loading('Adding employee...')
    
    try {
      if (!user?.factory_id) {
        toast.error('No factory selected. Please make sure you are logged in properly.', { id: loadingToast })
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([{
          ...newEmployee,
          factory_id: user.factory_id,
          salary: parseFloat(newEmployee.salary) || 0
        }] as any)
        .select()

      if (error) {
        console.error('Error adding employee:', error)
        toast.error(`Error adding employee: ${error.message}`, { id: loadingToast })
        return
      }

      console.log('Employee added successfully:', data)
      toast.success('Employee added successfully!', { id: loadingToast })
      
      // Reset form and close modal
      setNewEmployee({
        employee_code: '',
        full_name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        hire_date: '',
        salary: '',
        bank_account: '',
        id_number: '',
        address: '',
        emergency_contact: '',
        avatar_url: ''
      })
      resetImageUpload()
      generateEmployeeCode()
      setShowAddModal(false)
      fetchEmployees()
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error('Failed to add employee. Please try again.', { id: loadingToast })
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
        Inactive
      </span>
    )
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && emp.is_active) ||
                         (statusFilter === 'inactive' && !emp.is_active)
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
        </div>
        <p className="text-gray-600">Manage your workforce effectively</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{employees.filter(emp => emp.is_active).length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <User className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-purple-600">{departments.length}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-amber-600">
                {employees.filter(emp => {
                  const hireDate = new Date(emp.hire_date)
                  const currentMonth = new Date().getMonth()
                  const currentYear = new Date().getFullYear()
                  return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear
                }).length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <Plus className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => {
                generateEmployeeCode()
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {employee.avatar_url ? (
                          <img
                            src={employee.avatar_url}
                            alt={employee.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.position}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(employee.hire_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(employee.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee)
                          setShowDetailsModal(true)
                        }}
                        className="text-amber-600 hover:text-amber-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No employees found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add New Employee</h3>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {/* Image Upload */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <label className="block">
                    <span className="sr-only">Choose photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-amber-50 file:text-amber-700
                        hover:file:bg-amber-100"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={resetImageUpload}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={newEmployee.employee_code}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, employee_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={newEmployee.hire_date}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, hire_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, salary: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <input
                    type="text"
                    value={newEmployee.bank_account}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, bank_account: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={newEmployee.id_number}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, id_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={newEmployee.address}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={newEmployee.emergency_contact}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetImageUpload()
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Employee Details</h3>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-full overflow-hidden">
                  {selectedEmployee.avatar_url ? (
                    <img
                      src={selectedEmployee.avatar_url}
                      alt={selectedEmployee.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                      <User className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedEmployee.full_name}</h4>
                  <p className="text-gray-600">{selectedEmployee.position}</p>
                  <p className="text-sm text-gray-500">{selectedEmployee.employee_code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Contact Information</h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Email:</span> {selectedEmployee.email}</p>
                    <p><span className="text-gray-600">Phone:</span> {selectedEmployee.phone}</p>
                    <p><span className="text-gray-600">Address:</span> {selectedEmployee.address}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Employment Details</h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Department:</span> {selectedEmployee.department}</p>
                    <p><span className="text-gray-600">Hire Date:</span> {new Date(selectedEmployee.hire_date).toLocaleDateString()}</p>
                    <p><span className="text-gray-600">Status:</span> {getStatusBadge(selectedEmployee.is_active)}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Financial Information</h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Salary:</span> RWF {selectedEmployee.salary?.toLocaleString()}</p>
                    <p><span className="text-gray-600">Bank Account:</span> {selectedEmployee.bank_account}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Other Details</h5>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">ID Number:</span> {selectedEmployee.id_number}</p>
                    <p><span className="text-gray-600">Emergency Contact:</span> {selectedEmployee.emergency_contact}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  onLeave: number
  absent: number
  lateToday: number
}

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    absent: 0,
    lateToday: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null)
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showMonthlyAttendance, setShowMonthlyAttendance] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<any[]>([])
  const [loadingMonthlyData, setLoadingMonthlyData] = useState(false)

  // Form state for adding new employee
  const [newEmployee, setNewEmployee] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hire_date: '',
    salary: '',
    bank_account: '',
    id_number: '',
    address: '',
    emergency_contact: '',
    avatar_url: ''
  })

  const departments = [
    'Production',
    'Quality Control',
    'Administration',
    'Sales & Marketing',
    'Maintenance',
    'Security',
    'Finance'
  ]

  const positions = [
    'Production Supervisor',
    'Production Worker',
    'Quality Control Inspector',
    'Machine Operator',
    'Maintenance Technician',
    'Sales Representative',
    'Administrative Assistant',
    'Security Guard',
    'Accountant',
    'Manager',
    'General Worker'
  ]

  useEffect(() => {
    if (user?.factory_id) {
      fetchEmployees()
      fetchAttendanceStats()
      generateEmployeeCode() // Auto-generate code when component loads
    }
  }, [user?.factory_id])

  const generateEmployeeCode = () => {
    // For now, generate a simple code with timestamp to avoid Supabase issues
    const timestamp = Date.now().toString().slice(-3)
    const code = `EMP-${timestamp}`
    setNewEmployee(prev => ({ ...prev, employee_code: code }))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      
      // Validate file size (max 2MB for base64 storage)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB')
        return
      }

      setImageFile(file)
      
      // Create preview and base64
      const reader = new FileReader()
      reader.onload = () => {
        const base64String = reader.result as string
        setImagePreview(base64String)
        // Store the base64 string in the form data
        setNewEmployee(prev => ({ ...prev, avatar_url: base64String }))
      }
      reader.readAsDataURL(file)
    }
  }

  const resetImageUpload = () => {
    setImageFile(null)
    setImagePreview('')
    setUploadingImage(false)
    setNewEmployee(prev => ({ ...prev, avatar_url: '' }))
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      if (!user?.factory_id) {
        console.error('No factory_id found for user')
        setLoading(false)
        return
      }
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('factory_id', user.factory_id)
        .order('created_at', { ascending: false })

      if (employeesError) {
        console.error('Error fetching employees:', employeesError)
        setLoading(false)
        return
      }

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('factory_id', user.factory_id)
        .eq('attendance_date', today)

      // Combine employees with today's attendance
      const employeesWithAttendance: EmployeeWithDetails[] = (employeesData || []).map((emp: any) => ({
        ...emp,
        todayAttendance: (attendanceData || []).find((att: any) => att.employee_id === emp.id)
      }))

      setEmployees(employeesWithAttendance)
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthlyAttendance = async (employeeId: string) => {
    try {
      setLoadingMonthlyData(true)
      
      if (!user?.factory_id) return

      const startDate = `${selectedMonth}-01`
      const endDate = `${selectedMonth}-31` // Simple approach, could be more precise

      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('factory_id', user.factory_id)
        .eq('employee_id', employeeId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true })

      if (error) {
        console.error('Error fetching monthly attendance:', error)
        toast.error('Failed to load monthly attendance')
        return
      }

      setMonthlyAttendanceData(attendanceData || [])
    } catch (error) {
      console.error('Error fetching monthly attendance:', error)
      toast.error('Failed to load monthly attendance')
    } finally {
      setLoadingMonthlyData(false)
    }
  }

  const fetchAttendanceStats = async () => {
    try {
      if (!user?.factory_id) {
        return
      }

      const today = new Date().toISOString().split('T')[0]
      
      // Get total employees count
      const { count: totalEmployees, error: countError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('factory_id', user.factory_id)
        .eq('is_active', true)

      if (countError) {
        console.error('Error fetching employee count:', countError)
        return
      }

      // Try to get today's attendance, but don't fail if it doesn't work
      let presentToday = 0, onLeave = 0, lateToday = 0, absent = 0

      try {
        const { data: todayAttendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('status')
          .eq('factory_id', user.factory_id)
          .eq('attendance_date', today)

        if (!attendanceError && todayAttendance) {
          presentToday = todayAttendance.filter((att: any) => att.status === 'present').length
          onLeave = todayAttendance.filter((att: any) => att.status === 'leave').length
          lateToday = todayAttendance.filter((att: any) => att.status === 'late').length
          absent = (totalEmployees || 0) - todayAttendance.length
        } else {
          // If attendance fails, set defaults
          absent = totalEmployees || 0
        }
      } catch (attendanceError) {
        console.warn('Could not fetch attendance data:', attendanceError)
        absent = totalEmployees || 0
      }

      setAttendanceStats({
        totalEmployees: totalEmployees || 0,
        presentToday,
        onLeave,
        absent,
        lateToday
      })
    } catch (error) {
      console.error('Error fetching attendance stats:', error)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const loadingToast = toast.loading('Adding employee...')
    
    try {
      if (!user?.factory_id) {
        toast.error('No factory selected. Please make sure you are logged in properly.', { id: loadingToast })
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([{
          ...newEmployee,
          factory_id: user.factory_id,
          salary: parseFloat(newEmployee.salary) || 0
        }] as any)
        .select()

      if (error) {
        console.error('Error adding employee:', error)
        toast.error(`Error adding employee: ${error.message}`, { id: loadingToast })
        return
      }

      console.log('Employee added successfully:', data)
      
      // Reset form and close modal
      setNewEmployee({
        employee_code: '',
        full_name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        hire_date: '',
        salary: '',
        bank_account: '',
        id_number: '',
        address: '',
        emergency_contact: '',
        avatar_url: ''
      })
      resetImageUpload()
      setShowAddModal(false)
      fetchEmployees()
      toast.success('Employee added successfully!', { id: loadingToast })
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error('Failed to add employee. Please try again.', { id: loadingToast })
    }
  }

  const markAttendance = async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half_day' | 'leave') => {
    const loadingToast = toast.loading('Marking attendance...')
    
    try {
      if (!user?.factory_id || !user?.id) {
        toast.error('Please make sure you are logged in properly.', { id: loadingToast })
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      const checkIn = status === 'present' || status === 'late' ? 
        now.toTimeString().split(' ')[0] : null

      // Calculate hours worked if checking out
      let hoursWorked = null
      if (status === 'present') {
        // For simplicity, assume 8 hours for present status
        hoursWorked = 8
      } else if (status === 'half_day') {
        hoursWorked = 4
      } else if (status === 'late') {
        hoursWorked = 7 // Slightly less for late arrival
      }

      const { error } = await supabase
        .from('attendance')
        .upsert([{
          employee_id: employeeId,
          factory_id: user.factory_id,
          attendance_date: today,
          check_in: checkIn,
          check_out: status === 'present' ? '17:00:00' : null, // Default checkout time
          hours_worked: hoursWorked,
          status,
          recorded_by: user.id
        }] as any)

      if (error) {
        console.error('Error marking attendance:', error)
        toast.error(`Error marking attendance: ${error.message}`, { id: loadingToast })
        return
      }

      fetchEmployees()
      fetchAttendanceStats()
      toast.success(`Attendance marked as ${status}`, { id: loadingToast })
    } catch (error) {
      console.error('Error marking attendance:', error)
      toast.error('Failed to mark attendance. Please try again.', { id: loadingToast })
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
        Inactive
      </span>
    )
  }

  const getAttendanceIcon = (status?: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'leave':
        return <Calendar className="h-4 w-4 text-blue-600" />
      case 'half_day':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && emp.is_active) ||
                         (statusFilter === 'inactive' && !emp.is_active)
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#065f46',
              color: '#fff',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
            },
          },
        }}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage workforce, attendance, and payroll</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setShowAttendanceModal(true)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-amber-800 border border-amber-200"
          >
            <Clock className="h-4 w-4" />
            Mark Attendance
          </button>
          <button 
            onClick={() => {
              generateEmployeeCode()
              setShowAddModal(true)
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2 font-medium w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{attendanceStats.totalEmployees}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Employees</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-green-600">{attendanceStats.presentToday}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Present Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{attendanceStats.onLeave}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">On Leave</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Absent</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-orange-600">{attendanceStats.lateToday}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Late Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent w-64"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="ml-auto flex gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Employee Directory</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {employee.avatar_url ? (
                          <img
                            src={employee.avatar_url}
                            alt={employee.full_name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-amber-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-amber-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.position}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.phone}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(employee.hire_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getAttendanceIcon(employee.todayAttendance?.status)}
                      <span className="text-sm text-gray-900 capitalize">
                        {employee.todayAttendance?.status || 'Not marked'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RWF {employee.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(employee.is_active)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedEmployee(employee)
                          setShowEmployeeDetails(true)
                        }}
                        className="text-amber-600 hover:text-amber-900 flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedEmployee(employee)
                          fetchMonthlyAttendance(employee.id)
                          setShowMonthlyAttendance(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Calendar className="h-4 w-4" />
                        Attendance
                      </button>
                      <button className="text-orange-600 hover:text-orange-900 flex items-center gap-1">
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add New Employee</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {/* Image Upload Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Employee preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-amber-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center border-4 border-amber-200">
                      <User className="w-12 h-12 text-amber-600" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-amber-500 text-white rounded-full p-2 cursor-pointer hover:bg-amber-600 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Upload employee photo (optional)
                  <br />
                  <span className="text-xs text-gray-500">Max 5MB, JPG/PNG</span>
                </p>
                {imageFile && (
                  <button
                    type="button"
                    onClick={resetImageUpload}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.employee_code}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="Auto-generated"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated employee code</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    required
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Position</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    required
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    required
                    value={newEmployee.hire_date}
                    onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary (RWF)</label>
                  <input
                    type="number"
                    required
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <input
                    type="text"
                    value={newEmployee.bank_account}
                    onChange={(e) => setNewEmployee({...newEmployee, bank_account: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={newEmployee.id_number}
                    onChange={(e) => setNewEmployee({...newEmployee, id_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={newEmployee.address}
                  onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={newEmployee.emergency_contact}
                  onChange={(e) => setNewEmployee({...newEmployee, emergency_contact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploadingImage}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    'Add Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Mark Today's Attendance</h3>
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {employees.filter(emp => emp.is_active).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="mr-4">
                        {employee.avatar_url ? (
                          <img
                            src={employee.avatar_url}
                            alt={employee.full_name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-amber-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-amber-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employee_code} - {employee.position}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 mr-4">
                        Current: {employee.todayAttendance?.status ? (
                          <span className="capitalize font-medium">
                            {employee.todayAttendance.status}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not marked</span>
                        )}
                      </span>
                      <button
                        onClick={() => markAttendance(employee.id, 'present')}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm"
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markAttendance(employee.id, 'late')}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm"
                      >
                        Late
                      </button>
                      <button
                        onClick={() => markAttendance(employee.id, 'absent')}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm"
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => markAttendance(employee.id, 'leave')}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Employee Details</h3>
                <button 
                  onClick={() => setShowEmployeeDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Name:</span> {selectedEmployee.full_name}</div>
                      <div><span className="text-gray-500">Employee Code:</span> {selectedEmployee.employee_code}</div>
                      <div><span className="text-gray-500">Email:</span> {selectedEmployee.email || 'N/A'}</div>
                      <div><span className="text-gray-500">Phone:</span> {selectedEmployee.phone}</div>
                      <div><span className="text-gray-500">ID Number:</span> {selectedEmployee.id_number || 'N/A'}</div>
                      <div><span className="text-gray-500">Address:</span> {selectedEmployee.address || 'N/A'}</div>
                      <div><span className="text-gray-500">Emergency Contact:</span> {selectedEmployee.emergency_contact || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Employment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Position:</span> {selectedEmployee.position}</div>
                      <div><span className="text-gray-500">Department:</span> {selectedEmployee.department}</div>
                      <div><span className="text-gray-500">Hire Date:</span> {new Date(selectedEmployee.hire_date).toLocaleDateString()}</div>
                      <div><span className="text-gray-500">Salary:</span> RWF {selectedEmployee.salary.toLocaleString()}</div>
                      <div><span className="text-gray-500">Bank Account:</span> {selectedEmployee.bank_account || 'N/A'}</div>
                      <div><span className="text-gray-500">Status:</span> {selectedEmployee.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Today's Attendance</h4>
                <div className="flex items-center gap-4">
                  {selectedEmployee.todayAttendance ? (
                    <>
                      <div className="flex items-center gap-2">
                        {getAttendanceIcon(selectedEmployee.todayAttendance.status)}
                        <span className="capitalize">{selectedEmployee.todayAttendance.status}</span>
                      </div>
                      {selectedEmployee.todayAttendance.check_in && (
                        <div className="text-sm text-gray-600">
                          Check-in: {selectedEmployee.todayAttendance.check_in}
                        </div>
                      )}
                      {selectedEmployee.todayAttendance.check_out && (
                        <div className="text-sm text-gray-600">
                          Check-out: {selectedEmployee.todayAttendance.check_out}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500">Not marked today</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Attendance Modal */}
      {showMonthlyAttendance && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Monthly Attendance</h3>
                  <p className="text-gray-600">{selectedEmployee.full_name} - {selectedEmployee.employee_code}</p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value)
                      fetchMonthlyAttendance(selectedEmployee.id)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button 
                    onClick={() => setShowMonthlyAttendance(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {loadingMonthlyData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Attendance Summary */}
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {monthlyAttendanceData.filter(att => att.status === 'present').length}
                      </div>
                      <div className="text-sm text-green-700">Present</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {monthlyAttendanceData.filter(att => att.status === 'late').length}
                      </div>
                      <div className="text-sm text-yellow-700">Late</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {monthlyAttendanceData.filter(att => att.status === 'absent').length}
                      </div>
                      <div className="text-sm text-red-700">Absent</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {monthlyAttendanceData.filter(att => att.status === 'leave').length}
                      </div>
                      <div className="text-sm text-blue-700">On Leave</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {monthlyAttendanceData.filter(att => att.status === 'half_day').length}
                      </div>
                      <div className="text-sm text-orange-700">Half Day</div>
                    </div>
                  </div>

                  {/* Attendance Details Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Date</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Status</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Check In</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Check Out</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Hours</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyAttendanceData.length > 0 ? (
                          monthlyAttendanceData.map((attendance, index) => (
                            <tr key={index} className="border-b">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {new Date(attendance.attendance_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  {getAttendanceIcon(attendance.status)}
                                  <span className="capitalize">{attendance.status}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {attendance.check_in || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {attendance.check_out || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {attendance.hours_worked ? `${attendance.hours_worked}h` : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {attendance.notes || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              No attendance records found for {selectedMonth}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
