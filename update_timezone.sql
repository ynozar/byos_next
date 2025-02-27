-- SQL to update all devices to use Europe/London timezone
-- This ensures all devices have a standardized IANA timezone format

-- Update existing devices with null or empty timezone
UPDATE devices SET timezone = 'Europe/London' WHERE timezone IS NULL OR timezone = '';

-- Update devices with non-standard timezone formats to use IANA format
UPDATE devices SET timezone = 'Europe/London' WHERE timezone NOT LIKE '%/%';

-- Set default timezone for all future devices
ALTER TABLE devices ALTER COLUMN timezone SET DEFAULT 'Europe/London';

-- Add a check constraint to ensure timezone follows IANA format (Area/Location)
ALTER TABLE devices ADD CONSTRAINT check_timezone_format 
CHECK (timezone ~ '^[A-Za-z]+/[A-Za-z_]+$');

-- Create an index on timezone for faster queries
CREATE INDEX IF NOT EXISTS idx_devices_timezone ON devices(timezone); 