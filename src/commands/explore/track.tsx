import { Bold, Code, Embed, LinkButton } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber, MB_RECORDING_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import { formatDurationMs } from "./shared.ts";

export const trackCommand = defineCommand({
  meta: {
    name: "track",
    description: "Look up a track and its plays.",
    usage: "track <name> [user]",
    examples: ["track Paranoid Android"],
    category: "Explore",
    options: [
      { name: "name", description: "Track title", type: "string", required: true, rest: true },
      { name: "user", description: "Discord user for stats (defaults to you)", type: "user" },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const name = (ctx.get("name") ?? "").trim();
    if (!name) return;
    const lb = ctx.lb.anonymous;
    const search = await ctx.lb.mb.searchRecording(name, 1);
    const found = search[0];
    if (!found) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>No track found for “{name}”.</Embed>],
      });
      return;
    }
    const artistName = found["artist-credit"]?.[0]?.name ?? "Unknown artist";
    const [metadata, stats] = await Promise.all([
      ctx.lb.mb.lookupRecording(found.id).catch(() => null),
      lb.getRecordingStats(artistName, { range: "all_time", count: 100 }).catch(() => null),
    ]);
    const plays = (
      stats?.payload.recordings as Array<{ track_name: string; listen_count: number }> | undefined
    )?.find((r) => r.track_name.toLowerCase() === found.title.toLowerCase())?.listen_count;

    const lengthMs = found.length ?? metadata?.length;
    const firstReleaseDate = metadata?.["first-release-date"];
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`${found.title} — ${artistName}`}>
          {firstReleaseDate ? (
            <>
              First released: <Code>{firstReleaseDate}</Code>
              {"\n"}
            </>
          ) : null}
          {lengthMs ? (
            <>
              Length: <Code>{formatDurationMs(lengthMs)}</Code>
              {"\n"}
            </>
          ) : null}
          {plays !== undefined ? (
            <>
              Plays: <Bold>{formatNumber(plays)}</Bold>
              {"\n"}
            </>
          ) : null}
        </Embed>,
      ],
      buttons: [
        <LinkButton
          key="mb-recording"
          url={MB_RECORDING_URL(found.id)}
          label="Open on MusicBrainz"
        />,
      ],
    });
  },
});
