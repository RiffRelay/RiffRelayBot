import type { ReactNode } from "react";
import { Code, Embed, LineBreak } from "../../display/components.tsx";
import { BRAND_COLOR, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const lovedCommand = defineCommand({
  meta: {
    name: "loved",
    description: "Show tracks you've loved.",
    usage: "loved [user]",
    examples: ["loved"],
    category: "Scrobbling",
    aliases: ["faves", "favorites", "loves"],
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const res = await ctx.lb.anonymous.getFeedback(resolved.username, { count: 10 });
    const loved = res.feedback.filter((f) => f.score === 1);
    if (loved.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`${resolved.username} hasn't loved anything`}>
            Use <Code>{ctx.prefix}love</Code> while a track is playing.
          </Embed>,
        ],
      });
      return;
    }
    const lines: ReactNode[] = [];
    for (const f of loved.slice(0, 5)) {
      let label = "A loved track";
      if (f.recording_mbid) {
        try {
          const md = await ctx.lb.anonymous.getRecordingMetadata(f.recording_mbid);
          const artist = md.artist_credit?.map((a) => a.artist_credit_name).join("");
          label = `${md.title}${artist ? ` — ${artist}` : ""}`;
        } catch {
          label = `Recording ${f.recording_msid.slice(0, 8)}…`;
        }
      } else {
        label = `Recording ${f.recording_msid.slice(0, 8)}…`;
      }
      lines.push(
        <span>
          ❤️ {label}
          <LineBreak />
        </span>,
      );
    }
    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`❤️ ${resolved.username}'s loved tracks`}
          url={LB_PROFILE_URL(resolved.username)}
        >
          {lines}
        </Embed>,
      ],
    });
  },
});
