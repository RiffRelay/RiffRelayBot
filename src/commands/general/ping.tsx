import { Code, Embed } from "../../display/components.tsx";
import { BRAND_COLOR } from "../helpers.tsx";
import { defineCommand } from "../registry.ts";

export const pingCommand = defineCommand({
  meta: {
    name: "ping",
    description: "Check the bot's and Discord connection latency.",
    category: "General",
  },
  run: async (ctx) => {
    const responseLatency = ctx.message
      ? Math.max(0, Date.now() - ctx.message.createdTimestamp)
      : undefined;
    await ctx.reply({
      display: [
        <Embed color={BRAND_COLOR} title="Pong!">
          {responseLatency !== undefined ? (
            <div>
              Response latency: <Code>{responseLatency}ms</Code>
            </div>
          ) : null}
          {responseLatency !== undefined ? "\n" : null}
          WebSocket heartbeat: <Code>{ctx.client.ws.ping}ms</Code>
        </Embed>,
      ],
    });
  },
});
