# INSE 6110 — CipherChat browser cryptography module

This is a **replacement for the earlier Node.js-only `crypto-dev` prototype**, derived from the team's uploaded proposal and Hari Krishna's nine-page architecture. It does **not** change either `UI-ITERATION` folder.

## What it implements

- **Ed25519:** Non-extractable browser identity private keys, signatures, peer public-key fingerprint checks/pinning.
- **X25519:** Fresh ephemeral key agreement per handshake.
- **HKDF-SHA-256:** Session-bound, separate *initiator→responder* and *responder→initiator* AES-256 keys.
- **AES-256-GCM:** Browser encryption/decryption with 12-byte secure random nonces, 16-byte tags, and authenticated metadata (`version`, `conversationId`, `sessionId`, `senderId`, `sequence`).
- **Anti-replay:** Strictly increasing per-sender sequence values (Hari's page-8 rule), atomic IndexedDB counter updates, and rejection of stale packets.
- **Web Crypto + IndexedDB:** All `src/` files are browser-compatible; no `node:crypto` or server-held private key.
- **Attack demos:** A *test-only*, intentionally unauthenticated MITM relay plus rejection when trusted Ed25519 identities are used.
- **Experiments:** 64, 256, 1024 and 4096 byte messages, timing, ciphertext overhead and attack tests.

## Setup on Windows (Step by step)

1. Back up your old `crypto-dev` folder to `crypto-dev-old` (do **not** upload that folder to GitHub).
2. Copy the **new** `crypto-dev` folder from the ZIP into the root of `secure-messaging-application`.
3. Keep both `UI-ITERATION-0` and `UI-ITERATION-1` untouched.
4. Open VS Code terminal from the new `crypto-dev` folder.
5. Execute:

```cmd
npm install
npm run typecheck
npm test
npm run demo
npm run benchmark
```

To run the **real browser demo**, compile and serve with:

```cmd
npm run build
npm run browser-demo
```

Open **http://localhost:4173/demo/browser.html** in Chrome and click **Run local browser demo**. You should see a successful decrypted message and rejected replay/tampering. Use `Ctrl+C` to stop the server. Do not test from `file://` URLs.

## Project file map

| File | Purpose |
|---|---|
| `src/identity.ts` | Ed25519 identity, signature, verified fingerprint pinning |
| `src/keyExchange.ts` | X25519 ephemeral key pairs and shared secret |
| `src/handshake.ts` | Canonical signed handshake and authenticated session establishment |
| `src/session.ts` | HKDF directional AES-256 keys |
| `src/encryption.ts` | AES-GCM encrypt/decrypt, correct metadata/AAD |
| `src/replayProtection.ts` | Strict sequence numbers, sender/receiver wrapper |
| `src/browserStorage.ts` | Browser IndexedDB for non-extractable keys, peer pins, replay state |
| `src/index.ts` | Module public exports |
| `tests/*.test.ts` | Automated algorithm, tamper, MITM, replay, handshake tests |
| `demo/secureMessaging.ts` | Alice/Bob local example |
| `demo/benchmark.ts` | Repeat measurements at required message sizes |
| `demo/browser.html` | Actual Web Crypto browser smoke demo |
| `sql/supabase.sql` | Starter Supabase tables and RLS for Aniket to review |
| `docs/ANIKET_HANDOFF.md` | Exact integration guide; app and Supabase tasks remain with Aniket |
| `docs/REQUIREMENTS_MATRIX.md` | Proposal + diagram mapping, limitations |

## Security limitations: READ BEFORE DEPLOYING

This is a **teaching prototype** and **not** an independently audited, production-secure messaging application.

- Browser private identity keys are non-extractable and may be stored via IndexedDB; that does **not** protect against malicious browser scripts/XSS or a compromised device.
- A user **must manually verify the other user's public-key fingerprint via an independent trusted channel**. Do not automatically trust a key or fingerprint returned by Supabase.
- Handshakes require both users to be available (or a correctly implemented relay); session keys are memory-only. After refresh, **perform a fresh authenticated handshake**. Previous-session ciphertext cannot be decrypted in this initial prototype.
- Replayed packets with `sequence <= lastSeen` are rejected; valid delayed/out-of-order messages are also rejected under the exact diagram policy.
- Supabase integration, authentication, Realtime, row-level security, key registration, app UI and live two-browser integration are **not in this module**. They must be implemented/tested by Aniket and the team.
- Random 12-byte GCM nonces follow the architecture; nonce collisions have very low probability, not mathematical impossibility. Rekey per session and enforce reasonable session message limits; never restore an old key together with reset send state.
- No Double Ratchet, historical forward secrecy beyond ephemeral-session assumptions, multi-device backup or advanced recovery. Old ciphertext is not recoverable after a full page reload.
- The two-person local test knows identities in advance; it does not model a real trusted verification channel.
- Do not upload `node_modules`, `.env` files, secrets, tokens, or private keys.

## GitHub branch

From **repository root**, while on branch `feature/yusra-crypto-dev`:

```cmd
git status
git add crypto-dev
git diff --cached --stat
git commit -m "Add tested browser-compatible CipherChat crypto module"
git push -u origin feature/yusra-crypto-dev
```

Review `git diff --cached --stat` **before** committing. The root `.gitignore` or nested `crypto-dev/.gitignore` must exclude `node_modules/` and `dist/`. Open a pull request; do not merge into `main` without teammate review.

## Academic integrity

The course outline requires an AI-use appendix including content produced by AI and the prompts used. Keep your conversation prompts and identify generated code/assistance. Have each member review and understand their contributions.
