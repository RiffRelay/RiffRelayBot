import { describe, expect, test } from "bun:test";
import { decryptToken, encryptToken } from "../src/db/crypto.ts";
import {
  Bold,
  Embed,
  Field,
  LineBreak,
  LinkButton,
  Progress,
  Row,
} from "../src/display/components.tsx";
import { discordTimestamp } from "../src/display/format.ts";
import { toContainer, toMessageData } from "../src/display/render.ts";

const MASTER_KEY = new Uint8Array(32).fill(7);

describe("token encryption", () => {
  test("round-trips a token", async () => {
    const token = "qwertyuiop-asdfghjkl-1234567890";
    const encrypted = await encryptToken(MASTER_KEY, "123456789012345678", token);
    expect(encrypted.startsWith("v1:")).toBe(true);
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(4);
    const decrypted = await decryptToken(MASTER_KEY, "123456789012345678", encrypted);
    expect(decrypted).toBe(token);
  });

  test("produces different ciphertext for same token + context (fresh IV)", async () => {
    const a = await encryptToken(MASTER_KEY, "user-a", "same-token");
    const b = await encryptToken(MASTER_KEY, "user-a", "same-token");
    expect(a).not.toBe(b);
  });

  test("different contexts derive different keys", async () => {
    const a = await encryptToken(MASTER_KEY, "user-a", "tok");
    const b = await encryptToken(MASTER_KEY, "user-b", "tok");
    expect(a).not.toBe(b);
    expect(decryptToken(MASTER_KEY, "user-b", a)).rejects.toThrow();
  });

  test("rejects tampered payloads", async () => {
    const encrypted = await encryptToken(MASTER_KEY, "u1", "secret");
    const tampered = encrypted.slice(0, -2) + (encrypted.endsWith("AA") ? "BB" : "AA");
    expect(decryptToken(MASTER_KEY, "u1", tampered)).rejects.toThrow();
  });

  test("rejects malformed payloads", async () => {
    expect(decryptToken(MASTER_KEY, "u1", "garbage")).rejects.toThrow();
    expect(decryptToken(MASTER_KEY, "u1", "v2:aa:bb:cc")).rejects.toThrow();
  });
});

