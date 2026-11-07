/** Discord snowflake timestamp syntax, e.g. `<t:1700000000:R>`. */
export function discordTimestamp(
  ts: number,
  style: "t" | "T" | "d" | "D" | "f" | "F" | "R" = "R",
): string {
  return `<t:${Math.floor(ts)}:${style}>`;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_~|<>])/g, "\\$1");
}
