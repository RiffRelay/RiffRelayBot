import { Bold, Embed, LineBreak } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const freshCommand = defineCommand({
  meta: {
    name: "fresh",
    description: "New releases from the last month.",
    usage: "fresh [days]",
    examples: ["fresh", "fresh 7"],
    category: "Explore",
    aliases: ["newreleases", "releases"],
    options: [
      {
        name: "days",
        description: "How far back (max 60)",
        type: "number",
        minValue: 1,
        maxValue: 60,
      },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const days = Math.min(60, ctx.num("days") ?? 30);
    const res = await ctx.lb.anonymous.getFreshReleases(days);
    const releases = (res.releases ?? []).slice(0, 12);
    if (releases.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="Fresh releases">
            Nothing in the last {days} days.
          </Embed>,
        ],
      });
      return;
    }
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`New releases · last ${days} days`}>
          {releases.map((r) => (
            <span key={r.release_mbid}>
              <Bold>{r.release_name}</Bold> — {r.artist_name} ({r.release_date})
              <LineBreak />
            </span>
          ))}
        </Embed>,
      ],
    });
  },
});
