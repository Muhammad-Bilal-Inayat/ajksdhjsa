// PWA Service Worker & Zero-Logout Hot-Update Engine for MBI INVENTRA

export interface AppVersionInfo {
  version: string;
  releaseNotes?: string;
  buildTimestamp?: string;
  isUpdateAvailable: boolean;
}

export const CURRENT_CLIENT_VERSION = '4.2.4';
export const CURRENT_CACHE_NAME = `mbi-inventra-v${CURRENT_CLIENT_VERSION}`;

type UpdateCallback = (info: AppVersionInfo) => void;
const updateListeners = new Set<UpdateCallback>();

let latestServerVersionInfo: AppVersionInfo | null = null;
let waitingWorker: ServiceWorker | null = null;
let isUpdating = false;

// Check if update banner has been dismissed for the current browser session
export const isUpdateDismissedForSession = (version: string): boolean => {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(`mbi_update_dismissed_v${version}`) === 'true';
};

export const dismissUpdateForSession = (version: string): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(`mbi_update_dismissed_v${version}`, 'true');
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
        releaseNotes: data.releaseNotes || 'New POS Billing Speed, Live Sync & UI Enhancements',
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

  // Poll version on boot and every 5 minutes
  checkForAppVersionUpdate();
  const interval = setInterval(checkForAppVersionUpdate, 5 * 60 * 1000);

  // Also check when window regains focus or comes online
  window.addEventListener('focus', () => checkForAppVersionUpdate());
  window.addEventListener('online', () => checkForAppVersionUpdate());

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
              notifyListeners({
                version: '4.2.1',
                releaseNotes: 'LAN Multi-PC Counter Sync Hub, Zero-Crash Offline Throttle, Universal User Popup Broadcast & Server Direct Access',
                isUpdateAvailable: true
              });
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

// ZERO-LOGOUT & ZERO CACHE-CLEAR INSTANT RESUME
export const triggerSeamlessHotUpdate = async () => {
  if (isUpdating) return;
  isUpdating = true;

  try {
    sessionStorage.setItem('mbi_user_triggered_update', 'true');

    // 1. Preserve all session state, JWT tokens, tenant info & current URL path
    const currentState = {
      path: window.location.pathname + window.location.search + window.location.hash,
      timestamp: Date.now(),
      authUser: localStorage.getItem('mbi_user') || localStorage.getItem('user'),
      activeTenant: localStorage.getItem('mbi_active_tenant') || localStorage.getItem('activeTenantId'),
      token: localStorage.getItem('token') || localStorage.getItem('mbi_token')
    };

    sessionStorage.setItem('mbi_hot_update_resume', JSON.stringify(currentState));

    // 2. Set active installed version to new version
    if (latestServerVersionInfo?.version) {
      localStorage.setItem('mbi_active_version', latestServerVersionInfo.version);
    }

    // 3. Send SKIP_WAITING signal to waiting ServiceWorker
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }

    // 4. Purge outdated static caches while preserving IndexedDB and user auth data
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter(key => key !== CURRENT_CACHE_NAME && (key.includes('workbox') || key.includes('app-') || key.includes('html') || key.startsWith('mbi-inventra-')))
            .map(key => caches.delete(key))
        );
      } catch (e) {}
    }

    // 5. Fast Instant Reload
    setTimeout(() => {
      window.location.reload();
    }, 200);

  } catch (err) {
    console.error('[PWA UPDATE ERROR]', err);
    window.location.reload();
  }
};
