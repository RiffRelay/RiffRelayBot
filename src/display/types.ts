import type { ReactElement, ReactNode } from "react";

export interface DisplayContent {
  display?: ReactElement[];
  content?: string;
  buttons?: ReactElement[];
  selectMenus?: ReactElement[];
  actionButtons?: ReactElement[];
}

export interface EmbedFieldData {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedAuthorProps {
  name?: ReactNode;
  url?: string;
  iconUrl?: string;
}

export interface EmbedProps {
  color?: number | string;
  title?: ReactNode;
  url?: string;
  description?: ReactNode;
  author?: EmbedAuthorProps;
  thumbnail?: string;
  image?: string;
  aside?: ReactNode;
  /**
   * Link buttons rendered as an ActionRow right after the section/thumbnail —
   * for actions tied to the card's image (e.g. "watch on YouTube").
   */
  sideButtons?: ReactElement[];
  /** Explicitly declared fields (children `Field`/`Row` are appended). */
  fields?: EmbedFieldData[];
  children?: ReactNode;
}

export interface FieldProps {
  name?: ReactNode;
  value?: ReactNode;
  children?: ReactNode;
  inline?: boolean;
}

export interface MarkupProps {
  children?: ReactNode;
}

/** A link button rendered into an ActionRow by the display renderer. */
export interface LinkButtonProps {
  url: string;
  label?: string;
  /**
   * Emoji shown on the button: a unicode emoji string (e.g. `"▶️"`) or a
   * custom guild emoji by id/name.
   */
  emoji?: string | { id: string; name?: string; animated?: boolean };
}

export interface SelectOptionProps {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
}

export interface SelectMenuProps {
  id: string;
  placeholder?: string;
  options: SelectOptionProps[];
}

export interface ActionButtonProps {
  id: string;
  label: string;
  style?: "primary" | "secondary" | "danger";
  emoji?: string;
}
