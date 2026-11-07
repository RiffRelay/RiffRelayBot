import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface BotConfig {
  discordToken: string;
  clientId: string;
  defaultPrefix: string;
  slashGuildIds: string[];
  dbPath: string;
  /** 32-byte master key for token encryption. */
  encKey: Uint8Array;
  lbBaseUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadOrCreateEncryptionKey(): Uint8Array {
  const provided = process.env.BRAINZBOT_ENC_KEY;
  if (provided) {
    const normalized = provided.replace(/^0x/, "").trim();
    if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
      throw new Error(
        "BRAINZBOT_ENC_KEY must be exactly 64 hexadecimal characters (32 random bytes). Generate with: openssl rand -hex 32",
      );
    }
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1)
      bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  }

  const keyPath = join(process.cwd(), "data", ".enc_key");
  if (existsSync(keyPath)) {
    return new Uint8Array(Buffer.from(readFileSync(keyPath, "utf8").trim(), "hex"));
  }
  const key = randomBytes(32);
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, `${key.toString("hex")}\n`, { mode: 0o600 });
  chmodSync(keyPath, 0o600);
  return new Uint8Array(key);
}

export function loadConfig(): BotConfig {
  const level = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const logLevel: BotConfig["logLevel"] =
    level === "debug" || level === "info" || level === "warn" || level === "error" ? level : "info";

  return {
    discordToken: requiredEnv("DISCORD_TOKEN"),
    clientId: process.env.CLIENT_ID ?? "",
    defaultPrefix: process.env.PREFIX ?? "!",
    slashGuildIds: (process.env.SLASH_GUILD_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    dbPath: process.env.DB_PATH ?? "./data/brainzbot.db",
    encKey: loadOrCreateEncryptionKey(),
    lbBaseUrl: process.env.LISTENBRAINZ_BASE_URL ?? "https://api.listenbrainz.org",
    logLevel,
  };
}
