/** Generate a unique ntfy topic with a yawpr prefix + 16 random hex chars */
export function generateNtfyTopic(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `yawpr-${hex}`;
}

/** Verify Slack request signature using Web Crypto API */
export async function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const baseString = `v0:${timestamp}:${body}`;
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(baseString)
  );

  const computed =
    "v0=" +
    Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return await timingSafeEqual(computed, signature);
}

/** Verify HMAC-SHA256 for webhook payloads */
export async function verifyHmacSignature(
  secret: string,
  signature: string,
  body: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );

  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return await timingSafeEqual(computed, signature);
}

/** Constant-time string comparison using HMAC to normalize length */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode("timing-safe-compare"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const [macA, macB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const bufA = new Uint8Array(macA);
  const bufB = new Uint8Array(macB);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

// ─── AES-GCM Encryption (for Slack tokens) ──────────────

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

async function deriveKey(encryptionKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(encryptionKey);
  if (keyBytes.length < 32) {
    throw new Error(`ENCRYPTION_KEY must be at least 32 bytes, got ${keyBytes.length}`);
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    keyBytes.slice(0, 32),
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

/** Encrypt a string using AES-GCM. Returns base64(iv + ciphertext). */
export async function encryptSecret(
  plaintext: string,
  encryptionKey: string
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64(iv + ciphertext) string using AES-GCM. */
export async function decryptSecret(
  encrypted: string,
  encryptionKey: string
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}
