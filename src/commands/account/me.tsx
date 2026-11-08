import { Bold, Code, Embed, Field, LineBreak } from "../../display/components.tsx";
import {
  BRAND_COLOR,
  coverFromListen,
  formatNumber,
  LB_PROFILE_URL,
  profileButton,
  relativeTime,
  resolveCoverImage,
  unlinkedEmbed,
} from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import { loginActionButton } from "./login.tsx";

export const meCommand = defineCommand({
  meta: {
    name: "me",
    description: "Show your linked ListenBrainz profile and stats.",
    category: "Account",
    aliases: ["profile", "user", "whoami"],
    slow: true,
  },
  run: async (ctx) => {
    const linked = await ctx.db.getUser(ctx.author.id);
    if (!linked) {
      await ctx.reply({
        display: [unlinkedEmbed()],
        actionButtons: [loginActionButton(ctx.author.id, "Connect ListenBrainz")],
      });
      return;
    }
    const lb = ctx.lb.anonymous;
    const [listenCount, artistCount, releaseCount, playing, recent, latestImport, topArtists, topAlbums, similar] =
      await Promise.all([
        lb.getListenCount(linked.lbUser),
        lb.getArtistCount(linked.lbUser),
        lb.getReleaseCount(linked.lbUser),
        lb.getPlayingNow(linked.lbUser).catch(() => null),
        lb.getListens(linked.lbUser, { count: 1 }).catch(() => null),
        lb.getLatestImport(linked.lbUser).catch(() => null),
        lb.getArtistStats(linked.lbUser, { range: "all_time", count: 3 }).catch(() => null),
        lb.getAlbumStats(linked.lbUser, { range: "all_time", count: 3 }).catch(() => null),
        lb.getSimilarUsers(linked.lbUser, { count: 3 }).catch(() => null),
      ]);

    const currentListen = playing?.payload.listens[0] ?? recent?.payload.listens[0];
    const artistRows = topArtists?.payload.artists as
      | Array<{ artist_name?: string; listen_count?: number }>
      | undefined;
    const albumRows = topAlbums?.payload.albums as
      | Array<{ artist_name?: string; release_name?: string; listen_count?: number }>
      | undefined;
    const similarList = similar?.payload.similar_users ?? [];
    const thumbnail = currentListen
      ? await resolveCoverImage(coverFromListen(currentListen))
      : undefined;
    const latestTrack = currentListen?.track_metadata;
    const trackTitle = latestTrack?.track_name ?? currentListen?.track_name ?? "Unknown track";
    const artistName = latestTrack?.artist_name ?? "Unknown artist";
    const listeningStatus = playing?.payload.count
      ? "Listening now"
      : currentListen?.listened_at !== undefined
        ? `Last played ${relativeTime(currentListen.listened_at)}`
        : "No recent listens";
    const topArtistText = artistRows
      ?.map(
        (artist, index) =>
          `${index + 1}. ${artist.artist_name} · ${formatNumber(artist.listen_count ?? 0)}`,
      )
      .join("\n");
    const topAlbumText = albumRows
      ?.map(
        (album, index) =>
          `${index + 1}. ${album.release_name}${album.artist_name ? ` — ${album.artist_name}` : ""}`,
      )
      .join("\n");

    await ctx.reply({
      display: [
        <Embed
          color={BRAND_COLOR}
          title={`${linked.lbUser}'s listening profile`}
          url={LB_PROFILE_URL(linked.lbUser)}
          author={{ name: `${ctx.memberDisplayName}`, iconUrl: ctx.authorAvatarUrl }}
          thumbnail={thumbnail}
          aside={
            <>
              <Bold>{trackTitle}</Bold>
              {"\n"}by {artistName} · {listeningStatus}
            </>
          }
        >
          <Field name="Total listens" value={formatNumber(listenCount)} />
          <Field name="Unique artists" value={formatNumber(artistCount)} />
          <Field name="Unique releases" value={formatNumber(releaseCount)} />
          {topArtistText ? <Field name="Top artists" value={topArtistText} /> : null}
          {topAlbumText ? <Field name="Top albums" value={topAlbumText} /> : null}
          {similarList.length > 0 ? (
            <Field
              name="Similar listeners"
              value={similarList.map((s) => `${s.user_name} · ${Math.round(s.similarity * 100)}%`).join("\n")}
            />
          ) : null}
          {latestImport?.payload.latest_import ? (
            <>
              <LineBreak />
              Last.fm import:{" "}
              <Code>{new Date(latestImport.payload.latest_import).toISOString().slice(0, 10)}</Code>
            </>
          ) : null}
        </Embed>,
      ],
      buttons: [profileButton(linked.lbUser)],
    });
  },
});
