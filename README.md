# Secure Messaging System — INSE 6110

An educational, browser-based **end-to-end-encrypted messaging** demo built for the
INSE 6110 (Foundations of Cryptography) project proposal. It implements the exact
cryptographic stack described in the proposal and provides interactive demonstrations
of normal messaging, message-tampering detection, and man-in-the-middle (MITM) attacks
comparing an **unauthenticated** key exchange against an **authenticated** one.

Everything runs **client-side in the browser** — no plaintext or private key ever
leaves the page. There is **nothing to install** and no build step.

## Cryptographic stack (as specified in the proposal)

| Primitive | Purpose | Standard | Implementation |
|-----------|---------|----------|----------------|
| **X25519** | Elliptic-curve key agreement | RFC 7748 | Web Crypto API (`SubtleCrypto`) |
| **HKDF-SHA-256** | Session-key derivation from the shared secret | RFC 5869 | Web Crypto API |
| **Ed25519** | Signatures authenticating the handshake | RFC 8032 | vendored [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519) (native `SubtleCrypto` when available) |
| **AES-256-GCM** | Authenticated encryption of messages | NIST SP 800-38D | Web Crypto API |

## Project layout

```
secure-messaging-application/
├── index.html              # UI
├── css/styles.css          # styling
├── js/
│   ├── crypto.js           # primitives: X25519, HKDF-SHA-256, Ed25519, AES-256-GCM
│   ├── channel.js          # handshake + MITM simulation (Alice, Bob, Mallory)
│   └── app.js              # UI controller (chat, wire view, tamper, benchmark)
├── vendor/
│   └── noble-ed25519.js    # self-contained Ed25519 (no external imports)
├── test.mjs                # headless verification of all crypto/attack scenarios
├── docs/
│   ├── flow-diagram.svg               # architecture + handshake flow diagram (open in a browser)
│   ├── flow-diagram.mmd               # Mermaid source for the diagram (editable)
│   ├── make_pptx.py                   # regenerates the slide deck (no dependencies)
│   └── INSE6110-Secure-Messaging.pptx # team presentation (12 slides)
├── Dockerfile              # nginx image serving the static app (port 8080)
├── .dockerignore
├── deploy/nginx.conf       # minimal nginx config (ES-module MIME + /healthz)
├── helm/secure-messaging/  # minimal Helm chart (Deployment, Service, optional Ingress)
└── package.json
```

## Team materials (diagram & slides)

- **Flow diagram:** open `docs/flow-diagram.svg` in any browser. It shows the three
  lanes (Alice / Wire / Bob), the five handshake phases, and the MITM comparison
  (unauthenticated succeeds vs authenticated detected). Edit via `docs/flow-diagram.mmd`
  at <https://mermaid.live>.
- **Presentation:** `docs/INSE6110-Secure-Messaging.pptx` — a 12-slide deck covering the
  problem, the build, the primitives, the handshake, tamper detection, the MITM result,
  architecture, performance, a live-demo script, limitations, and a summary. Opens in
  PowerPoint, Keynote, LibreOffice Impress, or Google Slides. Regenerate with
  `python3 docs/make_pptx.py`.

## Running the demo

A secure context is required for the Web Crypto API, which `http://localhost` satisfies.
Use any static file server. The simplest (no install) is Python's built-in server:

```bash
cd secure-messaging-application
python3 -m http.server 8000
```

Then open **http://localhost:8000/** in a recent **Chrome, Edge, Firefox, or Safari**.

> Opening `index.html` directly via `file://` will not work — ES modules and the
> Web Crypto API need an `http(s)` origin. Always serve it.

On load, a banner runs a crypto self-test and confirms all four primitives work in
your browser (including which Ed25519 backend is active).

## Headless verification (optional)

The cryptographic logic and all attack scenarios can be verified without a browser
(Node 18+). The test polyfills `globalThis.crypto`, which browsers provide natively.

```bash
node test.mjs
# 11 passed, 0 failed
```

## Running as a Docker container

The app is static, so the image just serves the assets with nginx (listening on 8080,
runs as non-root).

```bash
cd secure-messaging-application
docker build -t secure-messaging:1.0.0 .
docker run --rm -p 8080:8080 secure-messaging:1.0.0
# open http://localhost:8080/   (health check: http://localhost:8080/healthz)
```

## Deploying to Kubernetes with Helm

A minimal chart lives in `helm/secure-messaging`. First build and push the image to a
registry your cluster can pull from, then install the chart.

