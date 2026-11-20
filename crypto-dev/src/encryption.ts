import {
  asBuffer, base64, fromBase64, joinBytes, MESSAGE_VERSION, MAX_MESSAGE_BYTES,
  randomBytes, readUtf8, utf8, validId, validSequence
} from "./encoding.js";
import type { SecureSession } from "./session.js";

/** Supabase row contract: authenticated metadata + AES-GCM payload. */
export interface EncryptedMessage {
  version: typeof MESSAGE_VERSION;
  conversationId: string;
  sessionId: string;
  senderId: string;
  sequence: number;
  nonce: string;       // Base64, 12 secure random bytes
  ciphertext: string;  // Base64, encrypted UTF-8 bytes only
  tag: string;         // Base64, 16-byte GCM authentication tag
}

type Header = Pick<EncryptedMessage, "version" | "conversationId" | "sessionId" | "senderId" | "sequence">;

function authenticatedHeader(header: Header): Uint8Array {
  if (header.version !== MESSAGE_VERSION) throw new Error("Unsupported message version");
  validId("conversationId", header.conversationId);
  validId("sessionId", header.sessionId);
  validId("senderId", header.senderId);
  validSequence(header.sequence);
  // Same exact field order on every device; includes Hari's version, conversation, sender and seq.
  return utf8(JSON.stringify([
    header.version, header.conversationId, header.sessionId, header.senderId, header.sequence
  ]));
}

export async function encryptMessage(
  plaintext: string,
  session: SecureSession,
  sequence: number
): Promise<EncryptedMessage> {
  if (typeof plaintext !== "string") throw new Error("Plaintext must be text");
  const plain = utf8(plaintext);
  if (plain.length > MAX_MESSAGE_BYTES) throw new Error("Message exceeds size limit");
  const header = {
    version: MESSAGE_VERSION,
    conversationId: session.conversationId,
    sessionId: session.sessionId,
    senderId: session.localId,
    sequence
  };
  const aad = authenticatedHeader(header);
  const nonce = randomBytes(12); // Fresh random 96-bit AES-GCM nonce, as in Hari's diagram.
  const combined = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuffer(nonce), additionalData: asBuffer(aad), tagLength: 128 },
    session.sendKey,
    asBuffer(plain)
  ));
  return {
    ...header,
    nonce: base64(nonce),
    ciphertext: base64(combined.slice(0, -16)),
    tag: base64(combined.slice(-16))
  };
}

export async function decryptMessage(message: EncryptedMessage, session: SecureSession): Promise<string> {
  if (!message || typeof message !== "object") throw new Error("Invalid encrypted message");
  const aad = authenticatedHeader(message);
  if (
    message.conversationId !== session.conversationId ||
    message.sessionId !== session.sessionId ||
    message.senderId !== session.peerId
  ) {
    throw new Error("Unexpected conversation, session or sender");
  }
  // Reject oversized input before Base64 decoding allocates browser memory.
  const nonce = fromBase64(message.nonce, 12);
  const ciphertext = fromBase64(message.ciphertext, undefined, MAX_MESSAGE_BYTES);
  const tag = fromBase64(message.tag, 16);
  const plaintext = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(nonce), additionalData: asBuffer(aad), tagLength: 128 },
    session.receiveKey,
    asBuffer(joinBytes(ciphertext, tag))
  ));
  return readUtf8(plaintext);
}
