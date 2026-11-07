import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { decryptToken, encryptToken } from "./crypto.ts";

export interface LinkedUser {
  discordId: string;
  lbUser: string;
  /** Decrypted ListenBrainz token. */
  token: string;
  createdAt: number;
  updatedAt: number;
}

export class BrainzDatabase {
  private db: Database;

  constructor(
    dbPath: string,
    private readonly encKey: Uint8Array,
  ) {
    if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        discord_id  TEXT PRIMARY KEY,
        lb_user     TEXT NOT NULL,
        token       TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS guilds (
        guild_id    TEXT PRIMARY KEY,
        prefix      TEXT NOT NULL DEFAULT '!',
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  /** Link (or refresh) a Discord user's ListenBrainz account. */
  async linkUser(discordId: string, lbUser: string, token: string): Promise<void> {
    const now = Date.now();
    const encrypted = await encryptToken(this.encKey, discordId, token);
    this.db
      .query(
        `INSERT INTO users (discord_id, lb_user, token, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(discord_id) DO UPDATE SET
           lb_user = excluded.lb_user,
           token   = excluded.token,
           updated_at = excluded.updated_at`,
      )
      .run(discordId, lbUser, encrypted, now, now);
  }

  /** Look up a user by Discord ID, returning the decrypted token. */
  async getUser(discordId: string): Promise<LinkedUser | null> {
    const row = this.db
      .query<{ lb_user: string; token: string; created_at: number; updated_at: number }, string>(
        `SELECT lb_user, token, created_at, updated_at FROM users WHERE discord_id = ?`,
      )
      .get(discordId);
    if (!row) return null;
    const token = await decryptToken(this.encKey, discordId, row.token);
    return {
      discordId,
      lbUser: row.lb_user,
      token,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async unlinkUser(discordId: string): Promise<boolean> {
    const res = this.db.query(`DELETE FROM users WHERE discord_id = ?`).run(discordId);
    return res.changes > 0;
  }

  async countUsers(): Promise<number> {
    const row = this.db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM users`).get();
    return row?.n ?? 0;
  }

  async getAllUsers(): Promise<Array<{ discordId: string; lbUser: string }>> {
    const rows = this.db
      .query<{ discord_id: string; lb_user: string }, []>(`SELECT discord_id, lb_user FROM users`)
      .all();
    return rows.map((r) => ({ discordId: r.discord_id, lbUser: r.lb_user }));
  }

  async getPrefix(guildId: string, fallback = process.env.PREFIX ?? "!"): Promise<string> {
    const row = this.db
      .query<{ prefix: string }, string>(`SELECT prefix FROM guilds WHERE guild_id = ?`)
      .get(guildId);
    return row?.prefix ?? fallback;
  }

  async setPrefix(guildId: string, prefix: string): Promise<void> {
    this.db
      .query(
        `INSERT INTO guilds (guild_id, prefix, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET prefix = excluded.prefix, updated_at = excluded.updated_at`,
      )
      .run(guildId, prefix, Date.now());
  }

  async setMeta(key: string, value: string): Promise<void> {
    this.db
      .query(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  async getMeta(key: string): Promise<string | null> {
    const row = this.db
      .query<{ value: string }, string>(`SELECT value FROM meta WHERE key = ?`)
      .get(key);
    return row?.value ?? null;
  }

  close(): void {
    this.db.close();
  }
}
