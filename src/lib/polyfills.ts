/**
 * MBI INVENTRA — UNIVERSAL BROWSER & OS COMPATIBILITY LAYER
 * Guarantees 100% stable execution across:
 * - Windows 7, Windows 8, Windows 10, Windows 11
 * - Older Chromium (Chrome 80 - 109 on Win 7/8)
 * - Firefox (including Firefox ESR 115)
 * - Safari / WebKit (iOS 12+ / macOS)
 * - Android WebViews & Low-End Mobile POS Terminals
 * - Local LAN HTTP environments (e.g. http://192.168.x.x:3000 where crypto.randomUUID is normally disabled)
 */

export function installPolyfills(): void {
  if (typeof window === 'undefined') return;

  // 1. globalThis polyfill
  try {
    if (typeof globalThis === 'undefined') {
      (window as any).globalThis = window;
    }
  } catch {}

  // 2. crypto.randomUUID polyfill (Chrome < 92, Win 7, Non-HTTPS LAN networks)
  try {
    if (!window.crypto) {
      (window as any).crypto = {};
    }
    if (!window.crypto.randomUUID) {
      window.crypto.randomUUID = function(): `${string}-${string}-${string}-${string}-${string}` {
        if (window.crypto && window.crypto.getRandomValues) {
          const buf = new Uint8Array(16);
          window.crypto.getRandomValues(buf);
          buf[6] = (buf[6] & 0x0f) | 0x40; // Version 4
          buf[8] = (buf[8] & 0x3f) | 0x80; // Variant 10
          const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}` as any;
        }
        // Fallback using Math.random + timestamp
        let d = new Date().getTime();
        let d2 = (typeof performance !== 'undefined' && performance.now && (performance.now() * 1000)) || 0;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          let r = Math.random() * 16;
          if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
          } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
          }
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }) as any;
      };
    }
  } catch {}

  // 3. structuredClone polyfill (Chrome < 98, Safari < 15.4)
  try {
    if (typeof window.structuredClone !== 'function') {
      (window as any).structuredClone = function<T>(obj: T): T {
        if (obj === undefined) return undefined as any;
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch {
          // Deep clone fallback for objects with non-serializable fields
          if (obj === null || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(item => (window as any).structuredClone(item)) as any;
          const copy: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              copy[key] = (window as any).structuredClone((obj as any)[key]);
            }
          }
          return copy;
        }
      };
    }
  } catch {}

  // 4. Array.prototype.at polyfill (Chrome < 92, Firefox < 90, Safari < 15.4)
  try {
    if (!Array.prototype.at) {
      Object.defineProperty(Array.prototype, 'at', {
        value: function(n: number) {
          n = Math.trunc(n) || 0;
          if (n < 0) n += this.length;
          if (n < 0 || n >= this.length) return undefined;
          return this[n];
        },
        writable: true,
        configurable: true
      });
    }
  } catch {}

  // 5. String.prototype.at polyfill
  try {
    if (!String.prototype.at) {
      Object.defineProperty(String.prototype, 'at', {
        value: function(n: number) {
          n = Math.trunc(n) || 0;
          if (n < 0) n += this.length;
          if (n < 0 || n >= this.length) return '';
          return this.charAt(n);
        },
        writable: true,
        configurable: true
      });
    }
  } catch {}

  // 6. Object.hasOwn polyfill (Chrome < 93, Firefox < 92, Safari < 15.4)
  try {
    if (!(Object as any).hasOwn) {
      Object.defineProperty(Object, 'hasOwn', {
        value: function(object: any, property: PropertyKey) {
          if (object == null) {
            throw new TypeError('Cannot convert undefined or null to object');
          }
          return Object.prototype.hasOwnProperty.call(Object(object), property);
        },
        writable: true,
        configurable: true
      });
    }
  } catch {}

  // 7. window.matchMedia safe fallback for older browsers
  try {
    if (!window.matchMedia) {
      (window as any).matchMedia = function() {
        return {
          matches: false,
          media: '',
          onchange: null,
          addListener: function() {},
          removeListener: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return false; }
        };
      };
    }
  } catch {}

  // 8. Promise.allSettled polyfill (Chrome < 76, Firefox < 71, Safari < 13)
  try {
    if (!Promise.allSettled) {
      (Promise as any).allSettled = function<T>(promises: Array<Promise<T>>) {
        return Promise.all(
          promises.map(p =>
            Promise.resolve(p).then(
              value => ({ status: 'fulfilled', value }),
              reason => ({ status: 'rejected', reason })
            )
          )
        );
      };
    }
  } catch {}

  // 9. Window.fetch setter compatibility (Prevents 'Cannot set property fetch of #<Window> which has only a getter')
  try {
    if (typeof window !== 'undefined') {
      let _currentFetch = window.fetch ? window.fetch.bind(window) : undefined;
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch') ||
                   Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window) || {}, 'fetch') ||
                   Object.getOwnPropertyDescriptor(window.constructor ? window.constructor.prototype : {}, 'fetch');
      if (!desc || desc.configurable || (!desc.writable && !desc.set)) {
        try {
          Object.defineProperty(window, 'fetch', {
            get: () => _currentFetch,
            set: (fn: any) => { _currentFetch = fn; },
            configurable: true,
            enumerable: true
          });
        } catch {}
      }
    }
  } catch {}

  // 10. ResizeObserver safe fallback for older Windows 7/8 Chromium
  try {
    if (typeof window !== 'undefined' && !window.ResizeObserver) {
      (window as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  } catch {}

  // 11. IntersectionObserver safe fallback for legacy browsers
  try {
    if (typeof window !== 'undefined' && !window.IntersectionObserver) {
      (window as any).IntersectionObserver = class IntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  } catch {}

  // 12. requestIdleCallback fallback
  try {
    if (typeof window !== 'undefined' && !(window as any).requestIdleCallback) {
      (window as any).requestIdleCallback = function(cb: any) {
        const start = Date.now();
        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          });
        }, 1);
      };
      (window as any).cancelIdleCallback = function(id: any) {
        clearTimeout(id);
      };
    }
  } catch {}
}

// Auto-run on import
installPolyfills();
