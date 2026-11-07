import { Embed } from "../../display/components.tsx";
import { BRAND_COLOR, SUCCESS_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const unpinCommand = defineCommand({
  meta: {
    name: "unpin",
    description: "Remove your currently pinned track.",
    usage: "unpin",
    examples: ["unpin"],
    category: "Scrobbling",
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    if (!resolved.token) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>You can only unpin your own track.</Embed>],
      });
      return;
    }
    await ctx.lb.authed(resolved.token).unpin(resolved.token);
    await ctx.reply({
      display: [
        <Embed color={SUCCESS_COLOR} title="Unpinned">
          Your pinned track has been removed.
        </Embed>,
      ],
    });
  },
});
