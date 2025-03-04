export type Device = {
  id: number; // bigint (BIGSERIAL)
  name: string;
  mac_address: string;
  api_key: string;
  friendly_id: string;
  screen: string | null; // Screen identifier that maps to a screen component
  refresh_schedule: RefreshSchedule | null; // Stored as JSONB in DB
  timezone: string; // Defaults to 'UTC'
  last_update_time: string | null; // ISO timestamp (TIMESTAMPTZ)
  next_expected_update: string | null; // ISO timestamp (TIMESTAMPTZ)
  last_refresh_duration: number | null; // in seconds
  battery_voltage: number | null; // Stored as NUMERIC in DB
  firmware_version: string | null;
  rssi: number | null; // WiFi signal strength in dBm
  created_at: string | null; // ISO timestamp (TIMESTAMPTZ, nullable with default)
  updated_at: string | null; // ISO timestamp (TIMESTAMPTZ, nullable with default)
}

export type TimeRange = {
  start_time: string; // Format: "HH:MM" in 24-hour format
  end_time: string; // Format: "HH:MM" in 24-hour format
  refresh_rate: number; // Refresh rate in seconds
}

export type RefreshSchedule = {
  default_refresh_rate: number; // Default refresh rate in seconds
  time_ranges: TimeRange[]; // Array of time ranges with specific refresh rates
}

export type Log = {
  id: number; // bigint (BIGSERIAL)
  device_id: number;
  friendly_id?: string | null; // Now explicitly nullable
  log_data: string;
  created_at: string | null; // ISO timestamp (TIMESTAMPTZ, nullable with default)
}

export type SystemLog = {
  id: string; // UUID
  created_at: string | null; // TIMESTAMPTZ (nullable with default)
  level: string;
  message: string;
  source: string | null;
  metadata: string | null;
  trace: string | null;
}

export type Database = {
  public: {
    Tables: {
      devices: {
        Row: Device;
        Insert: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'last_update_time' | 'next_expected_update' | 'last_refresh_duration'>;
        Update: Partial<Omit<Device, 'id'>>;
      };
      logs: {
        Row: Log;
        Insert: Omit<Log, 'id' | 'created_at'>;
        Update: Partial<Omit<Log, 'id'>>;
      };
      system_logs: {
        Row: SystemLog;
        Insert: Omit<SystemLog, 'id' | 'created_at'>;
        Update: Partial<Omit<SystemLog, 'id'>>;
      };
    };
  };
};