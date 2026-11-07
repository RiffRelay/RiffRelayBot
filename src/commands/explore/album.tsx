import type { AlbumStat } from "listenbrainz-api";
import { Bold, Code, Embed, LinkButton } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber, MB_RELEASE_URL, resolveCoverImage } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import { coverFromMbid } from "./shared.ts";

export const albumCommand = defineCommand({
  meta: {
    name: "album",
    description: "Look up an album and its plays.",
    usage: "album <name> [user]",
    examples: ["album In Rainbows", "album In Rainbows @user"],
    category: "Explore",
    options: [
      { name: "name", description: "Album title", type: "string", required: true, rest: true },
      { name: "user", description: "Discord user for stats (defaults to you)", type: "user" },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const name = (ctx.get("name") ?? "").trim();
    if (!name) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>Give me an album name to look up.</Embed>],
      });
      return;
    }
    const lb = ctx.lb.anonymous;
    const search = await ctx.lb.mb.searchRelease(name, 1);
    const found = search[0];
    if (!found) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>No album found for “{name}”.</Embed>],
      });
      return;
    }
    const artistName = found["artist-credit"]?.[0]?.name ?? "Unknown artist";
    const requestedUser = ctx.get("user");
    const discordId =
      requestedUser && /^\d{15,20}$/.test(requestedUser) ? requestedUser : ctx.author.id;
    const linkedUser = await ctx.lb.resolveUser(ctx.db, discordId);
    const [release, stats, thumbnail] = await Promise.all([
      ctx.lb.mb.lookupRelease(found.id).catch(() => null),
      linkedUser
        ? lb.getAlbumStats(linkedUser.username, { range: "all_time", count: 100 }).catch(() => null)
        : Promise.resolve(null),
      resolveCoverImage(coverFromMbid(found.id)),
    ]);
    const plays = (stats?.payload.albums as AlbumStat[] | undefined)?.find(
      (a) => a.release_name.toLowerCase() === found.title.toLowerCase(),
    )?.listen_count;

    const trackCount = release?.media?.reduce(
      (sum, m) => sum + (m.track_count ?? m.tracks?.length ?? 0),
      0,
    );
    const releaseDate =
      release?.date ?? found.date ?? release?.["release-group"]?.["first-release-date"];
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`${found.title} — ${artistName}`} thumbnail={thumbnail}>
          {releaseDate ? (
            <>
              Released: <Code>{releaseDate}</Code>
              {"\n"}
            </>
          ) : null}
          {trackCount ? (
            <>
              Tracks: <Code>{trackCount}</Code>
              {"\n"}
            </>
          ) : null}
          {plays !== undefined ? (
            <>
              Plays for {linkedUser?.username}: <Bold>{formatNumber(plays)}</Bold>
              {"\n"}
            </>
          ) : null}
        </Embed>,
      ],
      buttons: [
        <LinkButton key="mb-release" url={MB_RELEASE_URL(found.id)} label="Open on MusicBrainz" />,
      ],
    });
  },
});
