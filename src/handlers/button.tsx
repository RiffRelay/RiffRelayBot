import { type ButtonInteraction, MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { BotRuntime } from "../bot.tsx";
import {
  ACTION_BUTTON_PREFIX,
  LOGIN_TIMEOUT_SECONDS,
  loginMessage,
} from "../commands/account/login.tsx";
import { toMessageData } from "../display/render.ts";
import { handleModalSubmit } from "./modal.tsx";

export async function handleButton(interaction: ButtonInteraction, runtime: BotRuntime): Promise<void> {
  if (!interaction.customId.startsWith(`${ACTION_BUTTON_PREFIX}_`)) return;
  if (interaction.customId !== `${ACTION_BUTTON_PREFIX}_${interaction.user.id}`) {
    await interaction.reply({
      content: "This login prompt belongs to another user. Run /login to start your own.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modalId = `login_modal_${interaction.user.id}_${interaction.message.id}`;
  await interaction.showModal({
    customId: modalId,
    title: "ListenBrainz API Token",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            customId: "token",
            label: "Your ListenBrainz API Token",
            style: 1,
            placeholder: "Paste your token here...",
            required: true,
          },
        ],
      },
    ],
  });

  const modalSubmission = interaction.awaitModalSubmit({
    time: LOGIN_TIMEOUT_SECONDS * 1000,
    filter: (candidate) =>
      candidate.customId === modalId && candidate.user.id === interaction.user.id,
  });

  try {
    await interaction.message.edit(toMessageData(loginMessage(interaction.user.id, "pending")));
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    runtime.logger.error("login", `Could not mark the connection as pending (${errorType}).`);
  }

  let submitted: ModalSubmitInteraction;
  try {
    submitted = await modalSubmission;
  } catch {
    await interaction.message.edit(toMessageData(loginMessage(interaction.user.id, "failed")));
    return;
  }

  await handleModalSubmit(submitted, runtime);
}
