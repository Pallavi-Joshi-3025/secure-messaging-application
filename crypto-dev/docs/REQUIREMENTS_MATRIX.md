# Requirements traceability — uploaded course outline, proposal, and Hari's architecture

| Source requirement | Where addressed | Remaining dependency |
|---|---|---|
| INSE 6110: design secure communication system | `src/handshake.ts`, `src/session.ts`, `src/encryption.ts`; browser demo | App integration, final report/workflow diagrams |
| Implement encryption and decryption | `src/encryption.ts`; `tests/crypto.test.ts` | Wire into chat UI |
| User authentication | `src/identity.ts` Ed25519 signatures, fingerprint pinning | Supabase Auth; display trusted fingerprint comparison |
| Stage 1: account registration, local private keys, public identity enrollment | `src/identity.ts`, `src/browserStorage.ts` | Aniket: Supabase Auth and key registration |
| Stage 2: fingerprint validation + signed X25519 handshake + HKDF | `src/identity.ts`, `src/handshake.ts`, `src/session.ts` | Actual signed relay between browsers |
| Stage 3: 12-byte nonce, AES-256-GCM | `src/encryption.ts` | UI call before upload |
| Stage 4: ciphertext only, Realtime, RLS | `sql/supabase.sql`; `docs/ANIKET_HANDOFF.md` | Aniket implements and tests Supabase relay |
| Stage 5: AES tag check + replay/sequence check | `src/encryption.ts`, `src/replayProtection.ts`, IndexedDB counter store | UI error marker, browser workflow tests |
| p.7 AAD: version, conv, sender, seq | `src/encryption.ts` ordered AAD; includes sessionId additionally for safe domain binding | Same serialization in Supabase converter |
| p.8 seq > lastSeen | `src/replayProtection.ts` strict last-seen policy, persisted in IndexedDB | Delayed legitimate messages rejected by design |
| p.9 message sizes 64/256/1024/4096 B | `tests/crypto.test.ts`, `demo/benchmark.ts` | Browser measurement for final report |
| p.9 tampering, unauthenticated MITM, authenticated MITM, replay | `tests/crypto.test.ts`, `tests/mitm.test.ts`, `tests/replay.test.ts` | Verify against live UI/network |
| Proposal: timing & overhead | `demo/benchmark.ts` | Repeated real browser measurements |
| Course: 20-minute presentation, 10-15 page report, ZIP, AI appendix | Team tasks | Not provided in this module |

## Intentional, documented differences from architecture

1. **AAD adds `sessionId`:** Hari listed `version, conv, sender, seq`. Adding authenticated `sessionId` helps prevent cross-session confusion and does not remove any specified field.
2. **Directional keys:** Session HKDF derives two separated AES keys instead of a single shared bidirectional AES key. This prevents the two sides from accidentally sharing a GCM nonce/key pair. Both are derived from the same authenticated X25519 handshake.
3. **Replay state lives in IndexedDB:** Improves on the initial in-memory demo and preserves page-level receiver reconstruction. A **fresh handshake after reload** is still required because ephemeral session keys are not recovered; historical messages remain inaccessible.
4. **Identity pinning is never automatic:** Correct cryptographic identity requires an independent trusted fingerprint comparison. The demo knows the reference keys by construction; that is not real onboarding.
5. **Random 12-byte AES-GCM nonces:** Matches Hari's diagram. This is probabilistic uniqueness. The demo assumes sessions are short and are always freshly rekeyed; it is not a high-volume, audited nonce lifecycle.

## Status as delivered

- `src/` is browser-targeted TypeScript with no Node-only crypto imports.
- Local compiled tests passed against Node 22 Web Crypto; automated real Chrome verification was not completed by the build environment.
- UI/Supabase integration is a separate team responsibility; do **not** call this ZIP a complete deployed application.
- This is an educational prototype, not production-safe E2EE or a formally verified cryptographic protocol.
