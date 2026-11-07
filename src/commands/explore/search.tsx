import type { ReactNode } from "react";
import { Code, Embed, LineBreak } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const searchCommand = defineCommand({
  meta: {
    name: "search",
    description: "Search MusicBrainz for artists, albums or tracks.",
    usage: "search <query> [--type artist|album|track]",
    examples: ["search Radiohead", "search --type album Kid A"],
    category: "Explore",
    aliases: ["find"],
    options: [
      {
        name: "type",
        description: "What to search for",
        type: "string",
        choices: [
          { name: "artist", value: "artist" },
          { name: "album", value: "album" },
          { name: "track", value: "track" },
        ],
      },
      { name: "query", description: "Search query", type: "string", required: true, rest: true },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const validTypes = ["artist", "album", "track"] as const;
    const rawType = ctx.get("type");
    const type = (() => {
      if (rawType && validTypes.includes(rawType as any)) return rawType as "artist" | "album" | "track";
      if (ctx.get("artist")) return "artist" as const;
      if (ctx.get("album")) return "album" as const;
      if (ctx.get("track")) return "track" as const;
      return "artist" as const;
    })();
    // The positional parser may have consumed the first word as --type.
    // If it wasn't a valid type, prepend it back to the query.
    const queryParts: string[] = [];
    if (rawType && !validTypes.includes(rawType as any)) queryParts.push(rawType);
    const rest = ctx.get("query");
    if (rest) queryParts.push(rest);
    const query = queryParts.join(" ").trim();
    if (!query) return;

    const lines: ReactNode[] = [];
    if (type === "artist") {
      const res = await ctx.lb.mb.searchArtist(query, 8);
      res.forEach((a, i) => {
        lines.push(
          <span>
            <Code>{i + 1}</Code> {a.name}
          </span>,
        );
        lines.push(<LineBreak />);
      });
    } else if (type === "album") {
      const res = await ctx.lb.mb.searchRelease(query, 8);
      res.forEach((a, i) => {
        lines.push(
          <span>
            <Code>{i + 1}</Code> {a.title} — {a["artist-credit"]?.[0]?.name ?? "Unknown artist"}
          </span>,
        );
        lines.push(<LineBreak />);
      });
    } else {
      const res = await ctx.lb.mb.searchRecording(query, 8);
      res.forEach((a, i) => {
        lines.push(
          <span>
            <Code>{i + 1}</Code> {a.title} — {a["artist-credit"]?.[0]?.name ?? "Unknown artist"}
          </span>,
        );
        lines.push(<LineBreak />);
      });
    }

    if (lines.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR}>
            No {type}s found for “{query}”.
          </Embed>,
        ],
      });
      return;
    }
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`${type}s matching “${query}”`}>
          {lines}
        </Embed>,
      ],
    });
  },
});
