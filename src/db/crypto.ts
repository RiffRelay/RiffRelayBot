const VERSION = "v1";
const SALT = new TextEncoder().encode("brainzbot.token-encryption");

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

async function deriveUserKey(masterKey: Uint8Array, context: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(masterKey);
  const base = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "HKDF", false, [
    "deriveKey",
  ]);
  const info = new TextEncoder().encode(`lb-token:${context}`);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt `plaintext` under a key derived from the master key + user context. */
export async function encryptToken(
  masterKey: Uint8Array,
  context: string,
  plaintext: string,
): Promise<string> {
  const key = await deriveUserKey(masterKey, context);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv } as AesGcmParams,
    key,
    new TextEncoder().encode(plaintext),
  );
  const buf = new Uint8Array(encrypted);
  // AES-GCM appends the 16-byte auth tag at the end.
  const ciphertext = buf.slice(0, buf.length - 16);
  const tag = buf.slice(buf.length - 16);
  return [VERSION, bytesToBase64(iv), bytesToBase64(ciphertext), bytesToBase64(tag)].join(":");
}

/** Decrypt a token payload. Throws on tampering / wrong key. */
export async function decryptToken(
  masterKey: Uint8Array,
  context: string,
  payload: string,
): Promise<string> {
  const [version, ivB64, ctB64, tagB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !ctB64 || !tagB64) {
    throw new Error("Unsupported or malformed encrypted token payload");
  }
  const key = await deriveUserKey(masterKey, context);
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(ctB64);
  const tag = base64ToBytes(tagB64);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv } as AesGcmParams,
    key,
    combined,
  );
  return new TextDecoder().decode(plaintext);
}

/** A readable message for an unknown thrown value. */
export function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