describe("display renderer", () => {
  test("toContainer produces a Container with section, fields and markdown", () => {
    const container = toContainer(
      <Embed color="#7C6BFF" title="Now Playing" thumbnail="https://img/art.png">
        <Row>
          <Field name="Track" inline>
            <Bold>Good News</Bold>
          </Field>
          <Field name="Artist" inline>
            Mac Miller
          </Field>
        </Row>
        <LineBreak />
        <Progress value={30} max={100} width={10} />
      </Embed>,
    );

    expect(container?.type).toBe(17);
    expect(container?.accent_color).toBe(0x7c6bff);

    const first = container?.components[0];
    expect(first?.type).toBe(9);
    if (first?.type === 9) {
      expect(first.components[0]?.content).toBe("**Now Playing**");
      expect(first.accessory?.type).toBe(11);
      if (first.accessory?.type === 11) {
        expect(first.accessory.media.url).toBe("https://img/art.png");
      }
    }

    const text = (container?.components ?? [])
      .filter((c) => c.type === 10)
      .map((c) => c.content)
      .join("\n");
    expect(text).toContain("**Good News**");
    expect(text).toContain("Mac Miller");
    expect(text).toContain("\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591");
  });

  test("title and aside text render beside the thumbnail, description anchors the button row", () => {
    const container = toContainer(
      <Embed
        color="#7C6BFF"
        title="user is listening to"
        thumbnail="https://img/art.png"
        aside={
          <>
            <Bold>Track</Bold>
            {"\n"}by <Bold>Artist</Bold>
          </>
        }
        sideButtons={[<LinkButton url="https://youtu.be/abc123" emoji="▶️" />]}
      >
        Duration: 4:56
      </Embed>,
    );
    expect(container?.type).toBe(17);
    const cover = container?.components[0];
    expect(cover?.type).toBe(9);
    if (cover?.type === 9) {
      expect(cover.components.map((c) => c.content)).toEqual([
        "**user is listening to**",
        "**Track**",
        "by **Artist**",
      ]);
      if (cover.accessory?.type === 11) {
        expect(cover.accessory.media.url).toBe("https://img/art.png");
      }
    }
    const buttonRow = container?.components[1];
    expect(buttonRow?.type).toBe(9);
    if (buttonRow?.type === 9) {
      expect(buttonRow.components.map((c) => c.content)).toEqual(["Duration: 4:56"]);
      expect(buttonRow.accessory?.type).toBe(2);
    }
    const body = (container?.components ?? [])
      .filter((c) => c.type === 10)
      .map((c) => c.content)
      .join("\n");
    expect(body).toBe("");
  });

  test("LineBreak-separated items render single-spaced", () => {
    const container = toContainer(
      <Embed>
        first
        <LineBreak />
        second
        <LineBreak />
        third
      </Embed>,
    );
    const text = (container?.components ?? [])
      .filter((c) => c.type === 10)
      .map((c) => c.content)
      .join("\n");
    expect(text).toBe("first\nsecond\nthird");
  });

  test("caps text component size within the 4000 budget", () => {
    const container = toContainer(
      <Embed>
        <Field name="Track">{"x".repeat(1100)}</Field>
      </Embed>,
    );
    const components = container?.components.filter((c) => c.type === 10) ?? [];
    expect(components.length).toBeGreaterThan(0);
    for (const c of components) expect(c.content.length).toBeLessThanOrEqual(1024);
    const total = components.reduce((sum, c) => sum + c.content.length, 0);
    expect(total).toBeLessThanOrEqual(4000);
  });

  test("sideButtons render as a section accessory right after the thumbnail section", () => {
    const container = toContainer(
      <Embed
        title="user is listening to"
        thumbnail="https://img/art.png"
        sideButtons={[<LinkButton url="https://youtu.be/abc123" emoji="▶️" />]}
      />,
    );
    expect(container?.type).toBe(17);
    const section = container?.components[0];
    expect(section?.type).toBe(9);
    const buttonSection = container?.components[1];
    expect(buttonSection?.type).toBe(9);
    if (buttonSection?.type === 9) {
      expect(buttonSection.components[0]?.content).toBe("\u200b");
      expect(buttonSection.accessory).toMatchObject({
        type: 2,
        style: 5,
        url: "https://youtu.be/abc123",
        emoji: { name: "▶️" },
      });
      expect(buttonSection.accessory).not.toHaveProperty("label");
    }
  });

  test("thumbnail row, then description anchored beside the side button", () => {
    const container = toContainer(
      <Embed
        title="user is listening to"
        thumbnail="https://img/art.png"
        sideButtons={[<LinkButton url="https://youtu.be/abc123" emoji="▶️" />]}
        description={"### Track\nby **Artist**"}
      />,
    );
    expect(container?.type).toBe(17);
    expect(container?.components[0]?.type).toBe(9);
    expect(container?.components[1]?.type).toBe(9);
    const buttonSection = container?.components[1];
    if (buttonSection?.type === 9) {
      expect(buttonSection.components.map((c) => c.content)).toEqual([
        "### Track",
        "by **Artist**",
      ]);
    }
  });

  test("toMessageData emits components + IsComponentsV2 flag", () => {
    const data = toMessageData({
      display: [<Embed title="Hi" />],
      buttons: [<LinkButton url="https://musicbrainz.org" label="Go" />],
    });
    expect(data.flags).toBe(32768);
    expect(data.components).toHaveLength(1);
    const container = data.components?.[0];
    expect(container?.type).toBe(17);
    if (container?.type === 17) {
      expect(container.components.some((c) => c.type === 1)).toBe(true);
    }
  });

  test("toMessageData folds content into the first container", () => {
    const data = toMessageData({ display: [<Embed title="Hi" />], content: "plain text" });
    expect(data.content).toBeUndefined();
    expect(data.flags).toBe(32768);
    const container = data.components?.[0];
    if (container?.type === 17) {
      expect(container.components[0]?.type).toBe(10);
    }
  });

  test("toMessageData sends plain content without the flag", () => {
    const data = toMessageData({ content: "hello" });
    expect(data.content).toBe("hello");
    expect(data.components).toBeUndefined();
    expect(data.flags).toBeUndefined();
  });

  test("discordTimestamp formats <t:sec:R>", () => {
    expect(discordTimestamp(1700000000, "R")).toBe("<t:1700000000:R>");
  });
});
