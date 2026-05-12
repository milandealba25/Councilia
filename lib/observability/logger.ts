/**
 * O1 · Logger estructurado ligero (sin dependencia externa).
 *
 * Emite JSON por línea con campos estables para que cualquier agregador
 * (Vercel Logs, Datadog, Logflare, etc.) pueda consumirlo sin parsers
 * adicionales. Reemplazable por `pino` cuando crezca el volumen.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_PRIORITY) return raw as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
  child(bindings: LogContext): Logger;
}

function emit(level: LogLevel, msg: string, ctx: LogContext): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel()]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...ctx,
    env: process.env.NODE_ENV ?? "development",
  };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

function createLogger(bindings: LogContext): Logger {
  return {
    debug: (msg, ctx = {}) => emit("debug", msg, { ...bindings, ...ctx }),
    info: (msg, ctx = {}) => emit("info", msg, { ...bindings, ...ctx }),
    warn: (msg, ctx = {}) => emit("warn", msg, { ...bindings, ...ctx }),
    error: (msg, ctx = {}) => emit("error", msg, { ...bindings, ...ctx }),
    child: (extra) => createLogger({ ...bindings, ...extra }),
  };
}

export const logger: Logger = createLogger({ app: "councilia" });
