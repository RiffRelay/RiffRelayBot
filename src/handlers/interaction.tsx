import type { ChatInputCommandInteraction } from "discord.js";
import type { BotRuntime } from "../bot.tsx";
import { ERROR_COLOR } from "../commands/helpers.tsx";
import { makeContext, SlashReplyTarget } from "../context.ts";
import { Embed } from "../display/components.tsx";
import { toMessageData } from "../display/render.ts";

export async function handleInteraction(
  interaction: ChatInputCommandInteraction,
  runtime: BotRuntime,
): Promise<void> {
  const command = runtime.registry.get(interaction.commandName);
  if (!command) {
    await interaction.reply(
      toMessageData({ display: [<Embed color={ERROR_COLOR}>Unknown command.</Embed>] }),
    );
    return;
  }

  const opts = new Map<string, string>();
  for (const option of interaction.options.data) {
    if (option.value !== undefined && option.value !== null)
      opts.set(option.name, String(option.value));
  }

  const member =
    "displayName" in (interaction.member ?? {})
      ? ((interaction.member as { displayName?: string }).displayName ?? interaction.user.username)
      : interaction.user.username;

  const ctx = makeContext(
    {
      opts,
      args: [],
      prefix: runtime.config.defaultPrefix,
      isSlash: true,
      guildId: interaction.guildId,
      guildName: interaction.guild?.name ?? null,
      channelId: interaction.channelId,
      author: { id: interaction.user.id, username: interaction.user.username },
      authorAvatarUrl: interaction.user.displayAvatarURL(),
      memberDisplayName: member,
      replyTarget: new SlashReplyTarget(interaction),
    },
    runtime.services(),
  );
  await runtime.execute(command, ctx);
}
