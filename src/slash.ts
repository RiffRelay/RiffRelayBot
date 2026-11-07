import { ApplicationCommandOptionType, REST, Routes } from "discord.js";
import type { CommandRegistry } from "./commands/registry.ts";
import type { Command } from "./commands/types.ts";
import type { BotConfig } from "./config.ts";
import type { Logger } from "./logger.ts";

const OPTION_TYPE: Record<string, number> = {
  string: ApplicationCommandOptionType.String,
  number: ApplicationCommandOptionType.Integer,
  boolean: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
};

export function toSlashCommand(command: Command) {
  return {
    name: command.meta.name,
    description: command.meta.description.slice(0, 100),
    options: (command.meta.options ?? [])
      .map((opt) => ({
        name: opt.name,
        description: opt.description.slice(0, 100),
        type: OPTION_TYPE[opt.type],
        required: opt.required ?? false,
        choices: opt.choices,
        min_value: opt.minValue,
        max_value: opt.maxValue,
      }))
      .sort((a, b) => Number(b.required) - Number(a.required)),
  };
}

export function slashCommandBody(registry: CommandRegistry): ReturnType<typeof toSlashCommand>[] {
  return registry.list().map(toSlashCommand);
}

export interface SlashRegistrationDeps {
  config: Pick<BotConfig, "clientId" | "discordToken">;
  logger: Logger;
  registry: CommandRegistry;
}

export async function registerCommandsForGuild(
  guildId: string,
  deps: SlashRegistrationDeps,
): Promise<void> {
  if (!deps.config.clientId) {
    deps.logger.warn("slash", "CLIENT_ID not set; skipping slash registration");
    return;
  }
  const rest = new REST().setToken(deps.config.discordToken);
  const body = slashCommandBody(deps.registry);
  await rest.put(Routes.applicationGuildCommands(deps.config.clientId, guildId), { body });
  deps.logger.info("slash", `Registered ${body.length} commands for guild ${guildId}`);
}
