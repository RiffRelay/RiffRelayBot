import type { StatsRange } from "listenbrainz-api";
import type { ReactNode } from "react";
import { Bold, Embed, LineBreak } from "../../display/components.tsx";
import { rangeLabel } from "../args.ts";
import { BRAND_COLOR, formatNumber, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import {
  ENTITY_CHOICES,
  ENTITY_KEY,
  type EntityItem,
  type EntityKind,
  rank,
  toTopRow,
} from "./core.tsx";

export function makeRangeCommand(
  name: string,
  range: string,
  description: string,
  aliases: string[] = [],
) {
  return defineCommand({
    meta: {
      name,
      description,
      usage: `${name} [user] [entity] [count]`,
      examples: [`${name}`, `${name} @user artists 10`],
      category: "Stats",
      aliases,
      options: [
        { name: "user", description: "Discord user (defaults to you)", type: "user" },
        {
          name: "entity",
          description: "What to rank (artists/albums/tracks/recordings)",
          type: "string",
          choices: ENTITY_CHOICES,
        },
        {
          name: "count",
          description: "How many to show (max 15)",
          type: "number",
          minValue: 1,
          maxValue: 15,
        },
      ],
      slow: true,
    },
    run: async (ctx) => {
      const resolved = await ctx.lb.requireUser(ctx);
      if (!resolved) return;
      const entity = (ctx.get("entity") ?? "artist") as EntityKind;
      const count = Math.min(15, ctx.num("count") ?? 10);
      const statsKey = ENTITY_KEY[entity]!;
      const res = await ctx.lb.anonymous
        .getStats(resolved.username, statsKey, { range: range as StatsRange, count })
        .catch(() => null);
      const items = (res?.payload[statsKey] as EntityItem[] | undefined) ?? [];
      if (items.length === 0) {
        await ctx.reply({
          display: [
            <Embed color={BRAND_COLOR} title={`${resolved.username}'s ${rangeLabel(range)}`}>
              Nothing found.
            </Embed>,
          ],
        });
        return;
      }
      const lines: ReactNode[] = [];
      const rows = items.map((item) => toTopRow(item, entity));
      rows.forEach((row, i) => {
        lines.push(
          <span>
            <Bold>{rank(i + 1)}</Bold> {row.primary}
            {row.secondary ? <> — {row.secondary}</> : null} •{" "}
            <Bold>{formatNumber(row.listens)}</Bold>
          </span>,
        );
        lines.push(<LineBreak />);
      });
      await ctx.reply({
        display: [
          <Embed
            color={BRAND_COLOR}
            title={`${resolved.username}'s top ${entity}s`}
            url={LB_PROFILE_URL(resolved.username)}
          >
            {lines}
          </Embed>,
        ],
      });
    },
  });
}
