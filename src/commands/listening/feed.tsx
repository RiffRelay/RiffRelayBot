import type { ReactNode } from "react";
import { Embed } from "../../display/components.tsx";
import { BRAND_COLOR, coverFromTrackMetadata, relativeTime } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const feedCommand = defineCommand({
  meta: {
    name: "feed",
    description: "Show the ListenBrainz activity feed (scrobbles, pins).",
    usage: "feed [user]",
    examples: ["feed"],
    category: "Listening",
    aliases: ["activity"],
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const res = await ctx.lb.anonymous.getFeed(resolved.username, { count: 10 });
    const events = res.payload.events;
    if (events.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`${resolved.username}'s feed`}>
            No feed events yet.
          </Embed>,
        ],
      });
      return;
    }
    const lines: ReactNode[] = [];
    for (const event of events) {
      if (event.type === "recording" && event.track_metadata) {
        lines.push(
          <span>
            🎵 {event.track_metadata.artist_name} — {event.track_metadata.track_name} ·{" "}
            {relativeTime(event.created)}
          </span>,
        );
      } else if (event.type === "pin") {
        lines.push(<span>📌 pinned a recording · {relativeTime(event.created)}</span>);
      } else {
        lines.push(
          <span>
            🔔 {event.type} · {relativeTime(event.created)}
          </span>,
        );
      }
      lines.push(<br />);
    }
    const coverEvent = events.find((e) => e.type === "recording" && e.track_metadata);
    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`${resolved.username}'s feed`}
          thumbnail={coverEvent ? coverFromTrackMetadata(coverEvent.track_metadata) : undefined}
        >
          {lines}
        </Embed>,
      ],
    });
  },
});
