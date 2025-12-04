import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { 
  FileText, 
  Download, 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  Factory, 
  Calendar,
  Filter,
  Eye,
  FileSpreadsheet,
  PieChart,
  Activity,
  Users,
  Package,
  Plus,
  Milk,
  ShoppingCart
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

// Database types for reports
interface ProductionBatch {
  id: string
  batch_number: string
  production_date: string
  cheese_type: string
  milk_used_liters: number
  cheese_produced_kg: number
  conversion_ratio: number
  waste_kg: number | null
  quality_score: number | null
  status: string
}

interface SalesOrder {
  id: string
  order_number: string
  order_date: string
  customer_id: string
  status: string
  subtotal: number
  tax: number
  total: number
  payment_status: string
}

interface Expense {
  id: string
  expense_number: string
  category: string
  subcategory: string | null
  expense_date: string
  amount: number
  tax: number
  total: number
  status: string
  description: string
}

interface MilkCollection {
  id: string
  collection_date: string
  quantity_liters: number
  price_per_liter: number
  total_amount: number
  quality_grade: string | null
  temperature: number | null
}

interface ReportStats {
  totalReports: number
  thisMonth: number
  recentActivity: number
  avgDataPoints: number
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState<string>('production')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [showCustomDateModal, setShowCustomDateModal] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])
  const [reportStats, setReportStats] = useState<ReportStats>({
    totalReports: 0,
    thisMonth: 0,
    recentActivity: 0,
    avgDataPoints: 0
  })
  const [generatingReport, setGeneratingReport] = useState(false)

  const reportTypes = [
    { 
      id: 'production', 
      name: 'Production Reports', 
      icon: Factory, 
      color: 'bg-blue-500', 
      description: 'Track daily production metrics, cheese output, and conversion efficiency',
      table: 'production_batches'
    },
    { 
      id: 'expenses', 
      name: 'Expense Reports', 
      icon: DollarSign, 
      color: 'bg-red-500', 
      description: 'Analyze spending patterns, costs, and budget utilization',
      table: 'expenses'
    },
    { 
      id: 'milk_collection', 
      name: 'Milk Collection Reports', 
      icon: Milk, 
      color: 'bg-purple-500', 
      description: 'Track milk intake, quality grades, and farmer payments',
      table: 'milk_collections'
    },
    { 
      id: 'inventory', 
      name: 'Inventory Reports', 
      icon: Package, 
      color: 'bg-orange-500', 
      description: 'Stock levels, movements, and inventory valuation',
      table: 'stock'
    },
  ]

  const fetchReportStats = async () => {
    try {
      // Get basic stats from multiple tables
      const { data: production } = await supabase
        .from('production_batches')
        .select('id')
        .eq('factory_id', user?.factory_id)

      const { data: sales } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('factory_id', user?.factory_id)

      const { data: expenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('factory_id', user?.factory_id)

      const { data: collections } = await supabase
        .from('milk_collections')
        .select('id')
        .eq('factory_id', user?.factory_id)

      const totalReports = (production?.length || 0) + (sales?.length || 0) + (expenses?.length || 0) + (collections?.length || 0)
      
      // Get this month's data
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: thisMonthData } = await supabase
        .from('production_batches')
        .select('id')
        .eq('factory_id', user?.factory_id)
        .gte('created_at', startOfMonth.toISOString())

      setReportStats({
        totalReports,
        thisMonth: thisMonthData?.length || 0,
        recentActivity: Math.floor(totalReports * 0.3), // Simulate recent activity
        avgDataPoints: Math.floor(totalReports / 4) // Average across report types
      })
    } catch (error) {
      console.error('Error fetching report stats:', error)
    }
  }

  const fetchReportData = useCallback(async () => {
    if (!user?.factory_id) return
    
    setLoading(true)
    try {
      const reportType = reportTypes.find(t => t.id === selectedReportType)
      if (!reportType) return

      let query = supabase
        .from(reportType.table)
        .select('*')
        .eq('factory_id', user.factory_id)

      // Apply date filtering
      const dateFilter = getDateFilter()
      if (dateFilter.start && dateFilter.end) {
        const dateField = getDateFieldForTable(reportType.table)
        query = query
          .gte(dateField, dateFilter.start)
          .lte(dateField, dateFilter.end)
      }

      query = query.order('created_at', { ascending: false }).limit(100)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching report data:', error)
        toast.error('Failed to fetch report data')
        return
      }

      setReportData(data || [])
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }, [user?.factory_id, selectedReportType, selectedPeriod, customDateRange])

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

  const getDateFieldForTable = (table: string) => {
    switch (table) {
      case 'production_batches':
        return 'production_date'
      case 'sales_orders':
        return 'order_date'
      case 'expenses':
        return 'expense_date'
      case 'milk_collections':
        return 'collection_date'
      default:
        return 'created_at'
    }
  }

  // Auto-fetch report data when report type or period changes
  useEffect(() => {
    if (user?.factory_id) {
      fetchReportStats()
      fetchReportData()
    }
  }, [user?.factory_id, fetchReportData])

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

  const exportToPDF = () => {
    if (reportData.length === 0) {
      toast.error('No data to export')
      return
    }

    const doc = new jsPDF()
    const reportType = reportTypes.find(t => t.id === selectedReportType)
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Colors
    const primaryColor = [245, 158, 11] as const // Amber-500
    const secondaryColor = [59, 130, 246] as const // Blue-500
    const textColor = [31, 41, 55] as const // Gray-800
    const lightGray = [243, 244, 246] as const // Gray-100
    
    // Header Section with Company Branding
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    // Company Logo Area (placeholder)
    doc.setFillColor(255, 255, 255)
    doc.rect(14, 8, 24, 24, 'F')
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('NF', 26, 24) // Nziza Factory initials
    
    // Company Details
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('NZIZA FACTORY MANAGEMENT', 45, 20)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Professional Dairy Production & Management System', 45, 30)
    
    // Report Title Section
    doc.setFillColor(...lightGray)
    doc.rect(0, 40, pageWidth, 25, 'F')
    
    doc.setTextColor(...textColor)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(reportType?.name || 'Data Report', 14, 55)
    
    // Report Metadata in a styled box
    const metadataY = 70
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(200, 200, 200)
    doc.rect(14, metadataY, pageWidth - 28, 35, 'FD')
    
    // Metadata content in two columns
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    
    // Left column
    doc.text('REPORT DETAILS', 20, metadataY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textColor)
    doc.text(`Factory ID: ${user?.factory_id || 'N/A'}`, 20, metadataY + 15)
    doc.text(`Period: ${selectedPeriod.replace('_', ' ').toUpperCase()}`, 20, metadataY + 22)
    doc.text(`Total Records: ${reportData.length}`, 20, metadataY + 29)
    
    // Right column
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    doc.text('GENERATION INFO', pageWidth/2 + 10, metadataY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textColor)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth/2 + 10, metadataY + 15)
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, pageWidth/2 + 10, metadataY + 22)
    doc.text(`By: Factory Manager`, pageWidth/2 + 10, metadataY + 29)
    
    // Data Table
    if (reportData && reportData.length > 0) {
      const displayColumns = getDisplayColumns()
      const tableHeaders = displayColumns.map(col => 
        col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      )
      
      // Add status column if available
      if (reportData[0].status) {
        tableHeaders.push('STATUS')
      }
      
      const tableData = reportData.slice(0, 30).map(item => { // Limit to 30 rows for better PDF layout
        const row = displayColumns.map(col => {
          const value = formatValue(col, item[col])
          // Truncate long values for PDF
          return typeof value === 'string' && value.length > 25 
            ? value.substring(0, 25) + '...' 
            : String(value || 'N/A')
        })
        
        // Add status if available
        if (item.status) {
          row.push(String(item.status).toUpperCase())
        }
        
        return row
      })
      
      // Add totals row for production and milk collection reports
      if (selectedReportType === 'production' && reportData.length > 0) {
        const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.milk_used_liters) || 0), 0)
        const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced_kg) || 0), 0)
        
        // Create totals row matching the column structure
        const totalsRow = displayColumns.map(col => {
          if (col === 'batch_number') return 'TOTAL'
          if (col === 'milk_used_liters') return totalMilk.toLocaleString()
          if (col === 'cheese_produced_kg') return totalCheese.toLocaleString()
          return ''
        })
        tableData.push(totalsRow)
      } else if (selectedReportType === 'milk_collection' && reportData.length > 0) {
        const totalLiters = reportData.reduce((sum, item) => sum + (Number(item.quantity_liters) || 0), 0)
        
        const totalsRow = displayColumns.map(col => {
          if (col === 'collection_date') return 'TOTAL'
          if (col === 'quantity_liters') return totalLiters.toLocaleString()
          return ''
        })
        tableData.push(totalsRow)
      }
      
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 115,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: textColor,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Very light gray
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'left' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        didDrawCell: function(data) {
          // Make totals row bold and highlighted
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            if ((selectedReportType === 'production' || selectedReportType === 'milk_collection') && reportData.length > 0) {
              doc.setFont('helvetica', 'bold')
              doc.setFillColor(245, 158, 11, 0.1) // Light amber background
            }
          }
        },
        willDrawCell: function(data) {
          // Highlight totals row
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            if ((selectedReportType === 'production' || selectedReportType === 'milk_collection') && reportData.length > 0) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [255, 249, 235] // Very light amber
              data.cell.styles.textColor = [120, 53, 15] // Dark amber
            }
          }
        },
        didDrawPage: function(data) {
          // Footer on each page
          const footerY = pageHeight - 20
          doc.setFillColor(...primaryColor)
          doc.rect(0, footerY, pageWidth, 20, 'F')
          
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8)
          doc.text('© 2025 Nziza Factory Management System', 14, footerY + 12)
          doc.text(`Page ${data.pageNumber}`, pageWidth - 30, footerY + 12)
        }
      })
      
      // Summary section after table
      const finalY = (doc as any).lastAutoTable.finalY + 20
      if (finalY < pageHeight - 60) {
        // Calculate summary height based on report type
        let summaryHeight = 25
        if (selectedReportType === 'production' || selectedReportType === 'milk_collection') {
          summaryHeight = 40 // More space for totals
        }
        
        doc.setFillColor(...lightGray)
        doc.rect(14, finalY, pageWidth - 28, summaryHeight, 'F')
        
        doc.setTextColor(...textColor)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('REPORT SUMMARY', 20, finalY + 8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(`This report contains ${reportData.length} records for ${reportType?.name}`, 20, finalY + 16)
        doc.text(`Data filtered for period: ${selectedPeriod.replace('_', ' ')}`, 20, finalY + 21)
        
        // Add specific totals based on report type
        if (selectedReportType === 'production' && reportData.length > 0) {
          const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.milk_used_liters) || 0), 0)
          const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced_kg) || 0), 0)
          
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...secondaryColor)
          doc.text('PRODUCTION TOTALS:', 20, finalY + 28)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...textColor)
          doc.text(`Total Milk Used: ${totalMilk.toLocaleString()} Liters  |  Total Cheese Produced: ${totalCheese.toLocaleString()} Kg`, 20, finalY + 35)
        } else if (selectedReportType === 'milk_collection' && reportData.length > 0) {
          const totalLiters = reportData.reduce((sum, item) => sum + (Number(item.quantity_liters) || 0), 0)
          
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...secondaryColor)
          doc.text('COLLECTION TOTALS:', 20, finalY + 28)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...textColor)
          doc.text(`Total Milk Collected: ${totalLiters.toLocaleString()} Liters`, 20, finalY + 35)
        }
      }
    }
    
    const fileName = `${reportType?.name.replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast.success('PDF exported successfully!')
  }

  const exportToExcel = () => {
    if (reportData.length === 0) {
      toast.error('No data to export')
      return
    }

    const reportType = reportTypes.find(t => t.id === selectedReportType)
    const workbook = XLSX.utils.book_new()
    
    // === MAIN REPORT SHEET ===
    const displayColumns = getDisplayColumns()
    
    // Create professional header rows
    const headerRows = [
      // Company header
      ['NZIZA FACTORY MANAGEMENT SYSTEM', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      // Report info in a clean format
      ['Report:', reportType?.name || 'Unknown', '', 'Date:', new Date().toLocaleDateString(), '', ''],
      ['Period:', selectedPeriod.replace('_', ' ').toUpperCase(), '', 'Records:', reportData.length, '', ''],
      ['Factory:', user?.factory_id || 'N/A', '', 'Time:', new Date().toLocaleTimeString(), '', ''],
      ['', '', '', '', '', '', ''], // Spacer
      // Table headers
      displayColumns.map(col => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    ]
    
    // Add status column if data has status
    if (reportData.length > 0 && reportData[0].status) {
      headerRows[6].push('STATUS')
    }
    
    // Prepare data rows with proper formatting
    const dataRows = reportData.map(item => {
      const row = displayColumns.map(col => {
        let value = item[col]
        
        // Format values for Excel
        if (value === null || value === undefined) {
          return ''
        } else if (col.includes('amount') || col.includes('total') || col.includes('price') || col.includes('salary')) {
          return Number(value) || 0 // Keep as number for Excel calculations
        } else if (col.includes('date') || col.includes('_at')) {
          return new Date(value).toLocaleDateString()
        } else if (typeof value === 'number') {
          return value
        } else {
          return String(value)
        }
      })
      
      // Add status if available
      if (item.status) {
        row.push(String(item.status).toUpperCase())
      }
      
      return row
    })
    
    // Add totals row for production and milk collection reports
    if (selectedReportType === 'production' && reportData.length > 0) {
      const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.milk_used_liters) || 0), 0)
      const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced_kg) || 0), 0)
      
      const totalsRow = displayColumns.map(col => {
        if (col === 'batch_number') return 'TOTAL'
        if (col === 'milk_used_liters') return totalMilk
        if (col === 'cheese_produced_kg') return totalCheese
        return ''
      })
      
      if (reportData[0]?.status) {
        totalsRow.push('')
      }
      
      dataRows.push(totalsRow)
    } else if (selectedReportType === 'milk_collection' && reportData.length > 0) {
      const totalLiters = reportData.reduce((sum, item) => sum + (Number(item.quantity_liters) || 0), 0)
      
      const totalsRow = displayColumns.map(col => {
        if (col === 'collection_date') return 'TOTAL'
        if (col === 'quantity_liters') return totalLiters
        return ''
      })
      
      dataRows.push(totalsRow)
    }
    
    // Combine all data
    const allData = [...headerRows, ...dataRows]
    
    // Create the worksheet
    const mainSheet = XLSX.utils.aoa_to_sheet(allData)
    
    // Set column widths
    const colWidths = displayColumns.map((col, index) => {
      if (col.includes('id')) return { wch: 12 }
      if (col.includes('number') || col.includes('code')) return { wch: 15 }
      if (col.includes('name') || col.includes('description')) return { wch: 25 }
      if (col.includes('date')) return { wch: 12 }
      if (col.includes('amount') || col.includes('total') || col.includes('price')) return { wch: 15 }
      return { wch: 18 }
    })
    
    if (reportData.length > 0 && reportData[0].status) {
      colWidths.push({ wch: 12 }) // Status column
    }
    
    mainSheet['!cols'] = colWidths
    
    // Merge cells for header
    mainSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Company name
      { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }, // Report type value
      { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }, // Period value
      { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }  // Factory value
    ]
    
    // Freeze panes to keep headers visible
    mainSheet['!freeze'] = { xSplit: 0, ySplit: 7 }
    
    XLSX.utils.book_append_sheet(workbook, mainSheet, reportType?.name.replace(/\s+/g, '_') || 'Report')
    
    // === SUMMARY SHEET (Only if we have meaningful data to summarize) ===
    if (reportData.length > 0) {
      const summaryData = [
        ['EXECUTIVE SUMMARY'],
        [''],
        ['Report Overview'],
        ['Report Type', reportType?.name || 'Unknown'],
        ['Period Analyzed', selectedPeriod.replace('_', ' ').toUpperCase()],
        ['Total Records', reportData.length],
        ['Generated', new Date().toLocaleString()],
        [''],
        ['Key Metrics']
      ]
      
      // Add specific metrics based on report type
      if (selectedReportType === 'production' && reportData.length > 0) {
        const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.milk_used_liters) || 0), 0)
        const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced_kg) || 0), 0)
        
        summaryData.push(
          ['Total Milk Used', `${totalMilk.toLocaleString()} Liters`],
          ['Total Cheese Produced', `${totalCheese.toLocaleString()} Kg`],
          ['Production Efficiency', totalMilk > 0 ? `${((totalCheese / totalMilk) * 100).toFixed(2)}%` : 'N/A'],
          ['Total Production Batches', reportData.length]
        )
      } else if (selectedReportType === 'sales' && reportData.length > 0) {
        const totalRevenue = reportData.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
        const avgOrderValue = totalRevenue / reportData.length
        const paidOrders = reportData.filter(item => item.payment_status === 'paid').length
        
        summaryData.push(
          ['Total Revenue', `RWF ${totalRevenue.toLocaleString()}`],
          ['Average Order Value', `RWF ${Math.round(avgOrderValue).toLocaleString()}`],
          ['Orders Processed', reportData.length],
          ['Payment Success Rate', `${((paidOrders / reportData.length) * 100).toFixed(1)}%`]
        )
      } else if (selectedReportType === 'expenses' && reportData.length > 0) {
        const totalExpenses = reportData.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
        const avgExpense = totalExpenses / reportData.length
        const approvedExpenses = reportData.filter(item => item.status === 'approved').length
        const categories = [...new Set(reportData.map(item => item.category).filter(Boolean))]
        
        summaryData.push(
          ['Total Expenses', `RWF ${totalExpenses.toLocaleString()}`],
          ['Average Expense', `RWF ${Math.round(avgExpense).toLocaleString()}`],
          ['Expense Categories', categories.length],
          ['Approval Rate', `${((approvedExpenses / reportData.length) * 100).toFixed(1)}%`]
        )
      } else if (selectedReportType === 'milk_collection' && reportData.length > 0) {
        const totalLiters = reportData.reduce((sum, item) => sum + (Number(item.quantity_liters) || 0), 0)
        const totalValue = reportData.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0)
        const avgPrice = reportData.reduce((sum, item) => sum + (Number(item.price_per_liter) || 0), 0) / reportData.length
        
        summaryData.push(
          ['Total Milk Collected', `${totalLiters.toLocaleString()} Liters`],
          ['Total Value', `RWF ${totalValue.toLocaleString()}`],
          ['Average Price per Liter', `RWF ${avgPrice.toFixed(2)}`],
          ['Collection Sessions', reportData.length]
        )
      }
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 25 }]
      
      // Merge header
      summarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
      ]
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    }
    
    const fileName = `${reportType?.name.replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    try {
      XLSX.writeFile(workbook, fileName)
      toast.success('Professional Excel report exported successfully!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Failed to export Excel file')
    }
  }

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'completed': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
      'approved': 'bg-blue-100 text-blue-800',
      'processing': 'bg-purple-100 text-purple-800',
      'paid': 'bg-green-100 text-green-800',
      'unpaid': 'bg-red-100 text-red-800',
      'partial': 'bg-yellow-100 text-yellow-800',
    }
    
    const className = colorMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
    
    return (
      <Badge className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return 'N/A'
    
    // Format currency fields
    if (key.includes('amount') || key.includes('total') || key.includes('price') || key.includes('salary')) {
      return `RWF ${Number(value).toLocaleString()}`
    }
    
    // Format date fields
    if (key.includes('date') || key.includes('_at')) {
      return new Date(value).toLocaleDateString()
    }
    
    // Format numbers
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    return String(value)
  }

  const getDisplayColumns = () => {
    switch (selectedReportType) {
      case 'production':
        return ['batch_number', 'production_date', 'cheese_type', 'milk_used_liters', 'cheese_produced_kg', 'status']
      case 'expenses':
        return ['expense_number', 'category', 'expense_date', 'amount', 'tax', 'total', 'status']
      case 'milk_collection':
        return ['collection_date', 'quantity_liters', 'price_per_liter', 'total_amount']
      default:
        return Object.keys(reportData[0] || {}).slice(0, 7)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Same pattern as FarmersPage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Generate comprehensive reports with real-time data and export capabilities</p>
        </div>
        <Button 
          onClick={generateReport}
          disabled={generatingReport}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full sm:w-auto"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          {generatingReport ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {/* Stats Cards - Same pattern as FarmersPage */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Records</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.totalReports}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">This Month</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.thisMonth}</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Recent Activity</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.recentActivity}</p>
              </div>
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Avg per Type</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{reportStats.avgDataPoints}</p>
              </div>
              <PieChart className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Report Categories</CardTitle>
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
                      ? 'border-amber-500 bg-amber-50 shadow-md' 
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                  onClick={() => {
                    setSelectedReportType(type.id)
                  }}
                >
                  <div className="flex items-center mb-3">
                    <div className={`${type.color} p-2 rounded-lg text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className={`text-sm font-semibold ml-3 ${isSelected ? 'text-amber-700' : 'text-gray-900'}`}>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filters:</span>
            </div>
            
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
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

      {/* Data Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              {reportTypes.find(t => t.id === selectedReportType)?.name || 'Report Data'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {selectedPeriod.replace('_', ' ')} • {reportData.length} records
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
              <span className="ml-3 text-gray-600">Loading data...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
              <p className="text-gray-600 mb-4">
                No {reportTypes.find(t => t.id === selectedReportType)?.name.toLowerCase()} found for the selected period.
              </p>
              <Button onClick={generateReport} variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <>
              {/* Production Summary for Production Reports */}
              {selectedReportType === 'production' && reportData.length > 0 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Production Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Total Milk Used</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.reduce((sum, item) => sum + (Number(item.milk_used_liters) || 0), 0).toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 ml-1">Liters</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Total Cheese Produced</p>
                      <p className="text-2xl font-bold text-green-600">
                        {reportData.reduce((sum, item) => sum + (Number(item.cheese_produced_kg) || 0), 0).toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 ml-1">Kg</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Conversion Efficiency</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {(() => {
                          const totalMilk = reportData.reduce((sum, item) => sum + (Number(item.milk_used_liters) || 0), 0)
                          const totalCheese = reportData.reduce((sum, item) => sum + (Number(item.cheese_produced_kg) || 0), 0)
                          return totalMilk > 0 ? ((totalCheese / totalMilk) * 100).toFixed(2) : '0'
                        })()}
                        <span className="text-sm font-normal text-gray-500 ml-1">%</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {getDisplayColumns().map(column => (
                        <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.slice(0, 50).map((row, index) => ( // Limit to 50 rows for performance
                      <tr key={row.id || index} className="hover:bg-gray-50">
                        {getDisplayColumns().map(column => (
                          <td key={column} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {column === 'status' || column === 'payment_status' ? (
                              getStatusBadge(row[column])
                            ) : (
                              formatValue(column, row[column])
                            )}
                          </td>
                        ))}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
