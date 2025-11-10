-- Create function to update farmer totals when milk collection is added
CREATE OR REPLACE FUNCTION update_farmer_totals_on_collection()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add new collection to farmer totals
        UPDATE farmers
        SET 
            total_supplied = total_supplied + NEW.quantity_liters,
            balance = balance + NEW.total_amount,
            updated_at = NOW()
        WHERE id = NEW.farmer_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust farmer totals for updated collection
        UPDATE farmers
        SET 
            total_supplied = total_supplied - OLD.quantity_liters + NEW.quantity_liters,
            balance = balance - OLD.total_amount + NEW.total_amount,
            updated_at = NOW()
        WHERE id = NEW.farmer_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Subtract deleted collection from farmer totals
        UPDATE farmers
        SET 
            total_supplied = total_supplied - OLD.quantity_liters,
            balance = balance - OLD.total_amount,
            updated_at = NOW()
        WHERE id = OLD.farmer_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on milk_collections table
DROP TRIGGER IF EXISTS trigger_update_farmer_totals ON milk_collections;
CREATE TRIGGER trigger_update_farmer_totals
    AFTER INSERT OR UPDATE OR DELETE ON milk_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_farmer_totals_on_collection();

-- Add comment
COMMENT ON FUNCTION update_farmer_totals_on_collection() IS 
'Automatically updates farmer total_supplied and balance when milk collections are inserted, updated, or deleted';
