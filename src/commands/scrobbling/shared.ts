import type { Listen } from "listenbrainz-api";
import { type FlattenedListen, flattenListen } from "../helpers.tsx";
import type { CommandContext } from "../types.ts";

export interface ResolvedUser {
  username: string;
  token?: string;
  discordId: string;
}

export interface CurrentRecording {
  listen: Listen;
  flat: FlattenedListen;
}

export async function currentRecording(
  ctx: CommandContext,
  resolved: ResolvedUser,
): Promise<CurrentRecording | null> {
  const lb = resolved.token ? ctx.lb.authed(resolved.token) : ctx.lb.anonymous;
  const now = await lb.getPlayingNow(resolved.username);
  const listen = now.payload.listens[0];
  if (!listen) return null;
  return { listen, flat: flattenListen(listen) };
}
