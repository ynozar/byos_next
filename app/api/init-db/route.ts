import { NextResponse } from 'next/server';
import sql from '@/lib/supabase/db';

export const runtime = 'nodejs'; // Required for database connection

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const steps = [
        {
          step: 'Enable UUID extension',
          check: "SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';",
          execute: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
        },
        {
          step: 'Create devices table',
          check: "SELECT * FROM information_schema.tables WHERE table_name = 'devices';",
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
          check: "SELECT * FROM information_schema.tables WHERE table_name = 'logs';",
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
          check: "SELECT * FROM information_schema.tables WHERE table_name = 'system_logs';",
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
      ];

      for (const { step, check, execute } of steps) {
        controller.enqueue(encoder.encode(`2:[{"step":"${step}","status":"checking"}]\n`));

        try {
          const exists = await sql.unsafe(check);
          if (exists.length > 0) {
            controller.enqueue(encoder.encode(`2:[{"step":"${step}","status":"skipped"}]\n`));
            continue;
          }

          controller.enqueue(encoder.encode(`2:[{"step":"${step}","status":"executing"}]\n`));
          await sql.unsafe(execute);
          controller.enqueue(encoder.encode(`2:[{"step":"${step}","status":"completed"}]\n`));
        } catch (error: unknown) {
          controller.enqueue(encoder.encode(`3:"${step} failed: ${error instanceof Error ? error.message : String(error)}"\n`));
        }
      }

      controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`)); // Finish
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-vercel-ai-data-stream': 'v1',
    },
  });
}