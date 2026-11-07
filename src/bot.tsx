import { Client, GatewayIntentBits } from "discord.js";
import { wireEvents } from "./bot/events.tsx";
import { buildRegistry } from "./commands/index.ts";
import { type CommandRegistry, createExecutor } from "./commands/registry.ts";
import type { Command, CommandContext } from "./commands/types.ts";
import type { BotConfig } from "./config.ts";
import { type ContextInput, type ContextServices, makeContext } from "./context.ts";
import { BrainzDatabase } from "./db/database.ts";
import { BrainzService } from "./lb/service.ts";
import { type Logger, loggerFor } from "./logger.ts";

const INTENTS: GatewayIntentBits[] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMembers,
];

export class BotRuntime {
  readonly config: BotConfig;
  readonly logger: Logger;
  readonly db: BrainzDatabase;
  readonly lb: BrainzService;
  readonly registry: CommandRegistry;
  readonly client: Client<true>;
  readonly execute: (command: Command, ctx: CommandContext) => Promise<void>;

  constructor(config: BotConfig) {
    this.config = config;
    this.logger = loggerFor(config);
    this.db = new BrainzDatabase(config.dbPath, config.encKey);
    this.lb = new BrainzService(config.lbBaseUrl);
    this.registry = buildRegistry();
    this.execute = createExecutor(this.registry);
    this.client = new Client({ intents: INTENTS }) as Client<true>;
  }

  /** Services shared by every command context. */
  services(): ContextServices {
    return {
      client: this.client,
      db: this.db,
      logger: this.logger,
      registry: this.registry,
      lb: this.lb,
    };
  }

  makeContext(input: ContextInput): CommandContext {
    return makeContext(input, this.services());
  }

  /** Attach event listeners and start the bot. Resolves once logged in. */
  async start(): Promise<void> {
    wireEvents(this);
    await this.client.login(this.config.discordToken);
  }

  async shutdown(signal: string): Promise<void> {
    this.logger.info("shutdown", `Received ${signal}, shutting down`);
    this.db.close();
    this.client.destroy();
    process.exit(0);
  }

}
