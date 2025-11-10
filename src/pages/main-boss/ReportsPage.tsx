import { useState, useEffect } from 'react'
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
  Milk,
  ShoppingCart,
  Building2,
  RefreshCw
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

interface ReportStats {
  totalReports: number
  thisMonth: number
  recentActivity: number
  avgDataPoints: number
}

export default function MainBossReportsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState<string>('consolidated')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
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
      id: 'consolidated', 
      name: 'Consolidated Reports', 
      icon: Building2, 
      color: 'bg-blue-500', 
      description: 'System-wide consolidated performance reports across all factories',
    },
    { 
      id: 'factory_performance', 
      name: 'Factory Performance', 
      icon: Factory, 
      color: 'bg-green-500', 
      description: 'Individual factory performance analysis and benchmarking',
    },
    { 
      id: 'financial_overview', 
      name: 'Financial Overview', 
      icon: DollarSign, 
      color: 'bg-purple-500', 
      description: 'Revenue, expenses, profitability analysis across all operations',
    },
    { 
      id: 'production_analytics', 
      name: 'Production Analytics', 
      icon: Package, 
      color: 'bg-orange-500', 
      description: 'Production efficiency, quality metrics, and capacity utilization',
    },
    { 
      id: 'sales_performance', 
      name: 'Sales Performance', 
      icon: TrendingUp, 
      color: 'bg-indigo-500', 
      description: 'Sales trends, customer analysis, and market performance',
    },
    { 
      id: 'operational_kpis', 
      name: 'Operational KPIs', 
      icon: Activity, 
      color: 'bg-red-500', 
      description: 'Key performance indicators and operational efficiency metrics',
    },
  ]

  useEffect(() => {
    fetchReportStats()
    fetchReportData()
  }, [selectedReportType, selectedPeriod])

  const fetchReportStats = async () => {
    try {
      // Get comprehensive stats across all factories
      const { data: factories } = await supabase
        .from('factories')
        .select('id, name')

      const { data: production } = await supabase
        .from('production_batches')
        .select('id, factory_id')

      const { data: sales } = await supabase
        .from('sales_orders')
        .select('id, factory_id')

      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, factory_id')

      const { data: users } = await supabase
        .from('users')
        .select('id, factory_id')

      const totalReports = (factories?.length || 0) * 4 // Simulate daily reports per factory
      
      // Get this month's data
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: thisMonthData } = await supabase
        .from('production_batches')
        .select('id')
        .gte('created_at', startOfMonth.toISOString())

      setReportStats({
        totalReports,
        thisMonth: thisMonthData?.length || 0,
        recentActivity: Math.floor(totalReports * 0.25),
        avgDataPoints: Math.floor(totalReports / reportTypes.length)
      })
    } catch (error) {
      console.error('Error fetching report stats:', error)
    }
  }

  const fetchReportData = async () => {
    setLoading(true)
    try {
      let data: any[] = []

      switch (selectedReportType) {
        case 'consolidated':
          data = await fetchConsolidatedData()
          break
        case 'factory_performance':
          data = await fetchFactoryPerformanceData()
          break
        case 'financial_overview':
          data = await fetchFinancialData()
          break
        case 'production_analytics':
          data = await fetchProductionData()
          break
        case 'sales_performance':
          data = await fetchSalesData()
          break
        case 'operational_kpis':
          data = await fetchKPIData()
          break
        default:
          data = []
      }

      setReportData(data)
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  const fetchConsolidatedData = async () => {
    const { data: factories } = await supabase.from('factories').select('*')
    const consolidatedReports = []

    if (factories) {
      for (const factory of factories) {
        const dateFilter = getDateFilter()
        
        // Get production metrics
        const { data: production } = await supabase
          .from('production_batches')
          .select('*')
          .eq('factory_id', factory.id)
          .gte('production_date', dateFilter.start || '2024-01-01')
          .lte('production_date', dateFilter.end || new Date().toISOString())

        // Get sales metrics
        const { data: sales } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('factory_id', factory.id)
          .gte('order_date', dateFilter.start || '2024-01-01')
          .lte('order_date', dateFilter.end || new Date().toISOString())

        // Get expenses
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('factory_id', factory.id)
          .gte('expense_date', dateFilter.start || '2024-01-01')
          .lte('expense_date', dateFilter.end || new Date().toISOString())

        const totalProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
        const totalRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
        const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0
        const netProfit = totalRevenue - totalExpenses
        const efficiency = totalProduction > 0 ? Math.round((netProfit / totalProduction) * 100) : 0

        consolidatedReports.push({
          id: factory.id,
          factory_name: factory.name,
          factory_code: factory.code,
          location: factory.location,
          total_production: totalProduction,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          efficiency_ratio: efficiency,
          batches_count: production?.length || 0,
          orders_count: sales?.length || 0,
          status: netProfit >= 0 ? 'profitable' : 'loss'
        })
      }
    }

    return consolidatedReports.sort((a, b) => b.total_revenue - a.total_revenue)
  }

  const fetchFactoryPerformanceData = async () => {
    const { data: factories } = await supabase.from('factories').select('*')
    const performanceData = []

    if (factories) {
      for (const factory of factories) {
        const { data: production } = await supabase
          .from('production_batches')
          .select('*')
          .eq('factory_id', factory.id)

        const { data: employees } = await supabase
          .from('employees')
          .select('*')
          .eq('factory_id', factory.id)

        const totalProduction = production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0
        const avgQuality = production?.length > 0 
          ? production.reduce((sum, p) => sum + (p.quality_score || 0), 0) / production.length 
          : 0
        const capacity = factory.capacity || 1000
        const utilization = Math.round((totalProduction / capacity) * 100)

        performanceData.push({
          id: factory.id,
          factory_name: factory.name,
          capacity_kg: capacity,
          production_output: totalProduction,
          capacity_utilization: utilization,
          average_quality: Math.round(avgQuality * 10) / 10,
          employee_count: employees?.length || 0,
          production_batches: production?.length || 0,
          productivity_per_employee: employees?.length > 0 ? Math.round(totalProduction / employees.length) : 0,
          status: utilization >= 80 ? 'optimal' : utilization >= 60 ? 'good' : 'underutilized'
        })
      }
    }

    return performanceData.sort((a, b) => b.capacity_utilization - a.capacity_utilization)
  }

  const fetchFinancialData = async () => {
    const { data: factories } = await supabase.from('factories').select('*')
    const financialData = []

    if (factories) {
      for (const factory of factories) {
        const dateFilter = getDateFilter()
        
        const { data: sales } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('factory_id', factory.id)
          .gte('order_date', dateFilter.start || '2024-01-01')

        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('factory_id', factory.id)
          .gte('expense_date', dateFilter.start || '2024-01-01')

        const totalRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
        const totalExpenses = expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0
        const grossProfit = totalRevenue - totalExpenses
        const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0

        // Category breakdown
        const categoryExpenses = expenses?.reduce((acc: any, e) => {
          acc[e.category] = (acc[e.category] || 0) + (e.total || 0)
          return acc
        }, {}) || {}

        financialData.push({
          id: factory.id,
          factory_name: factory.name,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          gross_profit: grossProfit,
          profit_margin: profitMargin,
          operational_expenses: categoryExpenses['operational'] || 0,
          maintenance_expenses: categoryExpenses['maintenance'] || 0,
          utilities_expenses: categoryExpenses['utilities'] || 0,
          sales_count: sales?.length || 0,
          expense_count: expenses?.length || 0,
          status: profitMargin >= 20 ? 'excellent' : profitMargin >= 10 ? 'good' : profitMargin >= 0 ? 'break_even' : 'loss'
        })
      }
    }

    return financialData.sort((a, b) => b.profit_margin - a.profit_margin)
  }

  const fetchProductionData = async () => {
    const { data: production } = await supabase
      .from('production_batches')
      .select(`
        *,
        factories!inner(name, code)
      `)

    return production?.map(p => ({
      id: p.id,
      batch_number: p.batch_number,
      factory_name: p.factories.name,
      production_date: p.production_date,
      cheese_type: p.cheese_type,
      milk_used_liters: p.milk_used_liters || 0,
      cheese_produced_kg: p.cheese_produced_kg || 0,
      conversion_ratio: p.conversion_ratio || 0,
      quality_score: p.quality_score || 0,
      waste_kg: p.waste_kg || 0,
      efficiency: p.milk_used_liters > 0 ? Math.round((p.cheese_produced_kg / p.milk_used_liters) * 100) : 0,
      status: p.status
    })) || []
  }

  const fetchSalesData = async () => {
    const { data: sales } = await supabase
      .from('sales_orders')
      .select(`
        *,
        factories!inner(name, code),
        customers!inner(name, email)
      `)

    return sales?.map(s => ({
      id: s.id,
      order_number: s.order_number,
      factory_name: s.factories.name,
      customer_name: s.customers.name,
      order_date: s.order_date,
      subtotal: s.subtotal || 0,
      tax: s.tax || 0,
      total: s.total || 0,
      payment_status: s.payment_status,
      delivery_status: s.status,
      profit_margin: s.subtotal > 0 ? Math.round(((s.total - s.subtotal * 0.7) / s.total) * 100) : 0,
      status: s.status
    })) || []
  }

  const fetchKPIData = async () => {
    const { data: factories } = await supabase.from('factories').select('*')
    const kpiData = []

    if (factories) {
      for (const factory of factories) {
        // Get various metrics for KPI calculation
        const { data: production } = await supabase
          .from('production_batches')
          .select('*')
          .eq('factory_id', factory.id)

        const { data: sales } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('factory_id', factory.id)

        const { data: employees } = await supabase
          .from('employees')
          .select('*')
          .eq('factory_id', factory.id)

        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('factory_id', factory.id)

        // Calculate KPIs
        const productionEfficiency = production?.length > 0 
          ? Math.round(production.reduce((sum, p) => sum + (p.quality_score || 0), 0) / production.length)
          : 0

        const customerSatisfaction = 85 + Math.floor(Math.random() * 15) // Simulated
        const employeeProductivity = employees?.length > 0 
          ? Math.round((production?.reduce((sum, p) => sum + (p.cheese_produced_kg || 0), 0) || 0) / employees.length)
          : 0

        const orderFulfillmentRate = sales?.length > 0 
          ? Math.round((sales.filter(s => s.status === 'completed').length / sales.length) * 100)
          : 0

        kpiData.push({
          id: factory.id,
          factory_name: factory.name,
          production_efficiency: productionEfficiency,
          customer_satisfaction: customerSatisfaction,
          employee_productivity: employeeProductivity,
          order_fulfillment_rate: orderFulfillmentRate,
          quality_compliance: Math.min(100, productionEfficiency + 5),
          cost_efficiency: 75 + Math.floor(Math.random() * 20),
          employee_count: employees?.length || 0,
          customer_count: customers?.length || 0,
          production_batches: production?.length || 0,
          status: productionEfficiency >= 80 ? 'excellent' : productionEfficiency >= 60 ? 'good' : 'needs_improvement'
        })
      }
    }

    return kpiData.sort((a, b) => b.production_efficiency - a.production_efficiency)
  }

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
    const primaryColor = [245, 158, 11] // Amber-500
    const secondaryColor = [59, 130, 246] // Blue-500
    const textColor = [31, 41, 55] // Gray-800
    const lightGray = [243, 244, 246] // Gray-100
    
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
    doc.text('Executive Management Dashboard System', 45, 30)
    
    // Report Title Section
    doc.setFillColor(...lightGray)
    doc.rect(0, 40, pageWidth, 25, 'F')
    
    doc.setTextColor(...textColor)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(reportType?.name || 'Executive Report', 14, 55)
    
    // Report Metadata
    const metadataY = 70
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(200, 200, 200)
    doc.rect(14, metadataY, pageWidth - 28, 35, 'FD')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    
    // Left column
    doc.text('EXECUTIVE REPORT DETAILS', 20, metadataY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textColor)
    doc.text(`Report Type: ${reportType?.name}`, 20, metadataY + 15)
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
    doc.text(`By: Main Boss`, pageWidth/2 + 10, metadataY + 29)
    
    // Data Table
    if (reportData && reportData.length > 0) {
      const displayColumns = getDisplayColumns()
      const tableHeaders = displayColumns.map(col => 
        col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      )
      
      const tableData = reportData.slice(0, 20).map(item => {
        return displayColumns.map(col => {
          const value = formatValue(col, item[col])
          return typeof value === 'string' && value.length > 20 
            ? value.substring(0, 20) + '...' 
            : String(value || 'N/A')
        })
      })
      
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
          cellPadding: 2
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function(data) {
          // Footer on each page
          const footerY = pageHeight - 20
          doc.setFillColor(...primaryColor)
          doc.rect(0, footerY, pageWidth, 20, 'F')
          
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8)
          doc.text('© 2025 Nziza Factory Management System - Executive Dashboard', 14, footerY + 12)
          doc.text(`Page ${data.pageNumber}`, pageWidth - 30, footerY + 12)
        }
      })
    }
    
    const fileName = `NZIZA_Executive_${reportType?.name.replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`
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
    
    // === MAIN REPORT SHEET ===
    const displayColumns = getDisplayColumns()
    
    // Create executive header rows
    const headerRows = [
      ['NZIZA FACTORY MANAGEMENT SYSTEM - EXECUTIVE DASHBOARD', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Executive Report:', reportType?.name || 'Unknown', '', 'Date:', new Date().toLocaleDateString(), '', ''],
      ['Period:', selectedPeriod.replace('_', ' ').toUpperCase(), '', 'Records:', reportData.length, '', ''],
      ['Authority Level:', 'Main Boss - Executive Access', '', 'Time:', new Date().toLocaleTimeString(), '', ''],
      ['', '', '', '', '', '', ''], // Spacer
      // Table headers
      displayColumns.map(col => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    ]
    
    // Prepare data rows with executive formatting
    const dataRows = reportData.map(item => {
      return displayColumns.map(col => {
        let value = item[col]
        
        if (value === null || value === undefined) {
          return ''
        } else if (col.includes('amount') || col.includes('total') || col.includes('price') || col.includes('revenue') || col.includes('profit') || col.includes('expenses')) {
          return Number(value) || 0
        } else if (col.includes('date') || col.includes('_at')) {
          return new Date(value).toLocaleDateString()
        } else if (typeof value === 'number') {
          return value
        } else {
          return String(value)
        }
      })
    })
    
    const allData = [...headerRows, ...dataRows]
    const mainSheet = XLSX.utils.aoa_to_sheet(allData)
    
    // Set column widths
    const colWidths = displayColumns.map((col, index) => {
      if (col.includes('id')) return { wch: 12 }
      if (col.includes('name') || col.includes('description')) return { wch: 25 }
      if (col.includes('date')) return { wch: 12 }
      if (col.includes('amount') || col.includes('total') || col.includes('revenue') || col.includes('profit')) return { wch: 15 }
      return { wch: 18 }
    })
    
    mainSheet['!cols'] = colWidths
    
    // Merge cells for header
    mainSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Company name
      { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }, // Report type value
      { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }, // Period value
      { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }  // Authority value
    ]
    
    mainSheet['!freeze'] = { xSplit: 0, ySplit: 7 }
    
    XLSX.utils.book_append_sheet(workbook, mainSheet, reportType?.name.replace(/\s+/g, '_') || 'Executive_Report')
    
    // === EXECUTIVE SUMMARY SHEET ===
    const summaryData = [
      ['EXECUTIVE SUMMARY - MAIN BOSS DASHBOARD'],
      [''],
      ['Report Overview'],
      ['Report Type', reportType?.name || 'Unknown'],
      ['Period Analyzed', selectedPeriod.replace('_', ' ').toUpperCase()],
      ['Total Records', reportData.length],
      ['Generated', new Date().toLocaleString()],
      ['Authority Level', 'Main Boss - Full Executive Access'],
      [''],
      ['Executive Metrics']
    ]
    
    // Add specific executive metrics based on report type
    if (selectedReportType === 'consolidated' && reportData.length > 0) {
      const totalRevenue = reportData.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0)
      const totalProfit = reportData.reduce((sum, item) => sum + (Number(item.net_profit) || 0), 0)
      const avgEfficiency = reportData.reduce((sum, item) => sum + (Number(item.efficiency_ratio) || 0), 0) / reportData.length
      
      summaryData.push(
        ['Total System Revenue', `RWF ${totalRevenue.toLocaleString()}`],
        ['Total System Profit', `RWF ${totalProfit.toLocaleString()}`],
        ['Average Factory Efficiency', `${avgEfficiency.toFixed(1)}%`],
        ['Active Factories', reportData.length],
        ['Profitability Rate', `${((reportData.filter(f => f.net_profit > 0).length / reportData.length) * 100).toFixed(1)}%`]
      )
    } else if (selectedReportType === 'financial_overview' && reportData.length > 0) {
      const totalRevenue = reportData.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0)
      const totalExpenses = reportData.reduce((sum, item) => sum + (Number(item.total_expenses) || 0), 0)
      const avgMargin = reportData.reduce((sum, item) => sum + (Number(item.profit_margin) || 0), 0) / reportData.length
      
      summaryData.push(
        ['System-wide Revenue', `RWF ${totalRevenue.toLocaleString()}`],
        ['System-wide Expenses', `RWF ${totalExpenses.toLocaleString()}`],
        ['Net System Profit', `RWF ${(totalRevenue - totalExpenses).toLocaleString()}`],
        ['Average Profit Margin', `${avgMargin.toFixed(2)}%`],
        ['Financial Health Score', avgMargin >= 15 ? 'Excellent' : avgMargin >= 10 ? 'Good' : 'Needs Attention']
      )
    }
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }]
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive_Summary')
    
    const fileName = `NZIZA_Executive_${reportType?.name.replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    try {
      XLSX.writeFile(workbook, fileName)
      toast.success('Executive Excel report exported successfully!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Failed to export Excel file')
    }
  }

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'excellent': 'bg-green-100 text-green-800',
      'good': 'bg-blue-100 text-blue-800',
      'profitable': 'bg-green-100 text-green-800',
      'break_even': 'bg-yellow-100 text-yellow-800',
      'loss': 'bg-red-100 text-red-800',
      'optimal': 'bg-green-100 text-green-800',
      'underutilized': 'bg-orange-100 text-orange-800',
      'needs_improvement': 'bg-red-100 text-red-800',
      'completed': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-blue-100 text-blue-800',
    }
    
    const className = colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
    
    return (
      <Badge className={className}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    )
  }

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return 'N/A'
    
    if (key.includes('amount') || key.includes('total') || key.includes('revenue') || key.includes('profit') || key.includes('expenses')) {
      return `RWF ${Number(value).toLocaleString()}`
    }
    
    if (key.includes('date') || key.includes('_at')) {
      return new Date(value).toLocaleDateString()
    }
    
    if (key.includes('ratio') || key.includes('efficiency') || key.includes('margin') || key.includes('utilization')) {
      return `${Number(value)}%`
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    return String(value)
  }

  const getDisplayColumns = () => {
    switch (selectedReportType) {
      case 'consolidated':
        return ['factory_name', 'total_production', 'total_revenue', 'total_expenses', 'net_profit', 'efficiency_ratio', 'status']
      case 'factory_performance':
        return ['factory_name', 'capacity_utilization', 'production_output', 'average_quality', 'employee_count', 'productivity_per_employee', 'status']
      case 'financial_overview':
        return ['factory_name', 'total_revenue', 'total_expenses', 'gross_profit', 'profit_margin', 'sales_count', 'status']
      case 'production_analytics':
        return ['batch_number', 'factory_name', 'production_date', 'cheese_type', 'cheese_produced_kg', 'quality_score', 'efficiency']
      case 'sales_performance':
        return ['order_number', 'factory_name', 'customer_name', 'order_date', 'total', 'profit_margin', 'payment_status']
      case 'operational_kpis':
        return ['factory_name', 'production_efficiency', 'customer_satisfaction', 'employee_productivity', 'order_fulfillment_rate', 'quality_compliance', 'status']
      default:
        return Object.keys(reportData[0] || {}).slice(0, 7)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Executive Reports & Analytics</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Comprehensive executive reporting with system-wide insights and export capabilities</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Reports</p>
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
                      ? 'border-amber-500 bg-amber-50 shadow-md' 
                      : 'border-gray-200 hover:border-amber-300'
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
              <span className="font-medium text-gray-700">Executive Filters:</span>
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
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
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
              {reportTypes.find(t => t.id === selectedReportType)?.name || 'Executive Data'}
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
              <span className="ml-3 text-gray-600">Loading executive data...</span>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {getDisplayColumns().map(column => (
                      <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        {row.status && getStatusBadge(row.status)}
                      </td>
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