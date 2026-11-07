import type { APIMessageTopLevelComponent, Message } from "discord.js";
import type { BotRuntime } from "../bot.tsx";
import { parsePrefixArgs } from "../commands/args.ts";
import { NEUTRAL_COLOR } from "../commands/helpers.tsx";
import { MessageReplyTarget, makeContext } from "../context.ts";
import { Embed } from "../display/components.tsx";
import { toMessageData } from "../display/render.ts";

export async function handleMessage(message: Message, runtime: BotRuntime): Promise<void> {
  if (message.author.bot) return;
  const sendTo = (data: {
    components?: APIMessageTopLevelComponent[];
    content?: string;
    flags?: number;
  }): Promise<unknown> =>
    message.channel && "send" in message.channel ? message.channel.send(data) : Promise.resolve();

  if (!message.guildId) {
    // DM support — use the default prefix.
    const parsed = parsePrefixCommand(message.content, runtime.config.defaultPrefix);
    if (!parsed) return;
    const command = runtime.registry.get(parsed.name);
    if (!command) {
      return;
    }
    if (command.meta.slashOnly) {
      await sendTo(slashOnlyNotice(parsed.name));
      return;
    }
    if ("sendTyping" in message.channel) {
      void message.channel.sendTyping().catch(() => {});
    }
    const opts = parsePrefixArgs(parsed.args, command.meta.options);
    const ctx = makeContext(
      {
        opts,
        args: parsed.args,
        prefix: runtime.config.defaultPrefix,
        isSlash: false,
        guildId: null,
        guildName: null,
        channelId: message.channelId,
        author: { id: message.author.id, username: message.author.username },
        authorAvatarUrl: message.author.displayAvatarURL(),
        memberDisplayName: message.author.username,
        replyTarget: new MessageReplyTarget(message as Message<true>),
        message: message as Message<true>,
      },
      runtime.services(),
    );
    await runtime.execute(command, ctx);
    return;
  }

  const prefix = await runtime.db.getPrefix(message.guildId, runtime.config.defaultPrefix);
  const parsed = parsePrefixCommand(message.content, prefix);
  if (!parsed) {
    runtime.logger.debug(
      "message",
      `No prefix match: guild=${message.guildId} prefix=${prefix} content=${JSON.stringify(
        message.content.slice(0, 40),
      )}`,
    );
    return;
  }

  const command = runtime.registry.get(parsed.name);
  if (!command) {
    return;
  }
  if (command.meta.slashOnly) {
    await sendTo(slashOnlyNotice(parsed.name));
    return;
  }
  if ("sendTyping" in message.channel) {
    void message.channel.sendTyping().catch(() => {});
  }

  const opts = parsePrefixArgs(parsed.args, command.meta.options);
  const member = message.member;
  const guild = message.guild;
  const ctx = makeContext(
    {
      opts,
      args: parsed.args,
      prefix,
      isSlash: false,
      guildId: message.guildId,
      guildName: guild?.name ?? null,
      channelId: message.channelId,
      author: { id: message.author.id, username: message.author.username },
      authorAvatarUrl: member?.displayAvatarURL() ?? message.author.displayAvatarURL(),
      memberDisplayName: member?.displayName ?? message.author.username,
      replyTarget: new MessageReplyTarget(message as Message<true>),
      message: message as Message<true>,
    },
    runtime.services(),
  );
  await runtime.execute(command, ctx);
}

function parsePrefixCommand(
  content: string,
  prefix: string,
): { name: string; args: string[] } | null {
  if (!content.startsWith(prefix) || content === prefix) return null;
  const rest = content.slice(prefix.length).trim();
  if (!rest) return null;
  const [name, ...args] = rest.split(/\s+/);
  if (!name) return null;
  return { name: name.toLowerCase(), args };
}

function slashOnlyNotice(name: string) {
  return toMessageData({
    display: [
      <Embed color={NEUTRAL_COLOR} title="Use the slash command">
        {`\`${name}\``} can only be used as a slash command: {`</${name}>`}
        {"\n"}This keeps your data out of the chat history.
      </Embed>,
    ],
  });
}
