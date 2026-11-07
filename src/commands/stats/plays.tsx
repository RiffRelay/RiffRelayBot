import { Bold, Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import { ENTITY_KEY, type EntityItem, TOTAL_KEY } from "./core.tsx";

export const playsCommand = defineCommand({
  meta: {
    name: "plays",
    description: "How many plays an artist (or album/track) has.",
    usage: "plays [user] [entity] <name>",
    examples: ["plays Radiohead", "plays @user album In Rainbows"],
    category: "Stats",
    aliases: ["playcount", "playsfor"],
    options: [
      { name: "user", description: "Discord user (defaults to you)", type: "user" },
      {
        name: "entity",
        description: "artist (default) | album | track",
        type: "string",
        choices: [
          { name: "artist", value: "artist" },
          { name: "album", value: "album" },
          { name: "track", value: "track" },
        ],
      },
      {
        name: "name",
        description: "Artist / album / track name",
        type: "string",
        required: true,
        rest: true,
      },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const name = (ctx.get("name") ?? "").trim();
    if (!name) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="Usage">
            {ctx.prefix}plays <Bold>artist name</Bold>
          </Embed>,
        ],
      });
      return;
    }
    const entity = (ctx.get("entity") ?? "artist") as "artist" | "album" | "track";
    const statsKey = ENTITY_KEY[entity]!;
    const res = await ctx.lb.anonymous
      .getStats(resolved.username, statsKey, { range: "all_time", count: 100 })
      .catch(() => null);
    const items = (res?.payload[statsKey] as EntityItem[] | undefined) ?? [];
    const key =
      entity === "artist" ? "artist_name" : entity === "album" ? "release_name" : "track_name";
    const match = items.find((item) => String(item[key]).toLowerCase() === name.toLowerCase());
    if (!match) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`${name} for ${resolved.username}`}>
            Not found in the top 100 {entity}s. Play it more!
          </Embed>,
        ],
      });
      return;
    }
    const rank = items.indexOf(match) + 1;
    const secondary = entity !== "artist" ? String(match.artist_name ?? "") : undefined;
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`${match[key]} for ${resolved.username}`}>
          <Bold>{formatNumber(match.listen_count)}</Bold> plays
          {secondary ? (
            <>
              {"\n"}by <Bold>{secondary}</Bold>
            </>
          ) : null}
          {"\n"}Rank: <Code>#{rank}</Code> of{" "}
          {formatNumber(
            res
              ? ((res.payload[TOTAL_KEY[statsKey]] as number | undefined) ?? res.payload.count)
              : 0,
          )}{" "}
          in top 100
        </Embed>,
      ],
    });
  },
});
