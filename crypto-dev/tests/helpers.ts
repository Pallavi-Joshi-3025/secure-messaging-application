import { confirmPeerFingerprint, generateIdentityKeyPair, MemoryTrustStore } from "../src/identity.js";
import { finishHandshake, respondHandshake, signHandshake, startHandshake } from "../src/handshake.js";
import type { SecureSession } from "../src/session.js";

export async function establishPair(): Promise<{
  alice: SecureSession;
  bob: SecureSession;
  aliceIdentity: Awaited<ReturnType<typeof generateIdentityKeyPair>>;
  bobIdentity: Awaited<ReturnType<typeof generateIdentityKeyPair>>;
  initiator: Awaited<ReturnType<typeof startHandshake>>;
  responder: Awaited<ReturnType<typeof respondHandshake>>;
  aliceSig: string;
  bobSig: string;
  aliceTrust: MemoryTrustStore;
  bobTrust: MemoryTrustStore;
}> {
  const aliceIdentity = await generateIdentityKeyPair();
  const bobIdentity = await generateIdentityKeyPair();
  const aliceTrust = new MemoryTrustStore();
  const bobTrust = new MemoryTrustStore();
  // In test fixtures the identity source is authoritative. Real users must check fingerprints independently.
  const bobPinned = await confirmPeerFingerprint(aliceTrust, "bob", bobIdentity.publicKeyBase64, bobIdentity.fingerprint);
  const alicePinned = await confirmPeerFingerprint(bobTrust, "alice", aliceIdentity.publicKeyBase64, aliceIdentity.fingerprint);
  const initiator = await startHandshake("alice", "bob", "demo-conversation");
  const responder = await respondHandshake("bob", initiator.hello);
  const aliceSig = await signHandshake(initiator.hello, responder.hello, aliceIdentity.privateKey);
  const bobSig = await signHandshake(initiator.hello, responder.hello, bobIdentity.privateKey);
  const [alice, bob] = await Promise.all([
    finishHandshake(initiator, initiator.hello, responder.hello, bobSig, bobPinned),
    finishHandshake(responder, initiator.hello, responder.hello, aliceSig, alicePinned)
  ]);
  return { alice, bob, aliceIdentity, bobIdentity, initiator, responder, aliceSig, bobSig, aliceTrust, bobTrust };
}
