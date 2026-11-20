import { asBuffer, utf8 } from "./encoding.js";

export interface SecureSession {
  conversationId: string;
  sessionId: string;
  localId: string;
  peerId: string;
  sendKey: CryptoKey;
  receiveKey: CryptoKey;
}

async function deriveAesKey(
  hkdfKey: CryptoKey,
  salt: Uint8Array,
  info: string,
  usage: KeyUsage
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: asBuffer(salt), info: asBuffer(utf8(info)) },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}
/** Separate A->B and B->A keys prevent nonce/key crossover between directions. */
export async function deriveSessionKeys(
  sharedSecret: Uint8Array,
  salt: Uint8Array,
  transcriptHashHex: string,
  isInitiator: boolean,
  conversationId: string,
  sessionId: string,
  localId: string,
  peerId: string
): Promise<SecureSession> {
  const master = await crypto.subtle.importKey("raw", asBuffer(sharedSecret), "HKDF", false, ["deriveKey"]);
  const binding = `CipherChat-v1|${transcriptHashHex}`;
  const sendDirection = isInitiator ? "initiator-to-responder" : "responder-to-initiator";
  const receiveDirection = isInitiator ? "responder-to-initiator" : "initiator-to-responder";
  const [sendKey, receiveKey] = await Promise.all([
    deriveAesKey(master, salt, `${binding}|${sendDirection}`, "encrypt"),
    deriveAesKey(master, salt, `${binding}|${receiveDirection}`, "decrypt")
  ]);
  return { conversationId, sessionId, localId, peerId, sendKey, receiveKey };
}
