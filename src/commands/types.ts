import type { Client, Message } from "discord.js";
import type { ReactElement } from "react";
import type { BrainzDatabase } from "../db/database.ts";
import type { BrainzService } from "../lb/service.ts";
import type { Logger } from "../logger.ts";
import type { CommandRegistry } from "./registry.ts";

export type OptionType = "string" | "number" | "user" | "boolean";

export interface CommandOption {
  name: string;
  description: string;
  type: OptionType;
  required?: boolean;
  /** Consume the rest of the prefix args into this option. */
  rest?: boolean;
  choices?: Array<{ name: string; value: string }>;
  minValue?: number;
  maxValue?: number;
}

export interface CommandMeta {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  examples?: string[];
  category: CommandCategory;
  hidden?: boolean;
  /** Guild-only commands (e.g. `who`, `setprefix`). */
  guildOnly?: boolean;
  /**
   * Slash-only commands — the prefix handler refuses to run them. Used for
   * commands that take secrets (e.g. `login`) so user tokens never appear in
   * chat history.
   */
  slashOnly?: boolean;
  /** Slow commands defer the reply before running. */
  slow?: boolean;
  options?: CommandOption[];
}

export type CommandCategory =
  "General" | "Account" | "Listening" | "Stats" | "Explore" | "Social" | "Scrobbling";

export interface DisplayContent {
  display?: ReactElement[];
  content?: string;
  buttons?: ReactElement[];
  selectMenus?: ReactElement[];
  actionButtons?: ReactElement[];
}

export interface CommandContext {
  /** Raw prefix argument tokens (empty for slash). */
  args: string[];
  /** Resolved option map (positional args for prefix, options for slash). */
  opts: Map<string, string>;
  prefix: string;
  isSlash: boolean;

  author: { id: string; username: string };
  /** Author avatar URL (guild avatar preferred). */
  authorAvatarUrl?: string;
  memberDisplayName: string;
  guildId: string | null;
  guildName: string | null;
  channelId: string;

  /** The discord.js client, available for advanced integration. */
  client: Client<true>;
  /** The triggering message (prefix) — undefined for slash. */
  message?: Message<true>;
  /** The database. */
  db: BrainzDatabase;
  logger: Logger;
  /** The command registry (used by `help`). */
  registry: CommandRegistry;
  /** ListenBrainz service clients. */
  lb: BrainzService;

  /** Typed accessors over `opts`. */
  get(name: string): string | undefined;
  num(name: string): number | undefined;
  int(name: string): number | undefined;
  userMention(name: string): string | undefined;

  /** Send a Components V2 message (display components or plain text). */
  reply(content: DisplayContent): Promise<void>;
  /** Acknowledge before a slow command finishes. */
  defer(): Promise<void>;
}

export interface Command {
  meta: CommandMeta;
  run(ctx: CommandContext): Promise<void>;
}
