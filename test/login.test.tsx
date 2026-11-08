import { describe, expect, mock, test } from "bun:test";
import type { ButtonInteraction } from "discord.js";
import type { BotRuntime } from "../src/bot.tsx";
import { loginCommand, loginMessage } from "../src/commands/account/login.tsx";
import { meCommand } from "../src/commands/account/me.tsx";
import { unlinkedEmbed } from "../src/commands/helpers/common.tsx";
import type { CommandContext, DisplayContent } from "../src/commands/types.ts";
import { toMessageData } from "../src/display/render.ts";
import { handleButton } from "../src/handlers/button.tsx";

describe("login privacy", () => {
  test("uses a private token form and does not advertise tokens in chat", () => {
    expect(loginCommand.meta.slashOnly).toBeUndefined();

    const ready = JSON.stringify(toMessageData(loginMessage("user-1", "ready")));
    const unlinked = JSON.stringify(toMessageData({ display: [unlinkedEmbed()] }));

    expect(ready).toContain("private form");
    expect(ready).not.toContain("login <your-listenbrainz-token>");
    expect(unlinked).toContain("/login");
    expect(unlinked).not.toContain("login <your-listenbrainz-token>");
  });

  test("provides an account-link button on an unlinked prefix-command embed", async () => {
    const replies: DisplayContent[] = [];
    await meCommand.run({
      author: { id: "user-1", username: "listener" },
      db: { getUser: async () => null },
      reply: async (content: DisplayContent) => {
        replies.push(content);
      },
    } as unknown as CommandContext);

    expect(JSON.stringify(toMessageData(replies[0]!))).toContain("login_button_user-1");
  });

  test("opens the private login flow from the prefix command without an argument", async () => {
    const replies: DisplayContent[] = [];
    await loginCommand.run({
      args: [],
      author: { id: "user-1", username: "listener" },
      reply: async (content: DisplayContent) => {
        replies.push(content);
      },
    } as unknown as CommandContext);

    expect(JSON.stringify(toMessageData(replies[0]!))).toContain("login_button_user-1");
  });

  test("does not use or echo a token supplied as a prefix argument", async () => {
    const replies: DisplayContent[] = [];
    await loginCommand.run({
      args: ["secret-token"],
      author: { id: "user-1", username: "listener" },
      reply: async (content: DisplayContent) => {
        replies.push(content);
      },
    } as unknown as CommandContext);

    const rendered = JSON.stringify(toMessageData(replies[0]!));
    expect(rendered).toContain("Do not enter your token in chat");
    expect(rendered).not.toContain("secret-token");
  });

  test("marks a login embed failed when its modal is not submitted", async () => {
    const edit = mock(async () => undefined);
    const interaction = {
      customId: "login_button_user-1",
      user: { id: "user-1" },
      message: { id: "message-1", edit },
      showModal: mock(async () => undefined),
      awaitModalSubmit: mock(async () => {
        throw new Error("timed out");
      }),
    } as unknown as ButtonInteraction;
    const runtime = {
      logger: { info: mock(() => undefined) },
    } as unknown as BotRuntime;

    await handleButton(interaction, runtime);

    expect(edit).toHaveBeenNthCalledWith(1, toMessageData(loginMessage("user-1", "pending")));
    expect(edit).toHaveBeenNthCalledWith(2, toMessageData(loginMessage("user-1", "failed")));
  });
});
