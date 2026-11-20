/** Browser-compatible, deterministic encodings and validation. No Node APIs. */
export const PROTOCOL = "CipherChat-v1" as const;
export const MESSAGE_VERSION = 1 as const;
export const MAX_MESSAGE_BYTES = 1024 * 1024; // Educational prototype: 1 MiB cap
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}
export function readUtf8(data: Uint8Array): string {
  return decoder.decode(data);
}
export function asBuffer(bytes: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(result).set(bytes);
  return result;
}
export function joinBytes(...chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
export function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 1 || length > 65_536) {
    throw new Error("Invalid random-byte length");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}
export function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const item of bytes) binary += String.fromCharCode(item);
  return btoa(binary);
}
/**
 * Decode canonical Base64 with a size check BEFORE atob() allocates decoded data.
 * expectedLength enforces exact size for nonces, tags, public keys and signatures.
 * maxDecodedBytes caps variable-size ciphertext from untrusted network messages.
 */
export function fromBase64(
  input: string,
  expectedLength?: number,
  maxDecodedBytes?: number
): Uint8Array {
  if (typeof input !== "string") throw new Error("Invalid Base64 encoding");

  if (expectedLength !== undefined) {
    if (!Number.isSafeInteger(expectedLength) || expectedLength < 0) {
      throw new Error("Invalid expected Base64 length");
    }
    if (input.length !== Math.ceil(expectedLength / 3) * 4) {
      throw new Error("Invalid Base64 length");
    }
  }

  if (maxDecodedBytes !== undefined) {
    if (!Number.isSafeInteger(maxDecodedBytes) || maxDecodedBytes < 0) {
      throw new Error("Invalid maximum Base64 size");
    }
    if (input.length > Math.ceil(maxDecodedBytes / 3) * 4) {
      throw new Error("Encoded message exceeds size limit");
    }
  }

  // Do not run a full-string validation regex or atob() until size is bounded.
  // All untrusted variable-length inputs must supply maxDecodedBytes.
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input)) {
    throw new Error("Invalid Base64 encoding");
  }
  const decoded = atob(input);
  const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
  if (
    base64(bytes) !== input ||
    (expectedLength !== undefined && bytes.length !== expectedLength) ||
    (maxDecodedBytes !== undefined && bytes.length > maxDecodedBytes)
  ) {
    throw new Error("Invalid Base64 length, size or canonical encoding");
  }
  return bytes;
}
export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", asBuffer(bytes)));
}
export function validId(name: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 128 || !/^[\w.:@-]+$/.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
}
export function validSequence(sequence: unknown): asserts sequence is number {
  if (typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Invalid sequence number");
  }
}
export function equalStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
