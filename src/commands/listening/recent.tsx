import type { ReactNode } from "react";
import { Code, Embed } from "../../display/components.tsx";
import {
  BRAND_COLOR,
  coverFromListen,
  flattenListen,
  relativeTime,
  resolveCoverImage,
} from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const recentCommand = defineCommand({
  meta: {
    name: "recent",
    description: "Show the most recent listens.",
    usage: "recent [user] [count]",
    examples: ["recent", "recent @user 20"],
    category: "Listening",
    aliases: ["history", "recently"],
    options: [
      { name: "user", description: "Discord user (defaults to you)", type: "user" },
      {
        name: "count",
        description: "Number of listens (max 25)",
        type: "number",
        minValue: 1,
        maxValue: 25,
      },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const count = Math.min(25, ctx.num("count") ?? 10);
    const res = await ctx.lb.anonymous.getListens(resolved.username, { count });
    const listens = res.payload.listens;
    if (listens.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={resolved.username}>
            No recent listens found.
          </Embed>,
        ],
      });
      return;
    }
    const lines: ReactNode[] = [];
    listens.forEach((listen, i) => {
      const flat = flattenListen(listen);
      lines.push(
        <span>
          <Code>{String(i + 1).padStart(2, "0")}</Code> {flat.artist} — {flat.track}
          {flat.album ? <> ({flat.album})</> : null} —{" "}
          {flat.listenedAt !== undefined ? relativeTime(flat.listenedAt) : "playing now"}
          {flat.playingNow ? " ▶️" : ""}
        </span>,
      );
      lines.push(<br />);
    });

    const thumbnail = await resolveCoverImage(listens[0] ? coverFromListen(listens[0]) : undefined);

    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`${resolved.username}'s recent plays`}
          thumbnail={thumbnail}
        >
          {lines}
        </Embed>,
      ],
    });
  },
});
