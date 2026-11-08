import {
  coverArtUrl,
  lbSettingsUrl,
  lbUserUrl,
  mbArtistUrl,
  mbRecordingUrl,
  mbReleaseUrl,
} from "listenbrainz-api";
import type { ReactElement, ReactNode } from "react";
import { Embed, LinkButton } from "../../display/components.tsx";

export const BRAND_COLOR = "#7C6BFF";
export const ERROR_COLOR = "#ED4245";
export const SUCCESS_COLOR = "#57F287";
export const NEUTRAL_COLOR = "#2B2D31";

export const LB_PROFILE_URL = lbUserUrl;
export const MB_ARTIST_URL = mbArtistUrl;
export const MB_RECORDING_URL = mbRecordingUrl;
export const MB_RELEASE_URL = mbReleaseUrl;
export const coverArt = coverArtUrl;

/** Link button to a user's ListenBrainz profile. */
export function profileButton(user: string): ReactElement {
  return <LinkButton url={LB_PROFILE_URL(user)} label="ListenBrainz profile" />;
}

/** Generic error embed used across the bot. */
export function errorEmbed(message: string, title = "Error"): ReactElement {
  return (
    <Embed color={ERROR_COLOR} title={title}>
      {message}
    </Embed>
  );
}

export function successEmbed(title: string, children?: ReactNode): ReactElement {
  return (
    <Embed color={SUCCESS_COLOR} title={title}>
      {children}
    </Embed>
  );
}

export function unlinkedEmbed(extra?: string): ReactElement {
  return (
    <Embed color={NEUTRAL_COLOR} title="Not connected yet">
      You haven't linked your ListenBrainz account.
      {"\n"}
      Use `/login` or `!login` to connect through the private token form.
      {"\n"}
      You can find your token at{" "}
      <Embed_link href={lbSettingsUrl()}>listenbrainz.org/settings</Embed_link>
      {extra ? `\n\n${extra}` : ""}
    </Embed>
  );
}

function Embed_link({ href, children }: { href: string; children?: ReactNode }): ReactNode {
  return `${children ?? href} (${href})`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function relativeTime(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ARTIST_EMOJIS = [
  "🎸", "🎹", "🎧", "🎷", "🎺", "🎻", "🥁", "🎤", "🎼", "🎵", "💜", "🧡", "💙", "💚", "💛",
  "❤️", "🖤", "🤍", "💖", "🟣", "🟠", "🔵", "🟢", "🟡", "🔴", "⚪", "⚫", "🟥", "🟧", "🟨",
  "🟩", "🟦", "🟪", "🟫", "✨", "⭐", "🌟", "🔥", "🌙", "🌈",
];

export function emojiFor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return ARTIST_EMOJIS[hash % ARTIST_EMOJIS.length]!;
}
