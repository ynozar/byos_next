'use server';

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from 'next/cache';


export async function* initDatabase() {
    const supabase = await createClient()
    const steps = [
        {
            step: 'Enable UUID extension',
            check: "SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp';",
            execute: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
        },
        {
            step: 'Create devices table',
            check: "SELECT 1 FROM information_schema.tables WHERE table_name = 'devices';",
            execute: `CREATE TABLE IF NOT EXISTS public.devices (
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
      );`,
        },
        {
            step: 'Create logs table',
            check: "SELECT 1 FROM information_schema.tables WHERE table_name = 'logs';",
            execute: `CREATE TABLE IF NOT EXISTS public.logs (
        id BIGSERIAL PRIMARY KEY,
        device_id BIGINT NOT NULL,
        friendly_id TEXT NULL,
        log_data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
      );`,
        },
        {
            step: 'Create system_logs table',
            check: "SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs';",
            execute: `CREATE TABLE IF NOT EXISTS public.system_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now(),
        level VARCHAR NOT NULL,
        message TEXT NOT NULL,
        source VARCHAR NULL,
        metadata TEXT NULL,
        trace TEXT NULL
      );`,
        },
        {
            step: 'Create index idx_devices_refresh_schedule',
            check: "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_refresh_schedule';",
            execute: "CREATE INDEX IF NOT EXISTS idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);",
        },
        {
            step: 'Create index idx_system_logs_created_at',
            check: "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_created_at';",
            execute: "CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at);",
        },
        {
            step: 'Create index idx_system_logs_level',
            check: "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_level';",
            execute: "CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs (level);",
        },
    ];

    for (const { step, check, execute } of steps) {
        yield { step, status: 'checking' };

        const { data, error } = await supabase.rpc('sql', { query: check });

        if (error) {
            yield { step, status: 'error', message: error.message };
            continue;
        }

        if (data.length > 0) {
            yield { step, status: 'skipped' };
            continue;
        }

        yield { step, status: 'executing' };
        const { error: executionError } = await supabase.rpc('sql', { query: execute });

        if (executionError) {
            yield { step, status: 'error', message: executionError.message };
        } else {
            yield { step, status: 'completed' };
        }

        // Revalidate cache to ensure fresh data
        revalidatePath('/');
    }
}