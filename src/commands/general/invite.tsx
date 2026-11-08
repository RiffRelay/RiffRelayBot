import { discordInviteUrl } from "../../bot/constants.ts";
import { Bold, Embed, LinkButton } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const inviteCommand = defineCommand({
  meta: {
    name: "invite",
    description: "Get an invite link to add BrainzBot to your server.",
    category: "General",
  },
  run: async (ctx) => {
    const bot = ctx.client.user;
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title="Add RiffRelay to your server" thumbnail={bot.displayAvatarURL()}>
          Bring your ListenBrainz listening history into Discord.
          {"\n\n"}
          <Bold>Permissions requested</Bold>
          {"\n"}View Channels · Send Messages · Send Messages in Threads
          {"\n"}Embed Links · Use Application Commands
        </Embed>,
      ],
      buttons: [
        <LinkButton
          key="invite"
          url={discordInviteUrl(bot.id)}
          label="Invite RiffRelay"
          emoji="➕"
        />,
      ],
    });
  },
});
