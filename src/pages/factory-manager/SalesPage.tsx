import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Plus, Search, Calendar, DollarSign, Package, FileText, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'
type CheeseType = 'gouda' | 'cheddar' | 'mozzarella' | 'other'
type PaymentMethod = 'mobile_money' | 'cash' | 'bank_transfer' | 'check'

type Customer = {
  id: string
  name: string
  customer_code: string
  email: string | null
  phone: string
  customer_type: 'wholesale' | 'retail' | 'distributor'
}

type StockItem = {
  id: string
  item_name: string
  cheese_type: CheeseType
  quantity: number
  unit_cost: number
  unit: string
}

type Payment = {
  id: string
  invoice_id: string
  customer_id: string
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  reference_number: string | null
  notes: string | null
  received_by: string
  created_at: string
  updated_at: string
}

type OrderItem = {
  id?: string
  stock_id: string
  cheese_type: CheeseType
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  stock_item?: StockItem
}

type SalesOrder = {
  id: string
  order_number: string
  factory_id: string
  customer_id: string
  order_date: string
  delivery_date: string | null
  status: OrderStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_status: PaymentStatus
  payment_terms: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  customer?: Customer
  sales_order_items?: OrderItem[]
  total_paid?: number // We'll calculate this from payments
  balance_due?: number // We'll calculate this
}

type OrderFormData = {
  customer_id: string
  delivery_date: string
  payment_terms: string
  notes: string
  items: OrderItem[]
}

type PaymentFormData = {
  amount: number
  payment_method: PaymentMethod
  reference_number: string
  notes: string
}

