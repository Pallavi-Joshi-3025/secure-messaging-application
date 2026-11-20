import {
  asBuffer, fromBase64, hex, joinBytes, PROTOCOL, randomBytes, sha256,
  utf8, validId, equalStrings
} from "./encoding.js";
import {
  type TrustedPeerRecord, fingerprintIdentityKey, importIdentityPublicKey,
  signTranscript, verifyTranscript
} from "./identity.js";
import { calculateSharedSecret, generateExchangeKeyPair } from "./keyExchange.js";
import { deriveSessionKeys, type SecureSession } from "./session.js";

type Role = "initiator" | "responder";
export interface HandshakeHello {
  protocol: typeof PROTOCOL;
  conversationId: string;
  sessionId: string;
  role: Role;
  senderId: string;
  recipientId: string;
  ephemeralPublicKey: string;
  nonce: string;
}
export interface LocalHandshake {
  hello: HandshakeHello;
  ephemeralPrivateKey: CryptoKey;
}

function validateHello(hello: HandshakeHello): void {
  if (!hello || hello.protocol !== PROTOCOL || !["initiator", "responder"].includes(hello.role)) {
    throw new Error("Unsupported handshake protocol or role");
  }
  validId("conversationId", hello.conversationId);
  validId("sessionId", hello.sessionId);
  validId("senderId", hello.senderId);
  validId("recipientId", hello.recipientId);
  if (hello.senderId === hello.recipientId) throw new Error("Identical handshake participants");
  fromBase64(hello.ephemeralPublicKey, 32);
  fromBase64(hello.nonce, 32);
}
/** Canonical ordered fields: identical on independently reconstructed network JSON objects. */
function helloFields(hello: HandshakeHello): (string | number)[] {
  return [hello.protocol, hello.conversationId, hello.sessionId, hello.role,
    hello.senderId, hello.recipientId, hello.ephemeralPublicKey, hello.nonce];
}

export function handshakeTranscript(initiator: HandshakeHello, responder: HandshakeHello): Uint8Array {
  validateHello(initiator);
  validateHello(responder);
  if (
    initiator.role !== "initiator" || responder.role !== "responder" ||
    initiator.conversationId !== responder.conversationId ||
    initiator.sessionId !== responder.sessionId ||
    initiator.senderId !== responder.recipientId ||
    initiator.recipientId !== responder.senderId ||
    initiator.ephemeralPublicKey === responder.ephemeralPublicKey
  ) {
    throw new Error("Invalid handshake participant/session binding");
  }
  return utf8(JSON.stringify([PROTOCOL, helloFields(initiator), helloFields(responder)]));
}

export async function startHandshake(
  localId: string, peerId: string, conversationId: string
): Promise<LocalHandshake> {
  validId("localId", localId); validId("peerId", peerId); validId("conversationId", conversationId);
  if (localId === peerId) throw new Error("Self-handshake unsupported");
  const ephemeral = await generateExchangeKeyPair();
  const hello: HandshakeHello = {
    protocol: PROTOCOL, conversationId, sessionId: crypto.randomUUID(), role: "initiator",
    senderId: localId, recipientId: peerId,
    ephemeralPublicKey: ephemeral.publicKeyBase64,
    nonce: btoa(String.fromCharCode(...randomBytes(32)))
  };
  return { hello, ephemeralPrivateKey: ephemeral.privateKey };
}

export async function respondHandshake(localId: string, initiator: HandshakeHello): Promise<LocalHandshake> {
  validateHello(initiator);
  if (initiator.role !== "initiator" || initiator.recipientId !== localId) {
    throw new Error("Responder does not match initiator recipient");
  }
  const ephemeral = await generateExchangeKeyPair();
  const hello: HandshakeHello = {
    protocol: PROTOCOL,
    conversationId: initiator.conversationId,
    sessionId: initiator.sessionId,
    role: "responder",
    senderId: localId,
    recipientId: initiator.senderId,
    ephemeralPublicKey: ephemeral.publicKeyBase64,
    nonce: btoa(String.fromCharCode(...randomBytes(32)))
  };
  return { hello, ephemeralPrivateKey: ephemeral.privateKey };
}

export async function signHandshake(
  initiator: HandshakeHello, responder: HandshakeHello, identityPrivateKey: CryptoKey
): Promise<string> {
  return signTranscript(handshakeTranscript(initiator, responder), identityPrivateKey);
}

/**
 * trustedPeer MUST come from an out-of-band verified/pinned record, not untrusted network data.
 * Each participant runs this independently using their OWN ephemeral private key.
 */
export async function finishHandshake(
  local: LocalHandshake,
  initiator: HandshakeHello,
  responder: HandshakeHello,
  peerSignature: string,
  trustedPeer: TrustedPeerRecord
): Promise<SecureSession> {
  const transcript = handshakeTranscript(initiator, responder);
  const own = local.hello.role === "initiator" ? initiator : responder;
  const other = local.hello.role === "initiator" ? responder : initiator;
  if (!equalStrings(JSON.stringify(helloFields(local.hello)), JSON.stringify(helloFields(own)))) {
    throw new Error("Local handshake data changed");
  }
  if (!trustedPeer || trustedPeer.userId !== other.senderId) {
    throw new Error("Unverified/incorrect peer identity");
  }
  const calculatedFingerprint = await fingerprintIdentityKey(trustedPeer.publicKeyBase64);
  if (!equalStrings(calculatedFingerprint, trustedPeer.fingerprint)) {
    throw new Error("Invalid trusted peer fingerprint");
  }
  const peerPublicKey = await importIdentityPublicKey(trustedPeer.publicKeyBase64);
  if (!await verifyTranscript(transcript, peerSignature, peerPublicKey)) {
    throw new Error("Peer signature verification failed");
  }
  const secret = await calculateSharedSecret(local.ephemeralPrivateKey, other.ephemeralPublicKey);
  const salt = await sha256(joinBytes(
    fromBase64(initiator.nonce, 32), fromBase64(responder.nonce, 32)
  ));
  const transcriptHashHex = hex(await sha256(transcript));
  const session = await deriveSessionKeys(
    secret, salt, transcriptHashHex, local.hello.role === "initiator",
    own.conversationId, own.sessionId, own.senderId, other.senderId
  );
  secret.fill(0); // best-effort cleanup of the temporary raw shared-secret buffer
  return session;
}
