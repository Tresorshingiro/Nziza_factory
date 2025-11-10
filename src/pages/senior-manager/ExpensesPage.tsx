import { useState, useEffect } from 'react'
import { Search, Plus, Receipt, TrendingDown, DollarSign, Calendar, Edit, Trash2, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import FactorySelector from '../../components/ui/FactorySelector'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import type { Database } from '../../types/database.types'

type ExpenseRow = Database['public']['Tables']['expenses']['Row']

interface ExpenseWithFactory extends ExpenseRow {
  factory_name: string
}

const expenseCategories = [
  'Raw Materials',
  'Utilities',
  'Maintenance',
  'Transportation',
  'Salaries',
  'Equipment',
  'Marketing',
  'Insurance',
  'Office Supplies',
  'Rent',
  'Other'
]

const paymentMethods = [
  'Cash',
  'Bank Transfer',
  'Mobile Money',
  'Credit Card',
  'Check'
]

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

export default function SeniorManagerExpensesPage() {
  const { user } = useAuthStore()
  const [expenses, setExpenses] = useState<ExpenseWithFactory[]>([])
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithFactory | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; expenses: number }>>([])
  const [factories, setFactories] = useState<Array<{id: string; name: string}>>([])

  const [newExpense, setNewExpense] = useState({
    description: '',
    category: '',
    amount: '',
    factory_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    receipt_number: '',
    supplier: '',
    status: 'pending' as 'pending' | 'approved' | 'paid',
    notes: ''
  })

  useEffect(() => {
    fetchExpenses()
    fetchMonthlyData()
    fetchFactories()
  }, [selectedFactory])

  const fetchFactories = async () => {
    try {
      const { data: factoriesData, error } = await supabase
        .from('factories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setFactories(factoriesData || [])
    } catch (error) {
      console.error('Error fetching factories:', error)
      setFactories([])
    }
  }

  const fetchMonthlyData = async () => {
    try {
      // Get last 6 months data
      const months = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          year: date.getFullYear(),
          monthNum: date.getMonth() + 1
        })
      }

      const monthlyExpenses = await Promise.all(
        months.map(async ({ month, year, monthNum }) => {
          let query = supabase
            .from('expenses')
            .select('total')
            .gte('expense_date', `${year}-${monthNum.toString().padStart(2, '0')}-01`)
            .lt('expense_date', `${year}-${(monthNum + 1).toString().padStart(2, '0')}-01`)

          if (selectedFactory) {
            query = query.eq('factory_id', selectedFactory)
          }

          const { data } = await query
          const total = data?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0

          return { month, expenses: total }
        })
      )

      setMonthlyData(monthlyExpenses)
    } catch (error) {
      console.error('Error fetching monthly data:', error)
      setMonthlyData([])
    }
  }

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (selectedFactory) {
        query = query.eq('factory_id', selectedFactory)
      }

      const { data: expensesData, error: expensesError } = await query

      if (expensesError) {
        console.error('Expenses query error:', expensesError)
        throw expensesError
      }

      if (!expensesData) {
        setExpenses([])
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
      const expensesWithFactory: ExpenseWithFactory[] = expensesData.map((expense: any) => ({
        ...expense,
        factory_name: factoryMap.get(expense.factory_id) || 'Unknown Factory'
      }))

      setExpenses(expensesWithFactory)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to load expenses data')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const expenseData = {
        factory_id: newExpense.factory_id,
        expense_number: newExpense.receipt_number || `EXP-${Date.now()}`, // Generate if not provided
        category: newExpense.category,
        subcategory: null,
        supplier_id: null, // We don't have supplier management yet
        expense_date: newExpense.expense_date,
        amount: parseFloat(newExpense.amount),
        tax: 0, // Default to 0 for now
        total: parseFloat(newExpense.amount), // Same as amount for now
        payment_method: newExpense.payment_method || null,
        reference_number: newExpense.receipt_number || null,
        status: newExpense.status,
        description: newExpense.description,
        receipt_url: newExpense.receipt_number || null, // Map receipt_number to receipt_url
        recorded_by: user?.id || '',
        notes: newExpense.notes || null
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) throw error
        toast.success('Expense updated successfully')
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)

        if (error) throw error
        toast.success('Expense recorded successfully')
      }

      setIsCreateModalOpen(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error: any) {
      console.error('Error saving expense:', error)
      toast.error(error.message || 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewExpense({
      description: '',
      category: '',
      amount: '',
      factory_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: '',
      receipt_number: '',
      supplier: '',
      status: 'pending',
      notes: ''
    })
  }

  const handleEdit = (expense: ExpenseWithFactory) => {
    setEditingExpense(expense)
    setNewExpense({
      description: expense.description || '',
      category: expense.category || '',
      amount: expense.total.toString(),
      factory_id: expense.factory_id,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method || '',
      receipt_number: expense.reference_number || expense.expense_number || '',
      supplier: '', // Not used in database schema
      status: expense.status || 'pending',
      notes: expense.notes || ''
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Expense deleted successfully')
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const description = expense.description || ''
    const referenceNumber = expense.reference_number || expense.expense_number || ''
    const notes = expense.notes || ''
    
    const matchesSearch = description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.total, 0)
  const thisMonthExpenses = expenses.filter(e => 
    new Date(e.expense_date).getMonth() === new Date().getMonth()
  ).reduce((sum, e) => sum + e.total, 0)
  
  const paidExpenses = expenses.filter(e => e.status === 'paid')
  const pendingExpenses = expenses.filter(e => e.status === 'pending')
  const approvedExpenses = expenses.filter(e => e.status === 'approved')

  const categoryData = expenseCategories.map(category => ({
    name: category,
    value: expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.total, 0)
  })).filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses Management</h1>
          <p className="text-gray-600">Track and manage expenses across all factories</p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalExpenses.toLocaleString()} RWF
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {thisMonthExpenses.toLocaleString()} RWF
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{paidExpenses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingExpenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value.toLocaleString()} RWF`, 'Expenses']} />
              <Bar dataKey="expenses" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }: any) => `${name}: ${(value as number).toLocaleString()}`}
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value.toLocaleString()} RWF`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <span className="text-green-800 font-medium">Paid ({paidExpenses.length})</span>
            <span className="text-green-600 font-bold">
              {paidExpenses.reduce((sum, e) => sum + e.total, 0).toLocaleString()} RWF
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <span className="text-blue-800 font-medium">Approved ({approvedExpenses.length})</span>
            <span className="text-blue-600 font-bold">
              {approvedExpenses.reduce((sum, e) => sum + e.total, 0).toLocaleString()} RWF
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
            <span className="text-yellow-800 font-medium">Pending ({pendingExpenses.length})</span>
            <span className="text-yellow-600 font-bold">
              {pendingExpenses.reduce((sum, e) => sum + e.total, 0).toLocaleString()} RWF
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FactorySelector
            selectedFactoryId={selectedFactory}
            onFactoryChange={setSelectedFactory}
          />
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
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
            <option value="all">All Categories</option>
            {expenseCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{expense.description}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {expense.reference_number || expense.expense_number || 'No reference'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                        {expense.factory_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{expense.total.toLocaleString()} RWF</div>
                      <div className="text-sm text-gray-500">{expense.payment_method}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.notes || 'No notes'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        expense.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : expense.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
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
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No expenses found</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{expense.description}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </span>
                      </div>
                      {(expense.reference_number || expense.expense_number) && (
                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {expense.reference_number || expense.expense_number}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        expense.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : expense.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3 mb-4">
                    {/* Amount & Payment */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Amount</p>
                          <p className="text-lg font-semibold text-gray-900">{expense.total.toLocaleString()} RWF</p>
                          {expense.payment_method && (
                            <p className="text-xs text-gray-600">{expense.payment_method}</p>
                          )}
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg">
                          <DollarSign className="w-4 h-4 text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Category & Factory */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {expense.category}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Factory</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          {expense.factory_name}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {expense.notes && expense.notes !== 'No notes' && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-gray-700 bg-gray-100 rounded-lg p-2">{expense.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-300">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
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
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    {expenseCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (RWF)
                  </label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factory
                  </label>
                  <select
                    value={newExpense.factory_id}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, factory_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Factory</option>
                    {factories.map(factory => (
                      <option key={factory.id} value={factory.id}>{factory.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newExpense.payment_method}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Method</option>
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={newExpense.receipt_number}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, receipt_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newExpense.status}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, status: e.target.value as 'paid' | 'pending' | 'approved' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setEditingExpense(null)
                    setNewExpense({
                      description: '',
                      category: '',
                      amount: '',
                      factory_id: '',
                      expense_date: new Date().toISOString().split('T')[0],
                      payment_method: '',
                      receipt_number: '',
                      supplier: '',
                      status: 'pending',
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
                  {submitting ? 'Saving...' : editingExpense ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}