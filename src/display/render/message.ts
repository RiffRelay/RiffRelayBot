import type { APIContainerComponent, APIMessageTopLevelComponent } from "discord.js";
import { ComponentType, MessageFlags } from "discord.js";
import type { DisplayContent } from "../types.ts";
import { toActionButtonRows, toComponents, toSelectMenuRows } from "./actions.ts";
import { toDisplay } from "./container.ts";
import { MAX_TOTAL_TEXT, truncate } from "./text.ts";

export function toMessageData(content: DisplayContent): {
  components?: APIMessageTopLevelComponent[];
  content?: string;
  flags?: number;
} {
  const display = content.display ? toDisplay(content.display) : [];
  const components: APIMessageTopLevelComponent[] = display;
  const rows = [
    ...(content.buttons ? toComponents(content.buttons) : []),
    ...(content.selectMenus ? toSelectMenuRows(content.selectMenus) : []),
    ...(content.actionButtons ? toActionButtonRows(content.actionButtons) : []),
  ];
  const last = [...display].reverse().find(
    (component): component is APIContainerComponent => component.type === ComponentType.Container,
  );
  if (last) last.components.push(...rows);
  else components.push(...rows);
  if (!components.length) return { content: content.content };
  if (content.content && components[0]?.type === ComponentType.Container) {
    components[0].components.unshift({
      type: ComponentType.TextDisplay,
      content: truncate(content.content, MAX_TOTAL_TEXT),
    });
  }
  return {
    components,
    content: content.content && components[0]?.type !== ComponentType.Container ? content.content : undefined,
    flags: MessageFlags.IsComponentsV2,
  };
}
