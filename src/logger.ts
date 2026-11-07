import type { BotConfig } from "./config.ts";

type Level = "debug" | "info" | "warn" | "error";

const ORDER: Level[] = ["debug", "info", "warn", "error"];

function time(): string {
  return new Date().toISOString();
}

export function createLogger(level: Level) {
  const enabled = (l: Level) => ORDER.indexOf(l) >= ORDER.indexOf(level);

  const log = (l: Level, scope: string, msg: string, extra?: unknown) => {
    if (!enabled(l)) return;
    const extraText = extra === undefined ? "" : ` ${format(extra)}`;
    const line = `[${time()}] [${l.toUpperCase().padEnd(5)}] [${scope}] ${msg}${extraText}`;
    if (l === "error") console.error(line);
    else if (l === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (scope: string, msg: string, extra?: unknown) => log("debug", scope, msg, extra),
    info: (scope: string, msg: string, extra?: unknown) => log("info", scope, msg, extra),
    warn: (scope: string, msg: string, extra?: unknown) => log("warn", scope, msg, extra),
    error: (scope: string, msg: string, extra?: unknown) => log("error", scope, msg, extra),
  };
}

function format(extra: unknown): string {
  try {
    if (extra instanceof Error) return `${extra.name}: ${extra.message}`;
    return JSON.stringify(extra);
  } catch {
    return String(extra);
  }
}

export type Logger = ReturnType<typeof createLogger>;

export function loggerFor(config: BotConfig): Logger {
  return createLogger(config.logLevel);
}
