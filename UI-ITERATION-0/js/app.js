/*
 * app.js — UI controller for the INSE-6110 Secure Messaging demo.
 * Wires the DOM to crypto.js and channel.js: channel establishment,
 * two-party chat, the wire/attacker view, tamper demo, and the perf panel.
 */

import * as C from './crypto.js';
import { Party, handshake, mitmHandshake } from './channel.js';

const $ = (id) => document.getElementById(id);

const state = {
  mode: 'authenticated',   // 'authenticated' | 'unauthenticated'
  mitm: false,
  established: false,
  alice: null,
  bob: null,
  mallory: null,
  keyEstMs: null,
};

/* ------------------------------------------------------------------ Self-test */
async function runSelfTest() {
  const banner = $('selftest-banner');
  try {
    const r = await C.selfTest();
    if (r.allPassed) {
      banner.className = 'banner banner-ok';
      banner.textContent =
        `Crypto self-test passed ✓  —  X25519 ✓  HKDF-SHA-256 ✓  AES-256-GCM ✓  Ed25519 ✓ (backend: ${r.ed25519Backend})`;
    } else {
      banner.className = 'banner banner-bad';
      banner.textContent = `Crypto self-test FAILED: ${JSON.stringify(r)}`;
    }
  } catch (e) {
    banner.className = 'banner banner-bad';
    banner.textContent = `Crypto unavailable in this browser: ${e.message}. Use a recent Chrome/Edge/Firefox/Safari over http://localhost.`;
  }
}

/* ------------------------------------------------------------------ Toggles */
function wireToggles() {
  $('auth-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    state.mode = btn.dataset.mode;
    setActive('auth-toggle', btn);
    if (state.established) resetChannel();
  });
  $('mitm-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    state.mitm = btn.dataset.mitm === 'on';
    setActive('mitm-toggle', btn);
    if (state.established) resetChannel();
  });
  $('establish-btn').addEventListener('click', establishChannel);
  $('reset-btn').addEventListener('click', resetChannel);
  $('bench-btn').addEventListener('click', runBenchmark);
  $('composer-alice').addEventListener('submit', (e) => { e.preventDefault(); sendMessage('alice'); });
  $('composer-bob').addEventListener('submit', (e) => { e.preventDefault(); sendMessage('bob'); });
}

function setActive(groupId, btn) {
  for (const b of $(groupId).querySelectorAll('.toggle-btn')) b.classList.remove('active');
  btn.classList.add('active');
}

