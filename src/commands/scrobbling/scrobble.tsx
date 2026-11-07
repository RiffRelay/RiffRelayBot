import { createListen } from "listenbrainz-api";
import { Bold, Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, SUCCESS_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const scrobbleCommand = defineCommand({
  meta: {
    name: "scrobble",
    description: "Manually scrobble a track: “artist - title”.",
    usage: "scrobble <artist - title>",
    examples: ["scrobble Radiohead - Paranoid Android"],
    category: "Scrobbling",
    aliases: ["submit"],
    options: [
      {
        name: "track",
        description: "Format: Artist - Title",
        type: "string",
        required: true,
        rest: true,
      },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    if (!resolved.token) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR}>You can only scrobble for yourself, not other users.</Embed>,
        ],
      });
      return;
    }
    const raw = (ctx.get("track") ?? "").trim();
    const dash = raw.lastIndexOf(" - ");
    if (dash === -1) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="Usage">
            Format the track as <Code>artist - title</Code>, e.g.{" "}
            <Code>{ctx.prefix}scrobble Radiohead - Paranoid Android</Code>
          </Embed>,
        ],
      });
      return;
    }
    const artist = raw.slice(0, dash).trim();
    const track = raw.slice(dash + 3).trim();
    if (!artist || !track) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>Need both an artist and a track title.</Embed>],
      });
      return;
    }

    const listen = createListen({
      artistName: artist,
      trackName: track,
      listenedAt: Math.floor(Date.now() / 1000),
    });
    const res = await ctx.lb.authed(resolved.token).submitListen(resolved.token, listen);
    if (res.status !== "ok") {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="Scrobble failed">
            {res.error ?? "Unknown error from ListenBrainz."}
          </Embed>,
        ],
      });
      return;
    }
    await ctx.reply({
      display: [
        <Embed color={SUCCESS_COLOR} title="Scrobbled">
          <Bold>{track}</Bold> by <Bold>{artist}</Bold> — now on your ListenBrainz.
        </Embed>,
      ],
    });
  },
});
