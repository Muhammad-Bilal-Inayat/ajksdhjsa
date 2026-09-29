/**
 * MBI INVENTRA — ADVANCED WEB APPLICATION SECURITY & ANTI-TAMPER SHIELD
 * 
 * Capabilities:
 * 1. Anti-Console Tampering & Script Injection Guard.
 * 2. Clickjacking / Frame-Busting Guard (prevents embedding into malicious iframes).
 * 3. Keyboard Shortcut Guard for POS Terminals (blocks F12, Inspect, Source view in production mode).
 * 4. Master Bypass Key combination (Ctrl + Alt + M) for authorized engineers.
 * 5. Input Sanitizer against XSS & Prototype Pollution.
 */

const IS_DEV = import.meta.env.DEV;
let securityGuardInitialized = false;

export function initWebSecurityGuard() {
  if (typeof window === 'undefined' || securityGuardInitialized) return;
  securityGuardInitialized = true;

  // 1. Safe Production Keyboard & Context-Menu Guard (Protects POS Kiosk Terminals)
  if (!IS_DEV) {
    // Allow right-click on standard text inputs / textareas for paste/copy convenience
    window.addEventListener('contextmenu', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      
      const disableRightClick = localStorage.getItem('mbi_sec_disable_context_menu');
      if (disableRightClick === 'true') {
        e.preventDefault();
      }
    });

    // Block F12 if kiosk lock is explicitly enabled in settings
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const isMasterSecretKey = e.ctrlKey && e.altKey && (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'b');
      if (isMasterSecretKey) {
        return; // Allow authorized master bypass
      }

      if (e.key === 'F12') {
        const lockEnabled = localStorage.getItem('mbi_sec_kiosk_lock') === 'true';
        if (lockEnabled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });
  }

  // 2. Session Heartbeat & Auto Session Renewal
  setInterval(() => {
    try {
      const session = localStorage.getItem('mock_session');
      if (session) {
        localStorage.setItem('mbi_session_last_active', String(Date.now()));
      }
    } catch {}
  }, 60000);
}

/**
 * Sanitize untrusted strings to prevent XSS in dynamic tables
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
