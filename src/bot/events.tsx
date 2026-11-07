import { Events } from "discord.js";
import type { BotRuntime } from "../bot.tsx";
import { ERROR_COLOR } from "../commands/helpers.tsx";
import { Embed } from "../display/components.tsx";
import { toMessageData } from "../display/render.ts";
import { handleButton } from "../handlers/button.tsx";
import { handleInteraction } from "../handlers/interaction.tsx";
import { handleMessage } from "../handlers/message.tsx";
import { handleModalSubmit } from "../handlers/modal.tsx";
import { handleSelectMenu } from "../handlers/select-menu.tsx";
import { registerCommandsForGuild } from "../slash.ts";
import { startPresenceRotation } from "./presence.ts";

export function wireEvents(runtime: BotRuntime): void {
  runtime.client.once(Events.ClientReady, async (readyClient) => {
    runtime.logger.info("ready", `Logged in as ${readyClient.user.tag} (${readyClient.user.id})`);
    runtime.logger.info("ready", `Loaded ${runtime.registry.list().length} commands`);
    startPresenceRotation(readyClient.user);
    try {
      if (runtime.config.slashGuildIds.length) {
        for (const id of runtime.config.slashGuildIds) await registerCommandsForGuild(id, runtime);
      } else {
        const guilds = await readyClient.guilds.fetch();
        const ids = [...guilds.keys()];
        if (ids.length) {
          await Promise.all(ids.map((id) =>
            registerCommandsForGuild(id, runtime).catch((err) =>
              runtime.logger.warn("slash", `register failed for ${id}: ${(err as Error).message}`),
            ),
          ));
        } else {
          runtime.logger.info("slash", "Bot isn't in any guild yet; commands register on first server join.");
        }
      }
    } catch (err) {
      runtime.logger.error("slash", `Slash registration failed: ${(err as Error).message}`);
    }
  });
  runtime.client.on(Events.GuildCreate, (guild) => {
    registerCommandsForGuild(guild.id, runtime).catch((err) =>
      runtime.logger.warn("slash", `register failed for ${guild.id}: ${(err as Error).message}`),
    );
  });
  runtime.client.on(Events.MessageCreate, (message) => {
    handleMessage(message, runtime).catch((err) =>
      runtime.logger.error("message", `Handler error: ${(err as Error).message}`),
    );
  });
  runtime.client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isChatInputCommand()) {
      handleInteraction(interaction, runtime).catch((err) => {
        runtime.logger.error("interaction", `Handler error: ${(err as Error).message}`);
        if (!interaction.replied && !interaction.deferred) {
          interaction.reply(toMessageData({
            display: [<Embed color={ERROR_COLOR}>Something went wrong.</Embed>],
          })).catch(() => {});
        }
      });
    } else if (interaction.isStringSelectMenu()) {
      handleSelectMenu(interaction, runtime).catch((err) => {
        runtime.logger.error("select-menu", `Handler error: ${(err as Error).message}`);
        if (!interaction.replied && !interaction.deferred) interaction.deferUpdate().catch(() => {});
      });
    } else if (interaction.isButton()) {
      handleButton(interaction).catch((err) => {
        runtime.logger.error("button", `Handler error: ${(err as Error).message}`);
        if (!interaction.replied && !interaction.deferred) interaction.deferUpdate().catch(() => {});
      });
    } else if (interaction.isModalSubmit()) {
      handleModalSubmit(interaction, runtime).catch((err) => {
        runtime.logger.error("modal", `Handler error: ${(err as Error).message}`);
        if (!interaction.replied && !interaction.deferred) interaction.deferUpdate().catch(() => {});
      });
    }
  });
}
