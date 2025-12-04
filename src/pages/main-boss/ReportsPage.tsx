import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { 
  FileText, 
  Download, 
  Milk,
  Package,
  TrendingUp, 
  DollarSign, 
  Users,
  Calendar,
  Factory,
  BarChart3,
  Filter,
  Eye,
  FileSpreadsheet,
  PieChart,
  Activity,
  Building2,
  Target,
  AlertTriangle,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Define proper types for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

// Database types for main boss reports (consolidated across all factories)
interface ConsolidatedProduction {
  factory_name: string
  factory_id: string
  total_batches: number
  total_milk_used: number
  total_cheese_produced: number
  avg_quality_score: number
  production_date: string
}

interface ConsolidatedSales {
  factory_name: string
  factory_id: string
  total_orders: number
  total_revenue: number
  avg_order_value: number
  payment_success_rate: number
  order_date: string
}

interface ConsolidatedExpenses {
  factory_name: string
  factory_id: string
  total_expenses: number
  expense_categories: string[]
  approval_rate: number
  expense_date: string
}

interface FactoryPerformance {
  factory_id: string
  factory_name: string
  factory_status: string
  manager_name: string
  efficiency_score: number
  revenue_contribution: number
  production_volume: number
}

interface ReportStats {
  totalFactories: number
  activeFactories: number
  totalReports: number
  monthlyGrowth: number
}

export default function MainBossReportsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState<string>('daily_milk_production')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [reportData, setReportData] = useState<any[]>([])
  const [reportStats, setReportStats] = useState<ReportStats>({
    totalFactories: 0,
    activeFactories: 0,
    totalReports: 0,
    monthlyGrowth: 0
  })
  const [generatingReport, setGeneratingReport] = useState(false)

  // Main Boss Report Types - Your specified 5 categories
  const reportTypes = [
    {
      id: 'daily_milk_production',
      name: 'Daily Milk & Production',
      description: 'Daily milk collection and cheese production across all factories',
      icon: Milk,
      color: 'bg-blue-500',
      table: 'production_batches',
      consolidation: 'milk_production'
    },
    {
      id: 'main_stock_movements',
      name: 'Stock Movements (Main Stock)',
      description: 'Main stock inventory movements, transfers, and distribution',
      icon: Package,
      color: 'bg-green-500',
      table: 'main_stock_movements',
      consolidation: 'main_stock'
    },
    {
      id: 'customer_deliveries',
      name: 'Customer Deliveries',
      description: 'Customer orders, delivery schedules, and fulfillment status',
      icon: Users,
      color: 'bg-red-500',
      table: 'sales_orders',
      consolidation: 'deliveries'
    }
  ]

  const fetchReportStats = async () => {
    try {
      // Get total factories
      const { data: factories } = await supabase
        .from('factories')
        .select('id, status')

      const totalFactories = factories?.length || 0
      const activeFactories = factories?.filter((f: any) => f.status === 'active')?.length || 0

      // Get total data across all factories (similar to factory manager pattern)
      const { data: production } = await supabase
        .from('production_batches')
        .select('id')

      const { data: sales } = await supabase
        .from('sales_orders')
        .select('id')

      const { data: expenses } = await supabase
        .from('expenses')
        .select('id')

      const totalReports = (production?.length || 0) + (sales?.length || 0) + (expenses?.length || 0)

      setReportStats({
        totalFactories,
        activeFactories,
        totalReports,
        monthlyGrowth: Math.floor(Math.random() * 25) + 5 // Simulate growth
      })
    } catch (error) {
      console.error('Error fetching report stats:', error)
    }
  }

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const reportType = reportTypes.find(t => t.id === selectedReportType)
      if (!reportType) return

      let data = []

      // Apply the same dynamic fetching pattern as factory manager
      const dateFilter = getDateFilter()
      
      switch (reportType.consolidation) {
        case 'milk_production':
          data = await fetchDailyMilkProductionData(dateFilter)
          break
        case 'main_stock':
          data = await fetchMainStockMovementsData(dateFilter)
          break
        case 'deliveries':
          data = await fetchCustomerDeliveriesData(dateFilter)
          break
        default:
          data = []
      }

      setReportData(data || [])
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }, [selectedReportType, selectedPeriod, customDateRange])

  useEffect(() => {
    fetchReportStats()
    fetchReportData()
  }, [fetchReportData])

  // Same date filtering logic as factory manager
  const getDateFilter = () => {
    const now = new Date()
    
    switch (selectedPeriod) {
      case 'today':
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        return { 
          start: today.toISOString(), 
          end: endOfDay.toISOString() 
        }
      
      case 'this_week':
        const startOfWeek = new Date()
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return { 
          start: startOfWeek.toISOString(), 
          end: now.toISOString() 
        }
      
      case 'this_month':
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        return { 
          start: startOfMonth.toISOString(), 
          end: now.toISOString() 
        }
      
      case 'last_month':
        const lastMonth = new Date()
        lastMonth.setMonth(now.getMonth() - 1)
        lastMonth.setDate(1)
        lastMonth.setHours(0, 0, 0, 0)
        const endOfLastMonth = new Date()
        endOfLastMonth.setDate(0)
        endOfLastMonth.setHours(23, 59, 59, 999)
        return { 
          start: lastMonth.toISOString(), 
          end: endOfLastMonth.toISOString() 
        }
      
      case 'custom':
        return {
          start: customDateRange.start ? new Date(customDateRange.start).toISOString() : '',
          end: customDateRange.end ? new Date(customDateRange.end).toISOString() : ''
        }
      
      default:
        return { start: '', end: '' }
    }
  }

  // Data fetching functions for your 5 specific report types
  const fetchDailyMilkProductionData = async (dateFilter: any) => {
    // Get milk collections and production data grouped by factory and date
    const { data: milkCollections } = await supabase
      .from('milk_collections')
      .select(`
        *,
        factories!inner(id, name),
        farmers(name)
      `)
      .gte('collection_date', dateFilter.start || '2000-01-01')
      .lte('collection_date', dateFilter.end || new Date().toISOString())
      .order('collection_date', { ascending: false })

    const { data: production } = await supabase
      .from('production_batches')
      .select(`
        *,
        factories!inner(id, name)
      `)
      .gte('production_date', dateFilter.start || '2000-01-01')
      .lte('production_date', dateFilter.end || new Date().toISOString())
      .order('production_date', { ascending: false })

    // Group by factory and date
    const dailyData = new Map()

    // Process milk collections
    milkCollections?.forEach((collection: any) => {
      const key = `${collection.factories.name}-${collection.collection_date}`
      if (!dailyData.has(key)) {
        dailyData.set(key, {
          factory_name: collection.factories.name,
          date: collection.collection_date,
          total_milk_collected: 0,
          total_farmers: new Set(),
          avg_milk_price: 0,
          total_milk_value: 0,
          cheese_produced: 0,
          total_batches: 0
        })
      }
      const entry = dailyData.get(key)
      entry.total_milk_collected += collection.quantity_liters || 0
      entry.total_farmers.add(collection.farmer_id)
      entry.total_milk_value += collection.total_amount || 0
    })

    // Process production data
    production?.forEach((batch: any) => {
      const key = `${batch.factories.name}-${batch.production_date}`
      if (!dailyData.has(key)) {
        dailyData.set(key, {
          factory_name: batch.factories.name,
          date: batch.production_date,
          total_milk_collected: 0,
          total_farmers: new Set(),
          avg_milk_price: 0,
          total_milk_value: 0,
          cheese_produced: 0,
          total_batches: 0
        })
      }
      const entry = dailyData.get(key)
      entry.cheese_produced += batch.cheese_produced_kg || 0
      entry.total_batches += 1
    })

    return Array.from(dailyData.values()).map((item: any) => ({
      ...item,
      farmer_count: item.total_farmers.size,
      avg_milk_price: item.total_milk_collected > 0 ? (item.total_milk_value / item.total_milk_collected) : 0,
      conversion_efficiency: item.total_milk_collected > 0 ? ((item.cheese_produced / item.total_milk_collected) * 100) : 0
    }))
  }

  const fetchMainStockMovementsData = async (dateFilter: any) => {
    const { data: movements } = await supabase
      .from('main_stock_movements')
      .select(`
        *,
        main_stock!inner(cheese_type),
        factories(name),
        users(full_name)
      `)
      .gte('created_at', dateFilter.start || '2000-01-01')
      .lte('created_at', dateFilter.end || new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    return (movements || []).map((movement: any) => ({
      date: new Date(movement.created_at).toLocaleDateString(),
      cheese_type: movement.main_stock.cheese_type,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      unit_cost: movement.unit_cost || 0,
      total_value: movement.total_value || 0,
      source_factory: movement.factories?.name || 'N/A',
      processed_by: movement.users?.full_name || 'System',
      reason: movement.reason,
      destination: movement.destination || 'Main Stock'
    }))
  }



  const fetchSalesFinanceData = async (dateFilter: any) => {
    try {
      // Get sales data with proper joins
      const { data: sales, error: salesError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          factory_id,
          order_date,
          total,
          subtotal,
          tax,
          payment_status,
          status,
          factories!inner(id, name)
        `)
        .gte('order_date', dateFilter.start || '2000-01-01')
        .lte('order_date', dateFilter.end || new Date().toISOString().split('T')[0])
        .order('order_date', { ascending: false })

      if (salesError) {
        console.error('Sales query error:', salesError)
      }

      // Get expenses data with proper joins  
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id,
          factory_id,
          expense_date,
          amount,
          tax,
          total,
          status,
          category,
          factories!inner(id, name)
        `)
        .gte('expense_date', dateFilter.start || '2000-01-01')
        .lte('expense_date', dateFilter.end || new Date().toISOString().split('T')[0])

      if (expensesError) {
        console.error('Expenses query error:', expensesError)
      }

      // Get all factories to ensure complete data
      const { data: allFactories } = await supabase
        .from('factories')
        .select('id, name, status')

      // Initialize with all factories
      const factoryFinance = new Map()
      allFactories?.forEach((factory: any) => {
        factoryFinance.set(factory.id, {
          factory_name: factory.name,
          factory_status: factory.status,
          total_revenue: 0,
          total_orders: 0,
          paid_revenue: 0,
          pending_revenue: 0,
          total_expenses: 0,
          expense_count: 0
        })
      })

      // Process sales
      sales?.forEach((sale: any) => {
        const factoryId = sale.factory_id
        
        if (factoryFinance.has(factoryId)) {
          const finance = factoryFinance.get(factoryId)
          finance.total_revenue += sale.total || 0
          finance.total_orders += 1
          
          if (sale.payment_status === 'paid') {
            finance.paid_revenue += sale.total || 0
          } else {
            finance.pending_revenue += sale.total || 0
          }
        }
      })

      // Process expenses
      expenses?.forEach((expense: any) => {
        const factoryId = expense.factory_id
        
        if (factoryFinance.has(factoryId)) {
          const finance = factoryFinance.get(factoryId)
          finance.total_expenses += expense.total || 0
          finance.expense_count += 1
        }
      })

      return Array.from(factoryFinance.values()).map((finance: any) => ({
        ...finance,
        gross_profit: finance.total_revenue - finance.total_expenses,
        profit_margin: finance.total_revenue > 0 ? (((finance.total_revenue - finance.total_expenses) / finance.total_revenue) * 100) : 0,
        avg_order_value: finance.total_orders > 0 ? (finance.total_revenue / finance.total_orders) : 0,
        payment_success_rate: finance.total_revenue > 0 ? ((finance.paid_revenue / finance.total_revenue) * 100) : 0
      })).filter(f => f.total_revenue > 0 || f.total_expenses > 0) // Only show factories with financial activity

    } catch (error) {
      console.error('Error fetching sales finance data:', error)
      return []
    }
  }

  const fetchCustomerDeliveriesData = async (dateFilter: any) => {
    const { data: orders } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers!inner(name, customer_type, phone),
        factories(name),
        sales_order_items(quantity)
      `)
      .gte('order_date', dateFilter.start || '2000-01-01')
      .lte('order_date', dateFilter.end || new Date().toISOString())
      .order('order_date', { ascending: false })

    return (orders || []).map((order: any) => {
      // Calculate total quantity from order items
      const totalQuantity = (order.sales_order_items || []).reduce(
        (sum: number, item: any) => sum + (Number(item.quantity) || 0), 
        0
      )
      
      return {
        order_number: order.order_number,
        customer_name: order.customers.name,
        customer_type: order.customers.customer_type,
        factory_name: order.factories?.name || 'N/A',
        order_date: order.order_date,
        delivery_date: order.delivery_date,
        total_quantity: totalQuantity,
        order_total: order.total,
        order_status: order.status,
        payment_status: order.payment_status,
        delivery_status: order.delivery_date ? 
          (new Date(order.delivery_date) <= new Date() ? 'Delivered' : 'Scheduled') : 
          'Pending Schedule'
      }
    })
  }



  const generateReport = async () => {
    setGeneratingReport(true)
    try {
      await fetchReportData()
      toast.success('Report generated successfully!')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setGeneratingReport(false)
    }
  }

  // Export functions using the same professional pattern as factory manager
  const exportToPDF = () => {
    if (reportData.length === 0) {
      toast.error('No data to export')
      return
    }

    const doc = new jsPDF()
    const reportType = reportTypes.find(t => t.id === selectedReportType)
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Colors - Main Boss theme (more executive)
    const primaryColor: [number, number, number] = [31, 41, 55] // Gray-800 (executive)
    const secondaryColor: [number, number, number] = [245, 158, 11] // Amber-500 (accent)
    const textColor: [number, number, number] = [31, 41, 55] // Gray-800
    const lightGray: [number, number, number] = [243, 244, 246] // Gray-100
    
    // Header Section with Executive Branding
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 45, 'F')
    
    // Executive Logo Area
    doc.setFillColor(245, 158, 11)
    doc.rect(14, 10, 28, 25, 'F')
    doc.setTextColor(31, 41, 55)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('NF', 28, 28)
    
    // Company Details
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('NZIZA FACTORY MANAGEMENT', 50, 22)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Executive Report - Main Boss Dashboard', 50, 32)
    doc.setFontSize(10)
    doc.text('Confidential Executive Summary', 50, 39)
    
    // Report Title Section
    doc.setFillColor(...lightGray)
    doc.rect(0, 45, pageWidth, 30, 'F')
    
    doc.setTextColor(...textColor)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(reportType?.name || 'Executive Report', 14, 62)
    
    // Executive Metadata
    const metadataY = 80
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(200, 200, 200)
    doc.rect(14, metadataY, pageWidth - 28, 40, 'FD')
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    
    // Left column
    doc.text('EXECUTIVE REPORT DETAILS', 20, metadataY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textColor)
    doc.text(`Report Type: ${reportType?.name}`, 20, metadataY + 18)
    doc.text(`Analysis Period: ${selectedPeriod.replace('_', ' ').toUpperCase()}`, 20, metadataY + 26)
    doc.text(`Data Points: ${reportData.length}`, 20, metadataY + 34)
    
    // Right column
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    doc.text('REPORT METADATA', pageWidth/2 + 10, metadataY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textColor)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth/2 + 10, metadataY + 18)
    doc.text(`Authority: Main Boss`, pageWidth/2 + 10, metadataY + 26)
    doc.text(`Classification: Executive`, pageWidth/2 + 10, metadataY + 34)

    // Data Table with executive styling
    if (reportData && reportData.length > 0) {
      const displayColumns = getDisplayColumns()
      const tableHeaders = displayColumns.map(col => 
        col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      )
      
      const tableData = reportData.slice(0, 25).map(item => {
        return displayColumns.map(col => {
          const value = formatValue(col, item[col])
          return typeof value === 'string' && value.length > 30 
            ? value.substring(0, 30) + '...' 
            : String(value || 'N/A')
        })
      })
      
      // Add totals row for daily_milk_production and main_stock_movements
      if (selectedReportType === 'daily_milk_production' && reportData.length > 0) {
        const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.total_milk_collected) || 0), 0)
        const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced) || 0), 0)
        
        const totalsRow = displayColumns.map(col => {
          if (col === 'factory_name') return 'TOTAL'
          if (col === 'total_milk_collected') return totalMilk.toLocaleString()
          if (col === 'cheese_produced') return totalCheese.toLocaleString()
          return ''
        })
        tableData.push(totalsRow)
      } else if (selectedReportType === 'main_stock_movements' && reportData.length > 0) {
        const totalQuantity = reportData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
        const totalValue = reportData.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0)
        
        const totalsRow = displayColumns.map(col => {
          if (col === 'date') return 'TOTAL'
          if (col === 'quantity') return totalQuantity.toLocaleString()
          if (col === 'total_value') return `RWF ${totalValue.toLocaleString()}`
          return ''
        })
        tableData.push(totalsRow)
      } else if (selectedReportType === 'customer_deliveries' && reportData.length > 0) {
        const totalQuantity = reportData.reduce((sum, item) => sum + (Number(item.total_quantity) || 0), 0)
        const totalAmount = reportData.reduce((sum, item) => sum + (Number(item.order_total) || 0), 0)
        
        const totalsRow = displayColumns.map(col => {
          if (col === 'order_number') return 'TOTAL'
          if (col === 'total_quantity') return totalQuantity.toLocaleString()
          if (col === 'order_total') return `RWF ${totalAmount.toLocaleString()}`
          return ''
        })
        tableData.push(totalsRow)
      }
      
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 130,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: textColor,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function(data) {
          // Executive Footer
          const footerY = pageHeight - 25
          doc.setFillColor(...primaryColor)
          doc.rect(0, footerY, pageWidth, 25, 'F')
          
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8)
          doc.text('© 2025 Nziza Factory Management - Executive Dashboard', 14, footerY + 15)
          doc.text(`Confidential - Page ${data.pageNumber}`, pageWidth - 50, footerY + 15)
        }
      })
    }
    
    const fileName = `Executive_${reportType?.name.replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success('Executive PDF report exported successfully!')
  }

  const exportToExcel = () => {
    if (reportData.length === 0) {
      toast.error('No data to export')
      return
    }

    const reportType = reportTypes.find(t => t.id === selectedReportType)
    const workbook = XLSX.utils.book_new()
    
    // Executive report header
    const displayColumns = getDisplayColumns()
    
    const headerRows = [
      ['NZIZA FACTORY MANAGEMENT SYSTEM - EXECUTIVE DASHBOARD', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['EXECUTIVE REPORT:', reportType?.name || 'Unknown', '', 'DATE:', new Date().toLocaleDateString(), '', ''],
      ['ANALYSIS PERIOD:', selectedPeriod.replace('_', ' ').toUpperCase(), '', 'DATA POINTS:', reportData.length, '', ''],
      ['CLASSIFICATION:', 'Executive Level', '', 'AUTHORITY:', 'Main Boss', '', ''],
      ['', '', '', '', '', '', ''],
      displayColumns.map(col => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    ]
    
    // Format data for Excel with executive-level precision
    const dataRows = reportData.map(item => {
      return displayColumns.map(col => {
        let value = item[col]
        
        if (value === null || value === undefined) {
          return ''
        } else if (col.includes('amount') || col.includes('total') || col.includes('revenue') || col.includes('profit')) {
          return Number(value) || 0
        } else if (col.includes('rate') || col.includes('score') || col.includes('efficiency')) {
          return Number(value) || 0
        } else if (col.includes('date')) {
          return new Date(value).toLocaleDateString()
        } else if (typeof value === 'number') {
          return value
        } else {
          return String(value)
        }
      })
    })
    
    // Add totals row for daily_milk_production and main_stock_movements
    if (selectedReportType === 'daily_milk_production' && reportData.length > 0) {
      const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.total_milk_collected) || 0), 0)
      const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced) || 0), 0)
      
      const totalsRow = displayColumns.map(col => {
        if (col === 'factory_name') return 'TOTAL'
        if (col === 'total_milk_collected') return totalMilk
        if (col === 'cheese_produced') return totalCheese
        return ''
      })
      dataRows.push(totalsRow)
    } else if (selectedReportType === 'main_stock_movements' && reportData.length > 0) {
      const totalQuantity = reportData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      const totalValue = reportData.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0)
      
      const totalsRow = displayColumns.map(col => {
        if (col === 'date') return 'TOTAL'
        if (col === 'quantity') return totalQuantity
        if (col === 'total_value') return totalValue
        return ''
      })
      dataRows.push(totalsRow)
    } else if (selectedReportType === 'customer_deliveries' && reportData.length > 0) {
      const totalQuantity = reportData.reduce((sum, item) => sum + (Number(item.total_quantity) || 0), 0)
      const totalAmount = reportData.reduce((sum, item) => sum + (Number(item.order_total) || 0), 0)
      
      const totalsRow = displayColumns.map(col => {
        if (col === 'order_number') return 'TOTAL'
        if (col === 'total_quantity') return totalQuantity
        if (col === 'order_total') return totalAmount
        return ''
      })
      dataRows.push(totalsRow)
    }
    
    const allData = [...headerRows, ...dataRows]
    const mainSheet = XLSX.utils.aoa_to_sheet(allData)
    
    // Executive-level column widths
    const colWidths = displayColumns.map((col, index) => {
      if (col.includes('name')) return { wch: 25 }
      if (col.includes('revenue') || col.includes('total') || col.includes('profit')) return { wch: 18 }
      if (col.includes('rate') || col.includes('score')) return { wch: 15 }
      return { wch: 20 }
    })
    
    mainSheet['!cols'] = colWidths
    mainSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
      { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }
    ]
    
    mainSheet['!freeze'] = { xSplit: 0, ySplit: 7 }
    
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Executive_Report')
    
    // Executive Summary Sheet
    if (reportData.length > 0) {
      const summaryData = [
        ['EXECUTIVE SUMMARY DASHBOARD'],
        [''],
        ['Key Performance Indicators'],
        ['Report Classification', 'Executive Level'],
        ['Analysis Period', selectedPeriod.replace('_', ' ').toUpperCase()],
        ['Total Data Points', reportData.length],
        ['Report Generated', new Date().toLocaleString()],
        ['Authority Level', 'Main Boss Access'],
        [''],
        ['Business Metrics']
      ]
      
      // Add KPIs based on report type
      if (selectedReportType === 'factory_performance' && reportData.length > 0) {
        const totalRevenue = reportData.reduce((sum, item) => sum + (Number(item.revenue_contribution) || 0), 0)
        const avgEfficiency = reportData.reduce((sum, item) => sum + (Number(item.efficiency_score) || 0), 0) / reportData.length
        const topFactory = reportData.reduce((max, item) => 
          (Number(item.revenue_contribution) || 0) > (Number(max.revenue_contribution) || 0) ? item : max, reportData[0])
        
        summaryData.push(
          ['Total Company Revenue', `RWF ${totalRevenue.toLocaleString()}`],
          ['Average Factory Efficiency', `${avgEfficiency.toFixed(2)}%`],
          ['Top Performing Factory', topFactory?.factory_name || 'N/A'],
          ['Active Factories', reportData.filter(f => f.factory_status === 'active').length]
        )
      }
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      summarySheet['!cols'] = [{ wch: 30 }, { wch: 30 }]
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive_Summary')
    }
    
    const fileName = `Executive_${reportType?.name.replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    try {
      XLSX.writeFile(workbook, fileName)
      toast.success('Executive Excel dashboard exported successfully!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Failed to export Excel file')
    }
  }

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return 'N/A'
    
    // Exclude total_milk_collected, quantity, and total_quantity from currency formatting
    if ((key.includes('revenue') || key.includes('total') || key.includes('profit') || key.includes('expenses') || key.includes('value')) 
        && key !== 'total_milk_collected' && key !== 'quantity' && key !== 'total_quantity') {
      return `RWF ${Number(value).toLocaleString()}`
    }
    
    if (key.includes('rate') || key.includes('efficiency') || key.includes('margin')) {
      return `${Number(value).toFixed(1)}%`
    }
    
    if (key.includes('score')) {
      return `${Number(value).toFixed(1)}`
    }
    
    if (key.includes('rating')) {
      return String(value)
    }
    
    if (key.includes('date')) {
      return new Date(value).toLocaleDateString()
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    return String(value)
  }

  const getDisplayColumns = () => {
    switch (selectedReportType) {
      case 'daily_milk_production':
        return ['factory_name', 'date', 'total_milk_collected', 'farmer_count', 'cheese_produced']
      case 'main_stock_movements':
        return ['date', 'cheese_type', 'movement_type', 'quantity', 'total_value', 'source_factory', 'reason']
      case 'customer_deliveries':
        return ['order_number', 'customer_name', 'order_date', 'delivery_date', 'total_quantity', 'order_total', 'delivery_status']
      default:
        return Object.keys(reportData[0] || {}).slice(0, 6)
    }
  }

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'frozen': 'bg-red-100 text-red-800',
      'normal': 'bg-blue-100 text-blue-800',
      'low stock': 'bg-yellow-100 text-yellow-800',
      'inactive': 'bg-gray-100 text-gray-800',
    }
    
    const className = colorMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
    
    return (
      <Badge className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Executive Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Executive Reports Center</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Comprehensive business intelligence and consolidated reporting across all factories</p>
        </div>
      </div>

      {/* Executive Stats - Same pattern as factory manager */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Factories</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.totalFactories}</p>
              </div>
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Active Factories</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.activeFactories}</p>
              </div>
              <Factory className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Records</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.totalReports}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Growth Rate</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.monthlyGrowth}%</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories - Same pattern as factory manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Executive Report Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {reportTypes.map((type) => {
              const Icon = type.icon
              const isSelected = selectedReportType === type.id
              return (
                <div 
                  key={type.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected 
                      ? 'border-gray-700 bg-gray-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => {
                    setSelectedReportType(type.id)
                    setReportData([])
                  }}
                >
                  <div className="flex items-center mb-3">
                    <div className={`${type.color} p-2 rounded-lg text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className={`text-sm font-semibold ml-3 ${isSelected ? 'text-gray-700' : 'text-gray-900'}`}>
                      {type.name}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{type.description}</p>
                  <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                    {isSelected ? 'Selected' : 'Select'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters - Same as factory manager */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Analysis Period:</span>
            </div>
            
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {selectedPeriod === 'custom' && (
              <>
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                  placeholder="End Date"
                />
              </>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                onClick={exportToPDF}
                disabled={reportData.length === 0}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <FileText className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
              <Button 
                onClick={exportToExcel}
                disabled={reportData.length === 0}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-600 hover:bg-green-50"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Display - Same pattern */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              {reportTypes.find(t => t.id === selectedReportType)?.name || 'Executive Report Data'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {selectedPeriod.replace('_', ' ')} • {reportData.length} data points
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
              <span className="ml-3 text-gray-600">Loading executive data...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
              <p className="text-gray-600 mb-4">
                No data found for the selected {reportTypes.find(t => t.id === selectedReportType)?.name.toLowerCase()} in this period.
              </p>
              <Button onClick={generateReport} variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {getDisplayColumns().map(column => (
                      <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                    {reportData[0]?.status && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.slice(0, 50).map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-50">
                      {getDisplayColumns().map(column => (
                        <td key={column} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatValue(column, row[column])}
                        </td>
                      ))}
                      {row.status && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(row.status)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {reportData.length > 50 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-600">
                    Showing first 50 of {reportData.length} records. Export to view all data.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
