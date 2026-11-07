import type { ArtistStat } from "listenbrainz-api";
import type { ReactNode } from "react";
import { Bold, Code, Embed, LineBreak } from "../../display/components.tsx";
import { BRAND_COLOR, formatNumber, LB_PROFILE_URL } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const tasteCommand = defineCommand({
  meta: {
    name: "taste",
    description: "Compare your taste with another user's (top-artists overlap).",
    usage: "taste [user]",
    examples: ["taste @friend"],
    category: "Social",
    aliases: ["compare", "match", "compatibility"],
    options: [
      { name: "user", description: "The other Discord user", type: "user", required: true },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const me = await ctx.lb.requireUser(ctx);
    if (!me) return;

    const otherDiscordId = ctx.get("user") ?? "";
    const other = await ctx.db.getUser(otherDiscordId);
    if (!other) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR}>
            <Bold>@{ctx.get("user")}</Bold> hasn't linked their ListenBrainz account yet.
          </Embed>,
        ],
      });
      return;
    }

    const [mine, theirs] = await Promise.all([
      ctx.lb.anonymous.getArtistStats(me.username, { range: "all_time", count: 100 }),
      ctx.lb.anonymous.getArtistStats(other.lbUser, { range: "all_time", count: 100 }),
    ]);

    const myArtists = (mine.payload.artists as ArtistStat[] | undefined) ?? [];
    const theirArtists = (theirs.payload.artists as ArtistStat[] | undefined) ?? [];

    const normalize = (s: string) => s.trim().toLowerCase();
    const mySet = new Set(myArtists.map((a) => normalize(a.artist_name)));
    const theirSet = new Set(theirArtists.map((a) => normalize(a.artist_name)));

    const shared = myArtists.filter((a) => theirSet.has(normalize(a.artist_name)));

    const union = new Set([...mySet, ...theirSet]);
    const intersection = shared.length;
    const jaccard = union.size === 0 ? 0 : intersection / union.size;

    const myCounts = new Map(
      myArtists.map((a) => [normalize(a.artist_name), a.listen_count] as const),
    );
    const sharedSorted = [...shared].sort(
      (a, b) =>
        (myCounts.get(normalize(b.artist_name)) ?? 0) -
        (myCounts.get(normalize(a.artist_name)) ?? 0),
    );

    const percent = Math.round(jaccard * 100);
    const verdict =
      percent >= 90
        ? "Soulmates. Call each other."
        : percent >= 70
          ? "Great taste match!"
          : percent >= 45
            ? "Decent overlap."
            : percent >= 20
              ? "Different wavelengths."
              : "Opposites attract, clearly.";

    const sharedLines: ReactNode[] = sharedSorted.slice(0, 10).map((a) => (
      <span key={a.artist_name}>
        {a.artist_name} — <Code>{formatNumber(myCounts.get(normalize(a.artist_name)) ?? 0)}</Code>{" "}
        plays
        <LineBreak />
      </span>
    ));

    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title={`${me.username} × ${other.lbUser} — ${percent}% match`}>
          <Bold>{percent}%</Bold> — {verdict}
          {"\n"}
          {"\n"}
          <Bold>Shared artists ({intersection})</Bold>
          <LineBreak />
          {sharedLines.length > 0 ? sharedLines : "None in the top 100."}
          {"\n"}
          {"\n"}
          {me.username}: {LB_PROFILE_URL(me.username)}
          {"\n"}
          {other.lbUser}: {LB_PROFILE_URL(other.lbUser)}
        </Embed>,
      ],
    });
  },
});
