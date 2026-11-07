import type { AlbumStat, StatsRange } from "listenbrainz-api";
import type { ReactNode } from "react";
import { Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, emojiFor, formatNumber, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const chartCommand = defineCommand({
  meta: {
    name: "chart",
    description: "Top albums as an emoji grid (fmbot-style).",
    usage: "chart [user] [size] [period]",
    examples: ["chart", "chart 5x5 month", "chart @user 3x3 all"],
    category: "Listening",
    aliases: ["grid", "topchart"],
    options: [
      { name: "user", description: "Discord user (defaults to you)", type: "user" },
      { name: "size", description: "Grid size, e.g. 5x5 (max 10)", type: "string" },
      { name: "period", description: "week | month | year | all (default all)", type: "string" },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const size = parseChartSize(ctx.get("size"));
    if (!size) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="Invalid chart size">
            Use something like <Code>5x5</Code> or <Code>7</Code> (max 10).
          </Embed>,
        ],
      });
      return;
    }
    const range = (ctx.get("period") ?? "all_time") as StatsRange;
    const res = await ctx.lb.anonymous
      .getAlbumStats(resolved.username, { range, count: size * size })
      .catch(() => null);
    const albums = (res?.payload.albums as AlbumStat[] | undefined) ?? [];
    if (albums.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={resolved.username}>
            No albums found for that range.
          </Embed>,
        ],
      });
      return;
    }

    const gridLines: ReactNode[] = [];
    for (let row = 0; row < size; row += 1) {
      const cells = albums.slice(row * size, row * size + size);
      gridLines.push(
        <span>
          {cells.map((a) => emojiFor(`${a.artist_name ?? ""}${a.release_name}`)).join(" ")}
        </span>,
      );
      gridLines.push(<br />);
    }

    const legend: ReactNode[] = [];
    albums.forEach((album, _i) => {
      legend.push(
        <span>
          {emojiFor(`${album.artist_name ?? ""}${album.release_name}`)} {album.release_name} —{" "}
          {album.artist_name} ({formatNumber(album.listen_count)})
        </span>,
      );
      legend.push(<br />);
    });

    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`${resolved.username}'s ${size}×${size} chart`}
          url={LB_PROFILE_URL(resolved.username)}
        >
          {gridLines}
          {"\n"}
          {legend}
        </Embed>,
      ],
    });
  },
});

function parseChartSize(raw: string | undefined): number | null {
  if (!raw) return 5;
  const match = raw.toLowerCase().match(/^(\d{1,2})(?:x(\d{1,2}))?$/);
  if (!match) return null;
  const a = Number.parseInt(match[1]!, 10);
  const b = match[2] ? Number.parseInt(match[2], 10) : a;
  if (a === b && a >= 1 && a <= 10) return a;
  return null;
}
