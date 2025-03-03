export type Device = {
  id: number;
  name: string;
  mac_address: string;
  api_key: string;
  friendly_id: string;
  refresh_schedule: RefreshSchedule | null;
  timezone: string; // Device timezone (e.g., 'America/New_York', 'Europe/London')
  last_update_time: string | null; // ISO timestamp of last update
  next_expected_update: string | null; // ISO timestamp of next expected update
  last_refresh_duration: number | null; // in seconds
  created_at: string;
  updated_at: string;
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
  id: number;
  device_id: number;
  friendly_id?: string;
  log_data: string;
  created_at: string;
}

export type SystemLog = {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  level: string; // character varying
  message: string; // text
  source: string; // character varying
  metadata: string; // text
  trace: string; // text
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
      system_logs: { // New system_logs table
        Row: SystemLog;
        Insert: Omit<SystemLog, 'id' | 'created_at'>;
        Update: Partial<Omit<SystemLog, 'id'>>;
      };
    };
  };
}; 