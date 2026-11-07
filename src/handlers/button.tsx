import type { ButtonInteraction } from "discord.js";
import { ACTION_BUTTON_PREFIX } from "../commands/account/login.tsx";

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId.startsWith(ACTION_BUTTON_PREFIX)) {
    await interaction.showModal({
      customId: `login_modal_${interaction.user.id}`,
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
  }
}
