import type { StatsEntity } from "listenbrainz-api";
import { ytSearchUrl } from "../helpers.tsx";

export const ENTITY_CHOICES = [
  { name: "artists", value: "artist" },
  { name: "albums", value: "album" },
  { name: "tracks", value: "track" },
  { name: "recordings", value: "recording" },
];
export type EntityKind = "artist" | "album" | "track" | "recording";
export type EntityItem = { listen_count: number; total_listen_count?: number } & Record<string, unknown>;
export const ENTITY_KEY: Record<string, StatsEntity> = {
  artist: "artists", album: "albums", release: "releases", track: "tracks",
  recording: "recordings",
};
export const TOTAL_KEY: Record<StatsEntity, string> = {
  artists: "total_artist_count", albums: "total_album_count", releases: "total_release_count",
  tracks: "total_track_count", recordings: "total_recording_count", tags: "total_tag_count",
};

export function rank(i: number): string {
  return `${String(i).padStart(2, " ")}.`;
}
export function entityName(item: EntityItem, entity: EntityKind): string {
  const key = entity === "artist" ? "artist_name" : entity === "album" ? "release_name" : "track_name";
  return String(item[key] ?? "?");
}
export interface TopRow {
  primary: string;
  secondary?: string;
  listens: number;
}
export function toTopRow(item: EntityItem, entity: EntityKind): TopRow {
  const name = entityName(item, entity);
  if (entity === "artist") return { primary: `[${name}](<${ytSearchUrl(name)}>)`, listens: item.listen_count };
  const artist = String(item.artist_name ?? "");
  const query = artist ? `${artist} ${name}` : name;
  return {
    primary: `[${name}](<${ytSearchUrl(query)}>)`,
    secondary: artist ? `[${artist}](<${ytSearchUrl(artist)}>)` : undefined,
    listens: item.listen_count,
  };
}
