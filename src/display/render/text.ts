import type { ReactNode } from "react";
import { Embed, Field, isElement, Row, renderText } from "../components.tsx";
import type { EmbedFieldData, FieldProps } from "../types.ts";

const NAMED_COLORS: Record<string, number> = {
  blurple: 0x5865f2, green: 0x57f287, yellow: 0xfee75c, red: 0xed4245,
  fuchsia: 0xeb459e, white: 0xffffff, black: 0x000000, gray: 0x808080, orange: 0xfaa61a,
};
export const MAX_TOTAL_TEXT = 4000;
export const MAX_CHUNK = 1024;
export class TextBudget {
  remaining = MAX_TOTAL_TEXT;
}

export function toColor(color: number | string): number | undefined {
  if (typeof color === "number") return color & 0xffffff;
  const trimmed = color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return Number.parseInt(trimmed, 16);
  if (/^[0-9a-fA-F]{8}$/.test(trimmed)) return Number.parseInt(trimmed.slice(0, 6), 16);
  return NAMED_COLORS[trimmed.toLowerCase()];
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function chunkLines(lines: string[], max = MAX_CHUNK): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > max) {
      if (current) chunks.push(current);
      current = line;
    } else current = current ? `${current}\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function collectFields(children: ReactNode, out: EmbedFieldData[]): void {
  if (children === null || children === undefined || typeof children === "boolean") return;
  if (Array.isArray(children)) {
    for (const child of children) collectFields(child, out);
    return;
  }
  if (!isElement(children)) return;
  if (children.type === Field) {
    const props = children.props as FieldProps;
    out.push({
      name: truncate(renderText(props.name) || "\u200b", 256),
      value: truncate(renderText(props.value ?? props.children) || "\u200b", 1024),
      inline: props.inline,
    });
  } else if (children.type === Row) {
    collectFields((children.props as { children?: ReactNode }).children, out);
  }
}

export function collectDescription(children: ReactNode, out: string[]): void {
  if (children === null || children === undefined || typeof children === "boolean") return;
  if (Array.isArray(children)) {
    for (const child of children) collectDescription(child, out);
    return;
  }
  if (typeof children === "string" || typeof children === "number") {
    if (String(children)) out.push(String(children));
    return;
  }
  if (!isElement(children) || children.type === Field || children.type === Row || children.type === Embed) {
    return;
  }
  const text = renderText(children);
  if (text) out.push(text);
}