/* ------------------------------------------------------------------ Establish */
async function establishChannel() {
  resetChannel(true);
  $('establish-btn').disabled = true;

  const alice = await new Party('Alice').initIdentity();
  const bob = await new Party('Bob').initIdentity();
  state.alice = alice;
  state.bob = bob;

  // Fingerprints
  $('fingerprints').hidden = false;
  $('fp-alice').textContent = alice.identityFingerprint;
  $('fp-bob').textContent = bob.identityFingerprint;

  $('handshake').hidden = false;
  const logEl = $('handshake-log');
  logEl.innerHTML = '';

  const t0 = performance.now();
  let result, mitmResult = null;

  if (state.mitm) {
    const mallory = await new Party('Mallory').initIdentity();
    state.mallory = mallory;
    mitmResult = await mitmHandshake(alice, bob, mallory, state.mode);
    result = { log: mitmResult.log, success: !mitmResult.detected && mitmResult.attackSucceeded };
  } else {
    result = await handshake(alice, bob, state.mode);
  }
  const t1 = performance.now();
  state.keyEstMs = t1 - t0;
  $('m-keyest').textContent = `${state.keyEstMs.toFixed(2)} ms`;

  // Render log
  for (const entry of result.log) {
    const li = document.createElement('li');
    li.textContent = entry.text;
    if (entry.ok === true) li.classList.add('ok');
    if (entry.ok === false) li.classList.add('bad');
    logEl.appendChild(li);
  }

  // Fingerprint-check card + status pill
  const fpCheck = $('fp-check');
  const statusPill = $('handshake-status');
  const keyLabel = $('session-key-label');

  if (state.mitm && state.mode === 'authenticated') {
    // Attack detected -> handshake rejected
    fpCheck.className = 'fp-card fp-check bad';
    $('fp-check-icon').textContent = '🛑';
    $('fp-check-text').textContent = 'MITM detected: transcript signature invalid';
    statusPill.className = 'status-pill bad';
    statusPill.textContent = 'Handshake REJECTED — MITM detected';
    keyLabel.textContent = '';
    $('chat-area').hidden = true;
    $('establish-btn').disabled = false;
    state.established = false;
    return;
  }

  if (state.mitm && state.mode === 'unauthenticated') {
    fpCheck.className = 'fp-card fp-check bad';
    $('fp-check-icon').textContent = '😈';
    $('fp-check-text').textContent = 'Mallory sits in the middle (undetected)';
    statusPill.className = 'status-pill warn';
    statusPill.textContent = 'Channel established — but COMPROMISED by Mallory';
    keyLabel.textContent = `Alice↔Mallory key: ${hex12(state.alice.sessionKeyRaw)}  |  Mallory↔Bob key: ${hex12(state.bob.sessionKeyRaw)}`;
  } else {
    fpCheck.className = 'fp-card fp-check ok';
    $('fp-check-icon').textContent = '✅';
    $('fp-check-text').textContent = state.mode === 'authenticated'
      ? 'Fingerprints verified; handshake signed'
      : 'Fingerprints verified out-of-band';
    statusPill.className = 'status-pill ok';
    statusPill.textContent = state.mode === 'authenticated'
      ? 'Secure channel established (authenticated)'
      : 'Secure channel established (unauthenticated)';
    keyLabel.textContent = `Session key: ${C.bytesToHex(state.alice.sessionKeyRaw)}`;
  }

  // Ready to chat
  $('chat-area').hidden = false;
  $('messages-alice').innerHTML = '';
  $('messages-bob').innerHTML = '';
  $('wire').innerHTML = '';
  state.established = true;
  $('establish-btn').disabled = false;
}

function hex12(bytes) { return C.bytesToHex(bytes).slice(0, 24) + '…'; }

/* ------------------------------------------------------------------ Messaging */
async function sendMessage(from) {
  if (!state.established) return;
  const inputEl = from === 'alice' ? $('input-alice') : $('input-bob');
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';

  const sender = from === 'alice' ? state.alice : state.bob;
  const recipient = from === 'alice' ? state.bob : state.alice;
  const tamper = $('tamper-toggle').checked;

  appendMsg(from, 'out', text, 'encrypting with AES-256-GCM…');

  // Encrypt with sender's session key
  let packet = await sender.encrypt(text);
  const ctHex = C.bytesToHex(packet.ciphertext);

  // --- The wire / attacker view ---
  if (state.mitm && state.mode === 'unauthenticated') {
    // Mallory is in the middle. She decrypts with her session with the sender,
    // reads the plaintext, then re-encrypts with her session to the recipient.
    const malloryKeyParty = (from === 'alice') ? state.mallory : state.mallory.bobSideParty;
    const relayParty = (from === 'alice') ? state.mallory.bobSideParty : state.mallory;
    let intercepted = '(could not decrypt)';
    try { intercepted = await malloryKeyParty.decrypt(packet.iv, packet.ciphertext); } catch {}
    addWirePacket({
      dir: `${sender.name} → [Mallory] → ${recipient.name}`,
      ct: ctHex,
      intercepted,
    });
    // Mallory re-encrypts (optionally tampering) and forwards.
    let relayText = tamper ? intercepted + ' [ALTERED]' : intercepted;
    packet = await relayParty.encrypt(relayText);
  } else {
    // Honest path: optionally tamper the ciphertext on the wire.
    addWirePacket({ dir: `${sender.name} → ${recipient.name}`, ct: ctHex, tampered: tamper });
    if (tamper) packet.ciphertext[0] ^= 0x01; // flip one byte
  }

  // Encrypt timing metric (for the honest path)
  // Decrypt at recipient
  try {
    const t0 = performance.now();
    const plain = await recipient.decrypt(packet.iv, packet.ciphertext);
    const t1 = performance.now();
    $('m-dec').textContent = `${(t1 - t0).toFixed(3)} ms`;
    appendMsg(from === 'alice' ? 'bob' : 'alice', 'in', plain,
      `decrypted ✓ (${packet.ciphertext.length} B ciphertext)`);
  } catch (err) {
    appendMsg(from === 'alice' ? 'bob' : 'alice', 'fail',
      `⚠ Decryption FAILED — AES-GCM authentication tag rejected the message (tampering detected).`, '');
  }

  // overhead metric
  const ptLen = C.utf8ToBytes(text).length;
  const ctLen = packet.ciphertext.length + packet.iv.length;
  $('m-overhead').textContent = `+${ctLen - ptLen} B (iv+tag)`;
  $('tamper-toggle').checked = false;
}

