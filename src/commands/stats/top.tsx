import { defineCommand } from "../registry.ts";
import { ENTITY_CHOICES, type EntityKind, runTop } from "./core.tsx";

export const topCommand = defineCommand({
  meta: {
    name: "top",
    description: "Show top artists, albums or tracks for a period.",
    usage: "top [entity] [user] [period] [count]",
    examples: ["top", "top artists weekly", "top albums @user 30d 20"],
    category: "Stats",
    aliases: ["topstats", "toplist"],
    options: [
      {
        name: "entity",
        description: "What to rank (artists/albums/tracks/recordings)",
        type: "string",
        choices: ENTITY_CHOICES,
      },
      { name: "user", description: "Discord user (defaults to you)", type: "user" },
      { name: "period", description: "week | month | year | all (default all)", type: "string" },
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
  run: (ctx) => runTop(ctx, { entity: ctx.get("entity") as EntityKind | undefined }),
});
