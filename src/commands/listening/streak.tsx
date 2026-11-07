import type { Listen } from "listenbrainz-api";
import { Bold, Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const streakCommand = defineCommand({
  meta: {
    name: "streak",
    description: "Count consecutive days with scrobbles (current + longest).",
    usage: "streak [user]",
    examples: ["streak"],
    category: "Listening",
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;

    const listens: Listen[] = [];
    let maxTs: number | undefined;
    for (let page = 0; page < 5; page += 1) {
      const res = await ctx.lb.anonymous.getListens(resolved.username, { count: 100, maxTs });
      const batch = res.payload.listens;
      if (batch.length === 0) break;
      listens.push(...batch);
      const last = batch[batch.length - 1];
      if (last?.listened_at === undefined) break;
      maxTs = last.listened_at - 1;
    }

    if (listens.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={resolved.username}>
            No listens found to build a streak from.
          </Embed>,
        ],
      });
      return;
    }

    const days = new Set<string>();
    for (const l of listens) {
      if (l.listened_at === undefined) continue;
      days.add(new Date(l.listened_at * 1000).toISOString().slice(0, 10));
    }

    const todayKey = dayKey(0);
    const yesterdayKey = dayKey(-1);
    let currentStreak = 0;
    if (days.has(todayKey) || days.has(yesterdayKey)) {
      let cursor = days.has(todayKey) ? 0 : -1;
      currentStreak = 0;
      while (days.has(dayKey(cursor))) {
        currentStreak += 1;
        cursor -= 1;
      }
    }

    const sortedDays = [...days].sort();
    let longest = 0;
    let run = 0;
    let prev: number | undefined;
    for (const d of sortedDays) {
      const key = Date.parse(d) / 86400000;
      if (prev !== undefined && key === prev + 1) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
      prev = key;
    }

    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`${resolved.username}'s scrobble streak`}
          url={LB_PROFILE_URL(resolved.username)}
        >
          <Bold>Current streak:</Bold>{" "}
          <Code>
            {currentStreak} day{currentStreak === 1 ? "" : "s"}
          </Code>
          {"\n"}
          <Bold>Longest streak:</Bold>{" "}
          <Code>
            {longest} day{longest === 1 ? "" : "s"}
          </Code>
          {"\n"}
          <Bold>Days scrobbled:</Bold> <Code>{days.size}</Code>
          {"\n"}
          <Bold>Total plays scanned:</Bold> <Code>{formatNumber(listens.length)}</Code>
        </Embed>,
      ],
    });
  },
});

function dayKey(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
