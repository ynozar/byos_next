import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import { RefreshSchedule, TimeRange } from '@/lib/supabase/types'
import { CustomError } from '@/lib/api/types'
import { timezones } from '@/utils/helpers'

// Helper function to generate a filename using friendly_id and a Base64-encoded timestamp
const generateFilename = (friendlyId: string): string => {
    const timestamp = Date.now().toString();
    const base64Timestamp = Buffer.from(timestamp).toString('base64url'); // Use URL-safe Base64 encoding
    return `${friendlyId}_${base64Timestamp}.bmp`;
};

// Helper function to pre-cache the image in the background
const precacheImageInBackground = (imageUrl: string, deviceId: string): void => {
    // Fire and forget - don't await this
    fetch(imageUrl, { method: 'GET' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to cache image: ${response.status}`);
            }
            logInfo('Image pre-cached successfully', {
                source: 'api/display',
                metadata: { imageUrl, deviceId }
            });
        })
        .catch(error => {
            logError('Failed to precache image', {
                source: 'api/display',
                metadata: { imageUrl, error, deviceId }
            });
        });
};

// Helper to prepare for the next frame
const prepareNextFrame = (deviceId: string): void => {
    // Generate a random filename for the next frame
    const nextRandomFilename = generateFilename(deviceId);
    const baseUrl = 'https://api.manglekuo.com/api/dashboard/bitmap';
    const nextImageUrl = `${baseUrl}/${nextRandomFilename}`;

    // Start pre-caching the next frame in the background
    precacheImageInBackground(nextImageUrl, deviceId);

    // Store this information for the next request if needed
    // This could be expanded to store in a cache or database if needed
    logInfo('Next frame prepared', {
        source: 'api/display',
        metadata: {
            next_image_url: nextImageUrl,
            next_filename: nextRandomFilename,
            deviceId
        }
    });
};

// Helper function to calculate the current refresh rate based on time of day and device settings
const calculateRefreshRate = (
    refreshSchedule: RefreshSchedule | null,
    defaultRefreshRate: number,
    timezone: string = timezones[0].value
): number => {
    // Use the default refresh rate directly
    if (!refreshSchedule) {
        return defaultRefreshRate;
    }

    // Get current time in device's timezone
    const now = new Date();
    const options = { timeZone: timezone, hour12: false } as Intl.DateTimeFormatOptions;
    const formatter = new Intl.DateTimeFormat('en-US', {
        ...options,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format: "HH:MM" in 24-hour format
    const [{ value: hour }, , { value: minute }] = formatter.formatToParts(now);
    const currentTimeString = `${hour}:${minute}`;

    // Check if current time falls within any of the defined time ranges
    for (const range of refreshSchedule.time_ranges as TimeRange[]) {
        if (isTimeInRange(currentTimeString, range.start_time, range.end_time)) {
            // Convert refresh rate from seconds to device units (1 unit = 1 second)
            return range.refresh_rate;
        }
    }

    // If no specific range matches, use the default refresh rate from the schedule
    return refreshSchedule.default_refresh_rate;
};

// Helper function to check if a time is within a given range
const isTimeInRange = (timeToCheck: string, startTime: string, endTime: string): boolean => {
    // Handle cases where the range crosses midnight
    if (startTime > endTime) {
        return timeToCheck >= startTime || timeToCheck < endTime;
    }

    // Normal case where start time is before end time
    return timeToCheck >= startTime && timeToCheck < endTime;
};

// Helper function to update device refresh status information
const updateDeviceRefreshStatus = async (
    deviceId: string,
    refreshDurationSeconds: number,
    timezone: string = 'UTC'
): Promise<void> => {
    const now = new Date();
    const nextExpectedUpdate = new Date(now.getTime() + (refreshDurationSeconds * 1000));
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from('devices')
            .update({
                last_update_time: now.toISOString(),
                next_expected_update: nextExpectedUpdate.toISOString(),
                last_refresh_duration: Math.round(refreshDurationSeconds)
            })
            .eq('friendly_id', deviceId);

        if (error) {
            logError(error, {
                source: 'api/display/updateDeviceRefreshStatus',
                metadata: {
                    deviceId,
                    refreshDurationSeconds,
                    timezone,
                    last_update_time: now.toISOString(),
                    next_expected_update: nextExpectedUpdate.toISOString()
                }
            });
        }
    } catch (error) {
        logError(error as Error, {
            source: 'api/display/updateDeviceRefreshStatus',
            metadata: { deviceId, refreshDurationSeconds, timezone }
        });
    }
};

export async function GET(request: Request) {
    const apiKey = request.headers.get('Access-Token');
    const macAddress = request.headers.get('ID')?.toUpperCase();
    const refreshRate = request.headers.get('Refresh-Rate');
    const batteryVoltage = request.headers.get('Battery-Voltage');
    const fwVersion = request.headers.get('FW-Version');
    const rssi = request.headers.get('RSSI');
    const supabase = await createClient();

    // Log request details
    logInfo('Display API Request', {
        source: 'api/display',
        metadata: {
            url: request.url,
            method: request.method,
            path: new URL(request.url).pathname,
            macAddress: macAddress,
            apiKey: apiKey,
            refreshRate: refreshRate,
            batteryVoltage: batteryVoltage,
            fwVersion: fwVersion,
            rssi: rssi,
        }
    })

    if (!apiKey || !macAddress) {
        // Create an error object to capture the stack trace automatically
        const error = new Error('Missing required headers');
        logError(error, {
            source: 'api/display',
            metadata: { apiKey, macAddress }
        })
        return NextResponse.json({
            status: 500,
            reset_firmware: true,
            message: "Device not found"
        }, { status: 200 }) // Status 200 for device compatibility
    }

    try {
        const { data: device, error } = await supabase
            .from('devices')
            .select('*')
            .eq('api_key', apiKey)
            .eq('mac_address', macAddress)
            .single()

        if (error || !device) {
            // Create an error object with the Supabase error details
            const deviceError = new Error('Error fetching device');
            // Attach the original error information
            (deviceError as CustomError).originalError = error;

            logError(deviceError, {
                source: 'api/display',
                metadata: { apiKey, macAddress }
            })
            return NextResponse.json({
                status: 500,
                reset_firmware: true,
                message: "Device not found"
            }, { status: 200 })
        }

        logInfo('Device database info', {
            source: 'api/display',
            metadata: {
                name: device.name,
                friendly_id: device.friendly_id,
                mac_address: device.mac_address,
                api_key: device.api_key,
                refresh_schedule: device.refresh_schedule,
                last_update_time: device.last_update_time,
                next_expected_update: device.next_expected_update,
                last_refresh_duration: device.last_refresh_duration,
            }
        });

        // Generate a filename for the current request
        const nextFilename = generateFilename(device.friendly_id);
        const baseUrl = 'https://api.manglekuo.com/api/dashboard/bitmap';
        const imageUrl = `${baseUrl}/${nextFilename}`;

        // Start pre-caching the current image in the background
        // This ensures the image is cached by the time the device requests it
        precacheImageInBackground(imageUrl, device.friendly_id);

        // Calculate the appropriate refresh rate based on time of day and device settings
        // Default refresh rate is 60 seconds (180 units)
        const defaultRefreshRate = 180; // 3 units = 1s
        const deviceTimezone = device.timezone || 'UTC'; // Default to UTC if no timezone is set
        const dynamicRefreshRate = calculateRefreshRate(
            device.refresh_schedule,
            defaultRefreshRate,
            deviceTimezone
        );


        // Update device refresh status information in the background
        // We don't await this to avoid delaying the response
        updateDeviceRefreshStatus(device.friendly_id, dynamicRefreshRate, deviceTimezone);

        // Prepare for the next frame in the background
        // This will generate and pre-cache the next image that will be used in the future
        setTimeout(() => {
            prepareNextFrame(device.friendly_id);
        }, 0);

        // Calculate human-readable next update time for logging
        const nextUpdateTime = new Date(Date.now() + (dynamicRefreshRate * 1000));

        logInfo('Display request successful', {
            source: 'api/display',
            metadata: {
                image_url: imageUrl,
                friendly_id: device.friendly_id,
                refresh_rate: dynamicRefreshRate,
                refresh_duration_seconds: dynamicRefreshRate,
                calculated_from_schedule: !!device.refresh_schedule,
                next_update_expected: nextUpdateTime.toISOString(),
                filename: nextFilename,
                special_function: "restart_playlist"
            }
        })

        return NextResponse.json({
            status: 0,
            image_url: imageUrl,
            filename: nextFilename,
            refresh_rate: dynamicRefreshRate,
            reset_firmware: false,
            update_firmware: false,
            firmware_url: null,
            special_function: "restart_playlist"
        }, { status: 200 })

    } catch (error) {
        // The error object already contains the stack trace
        logError(error as Error, {
            source: 'api/display'
        })
        return NextResponse.json({
            status: 500,
            reset_firmware: true,
            message: "Device not found"
        }, { status: 200 })
    }
} 