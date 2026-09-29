/**
 * MBI INVENTRA - Total AES-256 Encrypted Backup & Restore Service
 * Strictly enforces client-side AES-256-GCM encryption with PBKDF2 key derivation.
 * Outputs .mbi.enc encrypted archives so raw plaintext JSON/SQL is NEVER exposed to USB drives or file systems.
 */

import { encryptionService, EncryptedContainerV5, MBI_DEFAULT_MASTER_KEY } from './encryptionService';
import { exportFullBackup, restoreFullBackup } from '../lib/db';
import { emitToast } from '../contexts/ToastContext';

export interface GoogleDriveMasterConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  lastUpdated?: string;
}

const STORAGE_KEY = 'mbi_master_google_drive_config';

export const backupService = {
  /**
   * Export database as an AES-256-GCM encrypted .mbi.enc file
   */
  async exportEncryptedBackup(
    customPassword?: string,
    businessName: string = 'MBI_Inventra'
  ): Promise<{ filename: string; container: EncryptedContainerV5 }> {
    try {
      // 1. Generate full database snapshot
      const rawSnapshotJson = await exportFullBackup();

      // 2. Encrypt using AES-256-GCM
      const password = customPassword || MBI_DEFAULT_MASTER_KEY;
      const cleanBusiness = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '_');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filename = `MBI_BACKUP_${cleanBusiness}_${dateStr}_${timeStr}.mbi.enc`;

      const encryptedContainer = await encryptionService.encryptPayload(rawSnapshotJson, password, {
        businessName,
        version: '5.0-AES256-GCM',
      });

      // 3. Trigger client-side file download (.mbi.enc)
      const blob = new Blob([JSON.stringify(encryptedContainer, null, 2)], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      emitToast(`🔒 Encrypted Backup (.mbi.enc) exported successfully!`, 'success');
      return { filename, container: encryptedContainer };
    } catch (err: any) {
      console.error('[BACKUP SERVICE] Export error:', err);
      emitToast('Failed to export encrypted backup: ' + (err?.message || 'Error'), 'error');
      throw err;
    }
  },

  /**
   * Decrypt and restore an .mbi.enc backup archive
   */
  async decryptAndRestoreBackup(
    fileContent: string,
    userPassphrase?: string
  ): Promise<{ success: boolean; message: string; recordCounts?: Record<string, number> }> {
    try {
      const password = userPassphrase || MBI_DEFAULT_MASTER_KEY;
      
      // Decrypt AES-256-GCM
      const decryptedPlaintext = await encryptionService.decryptPayload(fileContent, password);
      
      // Restore into IndexedDB
      const result = await restoreFullBackup(decryptedPlaintext);
      if (result.success) {
        emitToast('✅ Backup restored & verified successfully!', 'success');
      } else {
        emitToast(result.message || 'Restore verification failed', 'error');
      }
      return result;
    } catch (err: any) {
      console.error('[BACKUP SERVICE] Restore error:', err);
      return {
        success: false,
        message: err?.message || 'Decryption failed: Incorrect password or invalid .mbi.enc file.',
      };
    }
  },

  /**
   * Google Drive Master Configuration
   */
  getGoogleDriveMasterConfig(): GoogleDriveMasterConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: window.location.origin + '/oauth/google/callback',
      lastUpdated: new Date().toISOString()
    };
  },

  async saveGoogleDriveMasterConfig(config: Partial<GoogleDriveMasterConfig>): Promise<GoogleDriveMasterConfig> {
    const current = this.getGoogleDriveMasterConfig();
    const updated: GoogleDriveMasterConfig = {
      ...current,
      ...config,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Broadcast change to server & connected clients
    try {
      await fetch('/api/admin/system/google-drive-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch {
      // Offline fallback
    }

    emitToast(
      updated.enabled
        ? '⚡ Google Drive Cloud Sync ENABLED across Master Fleet'
        : '🔒 Google Drive Cloud Sync DISABLED (Local/VPS Only)',
      updated.enabled ? 'success' : 'info'
    );

    return updated;
  }
};
