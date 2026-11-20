/** Browser-only storage. IndexedDB stores non-extractable CryptoKey objects via structured clone. */
import type { IdentityKeyPair, TrustedPeerRecord, TrustStore } from "./identity.js";
import type { SequenceStore } from "./replayProtection.js";
import { validId, validSequence } from "./encoding.js";

const DATABASE = "CipherChat-Crypto-v1";
const TABLE_IDENTITIES = "identities";
const TABLE_TRUSTED = "trustedPeers";
const TABLE_COUNTERS = "sequenceCounters";

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}
function transactionFinished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}
export async function openCryptoDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB requires a browser");
  const request = indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    for (const name of [TABLE_IDENTITIES, TABLE_TRUSTED, TABLE_COUNTERS]) {
      if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
    }
  };
  return idbRequest(request);
}

interface StoredIdentity extends IdentityKeyPair { id: string; }
/** Does not use localStorage to store private-key material. */
export class BrowserIdentityStore {
  async save(userId: string, identity: IdentityKeyPair): Promise<void> {
    validId("userId", userId);
    if (identity.privateKey.extractable || identity.privateKey.algorithm.name !== "Ed25519") {
      throw new Error("Private identity key must be non-extractable Ed25519");
    }
    const db = await openCryptoDatabase();
    try {
      const tx = db.transaction(TABLE_IDENTITIES, "readwrite");
      const done = transactionFinished(tx);
      const store = tx.objectStore(TABLE_IDENTITIES);
      // Don't quietly overwrite a known identity after account changes.
      const prior = store.get(userId);
      prior.onsuccess = () => {
        const existing = prior.result as StoredIdentity | undefined;
        if (existing && existing.publicKeyBase64 !== identity.publicKeyBase64) {
          tx.abort();
          return;
        }
        store.put({ id: userId, ...identity } satisfies StoredIdentity);
      };
      await done;
    } finally { db.close(); }
  }
  async get(userId: string): Promise<IdentityKeyPair | undefined> {
    validId("userId", userId);
    const db = await openCryptoDatabase();
    try {
      const tx = db.transaction(TABLE_IDENTITIES, "readonly");
      const record = await idbRequest(tx.objectStore(TABLE_IDENTITIES).get(userId)) as StoredIdentity | undefined;
      if (!record) return undefined;
      return {
        privateKey: record.privateKey,
        publicKey: record.publicKey,
        publicKeyBase64: record.publicKeyBase64,
        fingerprint: record.fingerprint
      };
    } finally { db.close(); }
  }
}

/**
 * Trusted peer pins belong to the CURRENT authenticated local account.
 * Pass the authenticated account's immutable user ID from Supabase Auth.
 * A pin for Alice -> Bob must not be reused by Carol -> Bob.
 *
 * This prevents accidental cross-account trust reuse; IndexedDB remains
 * same-origin storage, NOT an isolation boundary against malicious JS.
 */
export class BrowserTrustStore implements TrustStore {
  constructor(private readonly ownerUserId: string) {
    validId("ownerUserId", ownerUserId);
  }

  // Structured composite key avoids collisions between IDs containing delimiters.
  private keyFor(peerUserId: string): string {
    validId("peerUserId", peerUserId);
    return JSON.stringify(["trusted-peer-v2", this.ownerUserId, peerUserId]);
  }

  async get(peerUserId: string): Promise<TrustedPeerRecord | undefined> {
    const recordId = this.keyFor(peerUserId);
    const db = await openCryptoDatabase();
    try {
      const tx = db.transaction(TABLE_TRUSTED, "readonly");
      const record = await idbRequest(tx.objectStore(TABLE_TRUSTED).get(recordId)) as
        (TrustedPeerRecord & { id: string }) | undefined;
      return record
        ? { userId: record.userId, fingerprint: record.fingerprint, publicKeyBase64: record.publicKeyBase64 }
        : undefined;
    } finally { db.close(); }
  }

  async put(record: TrustedPeerRecord): Promise<void> {
    const recordId = this.keyFor(record.userId);
    const db = await openCryptoDatabase();
    try {
      const tx = db.transaction(TABLE_TRUSTED, "readwrite");
      const done = transactionFinished(tx);
      const store = tx.objectStore(TABLE_TRUSTED);
      const request = store.get(recordId);
      request.onsuccess = () => {
        const prior = request.result as (TrustedPeerRecord & { id: string }) | undefined;
        if (prior && (prior.publicKeyBase64 !== record.publicKeyBase64 || prior.fingerprint !== record.fingerprint)) {
          tx.abort(); // Changing a trusted key requires a separate recovery/re-verification flow.
          return;
        }
        store.put({ ...record, id: recordId });
      };
      await done;
    } finally { db.close(); }
  }
}

/** Atomic counter updates via single readwrite IDB transactions; strict increasing-replay policy. */
export class BrowserSequenceStore implements SequenceStore {
  private async update(id: string, value?: number): Promise<number | boolean> {
    const db = await openCryptoDatabase();
    try {
      const tx = db.transaction(TABLE_COUNTERS, "readwrite");
      const done = transactionFinished(tx);
      const store = tx.objectStore(TABLE_COUNTERS);
      let result: number | boolean = false;
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const last = (getRequest.result as { id: string; last: number } | undefined)?.last ?? 0;
        if (value === undefined) {
          const next = last + 1;
          if (!Number.isSafeInteger(next)) { tx.abort(); return; }
          store.put({ id, last: next });
          result = next;
        } else if (value > last) {
          store.put({ id, last: value });
          result = true;
        }
      };
      await done;
      return result;
    } finally { db.close(); }
  }
  async reserveOutgoing(sessionId: string, senderId: string): Promise<number> {
    validId("sessionId", sessionId); validId("senderId", senderId);
    const value = await this.update(`out|${sessionId}|${senderId}`);
    if (typeof value !== "number") throw new Error("Sequence reservation failed");
    return value;
  }
  async acceptIncoming(sessionId: string, senderId: string, sequence: number): Promise<boolean> {
    validId("sessionId", sessionId); validId("senderId", senderId); validSequence(sequence);
    return this.update(`in|${sessionId}|${senderId}`, sequence) as Promise<boolean>;
  }
}
