-- Add avatar_url column to employees table
ALTER TABLE employees 
ADD COLUMN avatar_url TEXT;

-- Add comment for the new column
COMMENT ON COLUMN employees.avatar_url IS 'Base64 encoded image data or URL for employee avatar';