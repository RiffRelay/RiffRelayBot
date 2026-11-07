import type { ListenBrainzClient } from "listenbrainz-api";
import { coverArtUrl } from "listenbrainz-api";
import { resolveCoverImage } from "../helpers.tsx";
import type { EntityItem, EntityKind } from "./entities.ts";

export async function topThumbnail(
  lb: ListenBrainzClient,
  entity: EntityKind,
  top: EntityItem,
  size = 250,
): Promise<string | undefined> {
  const caa = typeof top.caa_release_mbid === "string" ? top.caa_release_mbid : undefined;
  const direct = coverArtUrl(caa, size);
  if (direct) return resolveCoverImage(direct);
  if (entity === "artist") {
    const mbid = typeof top.artist_mbid === "string" ? top.artist_mbid : undefined;
    const artist = mbid ? await lb.getArtistMetadata(mbid).catch(() => null) : null;
    const url = coverArtUrl(artist?.caa_release_mbid, size);
    return url ? resolveCoverImage(url) : undefined;
  }
  const artist = typeof top.artist_name === "string" ? top.artist_name : "";
  const track = typeof top.track_name === "string" ? top.track_name : "";
  if (!artist || !track) return undefined;
  const metadata = await lb.lookupTrackMetadata({ artistName: artist, recordingName: track }).catch(() => null);
  const url = coverArtUrl(metadata?.caa_release_mbid ?? metadata?.release_mbid, size);
  return url ? resolveCoverImage(url) : undefined;
}
