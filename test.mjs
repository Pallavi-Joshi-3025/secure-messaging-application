/*
 * test.mjs — Headless verification of the crypto + channel logic under Node.
 * Browsers expose globalThis.crypto natively; Node 18 needs the polyfill below
 * (globalThis.crypto became default in Node 19+). Run with:  node test.mjs
 */
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const C = await import('./js/crypto.js');
const { Party, handshake, mitmHandshake } = await import('./js/channel.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}
const mk = async (n) => new Party(n).initIdentity();

console.log('\n[1] Crypto primitive self-test');
const st = await C.selfTest();
check('X25519 shared secret agrees', st.x25519);
check('AES-256-GCM round trip', st.aesgcm);
check('Ed25519 sign/verify', st.ed25519);

console.log('\n[2] Normal handshake (unauthenticated)');
let a = await mk('Alice'), b = await mk('Bob');
let r = await handshake(a, b, 'unauthenticated');
check('session keys match', r.keysMatch);
let p = await a.encrypt('hello bob');
check('message round-trips', (await b.decrypt(p.iv, p.ciphertext)) === 'hello bob');

console.log('\n[3] Normal handshake (authenticated)');
a = await mk('Alice'); b = await mk('Bob');
r = await handshake(a, b, 'authenticated');
check('authenticated handshake succeeds', r.success);

console.log('\n[4] AES-GCM tamper detection');
a = await mk('Alice'); b = await mk('Bob');
await handshake(a, b, 'authenticated');
p = await a.encrypt('integrity');
p.ciphertext[0] ^= 0x01;
let threw = false;
try { await b.decrypt(p.iv, p.ciphertext); } catch { threw = true; }
check('tampered ciphertext is rejected', threw);

console.log('\n[5] MITM on UNAUTHENTICATED exchange (attack succeeds)');
a = await mk('Alice'); b = await mk('Bob'); let m = await mk('Mallory');
let u = await mitmHandshake(a, b, m, 'unauthenticated');
check('attack succeeds', u.attackSucceeded && !u.detected);
let e = await a.encrypt('secret for bob');
let read = await m.decrypt(e.iv, e.ciphertext);
check('Mallory reads plaintext', read === 'secret for bob');
let relay = await m.bobSideParty.encrypt(read);
check('Mallory relays to Bob', (await b.decrypt(relay.iv, relay.ciphertext)) === 'secret for bob');

console.log('\n[6] MITM on AUTHENTICATED exchange (attack detected)');
a = await mk('Alice'); b = await mk('Bob'); m = await mk('Mallory');
let d = await mitmHandshake(a, b, m, 'authenticated');
check('attack detected and rejected', d.detected && !d.attackSucceeded);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
