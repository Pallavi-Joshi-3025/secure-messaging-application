import { asBuffer, base64, fromBase64, hex, sha256, utf8, validId, equalStrings } from "./encoding.js";

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyBase64: string;
  fingerprint: string;
}
export interface TrustedPeerRecord {
  userId: string;
  publicKeyBase64: string;
  fingerprint: string;
}
export interface TrustStore {
  get(userId: string): Promise<TrustedPeerRecord | undefined>;
  put(record: TrustedPeerRecord): Promise<void>;
}

/** Non-extractable private key. Never export or upload it to Supabase. */
export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const keys = await crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]);
  const publicBytes = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    publicKeyBase64: base64(publicBytes),
    fingerprint: hex(await sha256(publicBytes))
  };
}
export async function fingerprintIdentityKey(publicKeyBase64: string): Promise<string> {
  return hex(await sha256(fromBase64(publicKeyBase64, 32)));
}
export async function importIdentityPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", asBuffer(fromBase64(publicKeyBase64, 32)), "Ed25519", true, ["verify"]);
}
export async function signTranscript(transcript: Uint8Array, privateKey: CryptoKey): Promise<string> {
  return base64(new Uint8Array(await crypto.subtle.sign("Ed25519", privateKey, asBuffer(transcript))));
}
export async function verifyTranscript(transcript: Uint8Array, signatureBase64: string, publicKey: CryptoKey): Promise<boolean> {
  return crypto.subtle.verify("Ed25519", publicKey, asBuffer(fromBase64(signatureBase64, 64)), asBuffer(transcript));
}
/**
 * Call ONLY after a user compares the fingerprint with the peer over an independent trusted channel.
 * Never pass the server-provided fingerprint as 'confirmedFingerprint' automatically.
 */
export async function confirmPeerFingerprint(
  store: TrustStore,
  userId: string,
  publicKeyBase64: string,
  confirmedFingerprint: string
): Promise<TrustedPeerRecord> {
  validId("userId", userId);
  const calculated = await fingerprintIdentityKey(publicKeyBase64);
  const provided = confirmedFingerprint.replace(/[:\s-]/g, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided) || !equalStrings(calculated, provided)) {
    throw new Error("Fingerprint verification failed");
  }
  const prior = await store.get(userId);
  if (prior && (prior.publicKeyBase64 !== publicKeyBase64 || prior.fingerprint !== calculated)) {
    throw new Error("Identity key changed: manual re-verification required");
  }
  const record = { userId, publicKeyBase64, fingerprint: calculated };
  await store.put(record);
  return record;
}
export class MemoryTrustStore implements TrustStore {
  private peers = new Map<string, TrustedPeerRecord>();
  async get(userId: string): Promise<TrustedPeerRecord | undefined> { return this.peers.get(userId); }
  async put(record: TrustedPeerRecord): Promise<void> { this.peers.set(record.userId, { ...record }); }
}
