import { lbHomeUrl } from "listenbrainz-api";
import {
  BOT_URLS,
  discordInviteUrl,
  REFERENCE_LISTENBRAINZ_USER,
  SPONSOR_CARD_DISPLAY_CHANCE,
} from "../../bot/constants.ts";
import { Bold, Code, Embed, LinkButton } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const botCommand = defineCommand({
  meta: {
    name: "bot",
    description: "Bot status: uptime, linked users, ListenBrainz connectivity.",
    category: "General",
    aliases: ["status", "stats", "about"],
    slow: true,
  },
  run: async (ctx) => {
    const showSponsorCard = Math.random() < SPONSOR_CARD_DISPLAY_CHANCE;
    const [listenCount, artistCount, service, healthy, linkedCount, ping] = await Promise.all([
      referenceCount(() => ctx.lb.anonymous.getListenCount(REFERENCE_LISTENBRAINZ_USER)),
      referenceCount(() => ctx.lb.anonymous.getArtistCount(REFERENCE_LISTENBRAINZ_USER)),
      ctx.lb.anonymous.getServiceStatus(),
      ctx.lb.anonymous.isHealthy(),
      ctx.db.countUsers(),
      ctx.client.ws.ping,
    ]);

    const bot = ctx.client.user;
    const inviteUrl = discordInviteUrl(bot.id);

    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title="BrainzBot status" thumbnail={bot.displayAvatarURL()}>
          <Bold>Bot</Bold>
          {"\n"}Uptime: <Code>{formatUptime(ctx.client.uptime)}</Code>
          {"\n"}WebSocket ping: <Code>{ping}ms</Code>
          {"\n"}Linked users: <Code>{formatNumber(linkedCount)}</Code>
          {"\n"}
          {"\n"}
          <Bold>ListenBrainz API</Bold>
          {"\n"}Healthy: <Code>{healthy ? "✅ yes" : "❌ no"}</Code>
          {"\n"}Stats age:{" "}
          <Code>
            {service.stats_age === null ? "updating" : formatUptime(service.stats_age * 1000)}
          </Code>
          {"\n"}Incoming queue: <Code>{formatNumber(service.incoming_listen_count)}</Code>
          {"\n"}
          {"\n"}
          <Bold>Reference user (`{REFERENCE_LISTENBRAINZ_USER}`)</Bold>
          {"\n"}Listens:{" "}
          <Code>{listenCount === null ? "unavailable" : formatNumber(listenCount)}</Code>
          {"\n"}Artists:{" "}
          <Code>{artistCount === null ? "unavailable" : formatNumber(artistCount)}</Code>
        </Embed>,
        ...(showSponsorCard
          ? [
              <Embed color={BRAND_COLOR} title="Support RiffRelay" thumbnail={BOT_URLS.githubAvatar}>
                Built by [kmmiio99o]({BOT_URLS.githubProfile}). If RiffRelay has been useful,
                sponsorship helps support its ongoing development. Contributions are optional,
                and the bot remains free to use.
              </Embed>,
            ]
          : []),
      ],
      buttons: [
        <LinkButton key="lb-site" url={lbHomeUrl()} label="ListenBrainz site" />,
        <LinkButton key="invite" url={inviteUrl} label="Invite BrainzBot" />,
        ...(showSponsorCard
          ? [
              <LinkButton
                key="sponsor"
                url={BOT_URLS.githubSponsors}
                label="Sponsor RiffRelay"
                emoji="💜"
              />,
            ]
          : []),
      ],
    });
  },
});

/** Probe that degrades to `null` instead of failing the whole status command. */
async function referenceCount(probe: () => Promise<number>): Promise<number | null> {
  try {
    return await probe();
  } catch {
    return null;
  }
}

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}