export default function SalesPage() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  
  // Analytics data
  const [analytics, setAnalytics] = useState({
    todaySales: 0,
    pendingOrders: 0,
    pendingPayments: 0,
    monthlyRevenue: 0,
    lastUpdated: new Date()
  })

  const [formData, setFormData] = useState<OrderFormData>({
    customer_id: '',
    delivery_date: '',
    payment_terms: '',
    notes: '',
    items: []
  })

  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amount: 0,
    payment_method: 'mobile_money',
    reference_number: '',
    notes: ''
  })

  const generateOrderNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-4)
    return `ORD-${year}${month}${day}-${timestamp}`
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, customer_code, email, phone, customer_type')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchStockItems = async () => {
    try {
      if (!user?.factory_id) return

      const { data, error } = await supabase
        .from('stock')
        .select('id, item_name, cheese_type, quantity, unit_cost, unit')
        .eq('factory_id', user.factory_id)
        .eq('stock_type', 'finished_goods')
        .gt('quantity', 0)
        .order('item_name')

      if (error) throw error
      setStockItems(data || [])
    } catch (error) {
      console.error('Error fetching stock items:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      if (!user?.factory_id) return

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(id, name, customer_code, email, phone, customer_type),
          sales_order_items(
            id,
            stock_id,
            cheese_type,
            quantity,
            unit_price,
            discount,
            subtotal,
            stock:stock(id, item_name, cheese_type, quantity, unit_cost, unit)
          )
        `)
        .eq('factory_id', user.factory_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate actual payment amounts for each order
      const ordersWithPayments = await Promise.all(
        (data as SalesOrder[]).map(async (order) => {
          // Get all invoices for this order
          const { data: invoices, error: invoiceError } = await supabase
            .from('invoices')
            .select('id, amount_paid')
            .eq('order_id', order.id)

          if (invoiceError) {
            console.error('Error fetching invoices:', invoiceError)
            return {
              ...order,
              total_paid: 0,
              balance_due: order.total
            }
          }

          // Calculate total paid from all invoices
          const totalPaid = invoices?.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0) || 0
          const balanceDue = order.total - totalPaid

          return {
            ...order,
            total_paid: totalPaid,
            balance_due: balanceDue
          }
        })
      )

      setOrders(ordersWithPayments)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedOrder || !paymentFormData.amount || paymentFormData.amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (!user?.id) {
      toast.error('User information not found')
      return
    }

    try {
      // First, create an invoice if it doesn't exist
      const invoiceNumber = `INV-${selectedOrder.order_number.replace('ORD-', '')}`
      
      const { data: existingInvoice, error: invoiceCheckError } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', selectedOrder.id)
        .single()

      let invoiceId = existingInvoice?.id

      if (!existingInvoice) {
        // Create invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            order_id: selectedOrder.id,
            factory_id: selectedOrder.factory_id,
            customer_id: selectedOrder.customer_id,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            subtotal: selectedOrder.subtotal,
            tax: selectedOrder.tax,
            total: selectedOrder.total,
            amount_paid: 0,
            balance: selectedOrder.total,
            payment_status: 'pending',
            created_by: user.id
          })
          .select('id')
          .single()

        if (invoiceError) throw invoiceError
        invoiceId = newInvoice.id
      }

      // Record the payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          customer_id: selectedOrder.customer_id,
          payment_date: new Date().toISOString().split('T')[0],
          amount: paymentFormData.amount,
          payment_method: paymentFormData.payment_method,
          reference_number: paymentFormData.reference_number || null,
          notes: paymentFormData.notes || null,
          received_by: user.id
        })

      if (paymentError) throw paymentError

      // Calculate total payments for this invoice
      const { data: allPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', invoiceId)

      if (paymentsError) throw paymentsError

      const totalPaid = allPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const newBalance = selectedOrder.total - totalPaid

      // Update invoice with new payment totals
      const { error: updateInvoiceError } = await supabase
        .from('invoices')
        .update({
          amount_paid: totalPaid,
          balance: newBalance,
          payment_status: newBalance <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending'),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (updateInvoiceError) throw updateInvoiceError

      // Update order payment status
      const orderPaymentStatus: PaymentStatus = newBalance <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending')
      const { error: updateOrderError } = await supabase
        .from('sales_orders')
        .update({
          payment_status: orderPaymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)

      if (updateOrderError) throw updateOrderError

      const paymentStatusText = newBalance <= 0 ? 'fully paid' : 'partially paid'
      toast.success(`Payment of ${formatCurrency(paymentFormData.amount)} recorded successfully! Order is now ${paymentStatusText}.`)
      setIsPaymentModalOpen(false)
      setPaymentFormData({
        amount: 0,
        payment_method: 'mobile_money',
        reference_number: '',
        notes: ''
      })
      fetchOrders()
    } catch (error: any) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    }
  }

  const calculateAnalytics = () => {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7)

    // Today's Sales - sum of completed orders today
    const todaySales = orders
      .filter(order => 
        order.order_date === today && 
        order.status === 'completed'
      )
      .reduce((sum, order) => sum + order.total, 0)

    // Pending Orders - count of orders with pending status
    const pendingOrders = orders.filter(order => order.status === 'pending').length

    // Pending Payments - sum of balance_due from all unpaid/partial orders
    const pendingPayments = orders
      .filter(order => 
        order.payment_status === 'pending' || 
        order.payment_status === 'partial' ||
        order.payment_status === 'overdue'
      )
      .reduce((sum, order) => sum + (order.balance_due || order.total), 0)

    // Monthly Revenue - sum of all completed orders this month
    const monthlyRevenue = orders
      .filter(order => 
        order.order_date.startsWith(thisMonth) && 
        order.status === 'completed'
      )
      .reduce((sum, order) => sum + order.total, 0)

    setAnalytics({
      todaySales,
      pendingOrders,
      pendingPayments,
      monthlyRevenue,
      lastUpdated: new Date()
    })
  }

  useEffect(() => {
    fetchCustomers()
    fetchStockItems()
    fetchOrders()
  }, [user?.factory_id])

  useEffect(() => {
    calculateAnalytics()
  }, [orders])

  const addOrderItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          stock_id: '',
          cheese_type: 'gouda',
          quantity: 1,
          unit_price: 0,
          discount: 0,
          subtotal: 0
        }
      ]
    })
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Auto-calculate subtotal
    if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
      const item = updatedItems[index]
      const baseAmount = item.quantity * item.unit_price
      const discountAmount = (baseAmount * item.discount) / 100
      updatedItems[index].subtotal = baseAmount - discountAmount
    }

    // Auto-fill price when stock item is selected
    if (field === 'stock_id') {
      const stockItem = stockItems.find(item => item.id === value)
      if (stockItem) {
        updatedItems[index].cheese_type = stockItem.cheese_type
        updatedItems[index].unit_price = stockItem.unit_cost * 1.3 // 30% markup
        const baseAmount = updatedItems[index].quantity * updatedItems[index].unit_price
        const discountAmount = (baseAmount * updatedItems[index].discount) / 100
        updatedItems[index].subtotal = baseAmount - discountAmount
      }
    }

    setFormData({ ...formData, items: updatedItems })
  }

  const removeOrderItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: updatedItems })
  }

  const calculateOrderTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = subtotal * 0.18 // 18% VAT
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer_id || formData.items.length === 0) {
      toast.error('Please select a customer and add at least one item')
      return
    }

    if (!user?.factory_id) {
      toast.error('Factory information not found')
      return
    }

    try {
      const orderNumber = generateOrderNumber()
      const { subtotal, tax, total } = calculateOrderTotal()

      // Create the order
      const orderData = {
        order_number: orderNumber,
        factory_id: user.factory_id,
        customer_id: formData.customer_id,
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: formData.delivery_date || null,
        status: 'pending' as OrderStatus,
        subtotal,
        tax,
        discount: 0,
        total,
        payment_status: 'pending' as PaymentStatus,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null,
        created_by: user.id
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItemsData = formData.items.map(item => ({
        order_id: newOrder.id,
        stock_id: item.stock_id,
        cheese_type: item.cheese_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      toast.success('Order created successfully!')
      setShowForm(false)
      setFormData({
        customer_id: '',
        delivery_date: '',
        payment_terms: '',
        notes: '',
        items: []
      })
      fetchOrders()
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    }
  }

  const handleView = (order: SalesOrder) => {
    setSelectedOrder(order)
    setIsViewModalOpen(true)
  }

  const openPaymentModal = (order: SalesOrder) => {
    setSelectedOrder(order)
    const balanceDue = (order.balance_due !== undefined) ? order.balance_due : order.total
    setPaymentFormData({
      amount: balanceDue > 0 ? balanceDue : order.total,
      payment_method: 'mobile_money',
      reference_number: '',
      notes: ''
    })
    setIsPaymentModalOpen(true)
  }

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'mobile_money':
        return 'Mobile Money'
      case 'cash':
        return 'Cash'
      case 'bank_transfer':
        return 'Bank Transfer'
      case 'check':
        return 'Check'
      default:
        return method
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error
      
      toast.success(`Order status updated to ${status}`)
      fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error
      
      toast.success(`Payment status updated to ${paymentStatus}`)
      fetchOrders()
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'processing':
        return <Badge variant="default">Processing</Badge>
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'partial':
        return <Badge variant="outline">Partial</Badge>
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDate = !dateFilter || order.order_date === dateFilter
    const matchesStatus = !statusFilter || order.status === statusFilter

    return matchesSearch && matchesDate && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading sales data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales & Orders</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage sales orders, track deliveries, and monitor payments</p>
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {analytics.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Create New Order
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Today's Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.todaySales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.pendingPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.monthlyRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders found</p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                Create Your First Order
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Order #</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Items</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Payment</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{order.order_number}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(order.order_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{order.customer?.name}</div>
                          <div className="text-sm text-gray-500">{order.customer?.customer_code}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(order.order_date).toLocaleDateString()}
                          {order.delivery_date && (
                            <div className="text-sm text-gray-500">
                              Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {order.sales_order_items?.length || 0} item(s)
                          </div>
                          {order.sales_order_items?.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-xs text-gray-500">
                              {item.cheese_type} ({item.quantity}kg)
                            </div>
                          ))}
                          {(order.sales_order_items?.length || 0) > 2 && (
                            <div className="text-xs text-gray-500">
                              +{(order.sales_order_items?.length || 0) - 2} more
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{formatCurrency(order.total)}</div>
                          <div className="text-sm text-gray-500">
                            Subtotal: {formatCurrency(order.subtotal)}
                          </div>
                          {(order.total_paid || 0) > 0 && (
                            <div className="text-xs text-green-600">
                              Paid: {formatCurrency(order.total_paid || 0)}
                            </div>
                          )}
                          {(order.balance_due || order.total) > 0 && order.payment_status !== 'paid' && (
                            <div className="text-xs text-red-600">
                              Due: {formatCurrency(order.balance_due || order.total)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {getPaymentStatusBadge(order.payment_status)}
                            <select
                              value={order.payment_status}
                              onChange={(e) => updatePaymentStatus(order.id, e.target.value as PaymentStatus)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="partial">Partial</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {getStatusBadge(order.status)}
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleView(order)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                              title="View Details"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            {order.payment_status !== 'paid' && (
                              <button
                                onClick={() => openPaymentModal(order)}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-200"
                                title="Record Payment"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                Pay
                              </button>
                            )}
                            <button
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-200"
                              title="Generate Invoice"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                        <p className="text-sm text-gray-600">{order.customer?.name}</p>
                        <p className="text-xs text-gray-500">{order.customer?.customer_code}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {getStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.payment_status)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Order Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(order.order_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Amount</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(order.total)}</p>
                        {(order.total_paid || 0) > 0 && (
                          <p className="text-xs text-blue-600">Paid: {formatCurrency(order.total_paid || 0)}</p>
                        )}
                        {(order.balance_due || order.total) > 0 && order.payment_status !== 'paid' && (
                          <p className="text-xs text-red-600">Due: {formatCurrency(order.balance_due || order.total)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Items</p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.sales_order_items?.length || 0} item(s)
                        </p>
                      </div>
                      {order.delivery_date && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium">Delivery</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(order.delivery_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-1 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleView(order)}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                        title="View Details"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      {order.payment_status !== 'paid' && (
                        <button
                          onClick={() => openPaymentModal(order)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-200"
                          title="Record Payment"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Pay
                        </button>
                      )}
                      <button
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-200"
                        title="Generate Invoice"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Order Modal */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Order Number</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedOrder.order_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Customer</label>
                      <p className="text-gray-900">{selectedOrder.customer?.name}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.customer?.customer_code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Order Date</label>
                      <p className="text-gray-900">{new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                    </div>
                    {selectedOrder.delivery_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Delivery Date</label>
                        <p className="text-gray-900">{new Date(selectedOrder.delivery_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment Status</label>
                      <div className="mt-1">{getPaymentStatusBadge(selectedOrder.payment_status)}</div>
                    </div>
                    {selectedOrder.payment_terms && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Terms</label>
                        <p className="text-gray-900">{selectedOrder.payment_terms}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Product</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Quantity</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Unit Price</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Discount</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedOrder.sales_order_items?.map((item, index) => (
                          <tr key={index}>
                            <td className="py-2 px-3">
                              <div className="font-medium text-gray-900">
                                {item.cheese_type.charAt(0).toUpperCase() + item.cheese_type.slice(1)} Cheese
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600">{item.quantity} kg</td>
                            <td className="py-2 px-3 text-gray-600">{formatCurrency(item.unit_price)}</td>
                            <td className="py-2 px-3 text-gray-600">{item.discount}%</td>
                            <td className="py-2 px-3 font-medium text-gray-900">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax (18%):</span>
                        <span className="font-medium">{formatCurrency(selectedOrder.tax)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-amber-600">{formatCurrency(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-blue-700">Total Amount</label>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedOrder.total)}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-green-700">Amount Paid</label>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedOrder.total_paid || 0)}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-red-700">Balance Due</label>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedOrder.balance_due || selectedOrder.total)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Payment Status: </span>
                      {getPaymentStatusBadge(selectedOrder.payment_status)}
                    </div>
                    {selectedOrder.payment_status !== 'paid' && (
                      <Button
                        onClick={() => {
                          setIsViewModalOpen(false)
                          openPaymentModal(selectedOrder)
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Record Payment
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-8 pt-6 border-t">
                <Button
                  onClick={() => setIsViewModalOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormData({
                      customer_id: '',
                      delivery_date: '',
                      payment_terms: '',
                      notes: '',
                      items: []
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer *
                    </label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.customer_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., Net 30 days, Cash on delivery"
                  />
                </div>

                {/* Order Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                    <Button
                      type="button"
                      onClick={addOrderItem}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </Button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">No items added yet</p>
                      <Button
                        type="button"
                        onClick={addOrderItem}
                        className="mt-2"
                      >
                        Add First Item
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.items.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product *
                              </label>
                              <select
                                value={item.stock_id}
                                onChange={(e) => updateOrderItem(index, 'stock_id', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                              >
                                <option value="">Select product</option>
                                {stockItems.map((stock) => (
                                  <option key={stock.id} value={stock.id}>
                                    {stock.item_name} ({stock.quantity}{stock.unit} available)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={item.quantity}
                                onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit Price *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount %
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.discount}
                                onChange={(e) => updateOrderItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              />
                            </div>
                            <div className="flex items-end">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Subtotal
                                </label>
                                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                  {formatCurrency(item.subtotal)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOrderItem(index)}
                                className="ml-2 p-2 text-red-600 hover:text-red-800 transition-colors"
                                title="Remove Item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Order Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(calculateOrderTotal().subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax (18%):</span>
                            <span className="font-medium">{formatCurrency(calculateOrderTotal().tax)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between text-lg font-bold">
                            <span>Total:</span>
                            <span className="text-amber-600">{formatCurrency(calculateOrderTotal().total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="Additional notes or special instructions"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setFormData({
                        customer_id: '',
                        delivery_date: '',
                        payment_terms: '',
                        notes: '',
                        items: []
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formData.items.length === 0}>
                    Create Order
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                <button
                  onClick={() => {
                    setIsPaymentModalOpen(false)
                    setPaymentFormData({
                      amount: 0,
                      payment_method: 'mobile_money',
                      reference_number: '',
                      notes: ''
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Order Number:</span>
                    <span className="ml-2 font-medium">{selectedOrder.order_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <span className="ml-2 font-medium">{selectedOrder.customer?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedOrder.total_paid || 0)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="ml-2 font-bold text-red-600">
                      {formatCurrency(selectedOrder.balance_due || selectedOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        RWF
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={selectedOrder.balance_due || selectedOrder.total}
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({ 
                          ...paymentFormData, 
                          amount: parseFloat(e.target.value) || 0 
                        })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {formatCurrency(selectedOrder.balance_due || selectedOrder.total)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ 
                        ...paymentFormData, 
                        payment_method: e.target.value as PaymentMethod 
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    >
                      <option value="mobile_money">Mobile Money (MTN/Airtel)</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {paymentFormData.payment_method === 'mobile_money' && 'Mobile Phone Number *'}
                    {paymentFormData.payment_method === 'bank_transfer' && 'Bank Account Number *'}
                    {paymentFormData.payment_method === 'check' && 'Check Number *'}
                    {paymentFormData.payment_method === 'cash' && 'Receipt Number (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={paymentFormData.reference_number}
                    onChange={(e) => setPaymentFormData({ 
                      ...paymentFormData, 
                      reference_number: e.target.value 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder={
                      paymentFormData.payment_method === 'mobile_money' ? '078XXXXXXX or 073XXXXXXX' :
                      paymentFormData.payment_method === 'bank_transfer' ? 'Account number or IBAN' :
                      paymentFormData.payment_method === 'check' ? 'Check number' :
                      'Receipt or reference number'
                    }
                    required={paymentFormData.payment_method !== 'cash'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentFormData.payment_method === 'mobile_money' && 'Enter the phone number used for mobile money payment'}
                    {paymentFormData.payment_method === 'bank_transfer' && 'Enter bank account number or transaction reference'}
                    {paymentFormData.payment_method === 'check' && 'Enter the check number for tracking'}
                    {paymentFormData.payment_method === 'cash' && 'Optional receipt number for cash payments'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Notes (Optional)
                  </label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ 
                      ...paymentFormData, 
                      notes: e.target.value 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="Additional notes about this payment"
                  />
                </div>

                {/* Payment Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Payment Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Payment Amount:</span>
                      <span className="font-medium text-blue-900">{formatCurrency(paymentFormData.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Payment Method:</span>
                      <span className="font-medium text-blue-900">{getPaymentMethodLabel(paymentFormData.payment_method)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                      <span className="text-blue-700">Remaining Balance:</span>
                      <span className="font-bold text-blue-900">
                        {formatCurrency((selectedOrder.balance_due || selectedOrder.total) - paymentFormData.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsPaymentModalOpen(false)
                      setPaymentFormData({
                        amount: 0,
                        payment_method: 'mobile_money',
                        reference_number: '',
                        notes: ''
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={paymentFormData.amount <= 0 || paymentFormData.amount > (selectedOrder.balance_due || selectedOrder.total)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Record Payment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
