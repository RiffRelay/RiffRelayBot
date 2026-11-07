import type {
  APIComponentInContainer,
  APIContainerComponent,
  APIMessageTopLevelComponent,
  APISectionComponent,
} from "discord.js";
import { ComponentType } from "discord.js";
import type { ReactElement, ReactNode } from "react";
import { Embed, isElement, LinkButton, renderText } from "../components.tsx";
import type { EmbedProps } from "../types.ts";
import { toLinkButton } from "./actions.ts";
import {
  chunkLines,
  collectDescription,
  collectFields,
  MAX_CHUNK,
  TextBudget,
  toColor,
} from "./text.ts";

export function toContainer(el: ReactNode): APIContainerComponent | undefined {
  if (!isElement(el) || el.type !== Embed) return undefined;
  const props = el.props as EmbedProps;
  const budget = new TextBudget();
  const components: APIComponentInContainer[] = [];
  const push = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || budget.remaining <= 0) return;
    const available = Math.min(trimmed.length, MAX_CHUNK, budget.remaining);
    const capped = available < trimmed.length ? `${trimmed.slice(0, available - 1)}…` : trimmed;
    budget.remaining -= capped.length;
    components.push({ type: ComponentType.TextDisplay, content: capped });
  };
  const pushLines = (text: string) => {
    chunkLines(text.split("\n")).forEach(push);
  };

  if (props.author?.name !== undefined) push(`**${renderText(props.author.name)}**`);
  const title = props.title !== undefined ? renderText(props.title) : "";
  const aside = props.aside !== undefined ? renderText(props.aside) : "";
  if (props.thumbnail) {
    const lines = [title && `**${title}**`, ...aside.split("\n").map((line) => line.trim())].filter(Boolean);
    const section: APISectionComponent = {
      type: ComponentType.Section,
      components: (lines.length ? lines : ["\u200b"]).slice(0, 3).map((content) => ({
        type: ComponentType.TextDisplay,
        content,
      })),
      accessory: { type: ComponentType.Thumbnail, media: { url: props.thumbnail } },
    };
    components.push(section);
  } else if (title) push(`**${title}**`);
  if (props.image) {
    components.push({ type: ComponentType.MediaGallery, items: [{ media: { url: props.image } }] });
  }

  const parts: string[] = [];
  if (props.description !== undefined) parts.push(renderText(props.description));
  collectDescription(props.children, parts);
  const description = parts.join("");
  renderSideButtons(props, description, aside, components);
  if (!props.sideButtons?.length) {
    pushLines(description + (aside && !props.thumbnail ? aside : ""));
  }

  const fields = [...(props.fields ?? [])];
  collectFields(props.children, fields);
  for (const field of fields) pushLines(`**${field.name}**\n${field.value}`);
  if (!components.length) components.push({ type: ComponentType.TextDisplay, content: "\u200b" });
  const container: APIContainerComponent = { type: ComponentType.Container, components };
  const color = props.color === undefined ? undefined : toColor(props.color);
  if (color !== undefined) container.accent_color = color;
  return container;
}

function renderSideButtons(
  props: EmbedProps,
  description: string,
  aside: string,
  components: APIComponentInContainer[],
): void {
  if (!props.sideButtons?.length) return;
  let remaining = props.thumbnail ? description : aside;
  for (const button of props.sideButtons) {
    if (!isElement(button) || button.type !== LinkButton) continue;
    const lines = remaining.split("\n").map((line) => line.trim()).filter(Boolean);
    remaining = "";
    components.push({
      type: ComponentType.Section,
      components: (lines.length ? lines : ["\u200b"]).slice(0, 3).map((content) => ({
        type: ComponentType.TextDisplay,
        content,
      })),
      accessory: toLinkButton(button as ReactElement),
    });
  }
}

export function toDisplay(elements: ReactElement[]): APIMessageTopLevelComponent[] {
  return elements.flatMap((element) => {
    const container = toContainer(element);
    return container ? [container] : [];
  });
}
