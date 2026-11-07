import type { ArtistStat } from "listenbrainz-api";
import { Bold, Embed, LineBreak } from "../../display/components.tsx";
import { BRAND_COLOR, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

const MOOD_EMOJI: Record<string, string> = {
  rock: "🎸",
  metal: "🤘",
  jazz: "🎷",
  electronic: "🔊",
  techno: "🎛️",
  house: "🏠",
  hip_hop: "🎤",
  rap: "🎤",
  pop: "🍬",
  indie: "🎈",
  classical: "🎻",
  ambient: "🌫️",
  punk: "🧷",
  folk: "🪕",
  soul: "🎵",
  rnb: "💃",
  blues: "🎺",
  country: "🤠",
  reggae: "🇯🇲",
  funk: "🕺",
};

export const moodCommand = defineCommand({
  meta: {
    name: "mood",
    description: "Guess your listening mood from genre tags.",
    usage: "mood [user]",
    examples: ["mood"],
    category: "Explore",
    aliases: ["genre", "vibe"],
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const res = await ctx.lb.anonymous.getArtistStats(resolved.username, {
      range: "all_time",
      count: 6,
    });
    const artists = (res.payload.artists as ArtistStat[] | undefined) ?? [];

    const tagCounts = new Map<string, number>();
    let scanned = 0;
    for (const artist of artists) {
      if (!artist.artist_mbid) continue;
      if (scanned >= 4) break;
      scanned += 1;
      try {
        const tags = await ctx.lb.mb.getArtistTopTags(artist.artist_mbid, 3);
        for (const tag of tags) {
          tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1);
        }
      } catch {
        // skip artists without resolvable tags
      }
    }

    if (tagCounts.size === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`${resolved.username}'s mood`}>
            Couldn't find genre tags. Try again later.
          </Embed>,
        ],
      });
      return;
    }

    const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const mood = sorted[0]?.[0] ?? "unknown";
    const moodEmoji = MOOD_EMOJI[mood] ?? "🎵";

    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`${resolved.username}'s vibe is ${moodEmoji} ${mood}`}
          url={LB_PROFILE_URL(resolved.username)}
        >
          {sorted.map(([tag, count]) => (
            <span key={tag}>
              {MOOD_EMOJI[tag] ?? "🏷️"} <Bold>{tag}</Bold> — {count} artist{count === 1 ? "" : "s"}
              <LineBreak />
            </span>
          ))}
        </Embed>,
      ],
    });
  },
});
