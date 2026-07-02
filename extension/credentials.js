export const KEY_DB_NAME = "sjtu-login-addon";
export const KEY_STORE_NAME = "keys";
export const KEY_RECORD_ID = "credential-key";
const IV_BYTES = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function generateKey(cryptoObj = globalThis.crypto) {
  return cryptoObj.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptCredentials(
  key,
  { user, pass },
  cryptoObj = globalThis.crypto
) {
  const iv = cryptoObj.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(JSON.stringify({ user, pass }))
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptCredentials(
  key,
  { iv, data },
  cryptoObj = globalThis.crypto
) {
  const plaintext = await cryptoObj.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(data)
  );
  const { user, pass } = JSON.parse(textDecoder.decode(plaintext));
  return { user, pass };
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openKeyDatabase() {
  const request = indexedDB.open(KEY_DB_NAME, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(KEY_STORE_NAME);
  };
  return requestToPromise(request);
}

export async function getOrCreateKey() {
  const db = await openKeyDatabase();
  try {
    const existing = await requestToPromise(
      db.transaction(KEY_STORE_NAME).objectStore(KEY_STORE_NAME).get(KEY_RECORD_ID)
    );
    if (existing) return existing;
    const key = await generateKey();
    await requestToPromise(
      db
        .transaction(KEY_STORE_NAME, "readwrite")
        .objectStore(KEY_STORE_NAME)
        .put(key, KEY_RECORD_ID)
    );
    return key;
  } finally {
    db.close();
  }
}

export async function deleteKey() {
  const db = await openKeyDatabase();
  try {
    await requestToPromise(
      db
        .transaction(KEY_STORE_NAME, "readwrite")
        .objectStore(KEY_STORE_NAME)
        .delete(KEY_RECORD_ID)
    );
  } finally {
    db.close();
  }
}
