import { Bold, Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, flattenListen } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const whoCommand = defineCommand({
  meta: {
    name: "who",
    description: "Show what everyone in your voice channel is listening to.",
    usage: "who",
    examples: ["who"],
    category: "Listening",
    guildOnly: true,
    aliases: ["vc", "nowplayinghere"],
    slow: true,
  },
  run: async (ctx) => {
    const guild = ctx.client.guilds.cache.get(ctx.guildId ?? "");
    const authorMember = guild?.members.cache.get(ctx.author.id);
    const voiceChannel = authorMember?.voice.channel;
    if (!guild || !voiceChannel) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="Not in a voice channel">
            Join a voice channel first, then run <Code>who</Code>.
          </Embed>,
        ],
      });
      return;
    }

    const members = [...voiceChannel.members.values()].filter((m) => !m.user.bot);
    if (members.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={voiceChannel.name}>
            Nobody else is here.
          </Embed>,
        ],
      });
      return;
    }

    const rows = await Promise.all(
      members.map(async (member) => {
        const linked = await ctx.db.getUser(member.id);
        if (!linked) return { name: member.displayName, text: "not connected" };
        try {
          const now = await ctx.lb.anonymous.getPlayingNow(linked.lbUser);
          const listen = now.payload.listens[0];
          if (!listen) return { name: member.displayName, text: "not listening" };
          const flat = flattenListen(listen);
          return { name: member.displayName, text: `${flat.artist} — ${flat.track}` };
        } catch {
          return { name: member.displayName, text: "error fetching" };
        }
      }),
    );

    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`Now playing in ${voiceChannel.name}`}>
          {rows.map((row) => (
            <span key={row.name}>
              <Bold>{row.name}</Bold>: {row.text}
              <br />
            </span>
          ))}
        </Embed>,
      ],
    });
  },
});
