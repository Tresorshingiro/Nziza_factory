import { supabase } from '../lib/supabase'

export interface MainStockTransferResult {
  success: boolean
  message: string
  data?: any
}

export interface MainStockItem {
  id: string
  cheese_type: 'gouda' | 'cheddar' | 'mozzarella' | 'other'
  total_quantity: number
  unit: string
  average_unit_cost: number
  total_value: number
  location: string
  reorder_level: number
  last_restocked: string | null
  created_at: string
  updated_at: string
}

export interface MainStockMovement {
  id: string
  main_stock_id: string
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer_from_factory' | 'distribution'
  quantity: number
  unit_cost: number
  total_value: number
  source_factory_id?: string
  source_batch_id?: string
  destination?: string
  reason: string
  notes?: string
  processed_by: string
  created_at: string
}

/**
 * Transfer cheese from factory production to main stock
 */
export const transferToMainStock = async (
  cheeseType: string,
  quantity: number,
  unitCost: number,
  sourceFactoryId: string,
  sourceBatchId: string,
  processedBy: string,
  reason?: string,
  notes?: string
): Promise<MainStockTransferResult> => {
  try {
    console.log('🏭 Transferring to main stock:', { 
      cheeseType, 
      quantity, 
      unitCost, 
      sourceFactoryId, 
      sourceBatchId 
    })

    // First, ensure main stock record exists for this cheese type
    const { data: existingStock, error: checkError } = await (supabase
      .from('main_stock') as any)
      .select('*')
      .eq('cheese_type', cheeseType)
      .single()

    if (checkError && checkError.code === 'PGRST116') {
      // Record doesn't exist, create it
      console.log(`Creating main stock record for ${cheeseType}`)
      const { data: newStock, error: createError } = await (supabase
        .from('main_stock') as any)
        .insert([{
          cheese_type: cheeseType,
          total_quantity: 0,
          average_unit_cost: unitCost,
          total_value: 0,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating main stock record:', createError)
        throw createError
      }
    } else if (checkError) {
      console.error('Error checking main stock:', checkError)
      throw checkError
    }

    // Create transfer record
    const transferData = {
      cheese_type: cheeseType,
      quantity: quantity,
      unit_cost: unitCost,
      source_factory_id: sourceFactoryId,
      source_batch_id: sourceBatchId,
      reason: reason || 'Automatic transfer from production',
      notes: notes,
      processed_by: processedBy,
      status: 'completed' as const
    }

    const { data: transfer, error: transferError } = await (supabase
      .from('main_stock_transfers') as any)
      .insert([transferData])
      .select()
      .single()

    if (transferError) {
      console.error('Transfer error:', transferError)
      throw transferError
    }

    // Manually update main stock quantities (in case triggers aren't working)
    const { data: currentStock } = await (supabase
      .from('main_stock') as any)
      .select('*')
      .eq('cheese_type', cheeseType)
      .single()

    if (currentStock) {
      const newTotalQuantity = currentStock.total_quantity + quantity
      const newAverageUnitCost = ((currentStock.total_quantity * currentStock.average_unit_cost) + (quantity * unitCost)) / newTotalQuantity

      const { error: updateError } = await (supabase
        .from('main_stock') as any)
        .update({
          total_quantity: newTotalQuantity,
          average_unit_cost: newAverageUnitCost,
          total_value: newTotalQuantity * newAverageUnitCost,
          updated_at: new Date().toISOString(),
          last_restocked: new Date().toISOString()
        })
        .eq('cheese_type', cheeseType)

      if (updateError) {
        console.error('Error updating main stock manually:', updateError)
      }
    }

    // Create movement record
    const { data: updatedMainStock } = await (supabase
      .from('main_stock') as any)
      .select('id')
      .eq('cheese_type', cheeseType)
      .single()

    if (updatedMainStock) {
      const { error: movementError } = await (supabase
        .from('main_stock_movements') as any)
        .insert([{
          main_stock_id: updatedMainStock.id,
          movement_type: 'transfer_from_factory',
          quantity: quantity,
          unit_cost: unitCost,
          total_value: quantity * unitCost,
          source_factory_id: sourceFactoryId,
          source_batch_id: sourceBatchId,
          reason: reason || 'Production transfer',
          notes: notes,
          processed_by: processedBy
        }])

      if (movementError) {
        console.error('Error creating movement record:', movementError)
      }
    }

    // Get updated main stock to return current state
    const { data: mainStock, error: stockError } = await (supabase
      .from('main_stock') as any)
      .select('*')
      .eq('cheese_type', cheeseType)
      .single()

    if (stockError) {
      console.error('Error fetching updated main stock:', stockError)
    }

    return {
      success: true,
      message: `Successfully transferred ${quantity}kg of ${cheeseType} cheese to main stock`,
      data: {
        transfer: transfer,
        mainStock: mainStock
      }
    }

  } catch (error: any) {
    console.error('Error transferring to main stock:', error)
    return {
      success: false,
      message: error.message || 'Failed to transfer to main stock'
    }
  }
}

/**
 * Get main stock summary with factory contribution details
 */
export const getMainStockSummary = async (): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> => {
  try {
    console.log('Fetching main stock summary with factory details...')
    
    const { data, error } = await (supabase
      .from('main_stock') as any)
      .select('*')
      .order('cheese_type')

    if (error) {
      console.error('Error fetching main stock:', error)
      throw error
    }

    console.log('Main stock data:', data)

    // For each cheese type, get contributing factories
    const enrichedData = await Promise.all((data || []).map(async (item: any) => {
      // Get factories that contributed to this cheese type via main_stock_movements
      const { data: movements, error: movementsError } = await (supabase
        .from('main_stock_movements') as any)
        .select(`
          source_factory_id,
          quantity,
          factories!source_factory_id(id, name)
        `)
        .eq('main_stock_id', item.id)
        .eq('movement_type', 'transfer_from_factory')
        .not('source_factory_id', 'is', null)

      if (movementsError) {
        console.error('Error fetching movements for', item.cheese_type, ':', movementsError)
      }

      // Group by factory and sum quantities
      const factoryContributions = new Map()
      
      if (movements && movements.length > 0) {
        movements.forEach((movement: any) => {
          const factoryId = movement.source_factory_id
          const factoryName = movement.factories?.name || 'Unknown Factory'
          const quantity = movement.quantity || 0

          if (factoryContributions.has(factoryId)) {
            factoryContributions.set(factoryId, {
              ...factoryContributions.get(factoryId),
              quantity: factoryContributions.get(factoryId).quantity + quantity
            })
          } else {
            factoryContributions.set(factoryId, {
              factory_id: factoryId,
              factory_name: factoryName,
              quantity: quantity
            })
          }
        })
      }

      return {
        id: item.id, // ✅ Add the missing ID field
        cheese_type: item.cheese_type,
        total_quantity: item.total_quantity || 0,
        average_unit_cost: item.average_unit_cost || 0,
        price_per_unit: item.average_unit_cost || 0, // ✅ Add price_per_unit for compatibility
        total_value: item.total_value || 0,
        last_updated: item.updated_at || item.created_at,
        location: item.location || 'Central Warehouse',
        reorder_level: item.reorder_level || 0,
        contributing_factories: Array.from(factoryContributions.values())
      }
    }))

    return {
      success: true,
      data: enrichedData
    }
  } catch (error: any) {
    console.error('Error getting main stock summary:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch main stock summary'
    }
  }
}

/**
 * Get main stock movements for audit trail
 */
export const getMainStockMovements = async (
  limit: number = 50,
  cheeseType?: string,
  factoryId?: string
): Promise<{
  success: boolean
  data?: MainStockMovement[]
  error?: string
}> => {
  try {
    let query = supabase
      .from('main_stock_movements')
      .select(`
        *,
        main_stock!inner(cheese_type),
        factories(name),
        production_batches(batch_number),
        users(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cheeseType) {
      query = query.eq('main_stock.cheese_type', cheeseType)
    }

    if (factoryId) {
      query = query.eq('source_factory_id', factoryId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data || []
    }
  } catch (error: any) {
    console.error('Error fetching main stock movements:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch main stock movements'
    }
  }
}

/**
 * Distribute cheese from main stock (for sales/orders)
 */
export const distributeFromMainStock = async (
  cheeseType: 'gouda' | 'cheddar' | 'mozzarella' | 'other',
  quantity: number,
  destination: string,
  processedBy: string,
  reason: string,
  notes?: string
): Promise<MainStockTransferResult> => {
  try {
    console.log('📦 Distributing from main stock:', { 
      cheeseType, 
      quantity, 
      destination 
    })

    // First check available quantity
    const { data: mainStock, error: stockError } = await (supabase
      .from('main_stock') as any)
      .select('*')
      .eq('cheese_type', cheeseType)
      .single()

    if (stockError || !mainStock) {
      throw new Error(`Main stock record not found for ${cheeseType}`)
    }

    if (mainStock.total_quantity < quantity) {
      throw new Error(
        `Insufficient stock. Available: ${mainStock.total_quantity}kg, Requested: ${quantity}kg`
      )
    }

    // Update main stock quantity
    const newQuantity = mainStock.total_quantity - quantity
    const newTotalValue = newQuantity * mainStock.average_unit_cost

    const { error: updateError } = await (supabase
      .from('main_stock') as any)
      .update({
        total_quantity: newQuantity,
        total_value: newTotalValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', mainStock.id)

    if (updateError) throw updateError

    // Record the movement
    const movementData = {
      main_stock_id: mainStock.id,
      movement_type: 'distribution' as const,
      quantity: -quantity, // Negative for outgoing
      unit_cost: mainStock.average_unit_cost,
      total_value: -(quantity * mainStock.average_unit_cost),
      destination: destination,
      reason: reason,
      notes: notes,
      processed_by: processedBy
    }

    const { data: movement, error: movementError } = await (supabase
      .from('main_stock_movements') as any)
      .insert([movementData])
      .select()
      .single()

    if (movementError) throw movementError

    return {
      success: true,
      message: `Successfully distributed ${quantity}kg of ${cheeseType} to ${destination}`,
      data: {
        movement: movement,
        remainingStock: newQuantity
      }
    }

  } catch (error: any) {
    console.error('Error distributing from main stock:', error)
    return {
      success: false,
      message: error.message || 'Failed to distribute from main stock'
    }
  }
}

/**
 * Get factory production summary for a date range
 */
export const getFactoryProductionSummary = async (
  startDate: string,
  endDate: string,
  factoryId?: string
): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> => {
  try {
    let query = supabase
      .from('factory_production_summary')
      .select(`
        *,
        factories(name)
      `)
      .gte('production_date', startDate)
      .lte('production_date', endDate)
      .order('production_date', { ascending: false })

    if (factoryId) {
      query = query.eq('factory_id', factoryId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data || []
    }
  } catch (error: any) {
    console.error('Error fetching factory production summary:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch factory production summary'
    }
  }
}

/**
 * Update factory production summary (called after production)
 */
export const updateFactoryProductionSummary = async (
  factoryId: string,
  productionDate: string,
  cheeseType: 'gouda' | 'cheddar' | 'mozzarella' | 'other',
  productionKg: number,
  qualityScore?: number
): Promise<MainStockTransferResult> => {
  try {
    // Check if summary exists for this factory, date, and cheese type
    const { data: existing, error: fetchError } = await (supabase
      .from('factory_production_summary') as any)
      .select('*')
      .eq('factory_id', factoryId)
      .eq('production_date', productionDate)
      .eq('cheese_type', cheeseType)
      .single()

    const summaryData = {
      factory_id: factoryId,
      production_date: productionDate,
      cheese_type: cheeseType,
      total_production_kg: existing ? existing.total_production_kg + productionKg : productionKg,
      total_batches: existing ? existing.total_batches + 1 : 1,
      transferred_to_main: existing ? existing.transferred_to_main + productionKg : productionKg,
      pending_transfer: 0, // Since we're transferring immediately
      average_quality_score: qualityScore || (existing ? existing.average_quality_score : null),
      updated_at: new Date().toISOString()
    }

    let result
    if (existing) {
      const { data, error } = await (supabase
        .from('factory_production_summary') as any)
        .update(summaryData)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      const { data, error } = await (supabase
        .from('factory_production_summary') as any)
        .insert([summaryData])
        .select()
        .single()
      
      if (error) throw error
      result = data
    }

    return {
      success: true,
      message: 'Factory production summary updated',
      data: result
    }

  } catch (error: any) {
    console.error('Error updating factory production summary:', error)
    return {
      success: false,
      message: error.message || 'Failed to update production summary'
    }
  }
}

/**
 * Get main stock status alerts
 */
export const getMainStockAlerts = async (): Promise<{
  lowStock: any[]
  recentMovements: any[]
  productionSummary: any[]
}> => {
  try {
    // Get all stock items and filter in memory for low stock
    const { data: allStock } = await (supabase
      .from('main_stock') as any)
      .select('*')

    const lowStock = (allStock || []).filter((item: any) => 
      item.total_quantity <= item.reorder_level
    )

    // Get recent movements (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentMovements } = await (supabase
      .from('main_stock_movements') as any)
      .select(`
        *,
        main_stock(cheese_type),
        factories(name)
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Get today's production summary
    const today = new Date().toISOString().split('T')[0]
    const { data: productionSummary } = await (supabase
      .from('factory_production_summary') as any)
      .select(`
        *,
        factories(name)
      `)
      .eq('production_date', today)

    return {
      lowStock: lowStock || [],
      recentMovements: recentMovements || [],
      productionSummary: productionSummary || []
    }
  } catch (error) {
    console.error('Error fetching main stock alerts:', error)
    return {
      lowStock: [],
      recentMovements: [],
      productionSummary: []
    }
  }
}