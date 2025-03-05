"use server"

import { createClient } from "@/lib/supabase/server"
import type { Device, RefreshSchedule } from "@/lib/supabase/types"
import { isValidFriendlyId, isValidApiKey } from "@/utils/helpers";

/**
 * Initialize the database with the required schema and optionally a test device
 */
export async function initializeDatabase(device_name: string, mac_address: string, friendly_id: string, api_key: string, timezone: string = 'Europe/London'): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  try {
    let tablesExist = false;
    
    // First, create the database functions
    const functionsResult = await createDatabaseFunctions();
    if (!functionsResult.success) {
      console.error("Failed to create database functions:", functionsResult.error);
      // Continue anyway, as we might still be able to create the schema directly
    }
    
    // Check if tables already exist
    try {
      // Try using the check_tables_exist function if it exists
      const { data, error } = await supabase.rpc('check_tables_exist', {
        table_names: ['devices', 'logs', 'system_logs']
      });
      
      if (!error && data && typeof data === 'object' && 'all_exist' in data) {
        tablesExist = data.all_exist as boolean;
      }
    } catch (e) {
      console.log("Tables check failed, will create schema:", e);
      // If the check fails, we'll check directly using information_schema
      try {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', ['devices', 'logs', 'system_logs']);
          
        if (!error && data) {
          // If we found all three tables, they exist
          tablesExist = data.length === 3;
        }
      } catch (schemaError) {
        console.log("Information schema check failed too, will create schema:", schemaError);
        // If this fails too, we'll assume tables don't exist and try to create them
      }
    }
    
    if (tablesExist) {
      console.log("Database tables already exist, skipping schema creation");
    } else {
      // Create the database schema
      try {
        // Try using the create_database_schema function
        try {
          const { error: schemaError } = await supabase.rpc('create_database_schema');
          
          if (schemaError) {
            console.error("Error creating database schema using function:", schemaError);
            // If the function call fails, we'll create the schema directly
            throw new Error("Function call failed");
          }
        } catch (e) {
          console.log("Error creating database schema using function:", e);
          // Create the schema directly using raw SQL
          const schemaSQL = `
            -- Enable UUID generation extension
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            
            -- Devices Table
            CREATE TABLE IF NOT EXISTS public.devices (
                id BIGSERIAL PRIMARY KEY,
                friendly_id VARCHAR NOT NULL UNIQUE,
                name VARCHAR NOT NULL,
                mac_address VARCHAR NOT NULL UNIQUE,
                api_key VARCHAR NOT NULL UNIQUE,
                screen VARCHAR NULL DEFAULT NULL,
                refresh_schedule JSONB NULL,
                timezone TEXT NOT NULL DEFAULT 'UTC',
                last_update_time TIMESTAMPTZ NULL,
                next_expected_update TIMESTAMPTZ NULL,
                last_refresh_duration INTEGER NULL,
                battery_voltage NUMERIC NULL,
                firmware_version TEXT NULL,
                rssi INTEGER NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Indexes for Devices
            CREATE INDEX IF NOT EXISTS idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);
            
            -- Logs Table
            CREATE TABLE IF NOT EXISTS public.logs (
                id BIGSERIAL PRIMARY KEY,
                device_id BIGINT NOT NULL,
                friendly_id TEXT NULL,
                log_data TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
            );
            
            -- System Logs Table
            CREATE TABLE IF NOT EXISTS public.system_logs (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT now(),
                level VARCHAR NOT NULL,
                message TEXT NOT NULL,
                source VARCHAR NULL,
                metadata TEXT NULL,
                trace TEXT NULL
            );
            
            -- Indexes for System Logs
            CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at);
            CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs (level);
          `;
          
          const schemaResult = await executeRawSQL(schemaSQL);
          if (!schemaResult.success) {
            console.error("Error creating database schema directly:", schemaResult.error);
            return { success: false, error: schemaResult.error };
          }
        }
      } catch (schemaError) {
        console.error("Error creating database schema:", schemaError);
        return { 
          success: false, 
          error: schemaError instanceof Error ? schemaError.message : String(schemaError) 
        };
      }
    }
    
    // Check if we should create a test device
    if (device_name && mac_address && friendly_id && api_key) {
      // Validate inputs
      if (!isValidFriendlyId(friendly_id)) {
        return { success: false, error: "Invalid friendly ID format" };
      }
      
      if (!isValidApiKey(api_key)) {
        return { success: false, error: "Invalid API key format" };
      }
      
      const testDevice = {
        friendly_id: friendly_id,
        name: device_name,
        mac_address: mac_address,
        api_key: api_key,
        screen: 'simple-text',
        refresh_schedule: {
          default_refresh_rate: 60,
          time_ranges: [
            { start_time: "00:00", end_time: "07:00", refresh_rate: 600 }
          ]
        } as RefreshSchedule,
        timezone: timezone
      };
      
      // Check if device with this friendly_id already exists
      const { data: existingDevice } = await supabase
        .from("devices")
        .select("id")
        .eq("friendly_id", friendly_id)
        .single();
      
      if (existingDevice) {
        return { success: true, error: "Device with this friendly ID already exists" };
      }
      
      // Create the test device
      const { error } = await supabase
        .from("devices")
        .insert(testDevice);
      
      if (error) {
        console.error("Error creating test device:", error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error initializing database:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Delete all system logs
 */
export async function deleteAllSystemLogs(): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createClient()
  
  // First count how many logs will be deleted
  const { count, error: countError } = await supabase
    .from("system_logs")
    .select("*", { count: "exact", head: true })
  
  if (countError) {
    console.error("Error counting system logs:", countError)
    return { success: false, error: countError.message }
  }
  
  // Delete all system logs using a raw SQL query
  // This is safer than using .neq() with an impossible ID for UUID columns
  const { error } = await supabase
    .from("system_logs")
    .delete()
    .gte("id", "00000000-0000-0000-0000-000000000000") // This will match all UUIDs
  
  if (error) {
    console.error("Error deleting system logs:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, count: count || 0 }
}

/**
 * Delete all device logs
 */
export async function deleteAllDeviceLogs(): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createClient()
  
  // First count how many logs will be deleted
  const { count, error: countError } = await supabase
    .from("logs")
    .select("*", { count: "exact", head: true })
  
  if (countError) {
    console.error("Error counting device logs:", countError)
    return { success: false, error: countError.message }
  }
  
  // Delete all device logs
  const { error } = await supabase
    .from("logs")
    .delete()
    .gte("id", 0) // This will match all numeric IDs
  
  if (error) {
    console.error("Error deleting device logs:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, count: count || 0 }
}

/**
 * Add a new device
 */
export async function addDevice(device: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'last_update_time' | 'next_expected_update' | 'last_refresh_duration'>): Promise<{ success: boolean; error?: string; device?: Device }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("devices")
    .insert(device)
    .select()
    .single()
  
  if (error) {
    console.error("Error adding device:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, device: data }
}

/**
 * Delete a device by ID
 */
export async function deleteDevice(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // First delete all logs associated with this device
  const { error: logsError } = await supabase
    .from("logs")
    .delete()
    .eq("device_id", id)
  
  if (logsError) {
    console.error("Error deleting device logs:", logsError)
    return { success: false, error: logsError.message }
  }
  
  // Then delete the device
  const { error } = await supabase
    .from("devices")
    .delete()
    .eq("id", id)
  
  if (error) {
    console.error("Error deleting device:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Fix database issues by replacing null values with appropriate defaults
 */
export async function fixDatabaseIssues(): Promise<{ success: boolean; error?: string; fixedCount?: number }> {
  const supabase = await createClient()
  
  // Fetch all devices
  const { data: devices, error: fetchError } = await supabase
    .from("devices")
    .select("*")
  
  if (fetchError) {
    console.error("Error fetching devices:", fetchError)
    return { success: false, error: fetchError.message }
  }
  
  if (!devices || devices.length === 0) {
    return { success: true, fixedCount: 0 }
  }
  
  let fixedCount = 0
  
  // Process each device and fix null values
  for (const device of devices) {
    const updates: Partial<Device> = {}
    
    // Check and fix each field that should have a default value
    if (device.timezone === null) {
      updates.timezone = 'UTC'
      fixedCount++
    }
    
    if (device.refresh_schedule === null) {
      updates.refresh_schedule = {
        default_refresh_rate: 60,
        time_ranges: []
      } as RefreshSchedule
      fixedCount++
    }
    
    // Only update if there are changes to make
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("devices")
        .update(updates)
        .eq("id", device.id)
      
      if (updateError) {
        console.error(`Error updating device ${device.id}:`, updateError)
        return { success: false, error: updateError.message }
      }
    }
  }
  
  return { success: true, fixedCount }
}

/**
 * Fetch all devices
 */
export async function fetchAllDevices(): Promise<Device[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching devices:", error)
    return []
  }
  
  return data || []
}

/**
 * Execute raw SQL directly using Supabase's REST API
 * This is a workaround for executing SQL statements that can't be run through the regular API
 */
export async function executeRawSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  try {
    // First try using the PostgreSQL function if it exists
    try {
      const { error } = await supabase.rpc('exec_sql', { sql })
      
      if (!error) {
        return { success: true }
      } else {
        console.log("Error using exec_sql RPC:", error);
      }
    } catch (e) {
      // Function doesn't exist, continue to other methods
      console.log("exec_sql function doesn't exist or failed:", e);
    }
    
    // Try using direct SQL execution through the Supabase client
    try {
      // This is a workaround that might work in some environments
      // @ts-expect-error - Using private API
      if (supabase._db && typeof supabase._db.query === 'function') {
        // @ts-expect-error - Using private API
        await supabase._db.query(sql);
        return { success: true };
      }
    } catch (dbError) {
      console.log("Direct DB query failed:", dbError);
    }
    
    // Try using Supabase's REST API to execute SQL directly
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'X-Client-Info': 'byos-nextjs',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql }),
        cache: 'no-store'
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text();
        console.log(`RPC exec_sql failed (${response.status}):`, errorText);
      }
    } catch (fetchError) {
      console.log("Fetch to RPC endpoint failed:", fetchError);
    }
    
    // If all previous methods failed, try one last approach
    try {
      // Try using the Supabase SQL API directly
      // This is a last resort and might not work in all environments
      // const sqlUrl = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`);
      
      // For GET requests, we can't send a body, so we'll use a different approach
      // We'll create a temporary function that executes our SQL and then call it
      const tempFunctionName = `temp_exec_${Math.random().toString(36).substring(2, 10)}`;
      const createTempFunctionSQL = `
        CREATE OR REPLACE FUNCTION ${tempFunctionName}()
        RETURNS void AS $$
        BEGIN
          ${sql}
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      // First create the temporary function
      const createFunctionResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'X-Client-Info': 'byos-nextjs',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: 'exec_sql',
          args: { sql: createTempFunctionSQL }
        })
      });
      
      if (!createFunctionResponse.ok) {
        const createErrorText = await createFunctionResponse.text();
        console.log(`Failed to create temp function (${createFunctionResponse.status}):`, createErrorText);
        throw new Error(`Failed to create temporary function: ${createErrorText}`);
      }
      
      // Then call the temporary function
      const callFunctionResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${tempFunctionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'X-Client-Info': 'byos-nextjs',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({})
      });
      
      if (!callFunctionResponse.ok) {
        const callErrorText = await callFunctionResponse.text();
        console.log(`Failed to call temp function (${callFunctionResponse.status}):`, callErrorText);
        throw new Error(`Failed to execute SQL via temporary function: ${callErrorText}`);
      }
      
      // Finally, drop the temporary function
      const dropFunctionResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'X-Client-Info': 'byos-nextjs',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: 'exec_sql',
          args: { sql: `DROP FUNCTION IF EXISTS ${tempFunctionName}();` }
        })
      });
      
      if (!dropFunctionResponse.ok) {
        console.log(`Warning: Failed to drop temp function (${dropFunctionResponse.status})`, await dropFunctionResponse.text());
        // This is not critical, so we'll still return success
      }
      
      return { success: true };
    } catch (lastError) {
      console.error("All SQL execution methods failed:", lastError);
      return { 
        success: false, 
        error: `All SQL execution methods failed: ${lastError instanceof Error ? lastError.message : String(lastError)}` 
      };
    }
  } catch (error) {
    console.error("Error executing raw SQL:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Create the necessary database functions
export async function createDatabaseFunctions(): Promise<{ success: boolean; error?: string }> {
  try {
    let overallSuccess = true;
    const errors: string[] = [];
    
    // Create function to execute SQL
    const execSqlFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS json AS $$
      BEGIN
        EXECUTE sql;
        RETURN json_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Create function to check if tables exist
    const checkTablesFunction = `
      CREATE OR REPLACE FUNCTION check_tables_exist(table_names text[])
      RETURNS json AS $$
      DECLARE
        all_exist boolean := true;
        missing_tables text[] := '{}';
        table_name text;
      BEGIN
        FOREACH table_name IN ARRAY table_names LOOP
          IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
          ) THEN
            all_exist := false;
            missing_tables := array_append(missing_tables, table_name);
          END IF;
        END LOOP;
        
        RETURN json_build_object(
          'all_exist', all_exist,
          'missing_tables', missing_tables
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Create function to create the database schema
    const createSchemaFunction = `
      CREATE OR REPLACE FUNCTION create_database_schema()
      RETURNS json AS $$
      BEGIN
        -- Enable UUID generation extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Devices Table
        CREATE TABLE IF NOT EXISTS public.devices (
            id BIGSERIAL PRIMARY KEY,
            friendly_id VARCHAR NOT NULL UNIQUE,
            name VARCHAR NOT NULL,
            mac_address VARCHAR NOT NULL UNIQUE,
            api_key VARCHAR NOT NULL UNIQUE,
            screen VARCHAR NULL DEFAULT NULL,
            refresh_schedule JSONB NULL,
            timezone TEXT NOT NULL DEFAULT 'UTC',
            last_update_time TIMESTAMPTZ NULL,
            next_expected_update TIMESTAMPTZ NULL,
            last_refresh_duration INTEGER NULL,
            battery_voltage NUMERIC NULL,
            firmware_version TEXT NULL,
            rssi INTEGER NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Indexes for Devices
        CREATE INDEX IF NOT EXISTS idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);
        
        -- Logs Table
        CREATE TABLE IF NOT EXISTS public.logs (
            id BIGSERIAL PRIMARY KEY,
            device_id BIGINT NOT NULL,
            friendly_id TEXT NULL,
            log_data TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
        );
        
        -- System Logs Table
        CREATE TABLE IF NOT EXISTS public.system_logs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT now(),
            level VARCHAR NOT NULL,
            message TEXT NOT NULL,
            source VARCHAR NULL,
            metadata TEXT NULL,
            trace TEXT NULL
        );
        
        -- Indexes for System Logs
        CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at);
        CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs (level);
        
        RETURN json_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Execute the SQL statements one by one, continuing even if some fail
    const execSqlResult = await executeRawSQL(execSqlFunction);
    if (!execSqlResult.success) {
      console.error("Failed to create exec_sql function:", execSqlResult.error);
      errors.push(`exec_sql: ${execSqlResult.error}`);
      overallSuccess = false;
      // Continue anyway, as we might be able to create the other functions directly
    }
    
    const checkTablesResult = await executeRawSQL(checkTablesFunction);
    if (!checkTablesResult.success) {
      console.error("Failed to create check_tables_exist function:", checkTablesResult.error);
      errors.push(`check_tables_exist: ${checkTablesResult.error}`);
      overallSuccess = false;
      // Continue anyway
    }
    
    const createSchemaResult = await executeRawSQL(createSchemaFunction);
    if (!createSchemaResult.success) {
      console.error("Failed to create create_database_schema function:", createSchemaResult.error);
      errors.push(`create_database_schema: ${createSchemaResult.error}`);
      overallSuccess = false;
    }
    
    // Return success if at least one function was created successfully
    return { 
      success: overallSuccess, 
      error: errors.length > 0 ? `Failed to create some database functions: ${errors.join('; ')}` : undefined 
    };
  } catch (error) {
    console.error("Error creating database functions:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
} 