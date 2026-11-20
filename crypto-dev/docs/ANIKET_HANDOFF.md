# Aniket handoff — CipherChat / Next.js Pages Router + Supabase

**Do not place identity private keys, plaintext messages, or session keys in Supabase or Next.js API routes.** All cryptographic functions execute in a React browser client, on a secure origin (`https://` or `localhost`). The UI layout can remain unchanged.

## Division of responsibilities

- **Yusra:** Files in `crypto-dev/src`: key generation, signatures, authenticated handshake, AES-GCM, security tests, browser storage.
- **Aniket:** Supabase project configuration + Auth, SQL/RLS, identity public-key registration, handshake relay, conversation IDs, send/receive events, UI function calls and error handling.
- **Team:** Two actual browser accounts, manual fingerprint verification, integration tests, presentation measurements.

## Shared data contracts (must match the database)

Use Supabase UUID strings as `conversationId`, `sessionId` and `senderId`; do not trust arbitrary identities sent in the JSON payload without comparing to `supabase.auth.getUser()` and existing conversation membership.

`HandshakeHello` fields:

```ts
{
  protocol: "CipherChat-v1", conversationId, sessionId,
  role: "initiator" | "responder", senderId, recipientId,
  ephemeralPublicKey, nonce
}
```

`EncryptedMessage` fields (CamelCase in code; snake_case in SQL):

```ts
{
  version: 1, conversationId, sessionId, senderId, sequence,
  nonce, ciphertext, tag
}
```

AES-GCM Additional Authenticated Data (AAD) is **exactly** JSON of the ordered array:

`[1, conversationId, sessionId, senderId, sequence]`.

When converting Supabase rows to `EncryptedMessage`, map `conversation_id → conversationId`, etc., and convert SQL `bigint` sequence to a safe JavaScript integer (in the small classroom prototype). Never allow metadata reformatting or incorrect sender IDs.

## Stage 1 — Login and identity enrollment

1. Supabase Auth signs in a browser user and provides the immutable UUID `user.id`.
2. Call `new BrowserIdentityStore().get(user.id)`. If absent, call `generateIdentityKeyPair()` then `.save(user.id, pair)`.
3. Upload **only** `pair.publicKeyBase64` to `identity_keys` for that authenticated UUID. Never export/upload `pair.privateKey`.
4. If user changes browsers or clears storage, prior private keys are lost. The initial prototype should display a warning and require a deliberate identity re-enrollment/re-verification process.

## Stage 2 — Verification, key exchange and relay

1. Alice retrieves Bob's public identity key from `identity_keys`.
2. UI shows Bob's SHA-256 fingerprint. Alice checks that fingerprint **independently**, e.g. speaking in person or comparing a QR code on Bob's device. Do **not** auto-confirm the fingerprint returned by the same Supabase query.
3. After confirmation, call `confirmPeerFingerprint(new BrowserTrustStore(aliceId), bobId, bobPublicKey, userConfirmedFingerprint)`.
4. Alice calls `startHandshake(aliceId, bobId, conversationId)` and posts its `hello` to `handshake_events` with kind `hello`.
5. Bob retrieves Alice's hello, verifies the claimed `senderId` equals the actual authenticated sender/row sender, and calls `respondHandshake(bobId, aliceHello)`; posts his hello.
6. **Both** build the same transcript; each calls `signHandshake(aliceHello, bobHello, localIdentity.privateKey)`. Post each signature event to `handshake_events` with kind `signature`.
7. Alice obtains Bob's signature; Bob obtains Alice's. Both load their **previously verified/pinned** peer records from `new BrowserTrustStore(localAuthenticatedUserId)`, then call `finishHandshake(localHandshakeState, aliceHello, bobHello, peerSignature, trustedPeerRecord)`.
8. Session private keys remain in active browser memory. An invalid/untrusted signature aborts the session. Do not keep using a previous session after reconnect unless its replay/nonce state is also guaranteed intact.

