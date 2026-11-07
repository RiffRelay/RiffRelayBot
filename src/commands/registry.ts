import { ListenBrainzError } from "listenbrainz-api";
import { errorEmbed } from "./helpers.tsx";
import type { Command, CommandContext } from "./types.ts";

/** Register a single command. */
export const defineCommand = (command: Command): Command => command;

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();
  private readonly aliases = new Map<string, string>();

  register(command: Command): void {
    if (this.commands.has(command.meta.name)) {
      throw new Error(`Duplicate command: ${command.meta.name}`);
    }
    this.commands.set(command.meta.name, command);
    for (const alias of command.meta.aliases ?? []) {
      this.aliases.set(alias, command.meta.name);
    }
  }

  registerAll(commands: Command[]): void {
    for (const cmd of commands) this.register(cmd);
  }

  get(name: string): Command | undefined {
    const canonical = this.aliases.get(name) ?? name;
    return this.commands.get(canonical);
  }

  list(): Command[] {
    return [...this.commands.values()];
  }

  listByCategory(): Map<string, Command[]> {
    const byCategory = new Map<string, Command[]>();
    for (const cmd of this.commands.values()) {
      if (cmd.meta.hidden) continue;
      const list = byCategory.get(cmd.meta.category) ?? [];
      list.push(cmd);
      byCategory.set(cmd.meta.category, list);
    }
    return byCategory;
  }

  /** Simple Levenshtein distance for "did you mean" suggestions. */
  closest(name: string, max = 3, maxDistance = 2): string[] {
    const candidates: Array<{ name: string; distance: number }> = [];
    for (const [cmdName, cmd] of this.commands) {
      if (cmd.meta.hidden) continue;
      const names = [cmdName, ...(cmd.meta.aliases ?? [])];
      for (const n of names) {
        const distance = levenshtein(name.toLowerCase(), n.toLowerCase());
        if (distance <= maxDistance) {
          candidates.push({ name: cmdName, distance });
        }
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of candidates) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      out.push(c.name);
      if (out.length >= max) break;
    }
    return out;
  }
}

async function runCommand(
  command: Command,
  ctx: CommandContext,
  handleError: (err: unknown) => void,
): Promise<void> {
  try {
    if (command.meta.slow && ctx.isSlash) {
      await ctx.defer();
    }
    await command.run(ctx);
  } catch (err) {
    handleError(err);
  }
}

/**
 * Executor shared by the prefix message handler and the slash interaction
 * handler. Binds `handleError` so both paths render API errors as embeds.
 */
export function createExecutor(_registry: CommandRegistry) {
  return (command: Command, ctx: CommandContext): Promise<void> => {
    return runCommand(command, ctx, (err) => {
      const message = describeError(err);
      ctx.logger.error("command", `"${command.meta.name}" failed: ${message}`);
      if (err instanceof Error) {
        ctx.logger.debug(
          "command",
          `Stack for "${command.meta.name}":\n${err.stack ?? err.message}`,
        );
      }
      ctx.reply({ display: [errorEmbed(`Something went wrong: ${message}`)] }).catch(() => {});
    });
  };
}

/** Human-readable error summary: request → status → API message. */
function describeError(err: unknown): string {
  if (err instanceof ListenBrainzError) {
    const where = err.path ? `${err.method ?? "GET"} ${err.path}` : "ListenBrainz API";
    const code = err.status > 0 ? `HTTP ${err.status}` : err.message;
    return `${where} → ${code}${err.message ? `: ${err.message}` : ""}`;
  }
  return err instanceof Error ? err.message : String(err);
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}
