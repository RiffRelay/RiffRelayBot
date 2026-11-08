import { PermissionFlagsBits, PermissionsBitField } from "discord.js";

const GITHUB_USER = "kmmiio99o";
const INVITE_PERMISSIONS = new PermissionsBitField([
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.UseApplicationCommands,
]).bitfield.toString();

export const BOT_URLS = {
  githubProfile: `https://github.com/${GITHUB_USER}`,
  githubAvatar: `https://github.com/${GITHUB_USER}.png`,
  githubSponsors: `https://github.com/sponsors/${GITHUB_USER}`,
} as const;

export const REFERENCE_LISTENBRAINZ_USER = "iliekcomputers";
export const SPONSOR_CARD_DISPLAY_CHANCE = 0.2;

export function discordInviteUrl(clientId: string): string {
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("permissions", INVITE_PERMISSIONS);
  url.searchParams.set("scope", "bot applications.commands");
  return url.toString();
}
