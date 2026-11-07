import { Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const setprefixCommand = defineCommand({
  meta: {
    name: "setprefix",
    description: "Change the text-command prefix for this server.",
    usage: "setprefix <prefix>",
    examples: ["setprefix ?"],
    category: "General",
    guildOnly: true,
    options: [
      { name: "prefix", description: "New prefix (max 3 chars)", type: "string", required: true },
    ],
  },
  run: async (ctx) => {
    if (!ctx.guildId) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>This command only works in a server.</Embed>],
      });
      return;
    }
    const prefix = ctx.get("prefix") ?? "";
    if (!prefix || prefix.length > 3 || /[`\n]/.test(prefix)) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>Prefix must be 1-3 characters.</Embed>],
      });
      return;
    }
    await ctx.db.setPrefix(ctx.guildId, prefix);
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title="Prefix updated">
          Text commands now use <Code>{prefix}</Code> in this server. Slash commands are unaffected.
        </Embed>,
      ],
    });
  },
});
