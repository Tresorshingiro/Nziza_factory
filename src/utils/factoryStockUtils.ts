import { supabase } from '../lib/supabase'

export interface FactoryStockTransferResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Transfer cheese from factory stock to main stock
 */
export const transferFromFactoryToMainStock = async (
  factoryStockId: string,
  factoryId: string,
  cheeseType: string,
  quantity: number,
  unitCost: number,
  processedBy: string,
  notes?: string
): Promise<FactoryStockTransferResult> => {
  try {
    console.log('🏭➡️📦 Transferring from factory stock to main stock:', {
      factoryStockId,
      factoryId,
      cheeseType,
      quantity,
      unitCost
    })

    // Step 1: Check if there's enough quantity in factory stock
    const { data: factoryStock, error: factoryStockError } = await (supabase
      .from('stock') as any)
      .select('*')
      .eq('id', factoryStockId)
      .single()

    if (factoryStockError || !factoryStock) {
      throw new Error('Factory stock item not found')
    }

    if (factoryStock.quantity < quantity) {
      throw new Error(`Insufficient factory stock. Available: ${factoryStock.quantity}kg, Requested: ${quantity}kg`)
    }

    // Step 2: Reduce factory stock quantity
    const newFactoryQuantity = factoryStock.quantity - quantity
    const newFactoryTotalValue = newFactoryQuantity * factoryStock.unit_cost

    const { error: updateFactoryError } = await (supabase
      .from('stock') as any)
      .update({
        quantity: newFactoryQuantity,
        total_value: newFactoryTotalValue,
        last_updated_by: processedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', factoryStockId)

    if (updateFactoryError) throw updateFactoryError

    // Step 3: Record factory stock movement (outgoing)
    const { error: factoryMovementError } = await (supabase
      .from('stock_movements') as any)
      .insert([{
        stock_id: factoryStockId,
        factory_id: factoryId,
        movement_type: 'transfer',
        quantity: -quantity, // Negative for outgoing
        reason: 'Transfer to main stock',
        notes: notes || `Transferred ${quantity}kg to main stock`,
        recorded_by: processedBy
      }])

    if (factoryMovementError) {
      console.error('Error creating factory movement record:', factoryMovementError)
    }

    // Step 4: Update or create main stock record
    const { data: existingMainStock, error: mainStockCheckError } = await (supabase
      .from('main_stock') as any)
      .select('*')
      .eq('cheese_type', cheeseType)
      .single()

    let mainStockId
    if (existingMainStock && !mainStockCheckError) {
      // Update existing main stock
      const newMainQuantity = existingMainStock.total_quantity + quantity
      const newMainAverageUnitCost = ((existingMainStock.total_quantity * existingMainStock.average_unit_cost) + (quantity * unitCost)) / newMainQuantity
      const newMainTotalValue = newMainQuantity * newMainAverageUnitCost

      const { error: updateMainError } = await (supabase
        .from('main_stock') as any)
        .update({
          total_quantity: newMainQuantity,
          average_unit_cost: newMainAverageUnitCost,
          total_value: newMainTotalValue,
          updated_at: new Date().toISOString(),
          last_restocked: new Date().toISOString()
        })
        .eq('id', existingMainStock.id)

      if (updateMainError) throw updateMainError
      mainStockId = existingMainStock.id
    } else {
      // Create new main stock record
      const { data: newMainStock, error: createMainError } = await (supabase
        .from('main_stock') as any)
        .insert([{
          cheese_type: cheeseType,
          total_quantity: quantity,
          average_unit_cost: unitCost,
          total_value: quantity * unitCost,
          location: 'Central Warehouse',
          reorder_level: 100, // Default reorder level
          last_restocked: new Date().toISOString()
        }])
        .select()
        .single()

      if (createMainError) throw createMainError
      mainStockId = newMainStock.id
    }

    // Step 5: Create main stock movement record (incoming)
    const { error: mainMovementError } = await (supabase
      .from('main_stock_movements') as any)
      .insert([{
        main_stock_id: mainStockId,
        movement_type: 'transfer_from_factory',
        quantity: quantity,
        unit_cost: unitCost,
        total_value: quantity * unitCost,
        source_factory_id: factoryId,
        reason: 'Transfer from factory stock',
        notes: notes,
        processed_by: processedBy
      }])

    if (mainMovementError) {
      console.error('Error creating main stock movement:', mainMovementError)
    }

    // Step 6: Create transfer record for audit trail
    const { error: transferRecordError } = await (supabase
      .from('main_stock_transfers') as any)
      .insert([{
        cheese_type: cheeseType,
        quantity: quantity,
        unit_cost: unitCost,
        source_factory_id: factoryId,
        reason: 'Factory stock transfer',
        notes: notes,
        processed_by: processedBy,
        status: 'completed'
      }])

    if (transferRecordError) {
      console.error('Error creating transfer record:', transferRecordError)
    }

    return {
      success: true,
      message: `Successfully transferred ${quantity}kg of ${cheeseType} from factory stock to main stock`,
      data: {
        factoryStockRemaining: newFactoryQuantity,
        transferredQuantity: quantity,
        transferredValue: quantity * unitCost
      }
    }

  } catch (error: any) {
    console.error('Error transferring from factory to main stock:', error)
    return {
      success: false,
      message: error.message || 'Failed to transfer from factory to main stock'
    }
  }
}

/**
 * Get factory stock items ready for transfer (finished goods only)
 */
export const getTransferableFactoryStock = async (factoryId: string): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> => {
  try {
    const { data, error } = await (supabase
      .from('stock') as any)
      .select('*')
      .eq('factory_id', factoryId)
      .eq('stock_type', 'finished_goods')
      .gt('quantity', 0)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || []
    }
  } catch (error: any) {
    console.error('Error fetching transferable factory stock:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch factory stock'
    }
  }
}

/**
 * Get factory stock transfer history
 */
export const getFactoryTransferHistory = async (
  factoryId: string,
  limit: number = 50
): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> => {
  try {
    const { data, error } = await (supabase
      .from('stock_movements') as any)
      .select(`
        *,
        stock!inner(item_name, cheese_type)
      `)
      .eq('factory_id', factoryId)
      .eq('movement_type', 'transfer')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: data || []
    }
  } catch (error: any) {
    console.error('Error fetching factory transfer history:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch transfer history'
    }
  }
}

