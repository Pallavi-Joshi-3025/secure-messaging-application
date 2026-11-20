import test from "node:test";
import assert from "node:assert/strict";
import { establishPair } from "./helpers.js";
import { MemorySequenceStore, SecureMessenger } from "../src/replayProtection.js";

test("Replay and older out-of-order messages rejected, including recreated receiver with shared store", async () => {
  const { alice, bob } = await establishPair();
  const sender = new SecureMessenger(alice, new MemorySequenceStore());
  const receiverStore = new MemorySequenceStore();
  const bobReceiver = new SecureMessenger(bob, receiverStore);
  const m1 = await sender.send("first");
  const m2 = await sender.send("second");
  assert.equal(m1.sequence, 1);
  assert.equal(m2.sequence, 2);
  assert.equal(await bobReceiver.receive(m1), "first");
  await assert.rejects(() => bobReceiver.receive(m1), /Replay/);
  const recreatedReceiver = new SecureMessenger(bob, receiverStore);
  await assert.rejects(() => recreatedReceiver.receive(m1), /Replay/);
  assert.equal(await recreatedReceiver.receive(m2), "second");
  await assert.rejects(() => recreatedReceiver.receive(m1), /Replay/);
  const m3 = await sender.send("third");
  const m4 = await sender.send("fourth");
  assert.equal(await recreatedReceiver.receive(m4), "fourth");
  await assert.rejects(() => recreatedReceiver.receive(m3), /out-of-order/);
});

test("Modified authenticated sequence fails without advancing replay state", async () => {
  const { alice, bob } = await establishPair();
  const sender = new SecureMessenger(alice, new MemorySequenceStore());
  const receiver = new SecureMessenger(bob, new MemorySequenceStore());
  const valid = await sender.send("valid");
  await assert.rejects(() => receiver.receive({ ...valid, sequence: 500 }));
  assert.equal(await receiver.receive(valid), "valid");
});

test("A different session cannot replay messages into this one", async () => {
  const pair1 = await establishPair();
  const pair2 = await establishPair();
  const sender = new SecureMessenger(pair1.alice, new MemorySequenceStore());
  const receiver = new SecureMessenger(pair2.bob, new MemorySequenceStore());
  const oldMessage = await sender.send("old session");
  await assert.rejects(() => receiver.receive(oldMessage), /session/);
});
