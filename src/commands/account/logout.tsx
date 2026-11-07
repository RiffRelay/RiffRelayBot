import { Embed } from "../../display/components.tsx";
import { SUCCESS_COLOR, unlinkedEmbed } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const logoutCommand = defineCommand({
  meta: {
    name: "logout",
    description: "Disconnect your ListenBrainz account from this bot.",
    category: "Account",
  },
  run: async (ctx) => {
    const removed = await ctx.db.unlinkUser(ctx.author.id);
    if (!removed) {
      await ctx.reply({ display: [unlinkedEmbed()] });
      return;
    }
    await ctx.reply({
      display: [
        <Embed color={SUCCESS_COLOR} title="Logged out">
          Your ListenBrainz account has been disconnected and your token deleted.
        </Embed>,
      ],
    });
  },
});
