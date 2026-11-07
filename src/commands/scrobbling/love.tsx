import { Bold, Embed } from "../../display/components.tsx";
import { BRAND_COLOR, SUCCESS_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";
import { currentRecording } from "./shared.ts";

export const loveCommand = defineCommand({
  meta: {
    name: "love",
    description: "Love the currently playing track.",
    usage: "love",
    examples: ["love"],
    category: "Scrobbling",
    aliases: ["like"],
    slow: true,
  },
  run: async (ctx) => {
    const resolved = await ctx.lb.requireUser(ctx);
    if (!resolved) return;
    if (!resolved.token) {
      await ctx.reply({
        display: [<Embed color={BRAND_COLOR}>You can only love your own track.</Embed>],
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
            ListenBrainz has no recording match for the current track, so it can't be loved. Try
            again in a moment.
          </Embed>,
        ],
      });
      return;
    }
    await ctx.lb
      .authed(resolved.token)
      .submitFeedback(resolved.token, { recordingMsid: String(msid), score: 1 });
    await ctx.reply({
      display: [
        <Embed color={SUCCESS_COLOR} title="❤️ Loved">
          <Bold>{cur.flat.track}</Bold> by <Bold>{cur.flat.artist}</Bold>
        </Embed>,
      ],
    });
  },
});
