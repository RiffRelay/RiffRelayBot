import type { ArtistStat } from "listenbrainz-api";
import { Bold, Code, Embed, LinkButton } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber, MB_ARTIST_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const artistCommand = defineCommand({
  meta: {
    name: "artist",
    description: "Look up an artist and their stats.",
    usage: "artist <name> [user]",
    examples: ["artist Radiohead", "artist The Beatles @user"],
    category: "Explore",
    options: [
      { name: "name", description: "Artist name", type: "string", required: true, rest: true },
      { name: "user", description: "Discord user for stats (defaults to you)", type: "user" },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const name = (ctx.get("name") ?? "").trim();
    if (!name) {
      await ctx.reply({ display: [<Embed color={BRAND_COLOR}>Give me an artist name.</Embed>] });
      return;
    }
    const lb = ctx.lb.anonymous;
    const search = await ctx.lb.mb.searchArtist(name, 1);
    const found = search[0];
    if (!found) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title={`No artist found for “${name}”`}>
            Try a different spelling.
          </Embed>,
        ],
      });
      return;
    }

    const stats = await lb
      .getArtistStats(found.name, { range: "all_time", count: 1 })
      .catch(() => null);
    const listens = (stats?.payload.artists as ArtistStat[] | undefined)?.[0]?.listen_count;

    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={found.name}>
          {found.disambiguation ? (
            <>
              {found.disambiguation}
              {"\n"}
            </>
          ) : null}
          {found.type ? (
            <>
              Type: <Code>{found.type}</Code>
              {"\n"}
            </>
          ) : null}
          {listens !== undefined ? (
            <>
              Total plays: <Bold>{formatNumber(listens)}</Bold>
              {"\n"}
            </>
          ) : null}
        </Embed>,
      ],
      buttons: [
        <LinkButton key="mb-artist" url={MB_ARTIST_URL(found.id)} label="Open on MusicBrainz" />,
      ],
    });
  },
});
