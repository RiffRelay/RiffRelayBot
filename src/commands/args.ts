import type { CommandOption } from "./types.ts";

function resolveUserToken(raw: string): string {
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention?.[1]) return mention[1];
  if (/^\d{15,20}$/.test(raw)) return raw;
  if (raw.startsWith("@")) return raw.slice(1);
  return raw;
}

export function parsePrefixArgs(
  args: string[],
  options: CommandOption[] = [],
): Map<string, string> {
  const out = new Map<string, string>();

  const restIndex = options.findIndex((o) => o.rest);
  const positional = options.filter(
    (o, index) => o.type !== "boolean" && (restIndex === -1 || index < restIndex),
  );
  let cursor = 0;

  for (const opt of positional) {
    while (cursor < args.length && args[cursor]!.startsWith("--")) cursor += 1;
    if (cursor >= args.length) break;
    const value = args[cursor]!;
    if (opt.type === "user") out.set(opt.name, resolveUserToken(value));
    else out.set(opt.name, value);
    cursor += 1;
  }

  let end = args.length;
  const trailingUser =
    restIndex >= 0 ? options.slice(restIndex + 1).find((o) => o.type === "user") : undefined;
  const trailingToken = args[end - 1];
  if (
    trailingUser &&
    trailingToken &&
    args[end - 2] !== `--${trailingUser.name}` &&
    (/^<@!?\d+>$/.test(trailingToken) || /^\d{15,20}$/.test(trailingToken))
  ) {
    out.set(trailingUser.name, resolveUserToken(trailingToken));
    end -= 1;
  }

  const restTokens: string[] = [];
  for (let i = cursor; i < end; i += 1) {
    const token = args[i]!;
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      const name = token.slice(2, eq === -1 ? undefined : eq);
      const option = options.find((item) => item.name === name);
      let value = eq === -1 ? "true" : token.slice(eq + 1);
      if (
        eq === -1 &&
        option &&
        option.type !== "boolean" &&
        i + 1 < end &&
        !args[i + 1]!.startsWith("--")
      ) {
        value = args[++i]!;
      }
      out.set(name, option?.type === "user" ? resolveUserToken(value) : value);
    } else {
      restTokens.push(token);
    }
  }

  const restOpt = options.find((o) => o.rest);
  if (restOpt && restTokens.length > 0) out.set(restOpt.name, restTokens.join(" "));

  return out;
}

export function parseNum(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value.replace(/[,_]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function parseRange(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  const map: Record<string, string> = {
    today: "today",
    today_7d: "today",
    yesterday: "yesterday",
    this_week: "this_week",
    thisweek: "this_week",
    this_month: "this_month",
    thismonth: "this_month",
    this_year: "this_year",
    thisyear: "this_year",
    week: "week",
    weekly: "week",
    "7d": "week",
    "7day": "week",
    "7days": "week",
    month: "month",
    monthly: "month",
    "30d": "month",
    "30day": "month",
    year: "year",
    yearly: "year",
    "365d": "year",
    "365day": "year",
    all: "all_time",
    overall: "all_time",
    all_time: "all_time",
    alltime: "all_time",
    lifetime: "all_time",
  };
  return map[v];
}

/** Human label for a range value. */
export function rangeLabel(range: string | undefined): string {
  const map: Record<string, string> = {
    today: "today",
    yesterday: "yesterday",
    this_week: "this week",
    this_month: "this month",
    this_year: "this year",
    week: "past week",
    month: "past month",
    year: "past year",
    all_time: "all time",
  };
  return map[range ?? ""] ?? range ?? "";
}
