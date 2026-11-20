import { validSequence } from "./encoding.js";
import { decryptMessage, encryptMessage, type EncryptedMessage } from "./encryption.js";
import type { SecureSession } from "./session.js";

/**
 * CounterStore MUST atomically reserve outgoing sequences and reject incoming
 * sequences <= last accepted for (sessionId, senderId). Persist for active sessions.
 * We deliberately follow Hari's page-8 STRICT seq > lastSeen policy.
 */
export interface SequenceStore {
  reserveOutgoing(sessionId: string, senderId: string): Promise<number>;
  acceptIncoming(sessionId: string, senderId: string, sequence: number): Promise<boolean>;
}

/** Tests/demo only: this state is lost if this object is discarded. */
export class MemorySequenceStore implements SequenceStore {
  private counters = new Map<string, number>();
  private key(direction: string, sessionId: string, senderId: string): string {
    return `${direction}|${sessionId}|${senderId}`;
  }
  async reserveOutgoing(sessionId: string, senderId: string): Promise<number> {
    const key = this.key("out", sessionId, senderId);
    const next = (this.counters.get(key) ?? 0) + 1;
    validSequence(next);
    this.counters.set(key, next);
    return next;
  }
  async acceptIncoming(sessionId: string, senderId: string, sequence: number): Promise<boolean> {
    validSequence(sequence);
    const key = this.key("in", sessionId, senderId);
    if (sequence <= (this.counters.get(key) ?? 0)) return false;
    this.counters.set(key, sequence);
    return true;
  }
}

/** Browser/server uses separate sender/receiver sessions, not an exportable shared AES key. */
export class SecureMessenger {
  constructor(private readonly session: SecureSession, private readonly counters: SequenceStore) {}
  async send(plaintext: string): Promise<EncryptedMessage> {
    // Reserve before encryption. Gaps on failure are safe; reuse is not.
    const seq = await this.counters.reserveOutgoing(this.session.sessionId, this.session.localId);
    return encryptMessage(plaintext, this.session, seq);
  }
  async receive(message: EncryptedMessage): Promise<string> {
    // First validate & decrypt before changing anti-replay state.
    const plaintext = await decryptMessage(message, this.session);
    if (!await this.counters.acceptIncoming(message.sessionId, message.senderId, message.sequence)) {
      throw new Error("Replay or out-of-order message rejected");
    }
    // Never display plaintext until successful authenticated decryption AND anti-replay acceptance.
    return plaintext;
  }
}
