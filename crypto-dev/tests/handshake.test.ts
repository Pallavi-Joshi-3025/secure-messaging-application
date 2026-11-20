import test from "node:test";
import assert from "node:assert/strict";
import { establishPair } from "./helpers.js";
import { finishHandshake, handshakeTranscript, signHandshake } from "../src/handshake.js";
import { generateIdentityKeyPair } from "../src/identity.js";
import { generateExchangeKeyPair } from "../src/keyExchange.js";
import { decryptMessage, encryptMessage } from "../src/encryption.js";

test("Authenticated handshake derives complementary directional keys and supports both directions", async () => {
  const { alice, bob } = await establishPair();
  assert.equal(alice.sessionId, bob.sessionId);
  assert.equal(alice.conversationId, bob.conversationId);
  assert.equal(alice.sendKey.extractable, false);
  assert.equal(bob.sendKey.extractable, false);
  const toBob = await encryptMessage("Hello Bob", alice, 1);
  assert.equal(await decryptMessage(toBob, bob), "Hello Bob");
  const toAlice = await encryptMessage("Hello Alice", bob, 1);
  assert.equal(await decryptMessage(toAlice, alice), "Hello Alice");
  await assert.rejects(() => decryptMessage(toBob, alice));
});

test("Canonical transcript is invariant to incoming JSON property order", async () => {
  const { initiator, responder } = await establishPair();
  const reordered = Object.fromEntries(Object.entries(responder.hello).reverse()) as unknown as typeof responder.hello;
  assert.deepEqual(handshakeTranscript(initiator.hello, responder.hello), handshakeTranscript(initiator.hello, reordered));
});

test("Authenticated handshake detects substituted X25519 keys and forged Ed25519 signatures", async () => {
  const ownPair = await establishPair();
  const trustedBob = (await ownPair.aliceTrust.get("bob"))!;
  const mallory = await generateExchangeKeyPair();
  const fakeResponderHello = { ...ownPair.responder.hello, ephemeralPublicKey: mallory.publicKeyBase64 };
  await assert.rejects(() => finishHandshake(
    ownPair.initiator, ownPair.initiator.hello, fakeResponderHello,
    ownPair.bobSig, trustedBob
  ), /signature/i);
  const attacker = await generateIdentityKeyPair();
  const forged = await signHandshake(
    ownPair.initiator.hello, ownPair.responder.hello, attacker.privateKey
  );
  await assert.rejects(() => finishHandshake(
    ownPair.initiator, ownPair.initiator.hello, ownPair.responder.hello,
    forged, trustedBob
  ), /signature/i);
});

test("Handshake rejects changed session ID, wrong roles and wrong trusted user binding", async () => {
  const p = await establishPair();
  const trustedBob = (await p.aliceTrust.get("bob"))!;
  assert.throws(() => handshakeTranscript(p.initiator.hello, { ...p.responder.hello, sessionId: "other" }));
  assert.throws(() => handshakeTranscript(p.initiator.hello, { ...p.responder.hello, role: "initiator" }));
  await assert.rejects(() => finishHandshake(
    p.initiator, p.initiator.hello, p.responder.hello,
    p.bobSig, { ...trustedBob, userId: "mallory" }
  ), /identity/);
});
