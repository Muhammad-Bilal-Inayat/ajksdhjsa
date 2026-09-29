/**
 * MBI INVENTRA - RFC 6238 Standard TOTP & Google Authenticator Engine
 * Generates Base32 secrets, otpauth:// URIs, QR codes, and verifies live 6-digit TOTP tokens.
 */

import QRCode from 'qrcode';

// Base32 Alphabet (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a cryptographically strong random Base32 secret (16-32 chars)
 */
export function generateBase32Secret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return secret;
}

/**
 * Decode Base32 string into Uint8Array
 */
function base32ToUint8Array(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Compute HMAC-SHA1 using Web Crypto API
 */
async function computeHmacSha1(keyBytes: Uint8Array, messageBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as any,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes as any);
    return new Uint8Array(sig);
  }

  // Fallback simplified HMAC-SHA1 using SHA-1 block padding
  throw new Error('Web Crypto subtle is required for TOTP cryptographic HMAC-SHA1.');
}

/**
 * Generate 6-digit TOTP token for a specific 30-second time counter T
 */
export async function generateTotpForCounter(secretBase32: string, counter: number): Promise<string> {
  const keyBytes = base32ToUint8Array(secretBase32);
  
  // Convert counter to 8-byte big-endian buffer
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const hmac = await computeHmacSha1(keyBytes, counterBytes);
  
  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP token against a Base32 secret with +/- 1 time step window (30s)
 */
export async function verifyTotpToken(
  token: string,
  secretBase32: string,
  windowSteps: number = 1
): Promise<boolean> {
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!cleanToken || cleanToken.length !== 6) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  for (let step = -windowSteps; step <= windowSteps; step++) {
    try {
      const generated = await generateTotpForCounter(secretBase32, currentCounter + step);
      if (generated === cleanToken) {
        return true;
      }
    } catch (e) {
      console.error('[TOTP] Verification error:', e);
    }
  }

  return false;
}

/**
 * Build standard otpauth URI
 */
export function buildOtpauthUri(
  secretBase32: string,
  accountName: string = 'SuperAdmin',
  issuer: string = 'MBI Inventra Master Hub'
): string {
  const encIssuer = encodeURIComponent(issuer);
  const encAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR Code data URL from otpauth URI
 */
export async function generateTotpQrDataUrl(otpauthUri: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUri, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}
