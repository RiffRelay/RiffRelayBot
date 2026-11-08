import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ValidateTokenResponse } from "listenbrainz-api";
import type { BotRuntime } from "../bot.tsx";
import { loginMessage } from "../commands/account/login.tsx";
import { toMessageData } from "../display/render.ts";

export async function handleModalSubmit(interaction: ModalSubmitInteraction, runtime: BotRuntime): Promise<void> {
  if (!interaction.customId.startsWith("login_modal_")) return;

  const modalMatch = /^login_modal_(\d+)_(\d+)$/.exec(interaction.customId);
  if (!modalMatch || modalMatch[1] !== interaction.user.id || !interaction.isFromMessage()) {
    await interaction.reply({
      content: "This login form is invalid or expired. Run /login to try again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const token = interaction.fields.getTextInputValue("token")?.trim();
  await interaction.deferUpdate();

  if (!token) {
    await interaction.message.edit(toMessageData(loginMessage(interaction.user.id, "failed")));
    return;
  }
  let validation: ValidateTokenResponse | undefined;
  try {
    validation = await runtime.lb.anonymous.validateToken(token);
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    runtime.logger.error("login", `Token validation failed (${errorType}).`);
    await interaction.message.edit(toMessageData(loginMessage(interaction.user.id, "failed")));
    return;
  }

  if (!validation?.valid || !validation.user_name) {
    await interaction.message.edit(toMessageData(loginMessage(interaction.user.id, "failed")));
    return;
  }

  try {
    await runtime.db.linkUser(interaction.user.id, validation.user_name, token);
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    runtime.logger.error("login", `Saving the ListenBrainz link failed (${errorType}).`);
    await interaction.message.edit(toMessageData(loginMessage(interaction.user.id, "failed")));
    return;
  }

  await interaction.message.edit(
    toMessageData(loginMessage(interaction.user.id, "connected", validation.user_name)),
  );
}
