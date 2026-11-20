import test from "node:test";
import assert from "node:assert/strict";
import { establishPair } from "./helpers.js";
import { encryptMessage, decryptMessage } from "../src/encryption.js";
import {
  generateIdentityKeyPair, signTranscript, verifyTranscript,
  confirmPeerFingerprint, MemoryTrustStore
} from "../src/identity.js";
import { utf8, fromBase64, base64, MAX_MESSAGE_BYTES } from "../src/encoding.js";

for (const size of [64, 256, 1024, 4096]) {
  test(`AES-GCM roundtrip matches ${size}-byte plaintext`, async () => {
    const { alice, bob } = await establishPair();
    const plaintext = "A".repeat(size);
    const envelope = await encryptMessage(plaintext, alice, 1);
    assert.equal(envelope.version, 1);
    assert.equal(fromBase64(envelope.nonce).length, 12);
    assert.equal(fromBase64(envelope.tag).length, 16);
    assert.equal(await decryptMessage(envelope, bob), plaintext);
  });
}

test("Tampering with ciphertext, nonce, tag, sender, conversation, session, version and sequence fails", async () => {
  const { alice, bob } = await establishPair();
  const original = await encryptMessage("Hello Bob!", alice, 2);
  const flip = (encoded: string) => {
    const raw = fromBase64(encoded);
    raw[0] = raw[0]! ^ 1;
    return base64(raw);
  };
  const changes = [
    { ...original, ciphertext: flip(original.ciphertext) },
    { ...original, nonce: flip(original.nonce) },
    { ...original, tag: flip(original.tag) },
    { ...original, senderId: "mallory" },
    { ...original, conversationId: "other-conversation" },
    { ...original, sessionId: "other-session" },
    { ...original, version: 2 as 1 },
    { ...original, sequence: 99 }
  ];
  for (const payload of changes) {
    await assert.rejects(() => decryptMessage(payload, bob));
  }
  assert.equal(await decryptMessage(original, bob), "Hello Bob!");
});

test("Unrelated receive key cannot decrypt the ciphertext", async () => {
  const { alice, bob } = await establishPair();
  const other = await establishPair();
  const message = await encryptMessage("secret", alice, 1);
  await assert.rejects(() => decryptMessage(message, { ...bob, receiveKey: other.bob.receiveKey }));
});

test("Ed25519 accepts valid signatures and rejects modified text or different identity", async () => {
  const alice = await generateIdentityKeyPair();
  const mallory = await generateIdentityKeyPair();
  const sig = await signTranscript(utf8("handshake"), alice.privateKey);
  assert.equal(await verifyTranscript(utf8("handshake"), sig, alice.publicKey), true);
  assert.equal(await verifyTranscript(utf8("tampered"), sig, alice.publicKey), false);
  assert.equal(await verifyTranscript(utf8("handshake"), sig, mallory.publicKey), false);
  assert.equal(alice.privateKey.extractable, false);
  await assert.rejects(() => crypto.subtle.exportKey("pkcs8", alice.privateKey));
});

test("Out-of-band fingerprint pinning rejects mistakes and key substitution", async () => {
  const store = new MemoryTrustStore();
  const bob = await generateIdentityKeyPair();
  const attacker = await generateIdentityKeyPair();
  await assert.rejects(() => confirmPeerFingerprint(store, "bob", bob.publicKeyBase64, attacker.fingerprint));
  const trusted = await confirmPeerFingerprint(store, "bob", bob.publicKeyBase64, bob.fingerprint);
  assert.equal(trusted.fingerprint, bob.fingerprint);
  await assert.rejects(() => confirmPeerFingerprint(store, "bob", attacker.publicKeyBase64, attacker.fingerprint));
});


test("Rejects oversized ciphertext and wrong-length nonce/tag before decoding", async () => {
  const { alice, bob } = await establishPair();
  const original = await encryptMessage("Hello Bob!", alice, 1);
  const tooLarge = "A".repeat((Math.ceil(MAX_MESSAGE_BYTES / 3) + 1) * 4);
  await assert.rejects(
    () => decryptMessage({ ...original, ciphertext: tooLarge }, bob),
    /size limit/
  );
  // Also reject the rounding boundary where encoded length fits but decoded bytes do not.
  const boundaryOversize = "A".repeat(Math.ceil(MAX_MESSAGE_BYTES / 3) * 4);
  await assert.rejects(
    () => decryptMessage({ ...original, ciphertext: boundaryOversize }, bob),
    /size/
  );
  await assert.rejects(
    () => decryptMessage({ ...original, nonce: "A".repeat(400_000) }, bob),
    /Base64 length/
  );
  await assert.rejects(
    () => decryptMessage({ ...original, tag: "A".repeat(400_000) }, bob),
    /Base64 length/
  );
});

test("Rejects malformed message encodings without revealing plaintext", async () => {
  const { alice, bob } = await establishPair();
  const original = await encryptMessage("Hello Bob!", alice, 1);
  await assert.rejects(() => decryptMessage({ ...original, ciphertext: "!" }, bob));
  await assert.rejects(() => decryptMessage({ ...original, ciphertext: "AAAAA" }, bob));
  await assert.rejects(() => decryptMessage({ ...original, nonce: "!" }, bob));
  await assert.rejects(() => decryptMessage({ ...original, tag: "!" }, bob));
  await assert.rejects(() => decryptMessage({ ...original, ciphertext: 123 as unknown as string }, bob));
  assert.equal(await decryptMessage(original, bob), "Hello Bob!");
});

test("Rejects plaintext over the 1 MiB educational message limit", async () => {
  const { alice } = await establishPair();
  await assert.rejects(
    () => encryptMessage("A".repeat(MAX_MESSAGE_BYTES + 1), alice, 1),
    /size limit/
  );
});
