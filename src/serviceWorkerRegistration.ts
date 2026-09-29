// MBI INVENTRA — Service Worker Registration & Update Lifecycle Manager

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

let hasReloaded = false;

// Enforce strict one-time reload flag guarded by user-triggered update
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    const isUserUpdate = sessionStorage.getItem('mbi_user_triggered_update');
    if (isUserUpdate === 'true') {
      hasReloaded = true;
      sessionStorage.removeItem('mbi_user_triggered_update');
      window.location.reload();
    }
  });
}

export function register(config?: Config) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          // Check for background updates periodically
          setInterval(() => {
            registration.update().catch(() => {});
          }, 15 * 60 * 1000);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New content available.');
                  if (config && config.onUpdate) {
                    config.onUpdate(registration);
                  }
                } else {
                  console.log('[SW] Content cached for offline use.');
                  if (config && config.onSuccess) {
                    config.onSuccess(registration);
                  }
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[SW] Service worker registration notice:', error?.message);
        });
    });
  }
}

export function unregister() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.warn(error?.message);
      });
  }
}
