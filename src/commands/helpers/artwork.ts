import type { Listen, ListenBrainzClient } from "listenbrainz-api";
import { coverArt } from "./common.tsx";
import { coverFromTrackMetadata, ytThumbnailFromListen } from "./listen.tsx";

const MAX_IMAGE_REDIRECT_HOPS = 4;
const IMAGE_RESOLVE_TIMEOUT_MS = 3000;
const MAX_CACHE_ENTRIES = 500;
const CAA_BASE = "https://coverartarchive.org";
const coverImageCache = new Map<string, string>();
const coverArtCache = new Map<string, string>();

function cacheSet(cache: Map<string, string>, key: string, value: string): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

export async function resolveCoverImage(
  url: string | undefined,
  maxHops = MAX_IMAGE_REDIRECT_HOPS,
): Promise<string | undefined> {
  if (!url?.startsWith(CAA_BASE)) return url;
  const cached = coverImageCache.get(url);
  if (cached) return cached;
  let current = url;
  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetch(current, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(IMAGE_RESOLVE_TIMEOUT_MS),
    }).catch(() => null);
    if (!res) return url;
    if (res.status < 300 || res.status >= 400) {
      if (res.status >= 200 && res.status < 300) cacheSet(coverImageCache, url, current);
      return current;
    }
    const location = res.headers.get("location");
    if (!location) return url;
    current = new URL(location, current).toString();
  }
  return current;
}

export async function resolveCoverArt(
  lb: Pick<ListenBrainzClient, "lookupTrackMetadata">,
  listen: Listen,
  size = 250,
): Promise<string | undefined> {
  const md = listen.track_metadata;
  const artist = md?.artist_name || md?.additional_info?.release_artist_name;
  const track = md?.track_name;
  if (typeof artist !== "string" || typeof track !== "string") {
    return resolveCoverArtUncached(lb, listen, size);
  }
  const key = `${artist.toLowerCase().trim()}::${track.toLowerCase().trim()}`;
  const cached = coverArtCache.get(key);
  if (cached) return cached;
  const result = await resolveCoverArtUncached(lb, listen, size);
  if (result) cacheSet(coverArtCache, key, result);
  return result;
}

async function resolveCoverArtUncached(
  lb: Pick<ListenBrainzClient, "lookupTrackMetadata">,
  listen: Listen,
  size: number,
): Promise<string | undefined> {
  const direct = coverFromTrackMetadata(listen.track_metadata, size);
  if (direct) return resolveCoverImage(direct);
  const md = listen.track_metadata;
  const artist = md?.artist_name || md?.additional_info?.release_artist_name;
  const track = md?.track_name;
  if (typeof artist === "string" && typeof track === "string") {
    try {
      const mapped = await lb.lookupTrackMetadata({ artistName: artist, recordingName: track });
      const url = coverArt(mapped.caa_release_mbid ?? mapped.release_mbid, size);
      if (url) return resolveCoverImage(url);
    } catch {
      // Metadata lookup is best-effort; retain the listen's own artwork.
    }
  }
  return ytThumbnailFromListen(listen);
}
