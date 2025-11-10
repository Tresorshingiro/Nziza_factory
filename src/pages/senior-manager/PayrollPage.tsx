import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Users, 
  RefreshCw,
  Search,
  CheckCircle,
  Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string
  position: string
  department: string
  salary: number
  hire_date: string
  factory_id: string
  factory_name: string
  status: 'active' | 'inactive' | 'on_leave'
  last_payment_date: string | null
  total_paid: number
}

interface PayrollSummary {
  totalEmployees: number
  totalSalaryAmount: number
  paidThisMonth: number
  pendingPayments: number
  totalExpenses: number
}

interface PayrollTransaction {
  id: string
  employee_id: string
  employee_name: string
  factory_name: string
  amount: number
  payment_date: string
  payment_method: string
  status: 'completed' | 'pending' | 'failed'
  notes: string
}

export default function PayrollPage() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    totalSalaryAmount: 0,
    paidThisMonth: 0,
    pendingPayments: 0,
    totalExpenses: 0
  })
  const [payrollTransactions, setPayrollTransactions] = useState<PayrollTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFactory, setSelectedFactory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [factories, setFactories] = useState<{id: string, name: string}[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')

  useEffect(() => {
    fetchPayrollData()
  }, [])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchFactories(),
        fetchEmployees(),
        fetchPayrollTransactions()
      ])
      calculatePayrollSummary()
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  const refreshPayrollData = async () => {
    setRefreshing(true)
    await fetchPayrollData()
    setRefreshing(false)
    toast.success('Payroll data refreshed successfully')
  }

  const fetchFactories = async () => {
    try {
      const { data, error } = await supabase
        .from('factories')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setFactories(data || [])
    } catch (error) {
      console.error('Error fetching factories:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      // Fetch all employees including factory managers and senior managers
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          *,
          factories:factory_id (
            name
          )
        `)
        .order('full_name')

      if (employeesError) throw employeesError

      // Also fetch users who are senior managers (they should be included in payroll)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('role', ['senior_manager'])

      if (usersError) throw usersError

      // Get salary payment history for each employee
      const allEmployees = await Promise.all(
        (employeesData || []).map(async (emp: any) => {
          // Get last payment date and total paid from expenses
          const { data: payments } = await supabase
            .from('expenses')
            .select('expense_date, total')
            .eq('category', 'Salary')
            .eq('description', `Salary payment for ${emp.full_name}`)
            .order('expense_date', { ascending: false })
            .limit(1)

          const { data: totalPaidData } = await supabase
            .from('expenses')
            .select('total')
            .eq('category', 'Salary')
            .eq('description', `Salary payment for ${emp.full_name}`)

          const nameParts = emp.full_name?.split(' ') || ['Unknown']
          const firstName = nameParts[0]
          const lastName = nameParts.slice(1).join(' ') || ''

          return {
            id: emp.id,
            employee_code: emp.employee_code,
            first_name: firstName,
            last_name: lastName,
            email: emp.email,
            position: emp.position,
            department: emp.department,
            salary: emp.salary || 0,
            hire_date: emp.hire_date,
            factory_id: emp.factory_id,
            factory_name: emp.factories?.name || 'Unknown Factory',
            status: (emp.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'on_leave',
            last_payment_date: (payments as any)?.[0]?.expense_date || null,
            total_paid: (totalPaidData as any)?.reduce((sum: number, payment: any) => sum + (payment.total || 0), 0) || 0
          }
        })
      )

      // Add senior managers to the employee list for payroll purposes
      const seniorManagerEmployees = (usersData || []).map((user: any) => ({
        id: user.id,
        employee_code: `SM-${user.id.slice(0, 8)}`,
        first_name: user.full_name?.split(' ')[0] || 'Unknown',
        last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        position: 'Senior Manager',
        department: 'Management',
        salary: 1500000, // Default senior manager salary - you can adjust this
        hire_date: user.created_at,
        factory_id: 'management',
        factory_name: 'Head Office',
        status: 'active' as const,
        last_payment_date: null,
        total_paid: 0
      }))

      setEmployees([...allEmployees, ...seniorManagerEmployees])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchPayrollTransactions = async () => {
    try {
      // Fetch salary-related expenses as payroll transactions
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('category', 'Salary')
        .order('expense_date', { ascending: false })
        .limit(100)

      if (error) throw error

      const transactions: PayrollTransaction[] = (data || []).map((expense: any) => ({
        id: expense.id,
        employee_id: expense.id, // You might want to add employee_id to expenses table
        employee_name: expense.description?.replace('Salary payment for ', '') || 'Unknown Employee',
        factory_name: 'Various', // You might want to add factory reference
        amount: expense.total || 0,
        payment_date: expense.expense_date,
        payment_method: expense.payment_method || 'bank_transfer',
        status: 'completed' as const,
        notes: expense.description || ''
      }))

      setPayrollTransactions(transactions)
    } catch (error) {
      console.error('Error fetching payroll transactions:', error)
    }
  }

  const calculatePayrollSummary = () => {
    const totalEmployees = employees.length
    const totalSalaryAmount = employees.reduce((sum, emp) => sum + emp.salary, 0)
    
    // Calculate this month's payments
    const currentMonth = new Date().toISOString().slice(0, 7)
    const paidThisMonth = payrollTransactions
      .filter(transaction => transaction.payment_date.startsWith(currentMonth))
      .length

    const pendingPayments = employees.filter(emp => 
      !emp.last_payment_date || 
      !emp.last_payment_date.startsWith(currentMonth)
    ).length

    const totalExpenses = payrollTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

    setPayrollSummary({
      totalEmployees,
      totalSalaryAmount,
      paidThisMonth,
      pendingPayments,
      totalExpenses
    })
  }

  const processPayrollPayments = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select employees to pay')
      return
    }

    try {
      const paymentsToProcess = employees.filter(emp => selectedEmployees.includes(emp.id))
      
      // Generate expense numbers for each payment
      const expenseEntries = await Promise.all(
        paymentsToProcess.map(async (employee, index) => {
          // Generate a unique expense number
          const expenseNumber = `SAL-${new Date().getFullYear()}-${String(Date.now() + index).slice(-6)}`
          
          return {
            factory_id: employee.factory_id === 'management' ? paymentsToProcess[0]?.factory_id || 'default' : employee.factory_id,
            expense_number: expenseNumber,
            category: 'Salary',
            subcategory: 'Employee Salary',
            description: `Salary payment for ${employee.first_name} ${employee.last_name}`,
            expense_date: new Date().toISOString().split('T')[0],
            amount: employee.salary,
            tax: 0,
            total: employee.salary,
            payment_method: paymentMethod,
            status: 'approved' as const,
            recorded_by: user?.id || ''
          }
        })
      )

      const { error } = await supabase
        .from('expenses')
        .insert(expenseEntries as any)

      if (error) throw error

      toast.success(`Successfully processed payroll for ${selectedEmployees.length} employees`)
      setShowPaymentModal(false)
      setSelectedEmployees([])
      await fetchPayrollData()
    } catch (error) {
      console.error('Error processing payroll:', error)
      toast.error('Failed to process payroll payments')
    }
  }

  const getFilteredEmployees = () => {
    let filtered = employees

    if (selectedFactory !== 'all') {
      filtered = filtered.filter(emp => emp.factory_id === selectedFactory)
    }

    if (paymentFilter !== 'all') {
      const currentMonth = new Date().toISOString().slice(0, 7)
      if (paymentFilter === 'paid') {
        filtered = filtered.filter(emp => 
          emp.last_payment_date && emp.last_payment_date.startsWith(currentMonth)
        )
      } else if (paymentFilter === 'pending') {
        filtered = filtered.filter(emp => 
          !emp.last_payment_date || !emp.last_payment_date.startsWith(currentMonth)
        )
      }
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(emp =>
        emp.first_name.toLowerCase().includes(search) ||
        emp.last_name.toLowerCase().includes(search) ||
        emp.employee_code.toLowerCase().includes(search) ||
        emp.position.toLowerCase().includes(search)
      )
    }

    return filtered
  }

  const filteredEmployees = getFilteredEmployees()
  const formatCurrency = (amount: number) => `${amount.toLocaleString()} RWF`

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const handleSelectAll = () => {
    const pendingEmployees = filteredEmployees.filter(emp => {
      const currentMonth = new Date().toISOString().slice(0, 7)
      return !emp.last_payment_date || !emp.last_payment_date.startsWith(currentMonth)
    })
    
    if (selectedEmployees.length === pendingEmployees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(pendingEmployees.map(emp => emp.id))
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600">Manage employee salaries and payroll across all factories</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refreshPayrollData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={selectedEmployees.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4" />
            Process Payroll ({selectedEmployees.length})
          </button>
        </div>
      </div>

      {/* Payroll Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{payrollSummary.totalEmployees}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Payroll</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(payrollSummary.totalSalaryAmount)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid This Month</p>
              <p className="text-2xl font-bold text-gray-900">{payrollSummary.paidThisMonth}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{payrollSummary.pendingPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Factory</label>
            <select
              value={selectedFactory}
              onChange={(e) => setSelectedFactory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Factories</option>
              <option value="management">Head Office</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              <option value="paid">Paid This Month</option>
              <option value="pending">Pending Payment</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleSelectAll}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {selectedEmployees.length === filteredEmployees.filter(emp => {
                const currentMonth = new Date().toISOString().slice(0, 7)
                return !emp.last_payment_date || !emp.last_payment_date.startsWith(currentMonth)
              }).length ? 'Deselect All' : 'Select All Pending'}
            </button>
          </div>
        </div>
      </div>

      {/* Employee Payroll Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Employee Payroll</h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No employees found for the selected criteria
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const currentMonth = new Date().toISOString().slice(0, 7)
                  const isPaidThisMonth = employee.last_payment_date?.startsWith(currentMonth)
                  
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleSelectEmployee(employee.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          disabled={isPaidThisMonth}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{employee.employee_code}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{employee.factory_name}</td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{employee.position}</div>
                        <div className="text-sm text-gray-500">{employee.department}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{formatCurrency(employee.salary)}</td>
                      <td className="px-6 py-4 text-gray-900">
                        {employee.last_payment_date 
                          ? new Date(employee.last_payment_date).toLocaleDateString()
                          : 'Never paid'
                        }
                      </td>
                      <td className="px-6 py-4">
                        {isPaidThisMonth ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {filteredEmployees.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No employees found for the selected criteria
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => {
                const currentMonth = new Date().toISOString().slice(0, 7)
                const isPaidThisMonth = employee.last_payment_date?.startsWith(currentMonth)
                
                return (
                  <div key={employee.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleSelectEmployee(employee.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                          disabled={isPaidThisMonth}
                        />
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </h4>
                          <p className="text-sm text-gray-500">{employee.employee_code}</p>
                        </div>
                      </div>
                      {isPaidThisMonth ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Factory</p>
                        <p className="text-sm text-gray-900">{employee.factory_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Position</p>
                        <p className="text-sm text-gray-900">{employee.position}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Salary</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(employee.salary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Last Payment</p>
                        <p className="text-sm text-gray-900">
                          {employee.last_payment_date 
                            ? new Date(employee.last_payment_date).toLocaleDateString()
                            : 'Never paid'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Payroll Payments</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are about to process payroll for {selectedEmployees.length} employees.
              </p>
              <p className="text-lg font-medium text-gray-900">
                Total Amount: {formatCurrency(
                  employees
                    .filter(emp => selectedEmployees.includes(emp.id))
                    .reduce((sum, emp) => sum + emp.salary, 0)
                )}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="check">Check</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processPayrollPayments}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Process Payments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}