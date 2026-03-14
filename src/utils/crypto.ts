/**
 * Utility functions for encrypting and decrypting data using the Web Crypto API.
 * This provides a basic layer of security for data stored in IndexedDB or localStorage.
 */

// A static salt for derivation, in a real production app this might be user-specific or fetched from the server
const SALT = new TextEncoder().encode('open-plan-ai-offline-storage-salt');
const ITERATIONS = 100000;

/**
 * Generates an encryption key. In a real application, you might derive this
 * from a user session token or password. For this implementation, we'll
 * generate a random key and store it in memory/sessionStorage.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if we have a raw key in sessionStorage
  let rawKeyStr = sessionStorage.getItem('openplan_crypto_key');
  let rawKey: Uint8Array;

  if (rawKeyStr) {
    // Convert base64 string back to Uint8Array
    const binaryString = atob(rawKeyStr);
    rawKey = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      rawKey[i] = binaryString.charCodeAt(i);
    }
  } else {
    // Generate a new random key material
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);
    rawKey = buffer;
    
    // Convert to base64 for storage
    const binaryString = Array.from(rawKey).map(b => String.fromCharCode(b)).join('');
    sessionStorage.setItem('openplan_crypto_key', btoa(binaryString));
  }

  // Import the raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    rawKey.buffer as ArrayBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive the actual AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string payload.
 * Returns an object containing the ciphertext and the IV used, both base64 encoded.
 */
export async function encryptData(payload: string): Promise<{ ciphertext: string; iv: string }> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedPayload = new TextEncoder().encode(payload);

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedPayload
    );

    // Convert to base64 for easier storage
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedContent)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return { ciphertext: ciphertextBase64, iv: ivBase64 };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a previously encrypted payload.
 */
export async function decryptData(encryptedData: { ciphertext: string; iv: string }): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decode from base64
    const ivBytes = new Uint8Array(atob(encryptedData.iv).split('').map(c => c.charCodeAt(0)));
    const cipherBytes = new Uint8Array(atob(encryptedData.ciphertext).split('').map(c => c.charCodeAt(0)));

    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      key,
      cipherBytes
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Helper to encrypt a JSON object.
 */
export async function encryptObject(obj: any): Promise<{ ciphertext: string; iv: string }> {
  return encryptData(JSON.stringify(obj));
}

/**
 * Helper to decrypt back to a JSON object.
 */
export async function decryptObject<T>(encryptedData: { ciphertext: string; iv: string } | undefined): Promise<T | null> {
  if (!encryptedData || !encryptedData.ciphertext || !encryptedData.iv) {
    return null;
  }
  
  try {
    const decryptedString = await decryptData(encryptedData);
    return JSON.parse(decryptedString) as T;
  } catch (err) {
    console.error('Failed to decrypt object:', err);
    return null;
  }
}

/**
 * Encrypts an ArrayBuffer payload directly.
 */
export async function encryptArrayBuffer(buffer: ArrayBuffer): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      buffer
    );

    return { ciphertext: encryptedContent, iv: iv.buffer as ArrayBuffer };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt ArrayBuffer');
  }
}

/**
 * Decrypts an ArrayBuffer payload directly.
 */
export async function decryptArrayBuffer(encryptedData: { ciphertext: ArrayBuffer; iv: ArrayBuffer }): Promise<ArrayBuffer> {
  try {
    const key = await getEncryptionKey();
    
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedData.iv
      },
      key,
      encryptedData.ciphertext
    );

    return decryptedContent;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt ArrayBuffer');
  }
}
