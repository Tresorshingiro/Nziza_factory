import { supabase } from '../lib/supabase'

export interface InventoryUpdateResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Updates or creates milk inventory when milk is collected
 */
export const updateMilkInventoryOnCollection = async (
  factoryId: string,
  quantityLiters: number,
  pricePerLiter: number,
  userId: string
): Promise<InventoryUpdateResult> => {
  try {
    // Check if raw milk inventory exists for this factory
    const { data: existingStock, error: fetchError } = await supabase
      .from('stock')
      .select('*')
      .eq('factory_id', factoryId)
      .eq('stock_type', 'raw_milk')
      .eq('item_code', 'MILK-RAW-001')
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    if (existingStock) {
      // Update existing milk inventory
      const newQuantity = (existingStock as any).quantity + quantityLiters
      const newTotalValue = newQuantity * pricePerLiter

      const { error: updateError } = await supabase
        .from('stock')
        .update({
          quantity: newQuantity,
          unit_cost: pricePerLiter,
          total_value: newTotalValue,
          last_updated_by: userId,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', (existingStock as any).id)

      if (updateError) throw updateError

      // Record stock movement
      await recordStockMovement(
        (existingStock as any).id,
        factoryId,
        'in',
        quantityLiters,
        'Milk collection',
        userId
      )

      return {
        success: true,
        message: `Added ${quantityLiters}L to existing milk inventory`,
        data: { newQuantity, newTotalValue }
      }
    } else {
      // Create new milk inventory entry
      const stockData = {
        factory_id: factoryId,
        stock_type: 'raw_milk',
        item_name: 'Raw Milk',
        item_code: 'MILK-RAW-001',
        quantity: quantityLiters,
        unit: 'L',
        unit_cost: pricePerLiter,
        total_value: quantityLiters * pricePerLiter,
        reorder_level: 500, // Default reorder level
        location: 'Cold Storage',
        last_updated_by: userId
      }

      const { data: newStock, error: insertError } = await supabase
        .from('stock')
        .insert([stockData as any])
        .select()
        .single()

      if (insertError) throw insertError

      // Record stock movement
      await recordStockMovement(
        (newStock as any).id,
        factoryId,
        'in',
        quantityLiters,
        'Initial milk collection',
        userId
      )

      return {
        success: true,
        message: `Created new milk inventory with ${quantityLiters}L`,
        data: newStock
      }
    }
  } catch (error: any) {
    console.error('Error updating milk inventory:', error)
    return {
      success: false,
      message: error.message || 'Failed to update milk inventory'
    }
  }
}

/**
 * Reduces milk inventory when used in production
 */
export const reduceMilkInventoryOnProduction = async (
  factoryId: string,
  milkUsedLiters: number,
  userId: string,
  batchId?: string
): Promise<InventoryUpdateResult> => {
  try {
    // Get current milk inventory
    const { data: milkStock, error: fetchError } = await supabase
      .from('stock')
      .select('*')
      .eq('factory_id', factoryId)
      .eq('stock_type', 'raw_milk')
      .eq('item_code', 'MILK-RAW-001')
      .single()

    if (fetchError) {
      throw new Error('No milk inventory found. Please record milk collection first.')
    }

    if ((milkStock as any).quantity < milkUsedLiters) {
      throw new Error(`Insufficient milk stock. Available: ${(milkStock as any).quantity}L, Required: ${milkUsedLiters}L`)
    }

    // Update milk inventory
    const newQuantity = (milkStock as any).quantity - milkUsedLiters
    const newTotalValue = newQuantity * (milkStock as any).unit_cost

    const { error: updateError } = await supabase
      .from('stock')
      .update({
        quantity: newQuantity,
        total_value: newTotalValue,
        last_updated_by: userId,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', (milkStock as any).id)

    if (updateError) throw updateError

    // Record stock movement
    await recordStockMovement(
      (milkStock as any).id,
      factoryId,
      'out',
      milkUsedLiters,
      `Used in production${batchId ? ` (Batch: ${batchId})` : ''}`,
      userId,
      batchId,
      'production_batch'
    )

    return {
      success: true,
      message: `Reduced milk inventory by ${milkUsedLiters}L`,
      data: { newQuantity, newTotalValue }
    }
  } catch (error: any) {
    console.error('Error reducing milk inventory:', error)
    return {
      success: false,
      message: error.message || 'Failed to reduce milk inventory'
    }
  }
}

/**
 * Adds finished cheese to inventory after production
 * If cheese type already exists, increments quantity; otherwise creates new record
 */
export const addCheeseInventoryOnProduction = async (
  factoryId: string,
  cheeseType: 'gouda' | 'cheddar' | 'mozzarella' | 'other',
  cheeseProducedKg: number,
  unitCost: number,
  userId: string,
  batchId?: string
): Promise<InventoryUpdateResult> => {
  try {
    console.log('🧀 Adding cheese inventory:', { factoryId, cheeseType, cheeseProducedKg, unitCost, batchId })
    
    // Check if cheese of this type already exists in inventory
    const { data: existingCheese, error: fetchError } = await (supabase
      .from('stock') as any)
      .select('*')
      .eq('factory_id', factoryId)
      .eq('stock_type', 'finished_goods')
      .eq('cheese_type', cheeseType)
      .maybeSingle()

    console.log('🔍 Existing cheese search:', { existingCheese, fetchError })

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    if (existingCheese) {
      // Update existing cheese inventory
      const newQuantity = (existingCheese as any).quantity + cheeseProducedKg
      const weightedAverageCost = (
        ((existingCheese as any).quantity * (existingCheese as any).unit_cost) +
        (cheeseProducedKg * unitCost)
      ) / newQuantity
      const newTotalValue = newQuantity * weightedAverageCost

      const { data: updatedStock, error: updateError } = await (supabase
        .from('stock') as any)
        .update({
          quantity: newQuantity,
          unit_cost: weightedAverageCost,
          total_value: newTotalValue,
          last_updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', (existingCheese as any).id)
        .select()
        .single()

      if (updateError) throw updateError

      // Record stock movement
      await recordStockMovement(
        (existingCheese as any).id,
        factoryId,
        'in',
        cheeseProducedKg,
        `Production output - merged with existing stock${batchId ? ` (Batch: ${batchId})` : ''}`,
        userId,
        batchId,
        'production_batch'
      )

      return {
        success: true,
        message: `Added ${cheeseProducedKg}kg of ${cheeseType} cheese to existing inventory (Total: ${newQuantity}kg)`,
        data: updatedStock
      }
    } else {
      // Create new cheese inventory record
      const itemCode = `${cheeseType.toUpperCase()}-${Date.now().toString().slice(-6)}`
      
      const stockData = {
        factory_id: factoryId,
        stock_type: 'finished_goods',
        item_name: `${cheeseType.charAt(0).toUpperCase() + cheeseType.slice(1)} Cheese`,
        item_code: itemCode,
        cheese_type: cheeseType,
        quantity: cheeseProducedKg,
        unit: 'kg',
        unit_cost: unitCost,
        total_value: cheeseProducedKg * unitCost,
        reorder_level: 50, // Default reorder level for cheese
        location: 'Cold Storage',
        batch_id: batchId,
        last_updated_by: userId
      }

      const { data: newStock, error: insertError } = await (supabase
        .from('stock') as any)
        .insert([stockData])
        .select()
        .single()

      if (insertError) throw insertError

      // Record stock movement
      await recordStockMovement(
        (newStock as any).id,
        factoryId,
        'in',
        cheeseProducedKg,
        `Production output - new stock record${batchId ? ` (Batch: ${batchId})` : ''}`,
        userId,
        batchId,
        'production_batch'
      )

      return {
        success: true,
        message: `Added ${cheeseProducedKg}kg of ${cheeseType} cheese to inventory (New stock record)`,
        data: newStock
      }
    }
  } catch (error: any) {
    console.error('Error adding cheese inventory:', error)
    return {
      success: false,
      message: error.message || 'Failed to add cheese inventory'
    }
  }
}

/**
 * Records stock movement for audit trail
 */
export const recordStockMovement = async (
  stockId: string,
  factoryId: string,
  movementType: 'in' | 'out' | 'adjustment' | 'transfer',
  quantity: number,
  reason: string,
  userId: string,
  referenceId?: string,
  referenceType?: string
): Promise<void> => {
  try {
    const movementData = {
      stock_id: stockId,
      factory_id: factoryId,
      movement_type: movementType,
      quantity: movementType === 'out' ? -quantity : quantity,
      reason,
      reference_id: referenceId,
      reference_type: referenceType,
      recorded_by: userId
    }

    const { error } = await (supabase
      .from('stock_movements') as any)
      .insert([movementData])

    if (error) throw error
  } catch (error: any) {
    console.error('Error recording stock movement:', error)
    throw error
  }
}