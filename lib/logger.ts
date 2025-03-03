import { createClient } from '@/lib/supabase/server'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogOptions {
  source?: string
  metadata?: Record<string, unknown>
  trace?: string
}

export const log = async (
  level: LogLevel,
  message: string | Error,
  options: LogOptions = {}
) => {
  // Convert Error objects to strings if necessary
  const messageText = message instanceof Error ? message.message : message
  const trace = message instanceof Error ? message.stack : options.trace
  const supabase = await createClient();

  // Always do console logging first
  switch (level) {
    case 'info':
      console.log(messageText)
      break
    case 'warn':
      console.warn(messageText)
      break
    case 'error':
      console.error(messageText)
      break
    case 'debug':
      console.debug(messageText)
      break
  }

  // Then log to database without awaiting
  (async () => {
    try {
      const { error } = await supabase
        .from('system_logs')
        .insert({
          level,
          message: messageText,
          source: options.source,
          metadata: options.metadata,
          trace
        })

      if (error) {
        console.error('Failed to write to system_logs:', error)
      }
    } catch (err) {
      console.error('Error writing to system_logs:', err)
    }
  })()
}

// Convenience methods
export const logInfo = (message: string, options?: LogOptions) => log('info', message, options)
export const logWarn = (message: string, options?: LogOptions) => log('warn', message, options)
export const logError = (error: Error | string, options?: LogOptions) => log('error', error, options)
export const logDebug = (message: string, options?: LogOptions) => log('debug', message, options)

export type Log = {
  id: string
  created_at: string
  level: LogLevel
  message: string
  source?: string
  metadata?: Record<string, unknown>
  trace?: string
  count?: number
}

export const groupLogs = (logs: Log[]): Log[] => {
  if (!logs.length) return [];
  
  const groupedLogs: Log[] = [];
  let currentGroup: Log | null = null;
  
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  for (const log of sortedLogs) {
    if (!currentGroup) {
      currentGroup = {
        ...log,
        count: 1
      };
      continue;
    }
    
    const currentTime = new Date(currentGroup.created_at).getTime();
    const logTime = new Date(log.created_at).getTime();
    const timeDiff = Math.abs(currentTime - logTime) / 1000;
    
    if (
      timeDiff <= 5 &&
      log.level === currentGroup.level &&
      log.source === currentGroup.source
    ) {
      currentGroup.count = (currentGroup.count || 1) + 1;
      
      if (log.message !== currentGroup.message) {
        currentGroup.message = `${currentGroup.message} (+ ${currentGroup.count - 1} similar)`;
      }
    } else {
      groupedLogs.push(currentGroup);
      currentGroup = {
        ...log,
        count: 1
      };
    }
  }
  
  if (currentGroup) {
    groupedLogs.push(currentGroup);
  }
  
  return groupedLogs;
};

export const readLogs = async (
  options: {
    limit?: number;
    page?: number;
    levels?: LogLevel[];
    sources?: string[];
    search?: string;
    groupSimilar?: boolean;
  } = {}
): Promise<{ logs: Log[], total: number }> => {
  const {
    limit = 100,
    page = 1,
    levels,
    sources,
    search,
    groupSimilar = true
  } = options;
  const supabase = await createClient();
  // Start building the query
  let query = supabase
    .from('system_logs')
    .select('*', { count: 'exact' });

  // Apply filters
  if (levels && levels.length > 0) {
    query = query.in('level', levels);
  }

  if (sources && sources.length > 0) {
    query = query.in('source', sources);
  }

  if (search) {
    query = query.or(`message.ilike.%${search}%,source.ilike.%${search}%`);
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Execute the query
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to read system_logs:', error);
    return { logs: [], total: 0 };
  }

  let logs = data as Log[];
  
  // Apply grouping if requested
  if (groupSimilar && logs.length > 0) {
    logs = groupLogs(logs);
  }

  return { 
    logs, 
    total: count || logs.length 
  };
}