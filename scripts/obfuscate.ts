interface Token {
  type: "id" | "punct" | "num" | "str" | "regex" | "tpl";
  text: string;
}

const REGEX_AFTER_KEYWORD = new Set([
  "await",
  "case",
  "default",
  "delete",
  "do",
  "else",
  "extends",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

const REGEX_AFTER_PUNCT = new Set([
  "(",
  ",",
  "[",
  "{",
  "=",
  ":",
  "!",
  "?",
  ";",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&",
  "|",
  "^",
  "~",
  "<",
  ">",
]);

const DIRECTIVES = new Set(["use strict", "use asm"]);

function isIdentStart(c: string): boolean {
  return /[A-Za-z_$]/.test(c);
}

function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_$]/.test(c);
}

function escapeHex(s: string): string {
  let out = '"';
  for (let k = 0; k < s.length; k += 1) {
    const cu = s.charCodeAt(k);
    if (cu === 0x22) out += '\\"';
    else if (cu === 0x5c) out += "\\\\";
    else if (cu <= 0xff) out += `\\x${cu.toString(16).padStart(2, "0")}`;
    else out += `\\u${cu.toString(16).padStart(4, "0")}`;
  }
  return `${out}"`;
}

interface ScannedString {
  /** Index just past the closing quote. */
  end: number;
  /** The unescaped runtime value of the literal. */
  value: string;
}

function scanString(src: string, start: number): ScannedString {
  const quote = src[start]!;
  let j = start + 1;
  let value = "";
  while (j < src.length) {
    const c = src[j]!;
    if (c === quote) return { end: j + 1, value };
    if (c === "\\") {
      const e = src[j + 1];
      switch (e) {
        case "n":
          value += "\n";
          j += 2;
          break;
        case "t":
          value += "\t";
          j += 2;
          break;
        case "r":
          value += "\r";
          j += 2;
          break;
        case "b":
          value += "\b";
          j += 2;
          break;
        case "f":
          value += "\f";
          j += 2;
          break;
        case "v":
          value += "\v";
          j += 2;
          break;
        case "0":
          value += "\0";
          j += 2;
          break;
        case "x":
          value += String.fromCharCode(Number.parseInt(src.slice(j + 2, j + 4), 16) || 0);
          j += 4;
          break;
        case "u": {
          if (src[j + 2] === "{") {
            const close = src.indexOf("}", j + 3);
            const hex = src.slice(j + 3, close === -1 ? j + 3 : close);
            value += String.fromCodePoint(Number.parseInt(hex, 16) || 0);
            j = close === -1 ? src.length : close + 1;
          } else {
            value += String.fromCharCode(Number.parseInt(src.slice(j + 2, j + 6), 16) || 0);
            j += 6;
          }
          break;
        }
        case "\n":
          j += 2;
          break;
        case "\r":
          j += 2;
          break;
        default:
          value += e ?? "";
          j += 2;
          break;
      }
      continue;
    }
    value += c;
    j += 1;
  }
  return { end: src.length, value };
}

function scanTemplate(src: string, start: number): number {
  let j = start + 1;
  let brace = 0;
  while (j < src.length) {
    const c = src[j]!;
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (brace === 0) {
      if (c === "`") return j + 1;
      if (c === "$" && src[j + 1] === "{") {
        brace = 1;
        j += 2;
        continue;
      }
      j += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      j = scanString(src, j).end;
      continue;
    }
    if (c === "`") {
      j = scanTemplate(src, j);
      continue;
    }
    if (c === "/" && src[j + 1] === "/") {
      const nl = src.indexOf("\n", j);
      j = nl === -1 ? src.length : nl;
      continue;
    }
    if (c === "/" && src[j + 1] === "*") {
      const end = src.indexOf("*/", j + 2);
      j = end === -1 ? src.length : end + 2;
      continue;
    }
    if (c === "{") brace += 1;
    else if (c === "}") brace -= 1;
    j += 1;
  }
  return src.length;
}

function scanRegex(src: string, start: number): number {
  let j = start + 1;
  let inClass = false;
  while (j < src.length) {
    const c = src[j]!;
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "\n") return start + 1;
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      j += 1;
      break;
    }
    j += 1;
  }
  while (j < src.length && /[a-z]/i.test(src[j]!)) j += 1;
  return j;
}

function regexAllowed(prev: Token | undefined): boolean {
  if (!prev) return true;
  if (prev.type === "punct") return REGEX_AFTER_PUNCT.has(prev.text);
  if (prev.type === "id") return REGEX_AFTER_KEYWORD.has(prev.text);
  return false;
}

function shouldEncode(hist: Token[], value: string): boolean {
  if (DIRECTIVES.has(value)) return false;
  const last = hist[hist.length - 1];
  if (!last) return true;
  if (last.type === "id") {
    if (last.text === "from") return false;
    if (last.text === "import") return false;
  }
  if (last.type === "punct" && last.text === "(") {
    const p2 = hist[hist.length - 2];
    const p3 = hist[hist.length - 3];
    const p4 = hist[hist.length - 4];
    if (p2?.type === "id" && (p2.text === "import" || p2.text === "require")) return false;
    if (
      p2?.type === "id" &&
      p2.text === "resolve" &&
      p3?.type === "punct" &&
      p3.text === "." &&
      p4?.type === "id" &&
      p4.text === "require"
    )
      return false;
  }
  return true;
}

export function obfuscateStrings(src: string): string {
  const out: string[] = [];
  const hist: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i]!;

    if (/\s/.test(c)) {
      out.push(c);
      i += 1;
      continue;
    }

    if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      out.push(src.slice(i, nl === -1 ? src.length : nl));
      i = nl === -1 ? src.length : nl;
      continue;
    }

    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      out.push(src.slice(i, end === -1 ? src.length : end + 2));
      i = end === -1 ? src.length : end + 2;
      continue;
    }

    if (c === '"' || c === "'") {
      const { end, value } = scanString(src, i);
      if (shouldEncode(hist, value)) out.push(escapeHex(value));
      else out.push(src.slice(i, end));
      hist.push({ type: "str", text: src.slice(i, end) });
      i = end;
      continue;
    }

    if (c === "`") {
      const end = scanTemplate(src, i);
      out.push(src.slice(i, end));
      hist.push({ type: "tpl", text: src.slice(i, end) });
      i = end;
      continue;
    }

    if (c === "/") {
      if (regexAllowed(hist[hist.length - 1])) {
        const end = scanRegex(src, i);
        out.push(src.slice(i, end));
        hist.push({ type: "regex", text: src.slice(i, end) });
        i = end;
      } else {
        out.push(c);
        hist.push({ type: "punct", text: c });
        i += 1;
      }
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < src.length && isIdentPart(src[j]!)) j += 1;
      const text = src.slice(i, j);
      out.push(text);
      hist.push({ type: "id", text });
      i = j;
      continue;
    }

    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9A-Za-z_.$]/.test(src[j]!)) j += 1;
      const text = src.slice(i, j);
      out.push(text);
      hist.push({ type: "num", text });
      i = j;
      continue;
    }

    out.push(c);
    hist.push({ type: "punct", text: c });
    i += 1;
  }

  return out.join("");
}
