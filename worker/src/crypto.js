export async function encrypt(data, keyBase64) {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return JSON.stringify({
    iv: arrayToBase64(iv),
    data: arrayToBase64(new Uint8Array(cipher))
  });
}

export async function decrypt(encryptedStr, keyBase64) {
  const { iv, data } = JSON.parse(encryptedStr);
  const key = await importKey(keyBase64);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArray(iv) },
    key,
    base64ToArray(data)
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function importKey(keyBase64) {
  const raw = base64ToArray(keyBase64);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
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
