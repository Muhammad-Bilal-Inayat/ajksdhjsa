import { PlatformFeatureSettings, PlatformSettingsDocument, DEFAULT_PLATFORM_FEATURES } from '../types';
import { saveRecordToFirestore } from './firebase';
import { logMasterAudit } from './masterServerService';

const SETTINGS_COLLECTION = 'platformSettings';
const SETTINGS_DOC_ID = 'global';
const LOCAL_SETTINGS_KEY = 'mbi_platform_global_settings_v3';

export class PlatformSettingsService {
  /**
   * Get current platform feature settings (local cache first, then cloud)
   */
  public static async getSettings(): Promise<PlatformSettingsDocument> {
    // 1. Check local storage
    try {
      const cached = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (cached) {
        const parsed: PlatformSettingsDocument = JSON.parse(cached);
        return parsed;
      }
    } catch {}

    // 2. Fallback to default platform settings
    const defaultDoc: PlatformSettingsDocument = {
      id: SETTINGS_DOC_ID,
      features: { ...DEFAULT_PLATFORM_FEATURES },
      maintenanceMode: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'SYSTEM_BOOTSTRAP',
    };
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(defaultDoc));

    if (navigator.onLine) {
      saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, defaultDoc).catch(() => {});
    }

    return defaultDoc;
  }

  /**
   * Update a specific feature toggle in REST server and local state
   */
  public static async updateFeatureToggle(
    featureKey: keyof PlatformFeatureSettings,
    enabled: boolean,
    updatedBy: string = 'Master Admin'
  ): Promise<PlatformSettingsDocument> {
    const current = await this.getSettings();
    const updatedFeatures: PlatformFeatureSettings = {
      ...current.features,
      [featureKey]: enabled,
    };

    const updatedDoc: PlatformSettingsDocument = {
      ...current,
      features: updatedFeatures,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    // Save locally
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedDoc));

    // Save to PostgreSQL Server
    if (navigator.onLine) {
      await saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, updatedDoc);
    }

    // Dispatch global event for instantaneous React re-renders across components
    window.dispatchEvent(new CustomEvent('platform-features-updated', { detail: updatedDoc }));

    // Master Audit Log
    logMasterAudit(
      'Feature Toggle Changed',
      'COMMAND',
      `Feature "${String(featureKey)}" switched to ${enabled ? 'ENABLED' : 'DISABLED'} by ${updatedBy}`
    );

    return updatedDoc;
  }

  /**
   * Toggle system-wide maintenance mode
   */
  public static async setMaintenanceMode(
    enabled: boolean,
    bannerText?: string,
    updatedBy: string = 'Master Admin'
  ): Promise<PlatformSettingsDocument> {
    const current = await this.getSettings();
    const updatedDoc: PlatformSettingsDocument = {
      ...current,
      maintenanceMode: enabled,
      announcementBanner: bannerText || current.announcementBanner,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedDoc));
    if (navigator.onLine) {
      await saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, updatedDoc);
    }

    window.dispatchEvent(new CustomEvent('platform-features-updated', { detail: updatedDoc }));
    logMasterAudit(
      'Maintenance Mode Updated',
      'SECURITY',
      `Platform maintenance mode set to ${enabled ? 'ACTIVE' : 'OFF'}`
    );

    return updatedDoc;
  }

  /**
   * Reset all platform features to factory recommended defaults
   */
  public static async resetToDefaults(updatedBy: string = 'Master Admin'): Promise<PlatformSettingsDocument> {
    const docData: PlatformSettingsDocument = {
      id: SETTINGS_DOC_ID,
      features: { ...DEFAULT_PLATFORM_FEATURES },
      maintenanceMode: false,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(docData));
    if (navigator.onLine) {
      await saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, docData);
    }

    window.dispatchEvent(new CustomEvent('platform-features-updated', { detail: docData }));
    logMasterAudit('Feature Flags Reset', 'COMMAND', 'Reset all platform features to factory default configuration');

    return docData;
  }

  /**
   * Realtime listener for platformSettings using native window event bus
   */
  public static subscribeToPlatformSettings(
    onUpdate: (doc: PlatformSettingsDocument) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleEvent = (e: any) => {
      if (e?.detail) {
        onUpdate(e.detail);
      } else {
        PlatformSettingsService.getSettings().then(onUpdate).catch(() => {});
      }
    };

    window.addEventListener('platform-features-updated', handleEvent);
    return () => {
      window.removeEventListener('platform-features-updated', handleEvent);
    };
  }
}
