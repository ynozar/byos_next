import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import { CustomError } from '@/lib/api/types'
import { generateApiKey, generateFriendlyId } from '@/utils/helpers'

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const macAddress = request.headers.get('ID')?.toUpperCase();
        if (!macAddress) {
            const error = new Error('Missing ID header');
            logError(error, {
                source: 'api/setup',
                metadata: { macAddress }
            })
            return NextResponse.json({
                status: 404,
                api_key: null,
                friendly_id: null,
                image_url: null,
                message: "ID header is required"
            }, { status: 200 }) // Status 200 for device compatibility
        }

        const { data: device, error } = await supabase
            .from('devices')
            .select('*')
            .eq('mac_address', macAddress)
            .single()

        if (error || !device) {
            // Device not found, create a new one
            const friendly_id = generateFriendlyId(macAddress, new Date().toISOString().replace(/[-:Z]/g, ""));
            const api_key = generateApiKey(macAddress, new Date().toISOString().replace(/[-:Z]/g, ""));
            const { data: newDevice, error: createError } = await supabase
                .from('devices')
                .insert({
                    mac_address: macAddress,
                    name: `TRMNL Device ${friendly_id}`,
                    friendly_id: friendly_id,
                    api_key: api_key,
                    refresh_schedule: {
                        default_refresh_rate: 60, // Default refresh rate in seconds
                        time_ranges: [
                            {
                                start_time: "00:00", // Start of the time range
                                end_time: "07:00",   // End of the time range
                                refresh_rate: 3600   // Refresh rate in seconds
                            }
                        ]
                    },
                    last_update_time: new Date().toISOString(), // Current time as last update
                    next_expected_update: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
                    timezone: "Europe/London" // Default timezone
                })
                .select()
                .single()

            if (createError || !newDevice) {
                // Create an error object with the Supabase error details
                const deviceError: CustomError = new Error('Error creating device');
                // Attach the original error information
                (deviceError as CustomError).originalError = createError;
                
                logError(deviceError, {
                    source: 'api/setup',
                    metadata: { macAddress, friendly_id, api_key }
                })
                
                return NextResponse.json({
                    status: 500,
                    reset_firmware: false,
                    message: `Error creating new device. ${friendly_id}|${api_key}`
                }, { status: 200 })
            }

            logInfo(`New device ${newDevice.friendly_id} created!`, {
                source: 'api/setup',
                metadata: { 
                    friendly_id: newDevice.friendly_id
                }
            })
            return NextResponse.json({
                status: 200,
                api_key: newDevice.api_key,
                friendly_id: newDevice.friendly_id,
                image_url: null,
                filename: null,
                message: `Device ${newDevice.friendly_id} added to BYOS!`,
            }, { status: 200 })
        }

        // Device exists
        logInfo(`Device ${device.friendly_id} added to BYOS!`, {
            source: 'api/setup',
            metadata: { 
                friendly_id: device.friendly_id
            }
        })
        return NextResponse.json({
            status: 200,
            api_key: device.api_key,
            friendly_id: device.friendly_id,
            image_url: null,
            filename: null,
            message: `Device ${device.friendly_id} added to BYOS!`
        }, { status: 200 })

    } catch (error) {
        // The error object already contains the stack trace
        logError(error as Error, {
            source: 'api/setup'
        })
        return NextResponse.json({
            status: 500,
            error: 'Internal server error'
        }, { status: 200 })
    }
} 