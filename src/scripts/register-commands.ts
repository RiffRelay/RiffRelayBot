import { REST, Routes } from "discord.js";
import { buildRegistry } from "../commands/index.ts";
import { loadConfig } from "../config.ts";
import { loggerFor } from "../logger.ts";
import { slashCommandBody } from "../slash.ts";

const config = loadConfig();
const logger = loggerFor(config);
const registry = buildRegistry();

const rest = new REST().setToken(config.discordToken);
const global = process.argv.includes("--global");
const body = slashCommandBody(registry);

async function main(): Promise<void> {
  if (global) {
    if (!config.clientId) throw new Error("CLIENT_ID is required for global registration");
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info("register", `Registered ${body.length} global commands`);
    return;
  }

  if (config.slashGuildIds.length > 0) {
    for (const guildId of config.slashGuildIds) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body });
      logger.info("register", `Registered ${body.length} commands for guild ${guildId}`);
    }
    return;
  }

  logger.warn(
    "register",
    "No guilds configured. Set SLASH_GUILD_IDS=id1,id2, or pass --global to register commands globally.",
  );
}

main().catch((err) => {
  logger.error("register", (err as Error).message);
  process.exit(1);
});
