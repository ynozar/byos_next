import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import { defaultDevice } from '@/lib/defaultDevice'
import { CustomError } from '@/lib/api/types'

interface LogEntry {
  creation_timestamp: number
  message?: string
  level?: string
  device_status?: string
  battery_voltage?: number
  rssi?: number
  firmware_version?: string
}

interface LogData {
  logs_array: LogEntry[]
  device_id?: string
  timestamp?: string
}

// Default device ID to use as fallback
const DEFAULT_DEVICE_ID = defaultDevice.friendly_id

// Define a type for the expected request body
interface LogRequestBody {
  log: {
    logs_array: LogEntry[];
  };
}


export async function GET(request: Request) {
  logInfo('Log API GET Request received (unexpected)', {
    source: 'api/log',
    metadata: {
      url: request.url,
      method: request.method,
      path: new URL(request.url).pathname,
      search: new URL(request.url).search,
      origin: new URL(request.url).origin
    }
  })

  const apiKey = request.headers.get('Access-Token');
  const supabase = await createClient();

  if (!apiKey) {
    const error = new Error('Missing Access-Token header');
    logError(error, {
      source: 'api/log',
      metadata: { request_url: request.url }
    })

    return NextResponse.json({
      status: 500,
      message: "Device not found"
    }, { status: 200 }) // 200 for device compatibility
  }

  try {
    const { data: device, error } = await supabase
      .from('devices')
      .select('*')
      .eq('api_key', apiKey)
      .single()

    if (error || !device) {
      // Create an error object with the Supabase error details
      const deviceError: CustomError = new Error('Error fetching device');
      // Attach the original error information
      deviceError.originalError = error;

      logError(deviceError, {
        source: 'api/log',
        metadata: { apiKey }
      })

      return NextResponse.json({
        status: 500,
        message: "Device not found"
      }, { status: 200 }) // 200 for device compatibility
    }

    return NextResponse.json({
      status: 400, // Indicate wrong method in body
      message: "Please use POST method for sending logs",
      device_id: device.friendly_id
    }, { status: 200 }) // 200 for device compatibility
  } catch (error) {
    // The error object already contains the stack trace
    logError(error as Error, {
      source: 'api/log'
    })
    return NextResponse.json({
      status: 500,
      message: "Internal server error"
    }, { status: 200 }) // 200 for device compatibility
  }
}

export async function POST(request: Request) {
  // Log request details
  logInfo('Log API Request', {
    source: 'api/log',
    metadata: {
      url: request.url,
      method: request.method,
      path: new URL(request.url).pathname,
      search: new URL(request.url).search,
      origin: new URL(request.url).origin
    }
  })

  try {
    const apiKey = request.headers.get('Access-Token');
    const refreshRate = request.headers.get('Refresh-Rate');
    const batteryVoltage = request.headers.get('Battery-Voltage');
    const fwVersion = request.headers.get('FW-Version');
    const rssi = request.headers.get('RSSI');
    const supabase = await createClient();

    // Initialize device with default value
    let deviceId = DEFAULT_DEVICE_ID;
    let deviceFound = false;

    if (!apiKey) {
      const error = new Error('Missing Access-Token header');
      logError(error, {
        source: 'api/log'
      })
      // Continue with default device instead of returning error
      logInfo('Using default device as fallback', {
        source: 'api/log',
        metadata: { default_device_id: DEFAULT_DEVICE_ID }
      })
    } else {
      // Try to find the device
      const { data: device, error } = await supabase
        .from('devices')
        .select('*')
        .eq('api_key', apiKey)
        .single()

      if (error || !device) {
        // Create an error object with the Supabase error details
        const deviceError: CustomError = new Error('Error fetching device');
        // Attach the original error information
        deviceError.originalError = error;

        logError(deviceError, {
          source: 'api/log',
          metadata: { apiKey, refreshRate, batteryVoltage, fwVersion, rssi }
        })

        // Continue with default device instead of returning error
        logInfo('Using default device as fallback', {
          source: 'api/log',
          metadata: { default_device_id: DEFAULT_DEVICE_ID }
        })
      } else {
        // Use the found device
        deviceId = device.friendly_id;
        deviceFound = true;

        logInfo('Device authenticated', {
          source: 'api/log',
          metadata: {
            api_key: apiKey,
            device_id: deviceId,
            refresh_rate: refreshRate,
            battery_voltage: batteryVoltage,
            fw_version: fwVersion,
            rssi: rssi
          }
        })
      }
    }

    const requestBody: LogRequestBody = await request.json();
    logInfo('Processing logs array', {
      source: 'api/log',
      metadata: {
        logs: requestBody.log.logs_array,
        refresh_rate: refreshRate,
        battery_voltage: batteryVoltage,
        fw_version: fwVersion,
        rssi: rssi,
        using_default_device: !deviceFound
      }
    })

    // Process log data
    const logData: LogData = {
      logs_array: requestBody.log.logs_array.map((log: LogEntry) => ({
        ...log,
        timestamp: log.creation_timestamp
          ? new Date(log.creation_timestamp * 1000).toISOString()
          : new Date().toISOString()
      }))
    };

    console.log('📦 Processed log data:', JSON.stringify(logData, null, 2))

    // Try to insert log with the device ID (either real or default)
    const { error: insertError } = await supabase
      .from('logs')
      .insert({
        friendly_id: deviceId,
        log_data: logData
      })

    // If insertion failed and we're not already using the default device, try with default
    if (insertError && deviceId !== DEFAULT_DEVICE_ID) {
      // Create an error object with the insert error details
      const dbError: CustomError = new Error('Error inserting log with device ID, trying with default device');
      // Attach the original error information
      dbError.originalError = insertError;

      logError(dbError, {
        source: 'api/log',
        metadata: {
          original_device_id: deviceId,
          default_device_id: DEFAULT_DEVICE_ID,
          refresh_rate: refreshRate,
          battery_voltage: batteryVoltage,
          fw_version: fwVersion,
          rssi: rssi
        }
      })

      // Try again with default device
      const { error: fallbackError } = await supabase
        .from('logs')
        .insert({
          friendly_id: DEFAULT_DEVICE_ID,
          log_data: logData
        })

      if (fallbackError) {
        // Create an error object with the fallback error details
        const fallbackDbError: CustomError = new Error('Error inserting log with default device');
        // Attach the original error information
        fallbackDbError.originalError = fallbackError;

        logError(fallbackDbError, {
          source: 'api/log',
          metadata: {
            refresh_rate: refreshRate,
            battery_voltage: batteryVoltage,
            fw_version: fwVersion,
            rssi: rssi
          }
        })
      } else {
        logInfo('Log saved successfully with default device', {
          source: 'api/log',
          metadata: {
            device_id: DEFAULT_DEVICE_ID,
            log_data: logData,
            refresh_rate: refreshRate,
            battery_voltage: batteryVoltage,
            fw_version: fwVersion,
            rssi: rssi
          }
        })
      }
    } else if (!insertError) {
      logInfo('Log saved successfully', {
        source: 'api/log',
        metadata: {
          device_id: deviceId,
          log_data: logData,
          refresh_rate: refreshRate,
          battery_voltage: batteryVoltage,
          fw_version: fwVersion,
          rssi: rssi
        }
      })
    }

    return NextResponse.json({
      status: 200,
      message: "Log received"
    }, { status: 200 })

  } catch (error) {
    // The error object already contains the stack trace
    logError(error as Error, {
      source: 'api/log'
    })
    return NextResponse.json({
      status: 500,
      message: "Internal server error"
    }, { status: 200 }) // 200 for device compatibility
  }
} 