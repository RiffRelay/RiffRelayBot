import type {
  APIMessageTopLevelComponent,
  ChatInputCommandInteraction,
  Client,
  Message,
} from "discord.js";
import type { CommandRegistry } from "./commands/registry.ts";
import type { CommandContext, DisplayContent } from "./commands/types.ts";
import type { BrainzDatabase } from "./db/database.ts";
import { toMessageData } from "./display/render.ts";
import type { BrainzService } from "./lb/service.ts";
import type { Logger } from "./logger.ts";

export interface ReplyTarget {
  reply(content: DisplayContent): Promise<void>;
  defer(): Promise<void>;
}

type ReplyData = {
  components?: APIMessageTopLevelComponent[];
  content?: string;
  flags?: number;
};

function buildReplyData(content: DisplayContent): ReplyData {
  return toMessageData(content);
}

export class SlashReplyTarget implements ReplyTarget {
  private deferred = false;

  constructor(private readonly interaction: ChatInputCommandInteraction) {}

  async reply(content: DisplayContent): Promise<void> {
    const data = buildReplyData(content);
    if (this.deferred) await this.interaction.editReply(data);
    else await this.interaction.reply(data);
  }

  async defer(): Promise<void> {
    if (this.deferred) return;
    await this.interaction.deferReply();
    this.deferred = true;
  }
}

export class MessageReplyTarget implements ReplyTarget {
  constructor(private readonly message: Message<true>) {}

  async reply(content: DisplayContent): Promise<void> {
    const data = buildReplyData(content);
    const channel = this.message.channel;
    if (channel && "send" in channel) await channel.send(data);
  }

  async defer(): Promise<void> {
    // Regular messages can't be deferred — nothing to do.
  }
}

export interface ContextInput {
  opts: Map<string, string>;
  args: string[];
  prefix: string;
  isSlash: boolean;
  guildId: string | null;
  guildName: string | null;
  channelId: string;
  author: { id: string; username: string };
  authorAvatarUrl: string;
  memberDisplayName: string;
  replyTarget: ReplyTarget;
  message?: Message<true>;
}

export interface ContextServices {
  client: Client<true>;
  db: BrainzDatabase;
  logger: Logger;
  registry: CommandRegistry;
  lb: BrainzService;
}

export function makeContext(input: ContextInput, services: ContextServices): CommandContext {
  const opts = input.opts;
  return {
    args: input.args,
    opts,
    prefix: input.prefix,
    isSlash: input.isSlash,
    guildId: input.guildId,
    guildName: input.guildName,
    channelId: input.channelId,
    author: input.author,
    authorAvatarUrl: input.authorAvatarUrl,
    memberDisplayName: input.memberDisplayName,
    client: services.client,
    message: input.message,
    db: services.db,
    logger: services.logger,
    registry: services.registry,
    lb: services.lb,
    get: (name) => opts.get(name),
    num: (name) => {
      const raw = opts.get(name);
      if (raw === undefined) return undefined;
      const n = Number(raw.replace(/[,_]/g, ""));
      return Number.isFinite(n) ? n : undefined;
    },
    int: (name) => {
      const raw = opts.get(name);
      if (raw === undefined) return undefined;
      const n = Number(raw.replace(/[,_]/g, ""));
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    },
    userMention: (name) => opts.get(name),
    reply: (content) => input.replyTarget.reply(content),
    defer: () => input.replyTarget.defer(),
  };
}
