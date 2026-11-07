import type { ReactElement, ReactNode } from "react";
import React from "react";
import type {
  ActionButtonProps,
  EmbedProps,
  FieldProps,
  LinkButtonProps,
  MarkupProps,
  SelectMenuProps,
} from "./types.ts";

export const isElement = (node: ReactNode): node is ReactElement => React.isValidElement(node);

/** Recursively render a ReactNode tree to a plain (Markdown-aware) string. */
export function renderText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderText).join("");

  const el = node as ReactElement;
  const type = el.type;

  if (typeof type === "string") {
    const { children } = el.props as { children?: ReactNode };
    if (type === "br") return "\n";
    return renderText(children);
  }

  if (type === React.Fragment) {
    return renderText((el.props as { children?: ReactNode }).children);
  }

  // Custom component: render it by invoking directly (props-only components).
  const Component = type as unknown as (props: Record<string, unknown>) => ReactNode;
  const rendered = Component(el.props as Record<string, unknown>);
  return renderText(rendered);
}

export const Bold = ({ children }: MarkupProps) => <span>{`**${renderText(children)}**`}</span>;
export const Italic = ({ children }: MarkupProps) => <span>{`*${renderText(children)}*`}</span>;
export const BoldItalic = ({ children }: MarkupProps) => (
  <span>{`***${renderText(children)}***`}</span>
);
export const Code = ({ children }: MarkupProps) => <span>{`\`${renderText(children)}\``}</span>;
export const Strikethrough = ({ children }: MarkupProps) => (
  <span>{`~~${renderText(children)}~~`}</span>
);

export const Text = ({ children }: MarkupProps) => <span>{renderText(children)}</span>;
export const LineBreak = () => <span>{"\n"}</span>;
/** Zero-width space — useful for empty inline field padding. */
export const Space = () => <span>{"\u200b"}</span>;
export const Divider = ({ char = "─", length = 22 }: { char?: string; length?: number }) => (
  <span>{char.repeat(Math.max(0, length))}</span>
);

/** Unicode block progress bar, e.g. `███████░░░░░ 12:34 / 3:42`. */
export const Progress = ({
  value,
  max,
  width = 14,
  filled = "█",
  empty = "░",
}: {
  value: number;
  max: number;
  width?: number;
  filled?: string;
  empty?: string;
}) => {
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const filledCount = Math.round(ratio * width);
  const emptyCount = Math.max(0, width - filledCount);
  return <span>{filled.repeat(filledCount) + empty.repeat(emptyCount)}</span>;
};

/**
 * Field container. Rendered into TextDisplay rows by the renderer — both
 * `Field` and its inline sibling `Row` are markers, not visible markup.
 */
export const Field = (_props: FieldProps) => <></>;
export const Row = ({ children }: MarkupProps) => <span>{children}</span>;

/**
 * Root display component. Renders as a `Container` (type 17) with the embed
 * look — rounded card + accent stripe — in the Components V2 system.
 */
export const Embed = (_props: EmbedProps) => <></>;

/**
 * Link button marker. Collected by the renderer into an ActionRow nested
 * inside the container.
 */
export const LinkButton = (_props: LinkButtonProps) => <></>;

/**
 * Select menu marker. Collected by the renderer into an ActionRow.
 */
export const SelectMenu = (_props: SelectMenuProps) => <></>;

/**
 * Interactive action button marker. Collected by the renderer into an ActionRow.
 */
export const ActionButton = (_props: ActionButtonProps) => <></>;
