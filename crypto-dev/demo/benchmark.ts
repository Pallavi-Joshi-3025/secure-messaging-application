import { generateIdentityKeyPair, confirmPeerFingerprint, MemoryTrustStore } from "../src/identity.js";
import { startHandshake, respondHandshake, signHandshake, finishHandshake } from "../src/handshake.js";
import { encryptMessage, decryptMessage } from "../src/encryption.js";
import { utf8 } from "../src/encoding.js";

async function benchmark(): Promise<void> {
  const aliceIdentity = await generateIdentityKeyPair();
  const bobIdentity = await generateIdentityKeyPair();
  const trust = new MemoryTrustStore();
  const trustBack = new MemoryTrustStore();
  const bobTrusted = await confirmPeerFingerprint(trust, "bob", bobIdentity.publicKeyBase64, bobIdentity.fingerprint);
  const aliceTrusted = await confirmPeerFingerprint(trustBack, "alice", aliceIdentity.publicKeyBase64, aliceIdentity.fingerprint);
  const start = performance.now();
  const ai = await startHandshake("alice", "bob", "benchmark-conversation");
  const br = await respondHandshake("bob", ai.hello);
  const sigA = await signHandshake(ai.hello, br.hello, aliceIdentity.privateKey);
  const sigB = await signHandshake(ai.hello, br.hello, bobIdentity.privateKey);
  const alice = await finishHandshake(ai, ai.hello, br.hello, sigB, bobTrusted);
  const bob = await finishHandshake(br, ai.hello, br.hello, sigA, aliceTrusted);
  console.log(`Handshake + signing + verification: ${(performance.now() - start).toFixed(3)} ms`);
  console.log("Repeats: 20 per size (educational measurements, not production benchmarks)");
  console.log("Bytes | Encrypt avg ms | Decrypt avg ms | Envelope bytes | Overhead bytes");
  for (const bytes of [64, 256, 1024, 4096]) {
    const text = "A".repeat(bytes);
    let encMs = 0;
    let decMs = 0;
    let envelopeLength = 0;
    for (let i = 0; i < 20; i++) {
      const e0 = performance.now();
      const message = await encryptMessage(text, alice, i + 1);
      encMs += performance.now() - e0;
      const d0 = performance.now();
      const result = await decryptMessage(message, bob);
      decMs += performance.now() - d0;
      if (result !== text) throw new Error("Benchmark plaintext mismatch");
      envelopeLength = utf8(JSON.stringify(message)).length;
    }
    console.log(`${bytes} | ${(encMs / 20).toFixed(3)} | ${(decMs / 20).toFixed(3)} | ${envelopeLength} | ${envelopeLength - bytes}`);
  }
}
await benchmark();
