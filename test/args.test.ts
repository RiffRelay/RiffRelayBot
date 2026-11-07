import { describe, expect, test } from "bun:test";
import { parsePrefixArgs } from "../src/commands/args.ts";
import type { CommandOption } from "../src/commands/types.ts";

const albumOptions: CommandOption[] = [
  { name: "name", description: "Album title", type: "string", rest: true },
  { name: "user", description: "Discord user", type: "user" },
];

describe("prefix arguments with a trailing rest option", () => {
  test("keeps a single-word title in the rest option", () => {
    expect(parsePrefixArgs(["Discovery"], albumOptions)).toEqual(new Map([["name", "Discovery"]]));
  });

  test("splits a trailing Discord mention from the title", () => {
    expect(parsePrefixArgs(["In", "Rainbows", "<@12345678901234567>"], albumOptions)).toEqual(
      new Map([
        ["user", "12345678901234567"],
        ["name", "In Rainbows"],
      ]),
    );
  });

  test("accepts a user flag without consuming title words", () => {
    expect(
      parsePrefixArgs(["In", "Rainbows", "--user", "<@12345678901234567>"], albumOptions),
    ).toEqual(
      new Map([
        ["user", "12345678901234567"],
        ["name", "In Rainbows"],
      ]),
    );
  });
});
