import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  correlationId?: string;
  context?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getActiveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && envLevel in LEVEL_PRIORITIES) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const activeLevel = getActiveLogLevel();
  return LEVEL_PRIORITIES[level] >= LEVEL_PRIORITIES[activeLevel];
}

function formatError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  if (typeof err === 'string') {
    return { name: 'Error', message: err };
  }
  return undefined;
}

function outputLog(entry: LogEntry) {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const jsonStr = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(jsonStr);
    } else if (entry.level === 'warn') {
      console.warn(jsonStr);
    } else {
      console.log(jsonStr);
    }
  } else {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ''}${entry.correlationId ? ` [${entry.correlationId}]` : ''}:`;
    if (entry.level === 'error') {
      console.error(prefix, entry.message, entry.data || '', entry.error || '');
    } else if (entry.level === 'warn') {
      console.warn(prefix, entry.message, entry.data || '');
    } else if (entry.level === 'info') {
      console.info(prefix, entry.message, entry.data || '');
    } else {
      console.debug(prefix, entry.message, entry.data || '');
    }
  }

  // Forward breadcrumbs to Sentry when in browser/server runtime
  try {
    if (typeof Sentry?.addBreadcrumb === 'function') {
      Sentry.addBreadcrumb({
        category: entry.context || 'app',
        message: entry.message,
        level: entry.level === 'warn' ? 'warning' : entry.level,
        data: {
          ...entry.data,
          correlationId: entry.correlationId,
        },
      });
    }
  } catch {
    // Sentry breadcrumb forwarding should never break runtime flow
  }
}

export class Logger {
  private context?: string;
  private correlationId?: string;

  constructor(context?: string, correlationId?: string) {
    this.context = context;
    this.correlationId = correlationId;
  }

  public debug(
    message: string,
    data?: Record<string, unknown>,
    meta?: LogMetadata
  ) {
    this.log('debug', message, data, meta);
  }

  public info(
    message: string,
    data?: Record<string, unknown>,
    meta?: LogMetadata
  ) {
    this.log('info', message, data, meta);
  }

  public warn(
    message: string,
    data?: Record<string, unknown>,
    meta?: LogMetadata
  ) {
    this.log('warn', message, data, meta);
  }

  public error(
    message: string,
    err?: unknown,
    data?: Record<string, unknown>,
    meta?: LogMetadata
  ) {
    if (!shouldLog('error')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: meta?.context || this.context,
      correlationId: meta?.correlationId || this.correlationId,
      data,
      error: formatError(err),
    };

    outputLog(entry);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    meta?: LogMetadata
  ) {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: meta?.context || this.context,
      correlationId: meta?.correlationId || this.correlationId,
      data,
    };

    outputLog(entry);
  }

  public child(subContext: string, correlationId?: string): Logger {
    const mergedContext = this.context
      ? `${this.context}:${subContext}`
      : subContext;
    return new Logger(mergedContext, correlationId || this.correlationId);
  }
}

export const logger = new Logger('App');
export function createScopedLogger(
  context: string,
  correlationId?: string
): Logger {
  return new Logger(context, correlationId);
}
