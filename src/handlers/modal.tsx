import type { ModalSubmitInteraction } from "discord.js";
import { ListenBrainzError, lbSettingsUrl, type ValidateTokenResponse } from "listenbrainz-api";
import type { BotRuntime } from "../bot.tsx";
import { ERROR_COLOR, LB_PROFILE_URL, SUCCESS_COLOR } from "../commands/helpers.tsx";
import { Bold, Code, Embed } from "../display/components.tsx";
import { toMessageData } from "../display/render.ts";

export async function handleModalSubmit(interaction: ModalSubmitInteraction, runtime: BotRuntime): Promise<void> {
  if (!interaction.customId.startsWith("login_modal_")) return;

  const token = interaction.fields.getTextInputValue("token")?.trim();
  if (!token) {
    await interaction.reply(
      toMessageData({
        display: [
          <Embed color={ERROR_COLOR} title="No token provided">
            Please provide a valid ListenBrainz API token.
          </Embed>,
        ],
      }),
    );
    return;
  }

  let validation: ValidateTokenResponse | undefined;
  try {
    validation = await runtime.lb.anonymous.validateToken(token);
  } catch (err) {
    const message = err instanceof ListenBrainzError ? err.message : "Could not reach ListenBrainz.";
    await interaction.reply(
      toMessageData({
        display: [
          <Embed color={ERROR_COLOR} title="Login failed">
            {message}
          </Embed>,
        ],
      }),
    );
    return;
  }

  if (!validation?.valid || !validation.user_name) {
    await interaction.reply(
      toMessageData({
        display: [
          <Embed color={ERROR_COLOR} title="Invalid token">
            {"ListenBrainz says the token is not valid. Double-check it at "}
            <Code>{lbSettingsUrl()}</Code>
          </Embed>,
        ],
      }),
    );
    return;
  }

  await runtime.db.linkUser(interaction.user.id, validation.user_name, token);
  await interaction.reply(
    toMessageData({
      display: [
        <Embed color={SUCCESS_COLOR} title="Connected!">
          {"Linked your Discord to "}
          <Bold>{validation.user_name}</Bold>
          {".\nProfile: "}
          {LB_PROFILE_URL(validation.user_name)}
          {"\nYou can now use "}
          <Code>/np</Code>
          {", "}
          <Code>/top</Code>
          {", and the rest."}
        </Embed>,
      ],
    }),
  );
}
