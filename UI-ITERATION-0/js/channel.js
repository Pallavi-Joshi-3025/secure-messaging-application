/*
 * channel.js — Secure-channel / handshake logic for the INSE-6110 demo.
 *
 * Models two parties (Alice, Bob) and an optional Mallory (man-in-the-middle).
 * Implements the proposal's workflow:
 *   1. Each party has a long-term Ed25519 identity key (fingerprint verified
 *      out-of-band). Each party generates an ephemeral X25519 key pair.
 *   2. Parties exchange ephemeral X25519 public keys. In AUTHENTICATED mode each
 *      party signs the handshake transcript with its Ed25519 identity key.
 *   3. Both derive a shared session key via X25519 + HKDF-SHA-256.
 *   4. Messages are encrypted with AES-256-GCM (fresh nonce per message).
 *
 * The MITM simulation shows why authentication matters:
 *   - UNAUTHENTICATED: Mallory swaps the ephemeral keys, establishing two
 *     separate sessions (Alice<->Mallory and Mallory<->Bob). She silently
 *     decrypts, reads, and re-encrypts every message. The attack SUCCEEDS.
 *   - AUTHENTICATED: Mallory cannot forge Ed25519 signatures over the ephemeral
 *     keys using the victims' identity keys, so the transcript signature check
 *     FAILS and the handshake is rejected. The attack is DETECTED.
 */

import * as C from './crypto.js';

/* A party owns a long-term Ed25519 identity key and a per-session X25519 key. */
export class Party {
  constructor(name) {
    this.name = name;
    this.identity = null;      // Ed25519 { publicKeyRaw, ... }
    this.ephemeral = null;     // X25519 { privateKey, publicKey, publicKeyRaw }
    this.sessionKey = null;    // AES-GCM CryptoKey
    this.sessionKeyRaw = null; // for display
    this.peerName = null;
  }

  async initIdentity() {
    this.identity = await C.generateEd25519KeyPair();
    this.identityFingerprint = await C.fingerprint(this.identity.publicKeyRaw);
    return this;
  }

  async newEphemeral() {
    this.ephemeral = await C.generateX25519KeyPair();
    return this.ephemeral.publicKeyRaw;
  }

