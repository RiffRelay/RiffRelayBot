import { Embed } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const inviteCommand = defineCommand({
  meta: {
    name: "invite",
    description: "Get an invite link to add BrainzBot to your server.",
    category: "General",
  },
  run: async (ctx) => {
    const clientId = ctx.client.user.id;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=2147483648&scope=bot%20applications.commands`;
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title="Invite BrainzBot">
          Click here to add me to your server: {url}
        </Embed>,
      ],
    });
  },
});