function appendMsg(party, kind, text, meta) {
  const box = party === 'alice' ? $('messages-alice') : $('messages-bob');
  const div = document.createElement('div');
  div.className = `msg ${kind}`;
  div.textContent = text;
  if (meta) {
    const m = document.createElement('span');
    m.className = 'meta';
    m.textContent = meta;
    div.appendChild(m);
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function addWirePacket({ dir, ct, intercepted, tampered }) {
  const wire = $('wire');
  const div = document.createElement('div');
  div.className = 'wire-packet';
  if (intercepted !== undefined) div.classList.add('intercepted');
  if (tampered) div.classList.add('tampered');
  const dirEl = document.createElement('span');
  dirEl.className = 'dir';
  dirEl.textContent = tampered ? dir + '  ⚠ TAMPERED' : dir;
  div.appendChild(dirEl);
  const ctEl = document.createElement('span');
  ctEl.className = 'ct';
  ctEl.textContent = 'ciphertext: ' + ct.slice(0, 64) + (ct.length > 64 ? '…' : '');
  div.appendChild(ctEl);
  if (intercepted !== undefined) {
    const p = document.createElement('span');
    p.className = 'plain';
    p.textContent = `😈 Mallory reads: "${intercepted}"`;
    div.appendChild(p);
  }
  wire.appendChild(div);
  wire.scrollTop = wire.scrollHeight;
}

/* ------------------------------------------------------------------ Reset */
function resetChannel(keepControls) {
  state.established = false;
  state.alice = state.bob = state.mallory = null;
  if (!keepControls) {
    $('fingerprints').hidden = true;
    $('handshake').hidden = true;
    $('chat-area').hidden = true;
  }
  $('messages-alice').innerHTML = '';
  $('messages-bob').innerHTML = '';
  $('wire').innerHTML = '';
}

/* ------------------------------------------------------------------ Benchmark */
async function runBenchmark() {
  const sizes = [64, 256, 1024, 4096];
  const trials = 50;
  const body = $('bench-body');
  body.innerHTML = '';
  $('bench-table').hidden = false;

  // Fresh honest session for clean measurement
  const a = await new Party('A').initIdentity();
  const b = await new Party('B').initIdentity();
  await handshake(a, b, 'authenticated');

  for (const size of sizes) {
    const payload = 'x'.repeat(size);
    let encTotal = 0, decTotal = 0, ctSize = 0;
    for (let i = 0; i < trials; i++) {
      const te0 = performance.now();
      const pkt = await a.encrypt(payload);
      const te1 = performance.now();
      encTotal += te1 - te0;
      ctSize = pkt.ciphertext.length + pkt.iv.length;
      const td0 = performance.now();
      await b.decrypt(pkt.iv, pkt.ciphertext);
      const td1 = performance.now();
      decTotal += td1 - td0;
    }
    const overhead = ctSize - size;
    const row = document.createElement('tr');
    row.innerHTML =
      `<td>${size >= 1024 ? (size / 1024) + ' KB' : size + ' B'}</td>` +
      `<td>${(encTotal / trials).toFixed(3)} ms</td>` +
      `<td>${(decTotal / trials).toFixed(3)} ms</td>` +
      `<td>${ctSize} B</td>` +
      `<td>+${overhead} B</td>`;
    body.appendChild(row);
  }
  $('m-keyest').textContent = state.keyEstMs ? `${state.keyEstMs.toFixed(2)} ms` : '~ (see table)';
}

/* ------------------------------------------------------------------ Boot */
runSelfTest();
wireToggles();
