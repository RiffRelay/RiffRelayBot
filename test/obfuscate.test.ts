import { describe, expect, test } from "bun:test";

import { obfuscateStrings } from "../scripts/obfuscate.ts";

describe("obfuscateStrings", () => {
  test("encodes string values losslessly", () => {
    const out = obfuscateStrings('const a = "hello world";');
    // biome-ignore lint/security/noGlobalEval: round-trip check on a controlled fixture
    expect(eval(`(${out.split("const a = ")[1]!.replace(";", "")})`)).toBe("hello world");
    expect(out).not.toContain("hello world");
  });

  test("encodes strings with quotes, escapes and unicode", () => {
    const src = String.raw`const a = "say \"hi\"\nbye \uD83D\uDE00";`;
    const out = obfuscateStrings(src);
    const literal = out.split("const a = ")[1]!.replace(";", "");
    // biome-ignore lint/security/noGlobalEval: round-trip check on a controlled fixture
    expect(eval(`(${literal})`)).toBe('say "hi"\nbye 😀');
  });

  test("keeps import specifiers intact", () => {
    const src = 'import { mkdirSync } from "node:fs";\nconst b = "secret";';
    const out = obfuscateStrings(src);
    expect(out).toContain('"node:fs"');
    expect(out).not.toContain('"secret"');
  });

  test("keeps side-effect imports, dynamic imports and require intact", () => {
    const src =
      'import "node:module";\nconst a = await import("node:fs");\nconst b = require("node:path");\nconst c = require.resolve("node:crypto");';
    const out = obfuscateStrings(src);
    expect(out).toContain('import "node:module"');
    expect(out).toContain('import("node:fs")');
    expect(out).toContain('require("node:path")');
    expect(out).toContain('require.resolve("node:crypto")');
  });

  test("keeps the use strict directive literal", () => {
    const src = '"use strict";\nconst a = "x";';
    const out = obfuscateStrings(src);
    expect(out).toContain('"use strict"');
    expect(out).not.toContain('"x"');
  });

  test("leaves comments, regexes and template literals untouched", () => {
    const src =
      '// comment "noise"\nconst r = /["x"]/gi;\nconst t = `tpl \${"inner"} \${/}/.source}`;\nconst s = "encodable";';
    const out = obfuscateStrings(src);
    expect(out).toContain('// comment "noise"');
    expect(out).toContain('/["x"]/gi');
    expect(out).toContain('`tpl \${"inner"} \${/}/.source}`');
    expect(out).not.toContain('"encodable"');
  });

  test("survives round-trip through the transpiler", () => {
    const out = obfuscateStrings('const msg = "you are welcome";\nexport default msg;');
    expect(() => new Bun.Transpiler().transformSync(out, { loader: "js" })).not.toThrow();
  });
});