  /* Build the canonical handshake transcript bytes that get signed/verified. */
  static transcript(initiatorName, responderName, initiatorEphPub, responderEphPub) {
    const parts = [
      C.utf8ToBytes('INSE6110-handshake-v1|'),
      C.utf8ToBytes(initiatorName + '|'),
      C.utf8ToBytes(responderName + '|'),
      initiatorEphPub,
      C.utf8ToBytes('|'),
      responderEphPub,
    ];
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  async signTranscript(transcript) {
    return C.ed25519Sign(this.identity, transcript);
  }

  /* Derive the session key from our ephemeral private key and the peer's ephemeral public key. */
  async deriveSession(peerEphPubRaw, salt, info) {
    const peerPub = await C.importX25519PublicKey(peerEphPubRaw);
    const shared = await C.x25519SharedSecret(this.ephemeral.privateKey, peerPub);
    this.sessionKey = await C.hkdfDeriveSessionKey(shared, salt, info);
    this.sessionKeyRaw = await C.hkdfDeriveBits(shared, salt, info, 256);
    return this.sessionKeyRaw;
  }

  async encrypt(plaintext) {
    const { iv, ciphertext } = await C.aesGcmEncrypt(this.sessionKey, C.utf8ToBytes(plaintext));
    return { iv, ciphertext };
  }

  async decrypt(iv, ciphertext) {
    const pt = await C.aesGcmDecrypt(this.sessionKey, iv, ciphertext);
    return C.bytesToUtf8(pt);
  }
}

/*
 * Perform a handshake between two parties with no attacker.
 * mode: 'authenticated' | 'unauthenticated'
 * Returns a structured log of each step plus whether the session keys match.
 */
export async function handshake(alice, bob, mode) {
  const log = [];
  const salt = C.randomBytes(16);
  const info = 'INSE6110-secure-messaging-v1';

  const aEph = await alice.newEphemeral();
  const bEph = await bob.newEphemeral();
  log.push({ step: 'ephemeral', text: `${alice.name} and ${bob.name} generate ephemeral X25519 key pairs and exchange public keys.` });

  if (mode === 'authenticated') {
    const tA = Party.transcript(alice.name, bob.name, aEph, bEph);
    const tB = Party.transcript(alice.name, bob.name, aEph, bEph);
    const sigA = await alice.signTranscript(tA);
    const sigB = await bob.signTranscript(tB);
    // Each verifies the other's signature over the SAME transcript (keys verified out-of-band).
    const okA = await C.ed25519Verify(bob.identity.publicKeyRaw, sigB, tA);
    const okB = await C.ed25519Verify(alice.identity.publicKeyRaw, sigA, tB);
    log.push({ step: 'sign', text: `Both parties sign the handshake transcript with their Ed25519 identity keys and verify each other's signature.` });
    if (!okA || !okB) {
      log.push({ step: 'reject', ok: false, text: `Signature verification FAILED — handshake rejected.` });
      return { success: false, log, keysMatch: false };
    }
    log.push({ step: 'verify', ok: true, text: `Ed25519 signatures valid — identities authenticated.` });
  }

  const aKey = await alice.deriveSession(bEph, salt, info);
  const bKey = await bob.deriveSession(aEph, salt, info);
  const keysMatch = C.bytesToHex(aKey) === C.bytesToHex(bKey);
  alice.peerName = bob.name; bob.peerName = alice.name;
  log.push({ step: 'derive', ok: keysMatch, text: `Both derive the AES-256-GCM session key via X25519 + HKDF-SHA-256. Keys match: ${keysMatch}.` });

  return { success: keysMatch, log, keysMatch, sessionKeyHex: C.bytesToHex(aKey) };
}

/*
 * Perform a handshake WITH a man-in-the-middle (Mallory).
 * Mallory sits between Alice and Bob and relays/alters the exchange.
 *
 * Returns { attackSucceeded, detected, log, sessions } describing the outcome.
 */
export async function mitmHandshake(alice, bob, mallory, mode) {
  const log = [];
  const salt = C.randomBytes(16);
  const info = 'INSE6110-secure-messaging-v1';

  // Alice and Bob each create ephemeral keys and send them "to the peer",
  // but Mallory intercepts and substitutes her own ephemeral keys.
  const aEph = await alice.newEphemeral();          // Alice -> (intended Bob)
  const bEph = await bob.newEphemeral();            // Bob   -> (intended Alice)
  const mEphForAlice = await mallory.newEphemeral();// Mallory presents this to Alice (pretends to be Bob)
  // Mallory needs a second ephemeral for the Bob side.
  const malloryBobSide = new Party(mallory.name + "(toBob)");
  const mEphForBob = await malloryBobSide.newEphemeral(); // Mallory presents this to Bob (pretends to be Alice)

  log.push({ step: 'intercept', text: `${mallory.name} intercepts the channel and substitutes her own ephemeral X25519 keys toward both ${alice.name} and ${bob.name}.` });

  if (mode === 'authenticated') {
    // Alice signs the transcript she believes she's in: (Alice, Bob, aEph, <what she received as Bob's eph>)
    // She received mEphForAlice (Mallory's key) believing it is Bob's.
    const aliceTranscript = Party.transcript(alice.name, bob.name, aEph, mEphForAlice);
    const aliceSig = await alice.signTranscript(aliceTranscript);

    // Bob likewise received mEphForBob believing it's Alice's.
    const bobTranscript = Party.transcript(alice.name, bob.name, mEphForBob, bEph);
    const bobSig = await bob.signTranscript(bobTranscript);

    // Mallory must convince Bob that the (Alice-named) side is authentic.
    // To do that she'd need a valid Ed25519 signature from ALICE over Bob's transcript
    // (which contains Mallory's ephemeral key mEphForBob). Mallory does NOT have
    // Alice's private identity key, so she cannot forge it. She can only forward
    // Alice's real signature, which is over a DIFFERENT transcript (contains mEphForAlice,
    // not mEphForBob). So Bob's verification uses Alice's identity key against the
    // transcript Bob sees:
    const bobSeesTranscript = Party.transcript(alice.name, bob.name, mEphForBob, bEph);
    const bobVerifiesAlice = await C.ed25519Verify(alice.identity.publicKeyRaw, aliceSig, bobSeesTranscript);

    const aliceSeesTranscript = Party.transcript(alice.name, bob.name, aEph, mEphForAlice);
    const aliceVerifiesBob = await C.ed25519Verify(bob.identity.publicKeyRaw, bobSig, aliceSeesTranscript);

    log.push({ step: 'sign', text: `${alice.name} and ${bob.name} sign their handshake transcripts with Ed25519. ${mallory.name} cannot forge their identity-key signatures.` });

    if (!bobVerifiesAlice || !aliceVerifiesBob) {
      log.push({ step: 'reject', ok: false, text: `Transcript signature check FAILED on the tampered keys — ${mallory.name}'s substitution is DETECTED and the handshake is rejected.` });
      return { attackSucceeded: false, detected: true, log };
    }
    // Would only reach here if signatures somehow verified (they won't).
    log.push({ step: 'verify', ok: true, text: `(Unexpected) signatures verified.` });
    return { attackSucceeded: true, detected: false, log };
  }

  // UNAUTHENTICATED: no signatures, so nobody notices the key substitution.
  // Alice<->Mallory session:
  await alice.deriveSession(mEphForAlice, salt, info);
  await mallory.deriveSession(aEph, salt, info);
  // Mallory(toBob)<->Bob session:
  await malloryBobSide.deriveSession(bEph, salt, info);
  await bob.deriveSession(mEphForBob, salt, info);

  const aliceMalloryMatch = C.bytesToHex(alice.sessionKeyRaw) === C.bytesToHex(mallory.sessionKeyRaw);
  const malloryBobMatch = C.bytesToHex(malloryBobSide.sessionKeyRaw) === C.bytesToHex(bob.sessionKeyRaw);

  log.push({ step: 'derive', ok: true, text: `No signatures to check. ${mallory.name} establishes TWO sessions: one with ${alice.name}, one with ${bob.name}. Alice<->Mallory keys match: ${aliceMalloryMatch}; Mallory<->Bob keys match: ${malloryBobMatch}.` });
  log.push({ step: 'compromised', ok: false, text: `${mallory.name} can now decrypt, read, and re-encrypt every message. The attack SUCCEEDS undetected.` });

  // Expose Mallory's two session keys so the UI can relay/decrypt.
  mallory.aliceSideKey = mallory.sessionKey;
  mallory.aliceSideKeyRaw = mallory.sessionKeyRaw;
  mallory.bobSideParty = malloryBobSide;

  return {
    attackSucceeded: true,
    detected: false,
    log,
    sessions: { aliceMalloryMatch, malloryBobMatch },
  };
}
