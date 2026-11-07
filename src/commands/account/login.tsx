import { lbSettingsUrl } from "listenbrainz-api";
import { ActionButton, Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const ACTION_BUTTON_PREFIX = "login_button";

export const loginCommand = defineCommand({
  meta: {
    name: "login",
    description: "Connect your ListenBrainz account using your API token.",
    usage: "login",
    examples: ["login"],
    category: "Account",
  },
  run: async (ctx) => {
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title="Connect your ListenBrainz account">
          {"Click the button below to enter your API token.\n\nGet your token at: "}
          <Code>{lbSettingsUrl()}</Code>
        </Embed>,
      ],
      actionButtons: [
        <ActionButton id={`${ACTION_BUTTON_PREFIX}_${ctx.author.id}`} label="Enter Token" style="primary" />,
      ],
    });
  },
});
