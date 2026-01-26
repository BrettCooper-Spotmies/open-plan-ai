type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry = this.formatEntry(level, message, context);

    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console[level](
        `%c[${level.toUpperCase()}]%c ${message}`,
        style,
        'color: inherit',
        context || ''
      );
    }

    // Future: Send to Sentry, LogRocket, etc.
    // if (config.features.errorTracking && level === 'error') {
    //   this.sendToErrorTracking(entry);
    // }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #6B7280; font-weight: bold',
      info: 'color: #3B82F6; font-weight: bold',
      warn: 'color: #F59E0B; font-weight: bold',
      error: 'color: #EF4444; font-weight: bold',
    };
    return styles[level];
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  apiCall(method: string, url: string, status?: number) {
    this.info(`API ${method} ${url}`, { status });
  }

  userAction(action: string, details?: Record<string, unknown>) {
    this.info(`User: ${action}`, details);
  }
}

export const logger = new Logger();
