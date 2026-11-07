import { Bold, Code, Embed, LineBreak } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const similarCommand = defineCommand({
  meta: {
    name: "similar",
    description: "Show users with similar listening taste.",
    usage: "similar [user]",
    examples: ["similar"],
    category: "Social",
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const res = await ctx.lb.anonymous.getSimilarUsers(resolved.username, { count: 8 });
    const similar = res.payload.similar_users;
    if (similar.length === 0) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={resolved.username}>
            No similar users found yet. Keep scrobbling!
          </Embed>,
        ],
      });
      return;
    }
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`Users similar to ${resolved.username}`}>
          {similar.map((s) => (
            <span key={s.user_name}>
              <Code>{Math.round(s.similarity * 100)}%</Code> <Bold>{s.user_name}</Bold>
              <LineBreak />
            </span>
          ))}
        </Embed>,
      ],
    });
  },
});
