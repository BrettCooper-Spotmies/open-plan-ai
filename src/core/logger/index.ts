type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const STYLES: Record<LogLevel, string> = {
  debug: 'color:#6B7280;font-weight:bold',
  info: 'color:#3B82F6;font-weight:bold',
  warn: 'color:#F59E0B;font-weight:bold',
  error: 'color:#EF4444;font-weight:bold',
};

class Logger {
  private readonly isDev = import.meta.env.DEV;
  private minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info';
  private readonly marks = new Map<string, number>();

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.minLevel];
  }

  private emit(level: LogLevel, message: string, ctx?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    if (this.isDev) {
      console[level](`%c[${level.toUpperCase()}]%c ${message}`, STYLES[level], 'color:inherit', ctx ?? '');
      return;
    }

    const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), context: ctx };
    if (level === 'error' || level === 'warn') console[level](JSON.stringify(entry));

    if (level === 'error') this.sendToSink(entry);
  }

  private sendToSink(entry: LogEntry): void {
    try {
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/v1/client-logs', JSON.stringify(entry));
      }
    } catch { /* never throw from logger */ }
  }

  debug(msg: string, ctx?: Record<string, unknown>) { this.emit('debug', msg, ctx); }
  info(msg: string, ctx?: Record<string, unknown>) { this.emit('info', msg, ctx); }
  warn(msg: string, ctx?: Record<string, unknown>) { this.emit('warn', msg, ctx); }
  error(msg: string, ctx?: Record<string, unknown>) { this.emit('error', msg, ctx); }

  apiCall(method: string, url: string, status?: number) {
    this.info(`API ${method} ${url}`, { status });
  }

  userAction(action: string, details?: Record<string, unknown>) {
    this.info(`User: ${action}`, details);
  }

  track(event: string, properties?: Record<string, unknown>) {
    if (this.isDev) {
      console.log(`%c[TRACK]%c ${event}`, 'color:#10B981;font-weight:bold', 'color:inherit', properties ?? '');
    }
  }

  startMark(label: string) {
    this.marks.set(label, performance.now());
  }

  endMark(label: string): number | undefined {
    const start = this.marks.get(label);
    if (start === undefined) return;
    const dur = performance.now() - start;
    this.marks.delete(label);
    this.debug(`Perf: ${label}`, { ms: dur.toFixed(2) });
    return dur;
  }

  setLevel(level: LogLevel) { this.minLevel = level; }

  group(label: string) { if (this.isDev) console.group(`%c${label}`, 'color:#8B5CF6;font-weight:bold'); }
  groupEnd() { if (this.isDev) console.groupEnd(); }
}

export const logger = new Logger();
