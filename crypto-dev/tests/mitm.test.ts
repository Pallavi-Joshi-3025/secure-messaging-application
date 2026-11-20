import test from "node:test";
import assert from "node:assert/strict";
import { generateExchangeKeyPair, calculateSharedSecret } from "../src/keyExchange.js";
import { asBuffer, fromBase64, utf8, readUtf8 } from "../src/encoding.js";
import { establishPair } from "./helpers.js";
import { finishHandshake } from "../src/handshake.js";

/** DEMO ONLY: intentionally INSECURE unsigned exchange is NOT exported for production. */
async function insecureAesKey(secret: Uint8Array): Promise<CryptoKey> {
  const hkdf = await crypto.subtle.importKey("raw", asBuffer(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: asBuffer(utf8("INSECURE-DEMO-SALT")), info: asBuffer(utf8("DEMO")) },
    hkdf, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

test("Unauthenticated MITM can decrypt Alice's message and re-encrypt it for Bob", async () => {
  const alice = await generateExchangeKeyPair();
  const bob = await generateExchangeKeyPair();
  const malloryToAlice = await generateExchangeKeyPair();
  const malloryToBob = await generateExchangeKeyPair();
  const [a, ma, b, mb] = await Promise.all([
    calculateSharedSecret(alice.privateKey, malloryToAlice.publicKeyBase64),
    calculateSharedSecret(malloryToAlice.privateKey, alice.publicKeyBase64),
    calculateSharedSecret(bob.privateKey, malloryToBob.publicKeyBase64),
    calculateSharedSecret(malloryToBob.privateKey, bob.publicKeyBase64)
  ]);
  assert.deepEqual(a, ma);
  assert.deepEqual(b, mb);
  assert.notDeepEqual(a, b);
  const aliceKey = await insecureAesKey(a);
  const malloryAliceKey = await insecureAesKey(ma);
  const bobKey = await insecureAesKey(b);
  const malloryBobKey = await insecureAesKey(mb);
  const iv1 = crypto.getRandomValues(new Uint8Array(12));
  const alicePayload = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(iv1) }, aliceKey, asBuffer(utf8("Hello Bob")));
  const intercepted = readUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuffer(iv1) }, malloryAliceKey, alicePayload)));
  assert.equal(intercepted, "Hello Bob");
  const iv2 = crypto.getRandomValues(new Uint8Array(12));
  const malloryPayload = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(iv2) }, malloryBobKey, asBuffer(utf8(intercepted)));
  const bobReads = readUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuffer(iv2) }, bobKey, malloryPayload)));
  assert.equal(bobReads, "Hello Bob");
});

test("Authenticated handshake refuses the corresponding substituted key", async () => {
  const p = await establishPair();
  const mallory = await generateExchangeKeyPair();
  const pinnedBob = (await p.aliceTrust.get("bob"))!;
  const fake = { ...p.responder.hello, ephemeralPublicKey: mallory.publicKeyBase64 };
  await assert.rejects(() => finishHandshake(p.initiator, p.initiator.hello, fake, p.bobSig, pinnedBob));
});
