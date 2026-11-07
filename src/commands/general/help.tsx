import type { ReactNode } from "react";
import { Bold, Embed, SelectMenu } from "../../display/components.tsx";
import { BRAND_COLOR, NEUTRAL_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

const CATEGORY_EMOJIS: Record<string, string> = {
  General: "\u{1f4cb}",
  Account: "\u{1f464}",
  Listening: "\u{1f3b5}",
  Stats: "\u{1f4ca}",
  Explore: "\u{1f50d}",
  Social: "\u{1f91d}",
  Scrobbling: "\u{2699}\ufe0f",
};

const CATEGORY_ORDER = [
  "General",
  "Account",
  "Listening",
  "Stats",
  "Explore",
  "Social",
  "Scrobbling",
];

function getCategorySelectMenuId() {
  return "help_category_select";
}

function buildCategorySelectMenu() {
  const options = CATEGORY_ORDER.map((cat) => ({
    label: cat,
    value: cat,
    emoji: CATEGORY_EMOJIS[cat] ?? "\u{1f4c1}",
  }));
  return <SelectMenu id={getCategorySelectMenuId()} placeholder="Select a category..." options={options} />;
}

function buildCategoryPage(
  prefix: string,
  category: string,
  commands: Array<{ meta: { name: string; description: string; aliases?: string[]; slashOnly?: boolean; usage?: string } }>,
): ReactNode {
  const lines: ReactNode[] = [];
  const emoji = CATEGORY_EMOJIS[category] ?? "\u{1f4c1}";
  lines.push(`## ${emoji} ${category}`);
  lines.push(<br />);
  for (const cmd of commands) {
    const usage = cmd.meta.usage
      ? ` — \`${cmd.meta.slashOnly ? "/" : prefix}${cmd.meta.usage}\``
      : "";
    lines.push(`\`${cmd.meta.name}\` — ${cmd.meta.description}${usage}`);
    lines.push(<br />);
  }
  lines.push(`Use \`${prefix}help <command>\` for details`);
  return lines;
}

export const helpCommand = defineCommand({
  meta: {
    name: "help",
    description: "List all commands, or get help for a specific command.",
    usage: "help [command]",
    examples: ["help", "help np"],
    category: "General",
    options: [{ name: "command", description: "Command to get help for", type: "string" }],
  },
  run: async (ctx) => {
    const target = ctx.get("command");
    if (target) {
      const command = ctx.registry.get(target);
      if (!command) {
        await ctx.reply({
          display: [
            <Embed color={BRAND_COLOR} title={`Unknown command \`${target}\``}>
              Try {`\`help\``} for a full list of commands.
            </Embed>,
          ],
        });
        return;
      }
      const { meta } = command;
      const lines: ReactNode[] = [];
      lines.push(<Bold>{meta.name}</Bold>);
      lines.push(` — ${meta.description}`);
      if (meta.aliases?.length)
        lines.push(<br />, `Aliases: ${meta.aliases.map((a) => `\`${a}\``).join(", ")}`);
      if (meta.usage)
        lines.push(<br />, `Usage: ${meta.slashOnly ? "/" : ctx.prefix}${meta.usage}`);
      if (meta.examples?.length) {
        lines.push(<br />, `Examples:`);
        for (const ex of meta.examples) {
          lines.push(<br />, `  ${meta.slashOnly ? "/" : ctx.prefix}${ex}`);
        }
      }
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`${ctx.prefix}${meta.name}`}>
            {lines}
          </Embed>,
        ],
      });
      return;
    }

    const byCategory = ctx.registry.listByCategory();
    const totalCommands = [...byCategory.values()].reduce((sum, cmds) => sum + cmds.length, 0);

    const categoryList: ReactNode[] = [];
    categoryList.push("## \u{1f916} BrainzBot commands");
    categoryList.push(<br />);
    categoryList.push(`**Prefix:** \`${ctx.prefix}\``);
    categoryList.push(<br />);
    categoryList.push(`Select a category below to view commands`);
    categoryList.push(<br />);
    categoryList.push("---");
    categoryList.push(<br />);
    for (const cat of CATEGORY_ORDER) {
      const cmds = byCategory.get(cat);
      if (!cmds) continue;
      const emoji = CATEGORY_EMOJIS[cat] ?? "\u{1f4c1}";
      categoryList.push(`${emoji} **${cat}** (${cmds.length})`);
      categoryList.push(<br />);
    }
    categoryList.push("---");
    categoryList.push(<br />);
    categoryList.push(`Total: ${totalCommands} command(s)`);

    await ctx.reply({
      display: [<Embed color={NEUTRAL_COLOR}>{categoryList}</Embed>],
      selectMenus: [buildCategorySelectMenu()],
    });
  },
});

export { buildCategoryPage, getCategorySelectMenuId };