```bash
# 1. Build & push (replace <registry> with yours)
docker build -t <registry>/secure-messaging:1.0.0 .
docker push <registry>/secure-messaging:1.0.0

# 2. Install
helm install sm helm/secure-messaging \
  --set image.repository=<registry>/secure-messaging \
  --set image.tag=1.0.0

# 3. Reach it (ClusterIP by default)
kubectl port-forward svc/sm-secure-messaging 8080:80
# open http://localhost:8080/
```

Optionally expose it through an ingress controller:

```bash
helm install sm helm/secure-messaging \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host=secure-messaging.example.com
```

The chart renders a Deployment (with `/healthz` liveness/readiness probes and a hardened,
non-root security context), a Service, and an optional Ingress. Tune replicas, resources,
service type, and ingress in `helm/secure-messaging/values.yaml`.

## Demo script (for the presentation)

1. **Baseline — authenticated, no attacker.**
   Leave the defaults (*Authenticated (Ed25519)* + *No MITM*). Click
   **Establish Secure Channel**. Note the two identity fingerprints, the signed
   handshake log, and the single shared session key. Send messages from Alice and
   Bob; the "Wire" column shows only ciphertext while each side shows the decrypted
   plaintext.

2. **Tamper detection.**
   Tick **"Tamper with next ciphertext (flip a byte)"** and send a message. The
   recipient shows a red *Decryption FAILED* notice — the AES-256-GCM authentication
   tag rejects the modified ciphertext (integrity guarantee).

3. **MITM on an UNAUTHENTICATED exchange (the vulnerability).**
   Switch the key exchange to **Unauthenticated**, set the attacker to **Mallory (MITM)**,
   and re-establish. Two separate session keys appear (Alice↔Mallory and Mallory↔Bob).
   Send a message: the Wire column reveals **"Mallory reads: …"** — she silently
   decrypts, reads, and re-encrypts every message. The channel is compromised and
   nobody notices.

4. **MITM on an AUTHENTICATED exchange (the fix).**
   Switch the key exchange back to **Authenticated** while keeping Mallory on.
   Re-establish. The handshake is **REJECTED**: Mallory cannot forge Ed25519
   signatures over the substituted ephemeral keys using the victims' identity keys,
   so the transcript signature check fails. This is the core result the proposal sets
   out to demonstrate — authentication defeats the MITM.

5. **Performance & security metrics.**
   Click **Run Benchmark**. Using the Performance API it reports average encrypt/decrypt
   latency and ciphertext overhead across 64 B, 256 B, 1 KB, and 4 KB payloads, plus the
   measured key-establishment time.

## How the handshake works

1. Alice and Bob each hold a long-term **Ed25519 identity key**; their fingerprints are
   compared out-of-band (shown in the UI).
2. Each generates an ephemeral **X25519** key pair and they exchange public keys.
3. In **authenticated** mode each party signs the handshake transcript
   (`names ‖ ephemeral public keys`) with its Ed25519 identity key and verifies the
   other's signature.
4. Both derive the shared secret with X25519 and expand it into a 256-bit AES-GCM
   session key with **HKDF-SHA-256**.
5. Messages are encrypted with **AES-256-GCM** using a fresh 96-bit nonce per message;
   the 128-bit tag provides integrity.

Against a MITM, the unauthenticated exchange lets the attacker substitute her own
ephemeral keys and establish two sessions. The authenticated exchange binds the
ephemeral keys to the identity keys via the signature, which the attacker cannot forge.

## Scope and limitations

This is an educational prototype, not production software. In line with the proposal it
does **not** implement the full Signal Double Ratchet, multi-device support, or key
recovery. Its security depends on correct identity verification, private-key protection,
nonce uniqueness, and trustworthy client code. The MITM "attacker" and the two-party
chat are simulated within a single page so the cryptographic behaviour can be observed
directly.

## References

- [1] Marlinspike & Perrin, *The X3DH Key Agreement Protocol*, Signal, 2016.
- [2] Perrin & Marlinspike, *The Double Ratchet Algorithm*, Signal.
- [3] RFC 7748 — *Elliptic Curves for Security* (X25519).
- [4] RFC 5869 — *HKDF*.
- [5] RFC 8032 — *EdDSA* (Ed25519).
- [6] NIST SP 800-38D — *GCM and GMAC*.
- [7] MDN — *Performance: now()*.
