import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import { obfuscateStrings } from "./obfuscate.ts";

const dev = process.env.BOT_BUILD_DEV === "1";

const outfile = dev ? "./dist/bot.dev.js" : "./dist/bot.js";

const kib = (n: number) => (n / 1024).toFixed(1);

console.log(`[compiler] starting build (${dev ? "dev" : "production"})...`);
console.log(`[compiler] entry: ./src/index.ts`);
console.log(`[compiler] output: ${outfile}`);

mkdirSync("dist", { recursive: true });
rmSync(outfile, { force: true });

console.log("[compiler] bundling...");

const bundleStart = performance.now();
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  naming: dev ? "bot.dev.js" : "bot.js",
  target: "bun",
  format: "esm",
  minify: true,
  sourcemap: dev ? "inline" : "none",
  define: { "process.env.NODE_ENV": '"production"' },
  packages: "bundle",
});
const bundleMs = Math.round(performance.now() - bundleStart);

if (!result.success) {
  console.error(`[compiler] bundle failed (${bundleMs}ms):`);
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const bundleSize = readFileSync(outfile, "utf8").length;
console.log(`[compiler] bundle OK (${bundleMs}ms) — ${kib(bundleSize)} KiB`);

if (result.logs.length > 0) {
  console.log(`[compiler] bundle warnings (${result.logs.length}):`);
  for (const log of result.logs) console.log(" ", log);
}

let code = readFileSync(outfile, "utf8");
console.log(`[compiler] read ${kib(Buffer.byteLength(code))} KiB from disk`);

if (!dev) {
  console.log("[compiler] obfuscating strings...");
  const obfStart = performance.now();
  const obfuscated = obfuscateStrings(code);
  try {
    new Bun.Transpiler().transformSync(obfuscated, { loader: "js" });
    const obfMs = Math.round(performance.now() - obfStart);
    const obfSize = Buffer.byteLength(obfuscated);
    console.log(`[compiler] obfuscation OK (${obfMs}ms) — ${kib(obfSize)} KiB (was ${kib(Buffer.byteLength(code))} KiB)`);
    code = obfuscated;
  } catch (err) {
    const obfMs = Math.round(performance.now() - obfStart);
    console.warn(`[compiler] obfuscation failed validation after ${obfMs}ms, shipping minified-only:`, err);
  }
} else {
  console.log("[compiler] skipping obfuscation (dev build)");
}

if (!code.startsWith("#!")) {
  code = `#!/usr/bin/env bun\n${code}`;
  console.log("[compiler] injected shebang");
}

writeFileSync(outfile, code);
chmodSync(outfile, 0o755);

const finalSize = Buffer.byteLength(code);
const gzip = gzipSync(code).length;
const mode = dev ? "dev (minified, sourcemap inline)" : "production (minified + obfuscated)";

console.log(`[compiler] done — ${outfile}`);
console.log(`[compiler]   size: ${kib(finalSize)} KiB (${kib(gzip)} KiB gzip)`);
console.log(`[compiler]   mode: ${mode}`);
