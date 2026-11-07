import type { ReactNode } from "react";
import { Bold, Code, Embed, LineBreak } from "../../display/components.tsx";
import { discordTimestamp } from "../../display/format.ts";
import { BRAND_COLOR, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const pinsCommand = defineCommand({
  meta: {
    name: "pins",
    description: "Show a user's pinned tracks.",
    usage: "pins [user]",
    examples: ["pins"],
    category: "Scrobbling",
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const res = await ctx.lb.anonymous.getUserPins(resolved.username, { count: 5 });
    const pins = res.payload.pins;
    if (pins.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`${resolved.username} has no pins`}>
            Use <Code>{ctx.prefix}pin</Code> while a track is playing.
          </Embed>,
        ],
      });
      return;
    }
    const lines: ReactNode[] = [];
    for (const pin of pins) {
      const md = pin.track_metadata;
      lines.push(
        <span>
          📌 <Bold>{md.track_name}</Bold> — {md.artist_name} · {discordTimestamp(pin.created)}
          {pin.blurb ? (
            <>
              <LineBreak /> 💬 {pin.blurb}
            </>
          ) : null}
        </span>,
      );
      lines.push(<LineBreak />);
    }
    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`📌 ${resolved.username}'s pins`}
          url={LB_PROFILE_URL(resolved.username)}
        >
          {lines}
        </Embed>,
      ],
    });
  },
});
