const ITERATIONS = 100000;
const HASH_LENGTH = 32;

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return {
    hash: arrayToBase64(hash),
    salt: arrayToBase64(salt)
  };
}

export async function verifyPassword(password, hashBase64, saltBase64) {
  const salt = base64ToArray(saltBase64);
  const expectedHash = base64ToArray(hashBase64);
  const actualHash = await pbkdf2(password, salt);
  return arrayToBase64(actualHash) === arrayToBase64(expectedHash);
}

async function pbkdf2(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  return new Uint8Array(bits);
}

function arrayToBase64(arr) {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToArray(base64) {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}
