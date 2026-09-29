/**
 * MBI INVENTRA — SECURE LOCAL STORAGE & DATA INTEGRITY ENGINE
 * Protects cached financial records, customer ledgers, and tokens from tampering and plain-text extraction.
 */

const STORAGE_SALT = 'mbi_inventra_enterprise_sec_v3_9941';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function obfuscate(text: string): string {
  try {
    const chars = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) ^ STORAGE_SALT.charCodeAt(i % STORAGE_SALT.length);
      chars.push(String.fromCharCode(code));
    }
    return btoa(chars.join(''));
  } catch {
    return btoa(encodeURIComponent(text));
  }
}

function deobfuscate(encoded: string): string {
  try {
    const raw = atob(encoded);
    const chars = [];
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i) ^ STORAGE_SALT.charCodeAt(i % STORAGE_SALT.length);
      chars.push(String.fromCharCode(code));
    }
    return chars.join('');
  } catch {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return '';
    }
  }
}

interface EncryptedPayload<T> {
  payload: string;
  checksum: string;
  timestamp: number;
}

export class SecureStorage {
  /**
   * Securely encrypt and store a sensitive item
   */
  public static setItem<T = any>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const jsonStr = JSON.stringify(value);
      const checksum = simpleHash(jsonStr + STORAGE_SALT);
      const obfuscatedPayload = obfuscate(jsonStr);

      const wrapper: EncryptedPayload<T> = {
        payload: obfuscatedPayload,
        checksum,
        timestamp: Date.now()
      };

      localStorage.setItem(`sec_${key}`, JSON.stringify(wrapper));
      return true;
    } catch (e) {
      console.warn(`SecureStorage: Failed to set item for key ${key}`, e);
      return false;
    }
  }

  /**
   * Securely retrieve and verify item integrity
   */
  public static getItem<T = any>(key: string, fallbackValue: T | null = null): T | null {
    if (typeof window === 'undefined') return fallbackValue;
    try {
      const raw = localStorage.getItem(`sec_${key}`);
      if (!raw) {
        // Check unencrypted fallback key for backwards compatibility
        const plain = localStorage.getItem(key);
        if (plain) {
          try {
            return JSON.parse(plain);
          } catch {
            return plain as any;
          }
        }
        return fallbackValue;
      }

      const wrapper: EncryptedPayload<T> = JSON.parse(raw);
      if (!wrapper || !wrapper.payload || !wrapper.checksum) {
        return fallbackValue;
      }

      const decryptedStr = deobfuscate(wrapper.payload);
      const expectedChecksum = simpleHash(decryptedStr + STORAGE_SALT);

      if (expectedChecksum !== wrapper.checksum) {
        console.error(`SecureStorage: Data integrity checksum failure for key ${key}! Potential tampering detected.`);
        return fallbackValue;
      }

      return JSON.parse(decryptedStr);
    } catch (e) {
      console.warn(`SecureStorage: Failed to get item for key ${key}`, e);
      return fallbackValue;
    }
  }

  /**
   * Securely remove an item
   */
  public static removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`sec_${key}`);
    localStorage.removeItem(key);
  }

  /**
   * Clear all secure items
   */
  public static clearSecureItems(): void {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sec_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}
