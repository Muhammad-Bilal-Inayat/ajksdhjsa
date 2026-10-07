import { APP_VERSION_RAW } from '../config/appVersion';

export interface AppVersionInfo {
  version: string;
  releaseNotes?: string;
  buildTimestamp?: string;
  isUpdateAvailable: boolean;
}

export const CURRENT_CLIENT_VERSION = APP_VERSION_RAW;
export const CURRENT_CACHE_NAME = `mbi-inventra-v${CURRENT_CLIENT_VERSION}`;

type UpdateCallback = (info: AppVersionInfo) => void;
const updateListeners = new Set<UpdateCallback>();

let latestServerVersionInfo: AppVersionInfo | null = null;
let waitingWorker: ServiceWorker | null = null;
let isUpdating = false;

// Check if update banner has been notified/shown or dismissed once for this version
export const isUpdateDismissedForSession = (version: string): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`mbi_update_notified_v${version}`) === 'true' || 
         sessionStorage.getItem(`mbi_update_dismissed_v${version}`) === 'true';
};

export const dismissUpdateForSession = (version: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`mbi_update_notified_v${version}`, 'true');
  sessionStorage.setItem(`mbi_update_dismissed_v${version}`, 'true');
};

export const markUpdateAsNotified = (version: string): void => {
  dismissUpdateForSession(version);
};

// Notify all subscribed UI components
const notifyListeners = (info: AppVersionInfo) => {
  latestServerVersionInfo = info;
  updateListeners.forEach(cb => {
    try {
      cb(info);
    } catch (e) {
      console.error('[PWA UPDATE] Listener error:', e);
    }
  });
};

export const subscribeToAppUpdates = (callback: UpdateCallback): (() => void) => {
  updateListeners.add(callback);
  if (latestServerVersionInfo && latestServerVersionInfo.isUpdateAvailable) {
    callback(latestServerVersionInfo);
  }
  return () => {
    updateListeners.delete(callback);
  };
};

// Check version against /api/version
export const checkForAppVersionUpdate = async (): Promise<AppVersionInfo | null> => {
  try {
    const res = await fetch('/api/version', {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.version) {
      const installedVersion = localStorage.getItem('mbi_active_version') || CURRENT_CLIENT_VERSION;
      const isNewer = data.version !== installedVersion;

      const info: AppVersionInfo = {
        version: data.version,
        releaseNotes: data.releaseNotes || 'High-Speed 0.2s POS Engine, Enhanced Security & Performance Upgrades',
        buildTimestamp: data.buildTimestamp,
        isUpdateAvailable: isNewer
      };

      if (isNewer) {
        notifyListeners(info);
      }
      return info;
    }
  } catch (err) {
    // Silent fail in offline mode
  }
  return null;
};

// Register Service Worker and listen for SW updates
export const initializePwaService = () => {
  if (typeof window === 'undefined') return;

  // Set current version on initial boot
  if (!localStorage.getItem('mbi_active_version')) {
    localStorage.setItem('mbi_active_version', CURRENT_CLIENT_VERSION);
  }

  // Poll version on boot and every 10 minutes
  checkForAppVersionUpdate();
  const interval = setInterval(checkForAppVersionUpdate, 10 * 60 * 1000);

  // Also check when window regains focus or comes online
  window.addEventListener('focus', () => checkForAppVersionUpdate());
  window.addEventListener('online', () => checkForAppVersionUpdate());

  // In local development on localhost/127.0.0.1, unregister stale service workers to prevent chunk hanging
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalDev && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
    return () => clearInterval(interval);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Check for updates on register
      registration.update().catch(() => {});

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = newWorker;
              // Check with server to verify if actual new version exists
              checkForAppVersionUpdate();
            }
          });
        }
      });
    }).catch((err) => {
      console.log('[PWA SW] Registration check:', err?.message || 'Ready');
    });

    // Handle controller change reload (guarded by user update flag)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      const isUserUpdate = sessionStorage.getItem('mbi_user_triggered_update');
      if (isUserUpdate === 'true') {
        refreshing = true;
        sessionStorage.removeItem('mbi_user_triggered_update');
        window.location.reload();
      }
    });
  }

  return () => clearInterval(interval);
};

// Backward-compatibility alias
export const registerPWA = initializePwaService;

// ZERO-LOGOUT & ZERO DATA LOSS INSTANT HOT UPDATE
export const triggerSeamlessHotUpdate = async () => {
  try {
    sessionStorage.setItem('mbi_user_triggered_update', 'true');

    // 1. Preserve all session state, JWT tokens, tenant info & current URL path
    const currentState = {
      path: window.location.pathname + window.location.search + window.location.hash,
      timestamp: Date.now(),
      authUser: localStorage.getItem('mock_session') || localStorage.getItem('mbi_user') || localStorage.getItem('user'),
      mockProfile: localStorage.getItem('mock_user_profile'),
      mockBiz: localStorage.getItem('mock_business'),
      activeTenant: localStorage.getItem('mbi_active_tenant_cache') || localStorage.getItem('mbi_active_business_id'),
      token: localStorage.getItem('token') || localStorage.getItem('mbi_token')
    };

    sessionStorage.setItem('mbi_hot_update_resume', JSON.stringify(currentState));

    // 2. Set active installed version to new version and dismiss banner permanently
    const newVersion = latestServerVersionInfo?.version || CURRENT_CLIENT_VERSION;
    localStorage.setItem('mbi_active_version', newVersion);
    markUpdateAsNotified(newVersion);

    // 3. Send SKIP_WAITING signal non-blockingly
    try {
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }).catch(() => {});
      }
    } catch (e) {}

    // 4. Non-blocking cache flush with race timeout
    if ('caches' in window) {
      caches.keys().then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CURRENT_CACHE_NAME && (key.includes('workbox') || key.includes('app-') || key.includes('html') || key.startsWith('mbi-inventra-') || key.includes('assets') || key.includes('vite')))
            .map(key => caches.delete(key).catch(() => {}))
        );
      }).catch(() => {});
    }

    // 5. Guaranteed fast reload within 250ms
    setTimeout(() => {
      window.location.reload();
    }, 250);

  } catch (err) {
    console.error('[PWA UPDATE ERROR]', err);
    window.location.reload();
  }
};
