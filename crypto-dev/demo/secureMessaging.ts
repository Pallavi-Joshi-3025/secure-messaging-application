import { confirmPeerFingerprint, generateIdentityKeyPair, MemoryTrustStore } from "../src/identity.js";
import { startHandshake, respondHandshake, signHandshake, finishHandshake } from "../src/handshake.js";
import { MemorySequenceStore, SecureMessenger } from "../src/replayProtection.js";

async function demo(): Promise<void> {
  const aliceIdentity = await generateIdentityKeyPair();
  const bobIdentity = await generateIdentityKeyPair();
  const aliceTrust = new MemoryTrustStore();
  const bobTrust = new MemoryTrustStore();
  console.log("Identity fingerprints (must be checked out of band in the real app):");
  console.log("Alice:", aliceIdentity.fingerprint);
  console.log("Bob:  ", bobIdentity.fingerprint);
  // A classroom fixture directly knows genuine keys; production must have a real manual check.
  const bobPinned = await confirmPeerFingerprint(aliceTrust, "bob", bobIdentity.publicKeyBase64, bobIdentity.fingerprint);
  const alicePinned = await confirmPeerFingerprint(bobTrust, "alice", aliceIdentity.publicKeyBase64, aliceIdentity.fingerprint);
  const aliceHello = await startHandshake("alice", "bob", "demo-conversation");
  const bobHello = await respondHandshake("bob", aliceHello.hello);
  const aliceSignature = await signHandshake(aliceHello.hello, bobHello.hello, aliceIdentity.privateKey);
  const bobSignature = await signHandshake(aliceHello.hello, bobHello.hello, bobIdentity.privateKey);
  const aliceSession = await finishHandshake(aliceHello, aliceHello.hello, bobHello.hello, bobSignature, bobPinned);
  const bobSession = await finishHandshake(bobHello, aliceHello.hello, bobHello.hello, aliceSignature, alicePinned);
  const alice = new SecureMessenger(aliceSession, new MemorySequenceStore());
  const bob = new SecureMessenger(bobSession, new MemorySequenceStore());
  const encrypted = await alice.send("Hello Bob!");
  console.log("\nAlice sends ciphertext (no plaintext in the envelope):\n", JSON.stringify(encrypted, null, 2));
  console.log("\nBob decrypts:", await bob.receive(encrypted));
  try { await bob.receive(encrypted); } catch { console.log("Replay rejected as expected"); }
}
await demo();
