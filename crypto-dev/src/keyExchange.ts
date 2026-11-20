import { asBuffer, base64, fromBase64 } from "./encoding.js";
export interface EphemeralKeyPair {
  publicKeyBase64: string;
  privateKey: CryptoKey;
}
/** Generates a fresh ephemeral X25519 private key for every handshake. */
export async function generateExchangeKeyPair(): Promise<EphemeralKeyPair> {
  const pair = await crypto.subtle.generateKey("X25519", false, ["deriveBits"]) as CryptoKeyPair;
  return {
    publicKeyBase64: base64(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))),
    privateKey: pair.privateKey
  };
}
export async function calculateSharedSecret(privateKey: CryptoKey, peerPublicKeyBase64: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", asBuffer(fromBase64(peerPublicKeyBase64, 32)), "X25519", false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "X25519", public: key }, privateKey, 256));
  if (secret.every(byte => byte === 0)) throw new Error("Invalid X25519 shared secret");
  return secret;
}
