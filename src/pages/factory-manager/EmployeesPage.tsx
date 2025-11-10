import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  User, 
  Eye, 
  Edit, 
  Download
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Database } from '../../types/database.types'
import { Pagination } from '../../components/ui/pagination'
import toast, { Toaster } from 'react-hot-toast'

type Employee = Database['public']['Tables']['employees']['Row']

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Form state for editing employee
  const [editEmployee, setEditEmployee] = useState({
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
  }

  const resetImageUpload = () => {
    setImagePreview(null)
    setNewEmployee(prev => ({ ...prev, avatar_url: '' }))
  }

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate a color for avatar based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const charCode = name.charCodeAt(0) + name.charCodeAt(name.length - 1)
    return colors[charCode % colors.length]
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      
      if (!user?.factory_id) {
        console.error('No factory_id found for user:', user)
        toast.error('No factory selected. Please login again.')
        setLoading(false)
        return
      }
      
      console.log('Fetching employees for factory:', user.factory_id)
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('factory_id', user.factory_id)
        .order('created_at', { ascending: false })

      if (employeesError) {
        console.error('Error fetching employees:', employeesError)
        toast.error(`Failed to fetch employees: ${employeesError.message}`)
        setLoading(false)
        return
      }

      console.log('Employees fetched successfully:', employeesData?.length || 0, 'employees')
      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return // Prevent double submission
    
    setIsSubmitting(true)
    const loadingToast = toast.loading('Adding employee...')
    
    try {
      if (!user?.factory_id) {
        toast.error('No factory selected. Please make sure you are logged in properly.', { id: loadingToast })
        setIsSubmitting(false)
        return
      }

      // Validate required fields
      if (!newEmployee.full_name || !newEmployee.position || !newEmployee.department) {
        toast.error('Please fill in all required fields (Name, Position, Department).', { id: loadingToast })
        setIsSubmitting(false)
        return
      }

      // Convert salary to number and prepare data (now including avatar_url)
      const employeeData = {
        ...newEmployee,
        factory_id: user.factory_id,
        salary: parseFloat(newEmployee.salary) || 0,
        hire_date: newEmployee.hire_date || new Date().toISOString().split('T')[0], // Default to today if not set
        is_active: true
      }

      console.log('Adding employee with data:', employeeData)
      console.log('Factory ID:', user.factory_id)
      console.log('Employee fields:', Object.keys(employeeData))

      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData] as any)
        .select()

      if (error) {
        console.error('Supabase error adding employee:', error)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Error code:', error.code)
        toast.error(`Error adding employee: ${error.message}`, { id: loadingToast })
        setIsSubmitting(false)
        return
      }

      if (!data || data.length === 0) {
        console.error('No data returned from insert')
        toast.error('Employee was not added - no data returned', { id: loadingToast })
        setIsSubmitting(false)
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
      setIsSubmitting(false)
      fetchEmployees()
    } catch (error) {
      console.error('Unexpected error adding employee:', error)
      toast.error('Failed to add employee. Please try again.', { id: loadingToast })
      setIsSubmitting(false)
    }
  }

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const loadingToast = toast.loading('Updating employee...')
    
    try {
      if (!selectedEmployee?.id) {
        toast.error('No employee selected for editing.', { id: loadingToast })
        return
      }

      // Validate required fields
      if (!editEmployee.full_name || !editEmployee.email || !editEmployee.position || !editEmployee.department) {
        toast.error('Please fill in all required fields.', { id: loadingToast })
        return
      }

      // Convert salary to number and prepare data (now including avatar_url)
      const employeeData = {
        ...editEmployee,
        salary: parseFloat(editEmployee.salary) || 0
      }

      console.log('Updating employee with data:', employeeData)

      // @ts-ignore - Temporary fix for Supabase typing issue
      const { data, error } = await (supabase as any)
        .from('employees')
        .update(employeeData)
        .eq('id', selectedEmployee.id)
        .select()

      if (error) {
        console.error('Supabase error updating employee:', error)
        toast.error(`Error updating employee: ${error.message}`, { id: loadingToast })
        return
      }

      console.log('Employee updated successfully:', data)
      toast.success('Employee updated successfully!', { id: loadingToast })
      
      setShowEditModal(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } catch (error) {
      console.error('Unexpected error updating employee:', error)
      toast.error('Failed to update employee. Please try again.', { id: loadingToast })
    }
  }

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setEditEmployee({
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      email: employee.email || '',
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      hire_date: employee.hire_date,
      salary: employee.salary?.toString() || '',
      bank_account: employee.bank_account || '',
      id_number: employee.id_number || '',
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      avatar_url: employee.avatar_url || ''
    })
    setImagePreview(employee.avatar_url || null)
    setShowEditModal(true)
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

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, departmentFilter, statusFilter])

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
    <div className="min-h-screen bg-gray-50 p-4">
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
              {paginatedEmployees.map((employee) => (
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
                          <div className={`h-10 w-10 rounded-full ${getAvatarColor(employee.full_name)} flex items-center justify-center`}>
                            <span className="text-white text-sm font-medium">
                              {getInitials(employee.full_name)}
                            </span>
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
                      <button
                        onClick={() => openEditModal(employee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
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

      {/* Pagination */}
      {filteredEmployees.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEmployees.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      )}

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
                  ) : newEmployee.full_name ? (
                    <div className={`h-full w-full ${getAvatarColor(newEmployee.full_name)} flex items-center justify-center`}>
                      <span className="text-white text-lg font-bold">
                        {getInitials(newEmployee.full_name)}
                      </span>
                    </div>
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Employee Image (stored as base64 - no storage bucket needed)</p>
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
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Employee'}
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

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Edit Employee</h3>
            </div>
            
            <form onSubmit={handleEditEmployee} className="p-6 space-y-4">
              {/* Image Upload */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : editEmployee.full_name ? (
                    <div className={`h-full w-full ${getAvatarColor(editEmployee.full_name)} flex items-center justify-center`}>
                      <span className="text-white text-lg font-bold">
                        {getInitials(editEmployee.full_name)}
                      </span>
                    </div>
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Employee Image (stored as base64 - no storage bucket needed)</p>
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
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null)
                        setEditEmployee(prev => ({ ...prev, avatar_url: '' }))
                      }}
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
                    value={editEmployee.employee_code}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, employee_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editEmployee.full_name}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmployee.email}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editEmployee.phone}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={editEmployee.position}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={editEmployee.department}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    value={editEmployee.hire_date}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, hire_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={editEmployee.salary}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, salary: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <input
                    type="text"
                    value={editEmployee.bank_account}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, bank_account: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={editEmployee.id_number}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, id_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={editEmployee.address}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editEmployee.emergency_contact}
                    onChange={(e) => setEditEmployee(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Update Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedEmployee(null)
                    setImagePreview(null)
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
                    <div className={`h-full w-full ${getAvatarColor(selectedEmployee.full_name)} flex items-center justify-center`}>
                      <span className="text-white text-xl font-bold">
                        {getInitials(selectedEmployee.full_name)}
                      </span>
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