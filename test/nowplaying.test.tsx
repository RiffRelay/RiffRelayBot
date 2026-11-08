import { describe, expect, test } from "bun:test";
import type { Listen } from "listenbrainz-api";
import type { CommandContext, DisplayContent } from "../src/commands/types.ts";
import { nowPlayingCommand } from "../src/commands/listening/nowplaying.tsx";
import { toMessageData } from "../src/display/render.ts";

describe("nowplaying command", () => {
  test("falls back to the last listen and shows its Discord timestamp when nobody is playing now", async () => {
    const listenedAt = 1_700_000_000;
    const listen = {
      listened_at: listenedAt,
      track_metadata: {
        artist_name: "Clean Bandit",
        track_name: "Tick Tock",
      },
    } as Listen;
    const replies: DisplayContent[] = [];
    const api = {
      getPlayingNow: async () => ({ payload: { listens: [] } }),
      getListens: async () => ({ payload: { listens: [listen] } }),
      getArtistStats: async () => ({ payload: { artists: [] } }),
      getRecordingStats: async () => ({ payload: { recordings: [] } }),
      lookupTrackMetadata: async () => {
        throw new Error("No cover-art match");
      },
    };
    const context = {
      lb: {
        requireUser: async () => ({ username: "listener" }),
        anonymous: api,
      },
      client: { emojis: { cache: { find: () => undefined } } },
      reply: async (content: DisplayContent) => {
        replies.push(content);
      },
    } as unknown as CommandContext;

    await nowPlayingCommand.run(context);

    const rendered = JSON.stringify(toMessageData(replies[0]!));
    expect(rendered).toContain("Last played by listener · <t:1700000000:R>");
    expect(rendered).toContain("Tick Tock");
    expect(rendered).not.toContain("isn't listening to anything right now");
  });
});
