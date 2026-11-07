import { describe, expect, test } from "bun:test";
import { ActivityType, type ClientUser, PresenceUpdateStatus } from "discord.js";
import { startPresenceRotation } from "../src/bot/presence.ts";

describe("bot presence", () => {
  test("starts in Do Not Disturb with a music activity", () => {
    const updates: Array<Parameters<ClientUser["setPresence"]>[0]> = [];
    const timer = startPresenceRotation({
      setPresence: (presence) => {
        updates.push(presence);
      },
    });
    clearInterval(timer);

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      status: PresenceUpdateStatus.DoNotDisturb,
      activities: [{ name: "your listening history", type: ActivityType.Listening }],
    });
  });
});
