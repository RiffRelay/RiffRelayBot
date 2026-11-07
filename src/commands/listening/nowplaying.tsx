import type { Listen } from "listenbrainz-api";
import { Bold, Embed, LinkButton } from "../../display/components.tsx";
import {
  BRAND_COLOR,
  flattenListen,
  formatDuration,
  formatNumber,
  MB_ARTIST_URL,
  MB_RECORDING_URL,
  resolveCoverArt,
  ytTrackUrl,
} from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const nowPlayingCommand = defineCommand({
  meta: {
    name: "nowplaying",
    description: "Show what's currently playing.",
    usage: "np [user]",
    examples: ["np", "np @user"],
    category: "Listening",
    aliases: ["np", "now"],
    options: [{ name: "user", description: "Discord user (defaults to you)", type: "user" }],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    const lb = resolved.token ? ctx.lb.authed(resolved.token) : ctx.lb.anonymous;

    let listen: Listen | undefined;
    let fromHistory = false;
    try {
      const now = await lb.getPlayingNow(resolved.username);
      listen = now.payload.listens[0];
    } catch {
      // `playing-now` is the flakiest endpoint (timeouts / 502s) — fall back
      // to the most recent listen so the command still works during LB hiccups.
      const recent = await lb.getListens(resolved.username, { count: 1 });
      listen = recent.payload.listens[0];
      fromHistory = true;
    }
    if (!listen) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={resolved.username}>
            isn't listening to anything right now.
          </Embed>,
        ],
      });
      return;
    }
    const flat = flattenListen(listen);

    // Play counts + cover art, fetched in parallel and best-effort (failures → null).
    const [artistStats, trackStats, thumbnail] = await Promise.all([
      lb.getArtistStats(resolved.username, { range: "all_time", count: 50 }).catch(() => null),
      lb.getRecordingStats(resolved.username, { range: "all_time", count: 100 }).catch(() => null),
      resolveCoverArt(lb, listen),
    ]);
    const artistPlays = (
      artistStats?.payload.artists as
        Array<{ artist_name: string; listen_count: number }> | undefined
    )?.find((a) => a.artist_name.toLowerCase() === flat.artist.toLowerCase())?.listen_count;
    const trackPlays = (
      trackStats?.payload.recordings as
        Array<{ track_name: string; artist_name?: string; listen_count: number }> | undefined
    )?.find(
      (r) =>
        r.track_name.toLowerCase() === flat.track.toLowerCase() &&
        (r.artist_name?.toLowerCase() === flat.artist.toLowerCase() || !r.artist_name),
    )?.listen_count;

    const duration =
      flat.durationMs !== undefined ? `Duration: ${formatDuration(flat.durationMs)}` : null;

    const playCounts: string[] = [];
    if (artistPlays !== undefined) playCounts.push(`Artist plays: ${formatNumber(artistPlays)}`);
    if (trackPlays !== undefined) playCounts.push(`Track plays: ${formatNumber(trackPlays)}`);
    const meta = [duration, ...playCounts].filter((s): s is string => s !== null);

    const buttons = [
      ...(flat.recordingMbid
        ? [
            <LinkButton
              key="mb-track"
              url={MB_RECORDING_URL(flat.recordingMbid)}
              label="Track on MusicBrainz"
            />,
          ]
        : []),
      ...(flat.artistMbids?.[0]
        ? [
            <LinkButton
              key="mb-artist"
              url={MB_ARTIST_URL(flat.artistMbids[0])}
              label="Artist on MusicBrainz"
            />,
          ]
        : []),
    ];

    const ytEmoji = ctx.client.emojis.cache.find((emoji) => emoji.name === "YouTubeIcon");
    const ytButton = (
      <LinkButton
        key="yt-track"
        url={ytTrackUrl(flat)}
        emoji={ytEmoji ? { id: ytEmoji.id, name: ytEmoji.name ?? undefined } : "▶️"}
      />
    );

    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={
            fromHistory
              ? `Last played by ${resolved.username}`
              : `${resolved.username} is listening to`
          }
          thumbnail={thumbnail}
          aside={
            <>
              {`### ${flat.track}`}
              {"\n"}by <Bold>{flat.artist}</Bold>
              {flat.album ? (
                <>
                  {" "}
                  from <Bold>{flat.album}</Bold>
                </>
              ) : null}
            </>
          }
          sideButtons={[ytButton]}
        >
          {meta.join(" · ")}
        </Embed>,
      ],
      buttons,
    });
  },
});
