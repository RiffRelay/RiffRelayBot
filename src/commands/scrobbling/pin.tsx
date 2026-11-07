import { Bold, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, SUCCESS_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import { currentRecording } from "./shared.ts";

export const pinCommand = defineCommand({
  meta: {
    name: "pin",
    description: "Pin the currently playing track to your profile.",
    usage: "pin [blurb]",
    examples: ["pin This is my jam right now"],
    category: "Scrobbling",
    options: [
      { name: "blurb", description: "Optional message with the pin", type: "string", rest: true },
    ],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    if (!resolved.token) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>You can only pin your own track.</Embed>],
      });
      return;
    }
    const cur = await currentRecording(ctx, resolved);
    if (!cur) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>Nothing is playing right now.</Embed>],
      });
      return;
    }
    const msid = cur.listen.track_metadata.additional_info?.recording_msid;
    if (!msid) {
      await ctx.reply({
        display: [
          <Embed color={BRAND_COLOR} title="No recording match">
            Couldn't find a recording match to pin.
          </Embed>,
        ],
      });
      return;
    }
    const blurb = ctx.get("blurb");
    await ctx.lb.authed(resolved.token).pin(resolved.token, { recordingMsid: String(msid), blurb });
    await ctx.reply({
      display: [
        <Embed color={SUCCESS_COLOR} title="📌 Pinned">
          <Bold>{cur.flat.track}</Bold> by <Bold>{cur.flat.artist}</Bold> pinned to your profile.
        </Embed>,
      ],
    });
  },
});