/**
 * Get factory production summary for dashboard
 */
export const getFactoryStockSummary = async (factoryId: string): Promise<{
  success: boolean
  data?: any
  error?: string
}> => {
  try {
    // Get all factory stock items
    const { data: stockItems, error: stockError } = await (supabase
      .from('stock') as any)
      .select('*')
      .eq('factory_id', factoryId)

    if (stockError) throw stockError

    // Calculate summary statistics
    const finishedGoods = stockItems.filter((item: any) => item.stock_type === 'finished_goods')
    const rawMaterials = stockItems.filter((item: any) => item.stock_type === 'raw_milk')
    const byproducts = stockItems.filter((item: any) => item.stock_type === 'byproduct')

    const totalValue = stockItems.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0)
    const lowStockItems = stockItems.filter((item: any) => item.quantity <= item.reorder_level)

    // Get recent transfers (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentTransfers } = await (supabase
      .from('stock_movements') as any)
      .select('*')
      .eq('factory_id', factoryId)
      .eq('movement_type', 'transfer')
      .gte('created_at', sevenDaysAgo.toISOString())

    return {
      success: true,
      data: {
        totalItems: stockItems.length,
        finishedGoodsCount: finishedGoods.length,
        rawMaterialsCount: rawMaterials.length,
        byproductsCount: byproducts.length,
        totalValue: totalValue,
        lowStockCount: lowStockItems.length,
        recentTransfersCount: recentTransfers?.length || 0,
        finishedGoodsValue: finishedGoods.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0),
        readyForTransfer: finishedGoods.filter((item: any) => item.quantity > 0).length
      }
    }
  } catch (error: any) {
    console.error('Error getting factory stock summary:', error)
    return {
      success: false,
      error: error.message || 'Failed to get factory stock summary'
    }
  }
}