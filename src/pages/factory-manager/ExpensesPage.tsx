import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Receipt,
  DollarSign,
  AlertCircle,
  FileText
} from 'lucide-react'

// Types
type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid'

type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'check' | 'credit_card'

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
}

interface Expense {
  id: string
  expense_number: string
  category: string
  subcategory?: string
  supplier_id?: string
  supplier?: Supplier
  expense_date: string
  amount: number
  tax: number
  total: number
  payment_method?: PaymentMethod
  reference_number?: string
  status: ExpenseStatus
  description: string
  approved_by?: string
  approved_at?: string
  recorded_by: string
  created_at: string
  updated_at: string
}

// Expense categories
const EXPENSE_CATEGORIES = [
  'Raw Materials',
  'Equipment',
  'Utilities',
  'Maintenance',
  'Transportation',
  'Office Supplies',
  'Marketing',
  'Insurance',
  'Professional Services',
  'Other'
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' }
]

export default function ExpensesPage() {
  const { user } = useAuthStore()
  
  // State management
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)

  // Analytics data
  const [analytics, setAnalytics] = useState({
    todayExpenses: 0,
    pendingApproval: 0,
    monthlyTotal: 0,
    pendingPayments: 0,
    lastUpdated: new Date()
  })

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    supplier_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    tax: '18',
    payment_method: '' as PaymentMethod | '',
    mobile_number: '',
    bank_account: '',
    reference_number: '',
    description: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadExpenses()
    loadSuppliers()
  }, [])

  // Calculate analytics whenever expenses change
  useEffect(() => {
    calculateAnalytics()
  }, [expenses])

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  const calculateAnalytics = () => {
    const today = new Date().toISOString().split('T')[0]
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM format

    // Today's expenses (approved/paid only)
    const todayExpenses = expenses
      .filter(expense => 
        expense.expense_date === today && 
        (expense.status === 'approved' || expense.status === 'paid')
      )
      .reduce((sum, expense) => sum + expense.total, 0)

    // Pending approval count
    const pendingApproval = expenses.filter(expense => expense.status === 'pending').length

    // Monthly total (approved/paid only)
    const monthlyTotal = expenses
      .filter(expense => 
        expense.expense_date.startsWith(currentMonth) && 
        (expense.status === 'approved' || expense.status === 'paid')
      )
      .reduce((sum, expense) => sum + expense.total, 0)

    // Pending payments (approved but not paid)
    const pendingPayments = expenses
      .filter(expense => expense.status === 'approved')
      .reduce((sum, expense) => sum + expense.total, 0)

    setAnalytics({
      todayExpenses,
      pendingApproval,
      monthlyTotal,
      pendingPayments,
      lastUpdated: new Date()
    })
  }

  const generateExpenseNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EXP-${year}${month}-${randomNum}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      setLoading(true)
      
      const amount = parseFloat(formData.amount)
      const tax = parseFloat(formData.tax) || 0
      const total = amount + tax

      const expenseData = {
        factory_id: user.factory_id,
        expense_number: editingExpense?.expense_number || generateExpenseNumber(),
        category: formData.category,
        subcategory: formData.subcategory || null,
        supplier_id: formData.supplier_id || null,
        expense_date: formData.expense_date,
        amount: amount,
        tax: tax,
        total: total,
        payment_method: formData.payment_method || null,
        reference_number: formData.reference_number || null,
        status: 'pending' as ExpenseStatus,
        description: formData.description,
        recorded_by: user.id,
        updated_at: new Date().toISOString()
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData])

        if (error) throw error
      }

      await loadExpenses()
      setShowForm(false)
      setEditingExpense(null)
      resetForm()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Error saving expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (expenseId: string) => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)

      if (error) throw error
      await loadExpenses()
    } catch (error) {
      console.error('Error approving expense:', error)
      alert('Error approving expense. Please try again.')
    }
  }

  const handleReject = async (expenseId: string) => {
    if (!user?.id) return
    
    const reason = prompt('Please enter rejection reason:')
    if (!reason) return

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)

      if (error) throw error
      await loadExpenses()
    } catch (error) {
      console.error('Error rejecting expense:', error)
      alert('Error rejecting expense. Please try again.')
    }
  }

  const handleMarkAsPaid = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)

      if (error) throw error
      await loadExpenses()
    } catch (error) {
      console.error('Error marking expense as paid:', error)
      alert('Error marking expense as paid. Please try again.')
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
      await loadExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error deleting expense. Please try again.')
    }
  }

  // Auto-calculate tax when amount changes
  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0
    const taxAmount = (amount * 0.18).toFixed(2) // 18% tax
    setFormData({
      ...formData, 
      amount: value,
      tax: taxAmount
    })
  }

  const resetForm = () => {
    setFormData({
      category: '',
      subcategory: '',
      supplier_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      amount: '',
      tax: '18',
      payment_method: '',
      mobile_number: '',
      bank_account: '',
      reference_number: '',
      description: ''
    })
  }

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      category: expense.category,
      subcategory: expense.subcategory || '',
      supplier_id: expense.supplier_id || '',
      expense_date: expense.expense_date,
      amount: expense.amount.toString(),
      tax: expense.tax.toString(),
      payment_method: expense.payment_method || '',
      mobile_number: '', // These fields don't exist in current expense model
      bank_account: '', // These fields don't exist in current expense model
      reference_number: expense.reference_number || '',
      description: expense.description
    })
    setShowForm(true)
  }

  const openViewModal = (expense: Expense) => {
    setViewingExpense(expense)
    setIsViewModalOpen(true)
  }

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'paid': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Track expenses, purchases, and supplier payments</p>
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {analytics.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Record Expense
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.todayExpenses)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">{analytics.pendingApproval}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month Total</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.monthlyTotal)}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.pendingPayments)}</p>
            </div>
            <Receipt className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | 'all')}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {expense.expense_number}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.category}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.supplier?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {expense.description}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.total)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewModal(expense)}
                        className="p-2"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {expense.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(expense)}
                            className="p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(expense.id)}
                            className="p-2 text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(expense.id)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {expense.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(expense.id)}
                          className="p-2 text-blue-600 hover:text-blue-700"
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {expense.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No expenses found matching your criteria.
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingExpense ? 'Edit Expense' : 'Record New Expense'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select category</option>
                    {EXPENSE_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional subcategory"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select supplier (optional)</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax (18%) - RWF</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({...formData, tax: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    min="0"
                    placeholder="Auto-calculated (18%)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value as PaymentMethod})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select payment method</option>
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                {formData.payment_method === 'mobile_money' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({...formData, mobile_number: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., +250788123456"
                      required
                    />
                  </div>
                )}

                {formData.payment_method === 'bank_transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bank account number or IBAN"
                      required
                    />
                  </div>
                )}

                {(formData.payment_method === 'check' || formData.payment_method === 'bank_transfer' || formData.payment_method === 'mobile_money') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Transaction/Check/Reference number"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                  placeholder="Detailed description of the expense"
                />
              </div>

              {/* Total calculation display */}
              {(formData.amount || formData.tax) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span>{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(parseFloat(formData.tax) || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>{formatCurrency((parseFloat(formData.amount) || 0) + (parseFloat(formData.tax) || 0))}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Record Expense')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingExpense(null)
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

      {/* View Expense Modal */}
      {isViewModalOpen && viewingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Expense Details</h2>
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
                  <label className="block text-sm font-medium text-gray-500">Expense Number</label>
                  <p className="text-lg font-semibold">{viewingExpense.expense_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <Badge className={`${getStatusColor(viewingExpense.status)} text-xs px-2 py-1 rounded-full`}>
                    {viewingExpense.status.charAt(0).toUpperCase() + viewingExpense.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Category</label>
                  <p>{viewingExpense.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Subcategory</label>
                  <p>{viewingExpense.subcategory || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Supplier</label>
                  <p>{viewingExpense.supplier?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Expense Date</label>
                  <p>{new Date(viewingExpense.expense_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-lg font-semibold">{formatCurrency(viewingExpense.amount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tax</label>
                  <p>{formatCurrency(viewingExpense.tax)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Total</label>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(viewingExpense.total)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Method</label>
                  <p>{viewingExpense.payment_method ? PAYMENT_METHODS.find(m => m.value === viewingExpense.payment_method)?.label : 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Reference Number</label>
                  <p>{viewingExpense.reference_number || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 p-3 bg-gray-50 rounded-lg">{viewingExpense.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p>{new Date(viewingExpense.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p>{new Date(viewingExpense.updated_at).toLocaleString()}</p>
                </div>
                {viewingExpense.approved_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Approved At</label>
                    <p>{new Date(viewingExpense.approved_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              {viewingExpense.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      handleApprove(viewingExpense.id)
                      setIsViewModalOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleReject(viewingExpense.id)
                      setIsViewModalOpen(false)
                    }}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                </>
              )}
              
              {viewingExpense.status === 'approved' && (
                <Button
                  onClick={() => {
                    handleMarkAsPaid(viewingExpense.id)
                    setIsViewModalOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  Mark as Paid
                </Button>
              )}
              
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
