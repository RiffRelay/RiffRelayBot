import type { StringSelectMenuInteraction } from "discord.js";
import type { BotRuntime } from "../bot.tsx";
import { buildCategoryPage, getCategorySelectMenuId } from "../commands/general/help.tsx";
import { NEUTRAL_COLOR } from "../commands/helpers.tsx";
import { Embed, SelectMenu } from "../display/components.tsx";
import { toMessageData } from "../display/render.ts";

const CATEGORY_EMOJIS: Record<string, string> = {
  General: "\u{1f4cb}",
  Account: "\u{1f464}",
  Listening: "\u{1f3b5}",
  Stats: "\u{1f4ca}",
  Explore: "\u{1f50d}",
  Social: "\u{1f91d}",
  Scrobbling: "\u{2699}\ufe0f",
};

export async function handleSelectMenu(
  interaction: StringSelectMenuInteraction,
  runtime: BotRuntime,
): Promise<void> {
  if (interaction.customId === getCategorySelectMenuId()) {
    const category = interaction.values[0];
    if (!category) {
      await interaction.deferUpdate();
      return;
    }

    const byCategory = runtime.registry.listByCategory();
    const commands = byCategory.get(category);
    if (!commands) {
      await interaction.deferUpdate();
      return;
    }

    const prefix = runtime.config.defaultPrefix;
    const pageContent = buildCategoryPage(prefix, category, commands);

    const options = Object.keys(CATEGORY_EMOJIS).map((cat) => ({
      label: cat,
      value: cat,
      emoji: CATEGORY_EMOJIS[cat] ?? "\u{1f4c1}",
    }));

    const emoji = CATEGORY_EMOJIS[category] ?? "\u{1f4c1}";
    await interaction.update(
      toMessageData({
        display: [
          <Embed color={NEUTRAL_COLOR} title={`${emoji} ${category} commands`}>
            {pageContent}
          </Embed>,
        ],
        selectMenus: [
          <SelectMenu id={getCategorySelectMenuId()} placeholder={`Viewing: ${category}`} options={options} />,
        ],
      }),
    );
  }
}
