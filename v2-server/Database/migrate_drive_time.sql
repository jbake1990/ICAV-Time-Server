-- Migration to add drive time columns and make clock_in_time nullable
-- Run this on your Vercel PostgreSQL database

-- Add drive time columns if they don't exist
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS drive_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS drive_end_time TIMESTAMPTZ;

-- Make clock_in_time nullable to support driving-only entries
ALTER TABLE time_entries 
ALTER COLUMN clock_in_time DROP NOT NULL;

-- Add indexes for drive time columns
CREATE INDEX IF NOT EXISTS idx_time_entries_drive_start_time ON time_entries(drive_start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_drive_end_time ON time_entries(drive_end_time); 