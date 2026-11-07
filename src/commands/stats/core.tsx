import type { StatsRange } from "listenbrainz-api";
import type { ReactNode } from "react";
import { Bold, Embed, LineBreak } from "../../display/components.tsx";
import { parseRange, rangeLabel } from "../args.ts";
import { BRAND_COLOR, formatNumber, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import type { CommandContext } from "../types.ts";
import { ENTITY_KEY, type EntityItem, type EntityKind, rank, toTopRow } from "./entities.ts";
import { topThumbnail } from "./thumbnail.ts";

export {
  ENTITY_CHOICES,
  ENTITY_KEY,
  type EntityItem,
  type EntityKind,
  entityName,
  rank,
  TOTAL_KEY,
  toTopRow,
} from "./entities.ts";
export { topThumbnail } from "./thumbnail.ts";

export async function runTop(ctx: CommandContext, opts: { entity?: EntityKind }): Promise<void> {
  const resolved = await ctx.lb.requireUser(ctx);
  if (!resolved) return;
  const entity = opts.entity ?? "artist";
  const period = parseRange(ctx.get("period")) as StatsRange | undefined;
  const count = Math.min(15, ctx.num("count") ?? 10);
  const statsKey = ENTITY_KEY[entity]!;
  const result = await ctx.lb.anonymous
    .getStats(resolved.username, statsKey, { range: period, count })
    .catch(() => null);
  const items = (result?.payload[statsKey] as EntityItem[] | undefined) ?? [];
  if (!items.length) {
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`${resolved.username}'s top ${entity}s`}>
          Nothing found for {rangeLabel(period)}.
        </Embed>,
      ],
    });
    return;
  }
  const rows = items.map((item) => toTopRow(item, entity));
  const thumbnail = await topThumbnail(ctx.lb.anonymous, entity, items[0]!);
  const lines: ReactNode[] = [];
  rows.forEach((row, i) => {
    lines.push(
      <span>
        <Bold>{rank(i + 1)}</Bold> {row.primary}
        {row.secondary ? <> — {row.secondary}</> : null} • <Bold>{formatNumber(row.listens)}</Bold> plays
      </span>,
      <LineBreak />,
    );
  });
  await ctx.reply({
    display: [
      <Embed
        color={BRAND_COLOR}
        title={`${resolved.username}'s top ${entity}s`}
        url={LB_PROFILE_URL(resolved.username)}
        thumbnail={thumbnail}
      >
        {lines}
      </Embed>,
    ],
  });
}

export function makeEntityCommand(name: string, entity: EntityKind, aliases: string[] = []) {
  return defineCommand({
    meta: {
      name,
      description: `Show your top ${entity}s.`,
      usage: `${name} [user] [period] [count]`,
      examples: [`${name}`, `${name} @user weekly 10`],
      category: "Stats",
      aliases,
      options: [
        { name: "user", description: "Discord user (defaults to you)", type: "user" },
        { name: "period", description: "week | month | year | all (default all)", type: "string" },
        { name: "count", description: "How many to show (max 15)", type: "number", minValue: 1, maxValue: 15 },
      ],
      slow: true,
    },
    run: (ctx) => runTop(ctx, { entity }),
  });
}