> Handshake relay must authenticate sender IDs using Supabase Auth and RLS, and must verify the peer name against the pinned identity. The browser is the security boundary for signatures, not the database. Real app still needs timeout/retry/error handling and an explicit key-confirmation message for stronger assurances.

## Stage 3 + 4 — Encrypt before sending; store only ciphertext

```ts
import { SecureMessenger } from "./path-to-crypto-dev/src/replayProtection";
import { BrowserSequenceStore } from "./path-to-crypto-dev/src/browserStorage";

// Called INSIDE a browser event handler after authenticated handshake:
const messenger = new SecureMessenger(session, new BrowserSequenceStore());
const envelope = await messenger.send("Hello Bob!");
// Upload only envelope fields to public.encrypted_messages via Supabase client.
// Convert camelCase keys to SQL snake_case. No plaintext in the insert.
```

For the full Next.js application, adjust the relative import path to match the eventual folder structure. This is an integration illustration, not a ready-made UI file. Supabase RLS should allow only conversation members to read or insert their own rows.

## Stage 5 — Receive and decrypt only after verification

```ts
// Convert Supabase row to EncryptedMessage, then:
try {
  const plaintext = await messenger.receive(envelope);
  // Display plaintext in the chat screen only now.
} catch {
  // Render "Could not verify message" or "Replay/out-of-order rejected".
  // Do NOT display unverified ciphertext as plaintext.
}
```

Only the browser with the current active session key can decrypt that session's messages. With the present no-recovery design, new sessions after refresh do not decrypt older messages. This must be explicit to the professor.

## Required security and functionality testing

1. Two different authenticated browser accounts, manually compared key fingerprints.
2. Both browsers generate matching cross-direction keys, with no key visible in Supabase.
3. Plaintext typed into Alice's browser must **never** appear in Supabase database rows or network JSON payloads.
4. 64 B, 256 B, 1 KB and 4 KB roundtrips; nonce/tag/AAD tampering rejected.
5. Incorrect fingerprint/signature aborts handshake.
6. Test-only MITM simulation succeeds unsigned but fails signed; never turn off authentication in the real chat.
7. Duplicate sequence, older sequence, wrong sender and wrong session rejected.
8. Reload/reconnect: fresh signed handshake; previous session messages are not recoverable unless a separate secure recovery design is developed.
9. Database RLS: use two allowed accounts and one unauthorized account to verify select/insert are denied to outsiders.
10. Measure encryption/decryption and handshake time in the browser with `performance.now()`; note the hardware/browser used.

## SQL handoff

`sql/supabase.sql` is a **starter** schema/policy set for a test Supabase project. Aniket must review and run it in the SQL Editor, enroll conversation members, enable appropriate Realtime publications, and test RLS with multiple real Auth users. SQL alone does not implement registration, handshake relay, chat or fingerprint verification.

## Deployment reminders

- Keep Supabase service-role secret on trusted server only, never client-side.
- Only use client-side Supabase anon/publishable key with RLS enabled.
- `getUser()` is preferable to trusting a browser-supplied user ID.
- Browser cryptography must not run in server-side rendering or a Next.js API route.
- Test Chromium-based browsers and any additional target browsers individually for Ed25519/X25519 Web Crypto support.
- Use HTTPS for deployment and secure CSP. Browser XSS can defeat E2EE even with non-extractable keys.


## Security update — trust-store account isolation (Yusra Step 25)

Create `new BrowserTrustStore(currentAuthenticatedUser.id)` **after** obtaining the account ID from Supabase Auth. Do not pass a URL parameter or a peer-supplied ID as the owner. Trust pins for different signed-in accounts are now separate. Prior unscoped `trustedPeers` records are intentionally ignored; re-verify fingerprints for each local account. This prevents accidental cross-account trust reuse, **not** malicious same-origin JavaScript from accessing IndexedDB.
