/*
 * crypto.js — Core cryptographic primitives for the INSE-6110 Secure Messaging demo.
 *
 * Implements exactly the primitives named in the project proposal:
 *   - X25519        : elliptic-curve Diffie-Hellman key agreement (RFC 7748)
 *   - HKDF-SHA-256  : session-key derivation from the shared secret (RFC 5869)
 *   - Ed25519       : digital signatures authenticating the handshake (RFC 8032)
 *   - AES-256-GCM   : authenticated encryption of messages (NIST SP 800-38D)
 *
 * X25519, HKDF and AES-GCM use the browser-native Web Crypto API (SubtleCrypto).
 * Ed25519 uses the vendored, self-contained @noble/ed25519 library because native
 * SubtleCrypto Ed25519 support is still inconsistent across browsers. If the browser
 * does expose native Ed25519 we transparently prefer it.
 */

import * as nobleEd from '../vendor/noble-ed25519.js';

const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();

/* ----------------------------------------------------------------------------
 * Encoding helpers
 * ------------------------------------------------------------------------- */
export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const utf8ToBytes = (s) => te.encode(s);
export const bytesToUtf8 = (b) => td.decode(b);

export function randomBytes(n) {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

/* Short, human-comparable fingerprint of a public key (SHA-256 -> grouped hex). */
export async function fingerprint(publicKeyBytes) {
  const digest = new Uint8Array(await subtle.digest('SHA-256', publicKeyBytes));
  const hex = bytesToHex(digest.slice(0, 16)).toUpperCase();
  return hex.match(/.{1,4}/g).join(' ');
}

/* ----------------------------------------------------------------------------
 * X25519 — Elliptic-Curve Diffie-Hellman key agreement (RFC 7748)
 * ------------------------------------------------------------------------- */
export async function generateX25519KeyPair() {
  const kp = await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
  const rawPub = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  return { privateKey: kp.privateKey, publicKey: kp.publicKey, publicKeyRaw: rawPub };
}

export async function importX25519PublicKey(rawPub) {
  return subtle.importKey('raw', rawPub, { name: 'X25519' }, true, []);
}

/* Returns the 32-byte raw shared secret. */
export async function x25519SharedSecret(myPrivateKey, theirPublicKey) {
  const bits = await subtle.deriveBits(
    { name: 'X25519', public: theirPublicKey },
    myPrivateKey,
    256
  );
  return new Uint8Array(bits);
}

/* ----------------------------------------------------------------------------
 * HKDF-SHA-256 — key derivation (RFC 5869)
 * Derives a 256-bit AES-GCM session key from the X25519 shared secret.
 * ------------------------------------------------------------------------- */
export async function hkdfDeriveSessionKey(sharedSecret, salt, infoString) {
  const baseKey = await subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, [
    'deriveKey',
    'deriveBits',
  ]);
  const key = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt ?? new Uint8Array(0),
      info: utf8ToBytes(infoString ?? 'INSE6110-secure-messaging-v1'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
}

/* Also expose the raw derived bits so the UI can display the session key. */
export async function hkdfDeriveBits(sharedSecret, salt, infoString, lengthBits = 256) {
  const baseKey = await subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, [
    'deriveBits',
  ]);
  const bits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt ?? new Uint8Array(0),
      info: utf8ToBytes(infoString ?? 'INSE6110-secure-messaging-v1'),
    },
    baseKey,
    lengthBits
  );
  return new Uint8Array(bits);
}

/* ----------------------------------------------------------------------------
 * Ed25519 — digital signatures authenticating the handshake (RFC 8032)
 * Prefers native SubtleCrypto Ed25519 when available; otherwise uses vendored noble.
 * ------------------------------------------------------------------------- */
let nativeEd25519 = null; // lazily feature-detected

async function detectNativeEd25519() {
  if (nativeEd25519 !== null) return nativeEd25519;
  try {
    const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    await subtle.exportKey('raw', kp.publicKey);
    nativeEd25519 = true;
  } catch {
    nativeEd25519 = false;
  }
  return nativeEd25519;
}

