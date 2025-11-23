import { useState, useEffect } from 'react'
import { Search, DollarSign, ShoppingCart, TrendingUp, Calendar, Trash2, Eye, Plus, Package, FileText, Download, RefreshCw, MoreVertical, Edit, CreditCard } from 'lucide-react'
import { supabase as supabaseClient } from '../../lib/supabase'

// Type cast for easier database operations
const supabase = supabaseClient as any
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { Database } from '../../types/database.types'

// Define proper types for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

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
  factory_id: string
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

type SalesOrderRow = Database['public']['Tables']['sales_orders']['Row']

interface SalesOrderWithDetails extends SalesOrderRow {
  customer_name: string
  customer_email: string | null
  customer_phone: string
  source: string
  sales_order_items?: OrderItem[]
  total_paid?: number
  balance_due?: number
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

export default function SeniorManagerSalesPage() {
  const { user } = useAuthStore()
  const [sales, setSales] = useState<SalesOrderWithDetails[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingSale, setViewingSale] = useState<SalesOrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  
  const [chartData, setChartData] = useState<Array<{ name: string; revenue: number; orders: number }>>([])
  
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

  useEffect(() => {
    fetchCustomers()
    fetchStockItems()
    fetchSales()
    fetchChartData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.relative')) {
        setActiveDropdown(null)
      }
    }

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  useEffect(() => {
    calculateAnalytics()
  }, [sales])

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
      // Fetch from main_stock instead of individual factory stock
      const { data, error } = await supabase
        .from('main_stock')
        .select('id, cheese_type, total_quantity, unit, average_unit_cost, location')
        .gt('total_quantity', 0)
        .order('cheese_type')

      if (error) throw error
      
      // Transform main_stock data to match the expected stock items format
      const transformedData = (data as any[])?.map((item: any) => ({
        id: item.id,
        item_name: `${item.cheese_type.charAt(0).toUpperCase() + item.cheese_type.slice(1)} Cheese`,
        cheese_type: item.cheese_type,
        quantity: item.total_quantity,
        unit_cost: item.average_unit_cost,
        unit: item.unit,
        factory_id: 'main_stock' // Indicate this is from main stock
      })) || []
      
      setStockItems(transformedData)
    } catch (error) {
      console.error('Error fetching stock items:', error)
    }
  }

  const fetchChartData = async () => {
    try {
      // Last 7 days sales data - all from main stock now
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const salesChart = await Promise.all(
        last7Days.map(async (date) => {
          const { data: salesData } = await supabase
            .from('sales_orders')
            .select('total, id')
            .eq('order_date', date)

          return {
            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: salesData?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
            orders: salesData?.length || 0
          }
        })
      )

      setChartData(salesChart)
    } catch (error) {
      console.error('Error fetching chart data:', error)
      setChartData([])
    }
  }

  const fetchSales = async () => {
    try {
      setLoading(true)
      
      // All orders from main stock - no factory filtering needed
      const { data: salesData, error: salesError } = await supabase
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
            subtotal
          )
        `)
        .order('created_at', { ascending: false })

      if (salesError) {
        console.error('Sales query error:', salesError)
        throw salesError
      }

      if (!salesData) {
        setSales([])
        return
      }

      // Calculate actual payment amounts for each order
      const ordersWithPayments = await Promise.all(
        (salesData as Database['public']['Tables']['sales_orders']['Row'][]).map(async (order: any) => {
          // Get all invoices for this order
          const { data: invoices, error: invoiceError } = await supabase
            .from('invoices')
            .select('id, amount_paid')
            .eq('order_id', order.id)

          if (invoiceError) {
            console.error('Error fetching invoices:', invoiceError)
          }

          // Calculate total paid from all invoices
          const totalPaid = invoices?.reduce((sum, invoice: any) => sum + (invoice.amount_paid || 0), 0) || 0
          const balanceDue = order.total - totalPaid

          return {
            ...order,
            customer_name: order.customer?.name || 'Unknown Customer',
            customer_email: order.customer?.email || null,
            customer_phone: order.customer?.phone || 'No phone',
            source: 'Main Stock', // All orders now come from main stock
            total_paid: totalPaid,
            balance_due: balanceDue
          }
        })
      )

      setSales(ordersWithPayments)
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast.error('Failed to load sales data')
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = () => {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7)

    // Today's Sales - sum of completed orders today
    const todaySales = sales
      .filter(order => 
        order.order_date === today && 
        order.status === 'completed'
      )
      .reduce((sum, order) => sum + order.total, 0)

    // Pending Orders - count of orders with pending status
    const pendingOrders = sales.filter(order => order.status === 'pending').length

    // Pending Payments - sum of balance_due from all unpaid/partial orders
    const pendingPayments = sales
      .filter(order => 
        order.payment_status === 'pending' || 
        order.payment_status === 'partial' ||
        order.payment_status === 'overdue'
      )
      .reduce((sum, order) => sum + (order.balance_due || order.total), 0)

    // Monthly Revenue - sum of all completed orders this month
    const monthlyRevenue = sales
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

  const addOrderItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          stock_id: '',
          cheese_type: 'gouda',
          quantity: 0,
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

    if (!user?.id) {
      toast.error('User information not found')
      return
    }

    try {
      const orderNumber = generateOrderNumber()
      const { subtotal, tax, total } = calculateOrderTotal()

      // Create the order - all orders now come from main stock
      const orderData = {
        order_number: orderNumber,
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
        .insert(orderData as any)
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw orderError
      }

      // Create order items - no stock_id since we're using main_stock
      const orderItemsData = formData.items.map(item => ({
        order_id: newOrder?.id,
        stock_id: null, // Not using factory stock anymore
        cheese_type: item.cheese_type.toLowerCase(), // Ensure lowercase for consistency
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItemsData as any)

      if (itemsError) {
        console.error('Order items creation error:', itemsError)
        throw itemsError
      }

      // Update main_stock quantities
      for (const item of formData.items) {
        // First get the current quantity from main_stock
        const { data: currentStock } = await (supabase as any)
          .from('main_stock')
          .select('total_quantity')
          .eq('id', item.stock_id)
          .single()

        if (currentStock && currentStock.total_quantity >= item.quantity) {
          const { error: stockError } = await (supabase as any)
            .from('main_stock')
            .update({
              total_quantity: currentStock.total_quantity - item.quantity
            })
            .eq('id', item.stock_id)

          if (stockError) {
            console.error('Error updating main stock:', stockError)
            // Don't throw error to avoid failing the order, but log it
          }
        } else {
          console.warn(`Insufficient stock for item ${item.stock_id}`)
        }
      }

      toast.success('Order created successfully!')
      setShowForm(false)
      setFormData({
        customer_id: '',
        delivery_date: '',
        payment_terms: '',
        notes: '',
        items: []
      })
      fetchSales()
      fetchStockItems() // Refresh stock to show updated quantities
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    }
  }

  const handleView = (sale: SalesOrderWithDetails) => {
    setViewingSale(sale)
    setIsViewModalOpen(true)
  }

  const openPaymentModal = (order: SalesOrderWithDetails) => {
    setViewingSale(order)
    const balanceDue = (order.balance_due !== undefined) ? order.balance_due : order.total
    setPaymentFormData({
      amount: balanceDue > 0 ? balanceDue : order.total,
      payment_method: 'mobile_money',
      reference_number: '',
      notes: ''
    })
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!viewingSale || !paymentFormData.amount || paymentFormData.amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (!user?.id) {
      toast.error('User information not found')
      return
    }

    try {
      // First, create an invoice if it doesn't exist
      const invoiceNumber = `INV-${viewingSale.order_number.replace('ORD-', '')}`
      
      const { data: existingInvoice, error: invoiceCheckError } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', viewingSale.id)
        .single()

      let invoiceId = existingInvoice ? existingInvoice.id : null

      if (!existingInvoice) {
        // Create invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            order_id: viewingSale.id,
            customer_id: viewingSale.customer_id,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            subtotal: viewingSale.subtotal,
            tax: viewingSale.tax,
            total: viewingSale.total,
            amount_paid: 0,
            balance: viewingSale.total,
            payment_status: 'pending',
            created_by: user.id
          } as any)
          .select('id')
          .single()

        if (invoiceError) throw invoiceError
        invoiceId = newInvoice?.id
      }

      // Record the payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          customer_id: viewingSale.customer_id,
          payment_date: new Date().toISOString().split('T')[0],
          amount: paymentFormData.amount,
          payment_method: paymentFormData.payment_method,
          reference_number: paymentFormData.reference_number || null,
          notes: paymentFormData.notes || null,
          received_by: user.id
        } as any)

      if (paymentError) throw paymentError

      // Calculate total payments for this invoice
      const { data: allPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', invoiceId)

      if (paymentsError) throw paymentsError

      const totalPaid = allPayments.reduce((sum, payment: any) => sum + payment.amount, 0)
      const newBalance = viewingSale.total - totalPaid

      // Update invoice with new payment totals
      const { error: updateInvoiceError } = await supabase
        .from('invoices')
        .update({
          amount_paid: totalPaid,
          balance: newBalance,
          payment_status: newBalance <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending'),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', invoiceId)

      if (updateInvoiceError) throw updateInvoiceError

      // Update order payment status
      const orderPaymentStatus: PaymentStatus = newBalance <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending')
      const { error: updateOrderError } = await supabase
        .from('sales_orders')
        .update({
          payment_status: orderPaymentStatus,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', viewingSale.id)

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
      fetchSales()
    } catch (error: any) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq('id', orderId)

      if (error) throw error
      
      toast.success(`Order status updated to ${status}`)
      fetchSales()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() } as any)
        .eq('id', orderId)

      if (error) throw error
      
      toast.success(`Payment status updated to ${paymentStatus}`)
      fetchSales()
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    }
  }

  const handleDelete = async (sale: SalesOrderWithDetails) => {
    if (!confirm('Are you sure you want to delete this sale order? This action cannot be undone.')) return

    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('order_id', sale.id)

      if (itemsError) throw itemsError

      // Then delete the order
      const { error: orderError } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', sale.id)

      if (orderError) throw orderError

      toast.success('Sale order deleted successfully')
      fetchSales()
    } catch (error) {
      console.error('Error deleting sale:', error)
      toast.error('Failed to delete sale order')
    }
  }

  const downloadInvoicePDF = async (order: SalesOrderWithDetails) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Colors
      const primaryColor = [245, 158, 11] as const // Amber-500
      const textColor = [31, 41, 55] as const // Gray-800
      const lightGray = [243, 244, 246] as const // Gray-100
      
      // Header Section
      doc.setFillColor(...primaryColor)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      // Company Logo Area
      doc.setFillColor(255, 255, 255)
      doc.rect(14, 8, 24, 24, 'F')
      doc.setTextColor(245, 158, 11)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('NF', 26, 24)
      
      // Company Details
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('NZIZA FACTORY', 45, 20)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Main Stock Distribution', 45, 28)
      doc.text('Rwanda', 45, 35)
      
      // Invoice Title
      doc.setFillColor(...lightGray)
      doc.rect(0, 40, pageWidth, 25, 'F')
      doc.setTextColor(...textColor)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('INVOICE', 14, 57)
      
      // Invoice Details
      const startY = 75
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('BILL TO:', 14, startY)
      doc.text('INVOICE DETAILS:', pageWidth - 80, startY)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      
      // Customer info (accessing from the loaded relationship data)
      const customerData = (order as any).customer || {
        name: order.customer_name,
        customer_code: 'N/A',
        phone: order.customer_phone
      }
      
      doc.text(customerData.name || 'Customer', 14, startY + 10)
      doc.text(`Customer Code: ${customerData.customer_code || 'N/A'}`, 14, startY + 18)
      doc.text(`Phone: ${customerData.phone || 'N/A'}`, 14, startY + 26)
      
      // Invoice info
      doc.text(`Invoice #: ${order.order_number}`, pageWidth - 80, startY + 10)
      doc.text(`Date: ${new Date(order.order_date).toLocaleDateString()}`, pageWidth - 80, startY + 18)
      doc.text(`Due Date: ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}`, pageWidth - 80, startY + 26)
      doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 80, startY + 34)
      
      // Items Table
      const tableStartY = startY + 50
      const tableHeaders = ['Item', 'Quantity', 'Unit Price', 'Discount', 'Subtotal']
      const tableData = order.sales_order_items?.map(item => [
        item.cheese_type,
        `${item.quantity} kg`,
        formatCurrency(item.unit_price),
        `${item.discount}%`,
        formatCurrency(item.subtotal)
      ]) || []
      
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: tableStartY,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      })
      
      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 20
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      
      const totalsX = pageWidth - 80
      doc.text(`Subtotal: ${formatCurrency(order.subtotal)}`, totalsX, finalY)
      doc.text(`Tax: ${formatCurrency(order.tax)}`, totalsX, finalY + 10)
      doc.text(`Discount: ${formatCurrency(order.discount)}`, totalsX, finalY + 20)
      
      doc.setFontSize(14)
      doc.text(`TOTAL: ${formatCurrency(order.total)}`, totalsX, finalY + 35)
      
      if (order.total_paid && order.total_paid > 0) {
        doc.text(`Paid: ${formatCurrency(order.total_paid)}`, totalsX, finalY + 45)
        doc.text(`Balance: ${formatCurrency((order.balance_due || order.total))}`, totalsX, finalY + 55)
      }
      
      // Footer
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Thank you for your business!', 14, pageWidth - 20)
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, pageWidth - 10)
      
      // Download
      doc.save(`invoice-${order.order_number}.pdf`)
      toast.success('Invoice PDF downloaded successfully')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate invoice PDF')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
      case 'processing':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Processing</span>
      case 'completed':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Completed</span>
      case 'cancelled':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Cancelled</span>
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
      case 'partial':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Partial</span>
      case 'paid':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Paid</span>
      case 'overdue':
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Overdue</span>
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
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

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer_email && sale.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesPaymentStatus = filterPaymentStatus === 'all' || sale.payment_status === filterPaymentStatus
    const matchesStatus = filterStatus === 'all' || sale.status === filterStatus

    return matchesSearch && matchesPaymentStatus && matchesStatus
  })

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalOrders = sales.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const paidSales = sales.filter(s => s.payment_status === 'paid')
  const pendingSales = sales.filter(s => s.payment_status === 'pending')
  const overdueSales = sales.filter(s => s.payment_status === 'overdue')

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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales & Orders Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Create orders, track deliveries, and manage payments across all factories</p>
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {analytics.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Order
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.todaySales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-600">{analytics.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.pendingPayments)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.monthlyRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} RWF</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{avgOrderValue.toLocaleString()} RWF</p>
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
                {sales.filter(s => new Date(s.order_date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Overview & Weekly Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Overview */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Paid ({paidSales.length})</span>
              <span className="text-green-600 font-bold">
                {paidSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} RWF
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-800 font-medium">Pending ({pendingSales.length})</span>
              <span className="text-yellow-600 font-bold">
                {pendingSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} RWF
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-red-800 font-medium">Overdue ({overdueSales.length})</span>
              <span className="text-red-600 font-bold">
                {overdueSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} RWF
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Sales Trend Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Sales Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Revenue and order count (last 7 days)</p>
          
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <div className="relative h-full">
                <div className="flex items-end justify-between h-full pb-8">
                  {chartData.map((day, index) => {
                    const maxRevenue = Math.max(...chartData.map(d => d.revenue))
                    const maxOrders = Math.max(...chartData.map(d => d.orders))
                    const revenueHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 180 : 0
                    const ordersHeight = maxOrders > 0 ? (day.orders / maxOrders) * 180 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1">
                        <div className="flex gap-1 items-end">
                          <div 
                            className="w-4 bg-amber-500 rounded-t"
                            style={{ height: `${revenueHeight}px` }}
                            title={`Revenue: ${day.revenue.toLocaleString()} RWF`}
                          />
                          <div 
                            className="w-4 bg-orange-500 rounded-t"
                            style={{ height: `${ordersHeight}px` }}
                            title={`Orders: ${day.orders}`}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{day.name}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-500 rounded"></div>
                    <span className="text-xs text-gray-600">Revenue</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-xs text-gray-600">Orders</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No sales data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{sale.order_number}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(sale.order_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{sale.customer_name}</div>
                      <div className="text-sm text-gray-500">{sale.customer_email}</div>
                      <div className="text-sm text-gray-500">{sale.customer_phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {sale.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {sale.sales_order_items?.length || 0} item(s)
                    </div>
                    {sale.sales_order_items?.slice(0, 2).map((item, index) => (
                      <div key={index} className="text-xs text-gray-500">
                        {item.cheese_type} ({item.quantity}kg)
                      </div>
                    ))}
                    {(sale.sales_order_items?.length || 0) > 2 && (
                      <div className="text-xs text-gray-500">
                        +{(sale.sales_order_items?.length || 0) - 2} more
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{formatCurrency(sale.total)}</div>
                    <div className="text-sm text-gray-500">
                      Subtotal: {formatCurrency(sale.subtotal)}
                    </div>
                    {(sale.total_paid || 0) > 0 && (
                      <div className="text-xs text-green-600">
                        Paid: {formatCurrency(sale.total_paid || 0)}
                      </div>
                    )}
                    {(sale.balance_due || sale.total) > 0 && sale.payment_status !== 'paid' && (
                      <div className="text-xs text-red-600">
                        Due: {formatCurrency(sale.balance_due || sale.total)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {getPaymentStatusBadge(sale.payment_status)}
                      <select
                        value={sale.payment_status}
                        onChange={(e) => updatePaymentStatus(sale.id, e.target.value as PaymentStatus)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                      >
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {getStatusBadge(sale.status)}
                      <select
                        value={sale.status}
                        onChange={(e) => updateOrderStatus(sale.id, e.target.value as OrderStatus)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === sale.id ? null : sale.id)}
                        className="inline-flex items-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        title="More actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeDropdown === sale.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                handleView(sale)
                                setActiveDropdown(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors group"
                            >
                              <Eye className="w-4 h-4 mr-3 text-blue-600 group-hover:text-blue-700" />
                              View Details
                            </button>
                            
                            {sale.payment_status !== 'paid' && (
                              <button
                                onClick={() => {
                                  openPaymentModal(sale)
                                  setActiveDropdown(null)
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors group"
                              >
                                <CreditCard className="w-4 h-4 mr-3 text-green-600 group-hover:text-green-700" />
                                Record Payment
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                downloadInvoicePDF(sale)
                                setActiveDropdown(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors group"
                            >
                              <Download className="w-4 h-4 mr-3 text-purple-600 group-hover:text-purple-700" />
                              Download Invoice
                            </button>
                            
                            {sale.status === 'pending' && (
                              <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    handleDelete(sale)
                                    setActiveDropdown(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 transition-colors group"
                                >
                                  <Trash2 className="w-4 h-4 mr-3 text-red-600 group-hover:text-red-700" />
                                  Delete Order
                                </button>
                              </>
                            )}
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
        <div className="lg:hidden space-y-4 p-4">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{sale.order_number}</h3>
                  <p className="text-sm text-gray-600">{sale.customer_name}</p>
                  <p className="text-xs text-gray-500">{sale.customer_phone}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {getStatusBadge(sale.status)}
                  {getPaymentStatusBadge(sale.payment_status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Source</p>
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {sale.source}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Order Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(sale.order_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Items</p>
                  <p className="text-sm font-medium text-gray-900">
                    {sale.sales_order_items?.length || 0} item(s)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Amount</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(sale.total)}</p>
                  {(sale.total_paid || 0) > 0 && (
                    <p className="text-xs text-blue-600">Paid: {formatCurrency(sale.total_paid || 0)}</p>
                  )}
                  {(sale.balance_due || sale.total) > 0 && sale.payment_status !== 'paid' && (
                    <p className="text-xs text-red-600">Due: {formatCurrency(sale.balance_due || sale.total)}</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleView(sale)}
                  className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">View</span>
                </button>
                {sale.payment_status !== 'paid' && (
                  <button
                    onClick={() => openPaymentModal(sale)}
                    className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Pay</span>
                  </button>
                )}
                <button
                  onClick={() => downloadInvoicePDF(sale)}
                  className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Invoice</span>
                </button>
                {sale.status === 'pending' && (
                  <button
                    onClick={() => handleDelete(sale)}
                    className="flex-1 min-w-[80px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12 px-6">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No sales found</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{sale.order_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(sale.order_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : sale.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.payment_status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : sale.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : sale.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Factory Info */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer</p>
                      <div>
                        <p className="font-medium text-gray-900">{sale.customer_name}</p>
                        {sale.customer_email && (
                          <p className="text-sm text-gray-600">{sale.customer_email}</p>
                        )}
                        <p className="text-sm text-gray-600">{sale.customer_phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Source</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {sale.source}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Amount</p>
                        <div>
                          <p className="font-semibold text-gray-900">{sale.total.toLocaleString()} RWF</p>
                          <p className="text-xs text-gray-500">Subtotal: {sale.subtotal.toLocaleString()} RWF</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional details if available */}
                    {(sale.tax || sale.discount) && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {sale.tax && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax</p>
                            <p className="text-gray-700">{sale.tax.toLocaleString()} RWF</p>
                          </div>
                        )}
                        {sale.discount && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Discount</p>
                            <p className="text-gray-700">{sale.discount.toLocaleString()} RWF</p>
                          </div>
                        )}
                      </div>
                    )}

                    {(sale.delivery_date || sale.payment_terms) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {sale.delivery_date && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Delivery Date</p>
                            <p className="text-gray-700">{new Date(sale.delivery_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {sale.payment_terms && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment Terms</p>
                            <p className="text-gray-700">{sale.payment_terms}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="relative pt-3 border-t border-gray-300">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === `mobile-${sale.id}` ? null : `mobile-${sale.id}`)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 mr-2" />
                      Actions
                    </button>
                    
                    {activeDropdown === `mobile-${sale.id}` && (
                      <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleView(sale)
                              setActiveDropdown(null)
                            }}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors group"
                          >
                            <Eye className="w-4 h-4 mr-3 text-blue-600 group-hover:text-blue-700" />
                            View Details
                          </button>
                          
                          {sale.payment_status !== 'paid' && (
                            <button
                              onClick={() => {
                                openPaymentModal(sale)
                                setActiveDropdown(null)
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors group"
                            >
                              <CreditCard className="w-4 h-4 mr-3 text-green-600 group-hover:text-green-700" />
                              Record Payment
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              downloadInvoicePDF(sale)
                              setActiveDropdown(null)
                            }}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 transition-colors group"
                          >
                            <Download className="w-4 h-4 mr-3 text-purple-600 group-hover:text-purple-700" />
                            Download Invoice
                          </button>
                          
                          {sale.status === 'pending' && (
                            <>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                onClick={() => {
                                  handleDelete(sale)
                                  setActiveDropdown(null)
                                }}
                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 transition-colors group"
                              >
                                <Trash2 className="w-4 h-4 mr-3 text-red-600 group-hover:text-red-700" />
                                Delete Order
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isViewModalOpen && viewingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Sale Order Details</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.order_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.customer_name}</p>
                  <p className="text-xs text-gray-500">{viewingSale.customer_email}</p>
                  <p className="text-xs text-gray-500">{viewingSale.customer_phone}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.source}</p>
</div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(viewingSale.order_date).toLocaleDateString()}</p>
                </div>
                
                {viewingSale.delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                    <p className="text-sm text-gray-900 mt-1">{new Date(viewingSale.delivery_date).toLocaleDateString()}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.subtotal.toLocaleString()} RWF</p>
                </div>
                
                {viewingSale.tax && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingSale.tax.toLocaleString()} RWF</p>
                  </div>
                )}
                
                {viewingSale.discount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Discount</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingSale.discount.toLocaleString()} RWF</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total</label>
                  <p className="text-sm font-bold text-gray-900 mt-1">{viewingSale.total.toLocaleString()} RWF</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                  <span className={`inline-flex px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                    viewingSale.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : viewingSale.payment_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSale.payment_status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                    viewingSale.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : viewingSale.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : viewingSale.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingSale.status}
                  </span>
                </div>
                
                {viewingSale.payment_terms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                    <p className="text-sm text-gray-900 mt-1">{viewingSale.payment_terms}</p>
                  </div>
                )}
              </div>
              
              {viewingSale.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{viewingSale.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
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
                    <button
                      type="button"
                      onClick={addOrderItem}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">No items added yet</p>
                      <button
                        type="button"
                        onClick={addOrderItem}
                        className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        Add First Item
                      </button>
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
                                {stockItems

                                  .map((stock) => (
                                    <option key={stock.id} value={stock.id}>
                                      {stock.item_name} ({stock.quantity}{stock.unit} available)
                                    </option>
                                  ))
                                }
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
                                value={item.quantity || ''}
                                onChange={(e) => updateOrderItem(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="Enter quantity"
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
                                value={item.unit_price || ''}
                                onChange={(e) => updateOrderItem(index, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="Enter price"
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
                                value={item.discount || ''}
                                onChange={(e) => updateOrderItem(index, 'discount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="0"
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
                                <Trash2 className="w-4 h-4" />
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
                  <button
                    type="button"
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
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={formData.items.length === 0 || !formData.customer_id}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && viewingSale && (
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
                    <span className="ml-2 font-medium">{viewingSale.order_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <span className="ml-2 font-medium">{viewingSale.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(viewingSale.total)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="ml-2 font-medium">{formatCurrency(viewingSale.total_paid || 0)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="ml-2 font-bold text-red-600">
                      {formatCurrency(viewingSale.balance_due || viewingSale.total)}
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
                        max={viewingSale.balance_due || viewingSale.total}
                        value={paymentFormData.amount || ''}
                        onChange={(e) => setPaymentFormData({ 
                          ...paymentFormData, 
                          amount: e.target.value === '' ? 0 : parseFloat(e.target.value) 
                        })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {formatCurrency(viewingSale.balance_due || viewingSale.total)}
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
                        {formatCurrency((viewingSale.balance_due || viewingSale.total) - paymentFormData.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false)
                      setPaymentFormData({
                        amount: 0,
                        payment_method: 'mobile_money',
                        reference_number: '',
                        notes: ''
                      })
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={paymentFormData.amount <= 0 || paymentFormData.amount > (viewingSale.balance_due || viewingSale.total)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}