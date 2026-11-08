import { lbSettingsUrl } from "listenbrainz-api";
import { ActionButton, Bold, Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, ERROR_COLOR, errorEmbed, LB_PROFILE_URL, SUCCESS_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import type { DisplayContent } from "../types.ts";

export const ACTION_BUTTON_PREFIX = "login_button";
export const LOGIN_TIMEOUT_SECONDS = 2 * 60;

export function loginActionButton(userId: string, label = "Enter Token") {
  return <ActionButton id={`${ACTION_BUTTON_PREFIX}_${userId}`} label={label} style="primary" />;
}

export function loginMessage(
  userId: string,
  status: "ready" | "pending" | "failed" | "connected",
  userName?: string,
): DisplayContent {
  if (status === "connected" && userName) {
    return {
      display: [
        <Embed color={SUCCESS_COLOR} title="Connected!">
          {"Linked your Discord to "}
          <Bold>{userName}</Bold>
          {".\nProfile: "}
          {LB_PROFILE_URL(userName)}
          {"\nYou can now use "}
          <Code>/np</Code>
          {", "}
          <Code>/top</Code>
          {", and the rest."}
        </Embed>,
      ],
    };
  }

  const failed = status === "failed";
  const pending = status === "pending";
  return {
    display: [
      <Embed
        color={failed ? ERROR_COLOR : BRAND_COLOR}
        title={failed ? "Connection failed" : pending ? "Connection in progress" : "Connect your ListenBrainz account"}
      >
        {failed
          ? "This attempt did not complete. Your token was not stored. Run /login to try again."
          : pending
          ? `Complete the private token form within ${LOGIN_TIMEOUT_SECONDS} seconds.`
          : `Click the button to enter your token in a private form. Never share it in chat.\n\nGet your token at: ${lbSettingsUrl()}`}
      </Embed>,
    ],
    ...(pending
      ? {}
      : {
          actionButtons: [
            loginActionButton(userId, failed ? "Try Again" : "Enter Token"),
          ],
        }),
  };
}

export const loginCommand = defineCommand({
  meta: {
    name: "login",
    description: "Connect your ListenBrainz account using a private token form.",
    usage: "login",
    examples: ["login"],
    category: "Account",
  },
  run: async (ctx) => {
    if (ctx.args.length > 0) {
      await ctx.reply({
        display: [
          errorEmbed(
            "The token was not used or stored. Never pass it as an argument; run /login or !login without arguments and use the private form.",
            "Do not enter your token in chat",
          ),
        ],
      });
      return;
    }

    await ctx.reply(loginMessage(ctx.author.id, "ready"));
  },
});