export async function generateEd25519KeyPair() {
  if (await detectNativeEd25519()) {
    const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const rawPub = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
    return { kind: 'native', privateKey: kp.privateKey, publicKey: kp.publicKey, publicKeyRaw: rawPub };
  }
  // noble: private key is 32 random bytes
  const priv = nobleEd.utils.randomPrivateKey();
  const pub = await nobleEd.getPublicKeyAsync(priv);
  return { kind: 'noble', privateKey: priv, publicKeyRaw: pub };
}

export async function ed25519Sign(keyPair, messageBytes) {
  if (keyPair.kind === 'native') {
    const sig = await subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, messageBytes);
    return new Uint8Array(sig);
  }
  return nobleEd.signAsync(messageBytes, keyPair.privateKey);
}

export async function ed25519Verify(publicKeyRaw, signature, messageBytes) {
  // Try native first if the signer used native; but verification works cross-impl
  // as long as we pick a backend that can import the raw key.
  if (await detectNativeEd25519()) {
    try {
      const pub = await subtle.importKey('raw', publicKeyRaw, { name: 'Ed25519' }, true, ['verify']);
      return await subtle.verify({ name: 'Ed25519' }, pub, signature, messageBytes);
    } catch {
      /* fall through to noble */
    }
  }
  try {
    return await nobleEd.verifyAsync(signature, messageBytes, publicKeyRaw);
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------------------
 * AES-256-GCM — authenticated encryption (NIST SP 800-38D)
 * Each message uses a fresh 96-bit nonce. The 128-bit GCM tag provides integrity;
 * any tampering of ciphertext, nonce or AAD causes decryption to throw.
 * ------------------------------------------------------------------------- */
export async function aesGcmEncrypt(sessionKey, plaintextBytes, aadBytes) {
  const iv = randomBytes(12); // 96-bit nonce, unique per message
  const params = { name: 'AES-GCM', iv, tagLength: 128 };
  if (aadBytes) params.additionalData = aadBytes;
  const ct = new Uint8Array(await subtle.encrypt(params, sessionKey, plaintextBytes));
  return { iv, ciphertext: ct }; // ct already includes the 16-byte GCM tag
}

export async function aesGcmDecrypt(sessionKey, iv, ciphertextBytes, aadBytes) {
  const params = { name: 'AES-GCM', iv, tagLength: 128 };
  if (aadBytes) params.additionalData = aadBytes;
  // Throws OperationError if the tag check fails (tampering / wrong key).
  const pt = new Uint8Array(await subtle.decrypt(params, sessionKey, ciphertextBytes));
  return pt;
}

export async function exportSessionKeyRaw(sessionKey) {
  return new Uint8Array(await subtle.exportKey('raw', sessionKey));
}

/* Self-test used by the UI to confirm the crypto stack works in this browser. */
export async function selfTest() {
  const results = {};
  // X25519 + HKDF
  const a = await generateX25519KeyPair();
  const b = await generateX25519KeyPair();
  const ssA = await x25519SharedSecret(a.privateKey, b.publicKey);
  const ssB = await x25519SharedSecret(b.privateKey, a.publicKey);
  results.x25519 = bytesToHex(ssA) === bytesToHex(ssB);
  const kA = await hkdfDeriveSessionKey(ssA, randomBytes(0), 'selftest');
  // AES-GCM round trip
  const msg = utf8ToBytes('hello INSE6110');
  const { iv, ciphertext } = await aesGcmEncrypt(kA, msg);
  const kB = await hkdfDeriveSessionKey(ssB, new Uint8Array(0), 'selftest');
  const dec = await aesGcmDecrypt(kB, iv, ciphertext);
  results.aesgcm = bytesToUtf8(dec) === 'hello INSE6110';
  // Ed25519 sign/verify
  const ed = await generateEd25519KeyPair();
  const sig = await ed25519Sign(ed, msg);
  results.ed25519 = await ed25519Verify(ed.publicKeyRaw, sig, msg);
  results.ed25519Backend = ed.kind;
  results.allPassed = results.x25519 && results.aesgcm && results.ed25519;
  return results;
}
