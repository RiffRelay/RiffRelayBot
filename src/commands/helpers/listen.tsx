import type { Listen, TrackMetadata } from "listenbrainz-api";
import { coverArtUrl } from "listenbrainz-api";

export interface FlattenedListen {
  artist: string;
  track: string;
  album?: string;
  listenedAt?: number;
  playingNow: boolean;
  durationMs?: number;
  recordingMbid?: string;
  releaseMbid?: string;
  caaReleaseMbid?: string;
  artistMbids?: string[];
  originUrl?: string;
}

export function flattenListen(listen: Listen): FlattenedListen {
  const md = listen.track_metadata ?? {
    artist_name: listen.track_name ?? "unknown",
    track_name: listen.track_name ?? "unknown",
  };
  const info = md.additional_info;
  return {
    artist: md.artist_name ?? "unknown",
    track: md.track_name ?? listen.track_name ?? "unknown",
    album: md.release_name,
    listenedAt: listen.listened_at,
    playingNow: listen.playing_now ?? false,
    durationMs: info?.duration_ms ? Number(info.duration_ms) : undefined,
    recordingMbid: typeof info?.recording_mbid === "string" ? info.recording_mbid : undefined,
    releaseMbid: typeof info?.release_mbid === "string" ? info.release_mbid : undefined,
    caaReleaseMbid: typeof info?.caa_release_mbid === "string" ? info.caa_release_mbid : undefined,
    artistMbids: Array.isArray(info?.artist_mbids) ? (info.artist_mbids as string[]) : undefined,
    originUrl: typeof info?.origin_url === "string" ? info.origin_url : undefined,
  };
}

export function coverFromListen(listen: Listen, size = 250): string | undefined {
  return coverFromTrackMetadata(listen.track_metadata, size) ?? ytThumbnailFromListen(listen);
}

export function coverFromTrackMetadata(md?: TrackMetadata, size = 250): string | undefined {
  const info = md?.additional_info;
  const mbid =
    typeof info?.caa_release_mbid === "string"
      ? info.caa_release_mbid
      : typeof info?.release_mbid === "string"
        ? info.release_mbid
        : undefined;
  return coverArtUrl(mbid, size);
}

export function ytThumbnailFromListen(listen: Listen): string | undefined {
  const url = listen.track_metadata?.additional_info?.origin_url;
  if (typeof url !== "string") return undefined;
  const videoId = url.match(/[?&]v=([\w-]{11})/)?.[1];
  return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : undefined;
}

export function ytTrackUrl(flat: Pick<FlattenedListen, "artist" | "track" | "originUrl">): string {
  return flat.originUrl ?? ytSearchUrl(`${flat.artist} ${flat.track}`);
}

export function ytSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
