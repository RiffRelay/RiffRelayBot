import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
  APIButtonComponentWithURL,
  APISelectMenuComponent,
} from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";
import type { ReactElement } from "react";
import { ActionButton, isElement, LinkButton, SelectMenu } from "../components.tsx";
import type { ActionButtonProps, LinkButtonProps, SelectMenuProps } from "../types.ts";

export function toLinkButton(el: ReactElement): APIButtonComponentWithURL {
  const { url, label, emoji } = el.props as LinkButtonProps;
  return {
    type: ComponentType.Button,
    style: ButtonStyle.Link,
    url,
    ...(label ? { label } : {}),
    ...(emoji
      ? {
          emoji:
            typeof emoji === "string"
              ? { name: emoji }
              : { id: emoji.id, ...(emoji.name ? { name: emoji.name } : {}), ...(emoji.animated ? { animated: true } : {}) },
        }
      : {}),
  };
}

export function toComponents(elements: ReactElement[]): APIActionRowComponent<APIButtonComponentWithURL>[] {
  const rows: APIActionRowComponent<APIButtonComponentWithURL>[] = [];
  let current: APIButtonComponentWithURL[] = [];
  for (const el of elements) {
    if (!isElement(el) || el.type !== LinkButton) continue;
    current.push(toLinkButton(el));
    if (current.length === 5) {
      rows.push({ type: ComponentType.ActionRow, components: current });
      current = [];
    }
  }
  if (current.length) rows.push({ type: ComponentType.ActionRow, components: current });
  return rows;
}

function toSelectMenu(el: ReactElement): APISelectMenuComponent {
  const { id, placeholder, options } = el.props as SelectMenuProps;
  return {
    type: ComponentType.StringSelect,
    custom_id: id,
    ...(placeholder ? { placeholder } : {}),
    options: options.map((item) => ({
      label: item.label,
      value: item.value,
      ...(item.description ? { description: item.description } : {}),
      ...(item.emoji ? { emoji: { name: item.emoji } } : {}),
    })),
  };
}

export function toSelectMenuRows(elements: ReactElement[]): APIActionRowComponent<APISelectMenuComponent>[] {
  return elements.filter((el) => isElement(el) && el.type === SelectMenu).map((el) => ({
    type: ComponentType.ActionRow,
    components: [toSelectMenu(el as ReactElement)],
  }));
}

function toActionButton(el: ReactElement): APIButtonComponentWithCustomId {
  const { id, label, style = "primary", emoji } = el.props as ActionButtonProps;
  const styles = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    danger: ButtonStyle.Danger,
  } as const;
  return {
    type: ComponentType.Button,
    style: styles[style],
    custom_id: id,
    label,
    ...(emoji ? { emoji: { name: emoji } } : {}),
  };
}

export function toActionButtonRows(
  elements: ReactElement[],
): APIActionRowComponent<APIButtonComponentWithCustomId>[] {
  const rows: APIActionRowComponent<APIButtonComponentWithCustomId>[] = [];
  let current: APIButtonComponentWithCustomId[] = [];
  for (const el of elements) {
    if (!isElement(el) || el.type !== ActionButton) continue;
    current.push(toActionButton(el));
    if (current.length === 5) {
      rows.push({ type: ComponentType.ActionRow, components: current });
      current = [];
    }
  }
  if (current.length) rows.push({ type: ComponentType.ActionRow, components: current });
  return rows;
}
