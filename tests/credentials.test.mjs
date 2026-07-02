import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptCredentials,
  encryptCredentials,
  generateKey
} from "../extension/credentials.js";

const CREDENTIALS = { user: "sjtu-user", pass: "p@ss词-123" };

test("encrypts and decrypts credentials losslessly", async () => {
  const key = await generateKey();
  const cipher = await encryptCredentials(key, CREDENTIALS);
  assert.deepEqual(await decryptCredentials(key, cipher), CREDENTIALS);
});

test("ciphertext never contains the plaintext and IVs are unique", async () => {
  const key = await generateKey();
  const first = await encryptCredentials(key, CREDENTIALS);
  const second = await encryptCredentials(key, CREDENTIALS);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.data, second.data);
  const serialized = JSON.stringify([first, second]);
  assert.equal(serialized.includes(CREDENTIALS.user), false);
  assert.equal(serialized.includes(CREDENTIALS.pass), false);
});

test("rejects a wrong key and tampered ciphertext", async () => {
  const key = await generateKey();
  const cipher = await encryptCredentials(key, CREDENTIALS);

  const otherKey = await generateKey();
  await assert.rejects(decryptCredentials(otherKey, cipher));

  const bytes = Uint8Array.from(atob(cipher.data), (c) => c.charCodeAt(0));
  bytes[0] ^= 0xff;
  const tampered = {
    iv: cipher.iv,
    data: btoa(String.fromCharCode(...bytes))
  };
  await assert.rejects(decryptCredentials(key, tampered));
});

test("generates non-extractable AES-GCM keys", async () => {
  const key = await generateKey();
  assert.equal(key.extractable, false);
  assert.equal(key.algorithm.name, "AES-GCM");
  assert.equal(key.algorithm.length, 256);
});
