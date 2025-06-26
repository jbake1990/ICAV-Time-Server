-- Migration script to add drive time columns to existing time_entries table
-- Run this in your Vercel PostgreSQL database

-- Add drive time columns if they don't exist
DO $$ 
BEGIN
    -- Add drive_start_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'drive_start_time'
    ) THEN
        ALTER TABLE time_entries ADD COLUMN drive_start_time TIMESTAMPTZ;
    END IF;

    -- Add drive_end_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' 
        AND column_name = 'drive_end_time'
    ) THEN
        ALTER TABLE time_entries ADD COLUMN drive_end_time TIMESTAMPTZ;
    END IF;

    RAISE NOTICE 'Migration completed successfully';
END $$; 