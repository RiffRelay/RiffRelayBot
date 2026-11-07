import { coverArtUrl, ListenBrainzClient, MusicBrainzClient } from "listenbrainz-api";
import * as helpers from "../commands/helpers.tsx";
import type { CommandContext } from "../commands/types.ts";
import type { BrainzDatabase } from "../db/database.ts";

export class BrainzService {
  readonly anonymous: ListenBrainzClient;
  readonly mb: MusicBrainzClient;

  constructor(readonly baseUrl: string) {
    this.anonymous = new ListenBrainzClient({ baseUrl, userAgent: this.userAgent });
    this.mb = new MusicBrainzClient({ userAgent: this.userAgent });
  }

  private readonly userAgent = "RiffRelay/1.0 (https://github.com/ListenBrainzBot/ListenBrainzBot)";

  /** A client authenticated with the given token. */
  authed(token: string): ListenBrainzClient {
    return new ListenBrainzClient({ baseUrl: this.baseUrl, token, userAgent: this.userAgent });
  }

  /**
   * Resolve the linked ListenBrainz account for a Discord user (or a
   * mentioned user). Returns `null` if nobody is linked.
   */
  async resolveUser(
    db: BrainzDatabase,
    discordId: string,
  ): Promise<{ username: string; token: string } | null> {
    const user = await db.getUser(discordId);
    if (!user) return null;
    return { username: user.lbUser, token: user.token };
  }

  /**
   * Resolve a user for a command. Supports the `--user`/`user` option or the
   * author of the message. Returns `null` when the target isn't linked (the
   * helper already replied with an error embed).
   */
  async requireUser(
    ctx: CommandContext,
  ): Promise<{ username: string; token?: string; discordId: string } | null> {
    const target = ctx.get("user") ?? ctx.get("userMention");
    if (target && /^\d{15,20}$/.test(target) && target !== ctx.author.id) {
      const linked = await ctx.db.getUser(target);
      if (!linked) {
        await ctx.reply({
          display: [
            helpers.unlinkedEmbed(`<@${target}> hasn't connected their ListenBrainz account yet.`),
          ],
        });
        return null;
      }
      return { username: linked.lbUser, discordId: target };
    }

    const me = await ctx.db.getUser(ctx.author.id);
    if (!me) {
      await ctx.reply({ display: [helpers.unlinkedEmbed()] });
      return null;
    }
    return { username: me.lbUser, token: me.token, discordId: ctx.author.id };
  }
}

/** Cover Art Archive URL from a release MBID, if available. */
export function coverUrl(
  releaseMbid?: string | null,
  caaReleaseMbid?: string | null,
): string | undefined {
  const mbid = caaReleaseMbid ?? releaseMbid;
  return coverArtUrl(mbid, 250);
}
