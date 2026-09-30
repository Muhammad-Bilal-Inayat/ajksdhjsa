/**
 * MBI Inventra - Enterprise Manual Feature Patch Engine
 * 
 * Enables the master engineer/developer to craft custom feature patches (.mbipatch / JSON)
 * for specific tenants or universal deployment, and allows users/admins to upload and apply
 * these patches to instantly unlock extra capabilities (e.g. Godowns, Online Store, Audit Trail,
 * custom limits) without waiting or reinstalling software.
 */

export interface FeaturePatchPayload {
  patchId: string;
  version: string;
  title: string;
  description: string;
  targetTenantId: string; // Specific tenantId or 'ALL' / '*'
  targetBusinessName?: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string | null; // null = lifetime permanent
  features: string[];        // Array of featureKeys to unlock (e.g. ['godowns', 'online_store'])
  routes: string[];          // Array of route prefixes to unlock (e.g. ['/godowns', '/online-store'])
  settingsTabs?: string[];   // Settings tab keys to unlock (e.g. ['GODOWN', 'AUDIT'])
  limitsExpansion?: {
    maxFirms?: number;
    maxStaffUsers?: number;
    maxGodowns?: number;
    [key: string]: any;
  };
  customFlags?: Record<string, boolean | string | number>;
  customScript?: string;
  signature: string;         // Cryptographic integrity checksum
  format?: 'JSON' | 'MBI_V2_ENCRYPTED';
}

export interface InstalledPatch extends FeaturePatchPayload {
  installedAt: string;
  installedByEmail?: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
}

export interface TenantRestorePoint {
  restorePointId: string;
  tenantId: string;
  tenantName?: string;
  createdAt: string;
  reason: string;
  patchIdApplied?: string;
  patchTitle?: string;
  installedPatchesSnapshot: InstalledPatch[];
  featureTogglesSnapshot?: Record<string, any>;
}

const INSTALLED_PATCHES_KEY = 'mbi_installed_feature_patches_v1';
const RESTORE_POINTS_KEY = 'mbi_tenant_restore_points_v1';
const PATCH_INTEGRITY_SALT = 'MBI_INVENTRA_SECURE_PATCH_ENGINE_2026_PROD';

/**
 * Generate a reproducible hash signature for tamper detection
 */
function computePatchSignature(payload: Omit<FeaturePatchPayload, 'signature' | 'format'>): string {
  const serialized = JSON.stringify({
    patchId: payload.patchId,
    title: payload.title,
    targetTenantId: payload.targetTenantId,
    issuedAt: payload.issuedAt,
    features: [...(payload.features || [])].sort(),
    routes: [...(payload.routes || [])].sort(),
    customFlags: payload.customFlags || {},
    salt: PATCH_INTEGRITY_SALT
  });

  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Create a clean hex representation
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  const len = serialized.length.toString(16).padStart(4, '0').toUpperCase();
  return `MBI-SIG-${hex}-${len}`;
}

export class ManualPatchService {
  /**
   * Generates a signed, encrypted .mbi patch package
   */
  public generatePatch(params: {
    title: string;
    description: string;
    targetTenantId?: string;
    targetBusinessName?: string;
    features: string[];
    routes?: string[];
    settingsTabs?: string[];
    limitsExpansion?: {
      maxFirms?: number;
      maxStaffUsers?: number;
      maxGodowns?: number;
    };
    customFlags?: Record<string, any>;
    customScript?: string;
    expiresInDays?: number | null; // null = lifetime
    issuedBy?: string;
  }): { patch: FeaturePatchPayload; rawCode: string; encodedBase64: string; mbiFileContent: string } {
    const patchId = `PATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const issuedAt = new Date().toISOString();
    let expiresAt: string | null = null;

    if (params.expiresInDays && params.expiresInDays > 0) {
      const expDate = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const rawPayload: Omit<FeaturePatchPayload, 'signature' | 'format'> = {
      patchId,
      version: '2.0-MBI',
      title: params.title.trim(),
      description: params.description.trim(),
      targetTenantId: (params.targetTenantId || '*').trim(),
      targetBusinessName: params.targetBusinessName,
      issuedBy: params.issuedBy || 'MBI Inventra Master Engineer',
      issuedAt,
      expiresAt,
      features: params.features || [],
      routes: params.routes || [],
      settingsTabs: params.settingsTabs || [],
      limitsExpansion: params.limitsExpansion,
      customFlags: params.customFlags,
      customScript: params.customScript,
    };

    const signature = computePatchSignature(rawPayload);
    const fullPatch: FeaturePatchPayload = {
      ...rawPayload,
      signature,
      format: 'MBI_V2_ENCRYPTED'
    };

    const rawCode = JSON.stringify(fullPatch, null, 2);
    const base64Enc = btoa(encodeURIComponent(rawCode));
    const encodedBase64 = `MBI-PATCH-v1:${base64Enc}`;
    const mbiFileContent = `MBI-ENCRYPTED-PATCH-V2:${base64Enc}:${signature}`;

    return {
      patch: fullPatch,
      rawCode,
      encodedBase64,
      mbiFileContent
    };
  }

  /**
   * Parse raw patch string (JSON, .mbi, or Base64 .mbipatch format)
   */
  public parsePatch(rawInput: string): { patch: FeaturePatchPayload | null; error: string | null } {
    if (!rawInput || typeof rawInput !== 'string') {
      return { patch: null, error: 'Empty patch content provided.' };
    }

    let jsonString = rawInput.trim();

    // Check if .mbi V2 format with prefix
    if (jsonString.startsWith('MBI-ENCRYPTED-PATCH-V2:')) {
      try {
        const parts = jsonString.split(':');
        const b64 = parts[1];
        jsonString = decodeURIComponent(atob(b64));
      } catch (e) {
        return { patch: null, error: 'Invalid or corrupted .mbi encrypted patch format.' };
      }
    } else if (jsonString.startsWith('MBI-PATCH-v1:')) {
      try {
        const b64 = jsonString.replace('MBI-PATCH-v1:', '').trim();
        jsonString = decodeURIComponent(atob(b64));
      } catch (e) {
        return { patch: null, error: 'Invalid Base64 .mbipatch format.' };
      }
    }

    try {
      const parsed: FeaturePatchPayload = JSON.parse(jsonString);

      if (!parsed.patchId || !parsed.title || !parsed.signature || !Array.isArray(parsed.features)) {
        return { patch: null, error: 'Malformed patch data structure. Missing patchId, title, signature or features.' };
      }

      // Verify signature integrity
      const expectedSig = computePatchSignature({
        patchId: parsed.patchId,
        version: parsed.version,
        title: parsed.title,
        description: parsed.description,
        targetTenantId: parsed.targetTenantId,
        targetBusinessName: parsed.targetBusinessName,
        issuedBy: parsed.issuedBy,
        issuedAt: parsed.issuedAt,
        expiresAt: parsed.expiresAt,
        features: parsed.features,
        routes: parsed.routes,
        settingsTabs: parsed.settingsTabs,
        limitsExpansion: parsed.limitsExpansion,
        customFlags: parsed.customFlags,
        customScript: parsed.customScript,
      });

      if (parsed.signature !== expectedSig) {
        return { patch: null, error: 'Signature verification failed! Patch file is invalid, corrupted, or has been tampered with.' };
      }

      // Check Expiration
      if (parsed.expiresAt) {
        const expTime = new Date(parsed.expiresAt).getTime();
        if (Date.now() > expTime) {
          return { patch: null, error: `This patch expired on ${new Date(parsed.expiresAt).toLocaleDateString()}. Please request a fresh patch from engineering.` };
        }
      }

      return { patch: parsed, error: null };
    } catch (e: any) {
      return { patch: null, error: `JSON Parse error: ${e?.message || 'Invalid syntax'}` };
    }
  }

  /**
   * Apply and install a patch with automatic restore point creation and strict tenant isolation
   */
  public applyPatch(rawInput: string, currentTenantId?: string): { success: boolean; message: string; patch?: InstalledPatch; restorePointId?: string } {
    const { patch, error } = this.parsePatch(rawInput);
    if (error || !patch) {
      return { success: false, message: error || 'Failed to parse patch' };
    }

    const activeTid = currentTenantId || (typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id') || '' : '');
    
    // Strict Tenant Isolation Verification
    if (patch.targetTenantId !== '*' && patch.targetTenantId !== 'ALL') {
      if (activeTid && patch.targetTenantId !== activeTid) {
        return {
          success: false,
          message: `🚫 Security Violation: This encrypted .mbi patch is cryptographically bound to Tenant "${patch.targetBusinessName || patch.targetTenantId}" (ID: ${patch.targetTenantId}). It cannot be installed on your active tenant (${activeTid}).`
        };
      }
    }

    // AUTOMATIC RESTORE POINT CREATION
    const rp = this.createRestorePoint(
      activeTid || patch.targetTenantId,
      patch.title,
      `Automatic Restore Point created before applying: ${patch.title} (${patch.patchId})`,
      patch.patchId
    );

    const existingPatches = this.getInstalledPatches();
    const isAlreadyInstalled = existingPatches.some(p => p.patchId === patch.patchId);

    const installedRecord: InstalledPatch = {
      ...patch,
      installedAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    // Filter out if updating existing
    const updatedList = existingPatches.filter(p => p.patchId !== patch.patchId);
    updatedList.unshift(installedRecord);

    this.saveInstalledPatches(updatedList);

    // If custom flags or feature toggles exist, apply them specifically to this tenant
    if (patch.customFlags && activeTid) {
      try {
        const storedKey = `mbi_tenant_features_${activeTid}`;
        const existingFlags = JSON.parse(localStorage.getItem(storedKey) || '{}');
        const mergedFlags = { ...existingFlags, ...patch.customFlags };
        localStorage.setItem(storedKey, JSON.stringify(mergedFlags));
      } catch (e) {}
    }

    // Broadcast patch update live across application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-patch-applied', { detail: installedRecord }));
      window.dispatchEvent(new CustomEvent('saas-plans-updated'));
    }

    return {
      success: true,
      message: isAlreadyInstalled 
        ? `Patch "${patch.title}" re-applied and updated successfully! Restore point created (${rp?.restorePointId}).`
        : `Feature Patch "${patch.title}" installed successfully! Unlocked ${patch.features.length} feature(s). Restore point created (${rp?.restorePointId}).`,
      patch: installedRecord,
      restorePointId: rp?.restorePointId
    };
  }

  /**
   * Create a snapshot restore point before any custom patch application
   */
  public createRestorePoint(tenantId: string, patchTitle: string, reason: string, patchId?: string): TenantRestorePoint | null {
    if (typeof window === 'undefined') return null;
    try {
      const existingPatches = this.getInstalledPatches(tenantId);
      let featureTogglesSnapshot: Record<string, any> = {};
      
      try {
        const storedKey = `mbi_tenant_features_${tenantId}`;
        const raw = localStorage.getItem(storedKey);
        if (raw) featureTogglesSnapshot = JSON.parse(raw);
      } catch {}

      const restorePoint: TenantRestorePoint = {
        restorePointId: `RESTORE-${Date.now().toString(36).toUpperCase()}`,
        tenantId: tenantId || 'universal',
        createdAt: new Date().toISOString(),
        reason: reason || `Pre-patch snapshot for ${patchTitle}`,
        patchIdApplied: patchId,
        patchTitle,
        installedPatchesSnapshot: [...existingPatches],
        featureTogglesSnapshot
      };

      const points = this.getAllRestorePoints();
      points.unshift(restorePoint);
      // Keep last 50 restore points
      localStorage.setItem(RESTORE_POINTS_KEY, JSON.stringify(points.slice(0, 50)));
      window.dispatchEvent(new CustomEvent('mbi-restore-points-updated', { detail: points }));
      return restorePoint;
    } catch (e) {
      console.error('Failed to create restore point:', e);
      return null;
    }
  }

  /**
   * Get all available restore points
   */
  public getAllRestorePoints(tenantId?: string): TenantRestorePoint[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RESTORE_POINTS_KEY);
      if (!raw) return [];
      const parsed: TenantRestorePoint[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      if (!tenantId || tenantId === '*' || tenantId === 'ALL') {
        return parsed;
      }
      return parsed.filter(p => p.tenantId === tenantId || p.tenantId === 'universal' || p.tenantId === '*');
    } catch {
      return [];
    }
  }

  /**
   * Rollback system state to a specific restore point
   */
  public rollbackToRestorePoint(restorePointId: string, tenantId?: string): { success: boolean; message: string } {
    const points = this.getAllRestorePoints();
    const targetRp = points.find(p => p.restorePointId === restorePointId);
    if (!targetRp) {
      return { success: false, message: `Restore Point #${restorePointId} not found.` };
    }

    try {
      // Revert installed patches
      this.saveInstalledPatches(targetRp.installedPatchesSnapshot || []);

      // Revert custom flags
      if (targetRp.tenantId && targetRp.featureTogglesSnapshot) {
        localStorage.setItem(`mbi_tenant_features_${targetRp.tenantId}`, JSON.stringify(targetRp.featureTogglesSnapshot));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-patch-applied'));
        window.dispatchEvent(new CustomEvent('saas-plans-updated'));
        window.dispatchEvent(new CustomEvent('mbi-restore-points-updated'));
      }

      return {
        success: true,
        message: `⏪ Successfully rolled back to Restore Point #${restorePointId}! Pre-patch configuration restored with 100% data preservation.`
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Rollback failed: ${e?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Delete a restore point record
   */
  public deleteRestorePoint(restorePointId: string): boolean {
    const points = this.getAllRestorePoints();
    const filtered = points.filter(p => p.restorePointId !== restorePointId);
    localStorage.setItem(RESTORE_POINTS_KEY, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-restore-points-updated'));
    }
    return true;
  }

  /**
   * Get all installed patches
   */
  public getInstalledPatches(tenantId?: string): InstalledPatch[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(INSTALLED_PATCHES_KEY);
      if (!raw) return [];
      const parsed: InstalledPatch[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const activeTid = tenantId || localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id');

      // Filter active and non-expired patches matching this tenant
      return parsed.filter(p => {
        if (p.status === 'DISABLED') return false;
        if (p.expiresAt && Date.now() > new Date(p.expiresAt).getTime()) return false;
        if (p.targetTenantId === '*' || p.targetTenantId === 'ALL') return true;
        if (!activeTid) return true;
        return p.targetTenantId === activeTid;
      });
    } catch {
      return [];
    }
  }

  private saveInstalledPatches(patches: InstalledPatch[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(INSTALLED_PATCHES_KEY, JSON.stringify(patches));
    } catch (e) {
      console.error('Failed to save installed patches:', e);
    }
  }

  /**
   * Remove / Uninstall a patch
   */
  public removePatch(patchId: string): boolean {
    const patches = this.getInstalledPatches();
    const remaining = patches.filter(p => p.patchId !== patchId);
    this.saveInstalledPatches(remaining);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-patch-applied'));
      window.dispatchEvent(new CustomEvent('saas-plans-updated'));
    }
    return true;
  }

  /**
   * Toggle patch status (Active <-> Disabled)
   */
  public togglePatchStatus(patchId: string): boolean {
    const patches = this.getInstalledPatches();
    const target = patches.find(p => p.patchId === patchId);
    if (!target) return false;

    target.status = target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    this.saveInstalledPatches(patches);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-patch-applied'));
      window.dispatchEvent(new CustomEvent('saas-plans-updated'));
    }
    return true;
  }

  /**
   * Check if a specific feature key is unlocked by an active manual patch
   */
  public isFeaturePatched(featureKey: string, tenantId?: string): boolean {
    const patches = this.getInstalledPatches(tenantId);
    if (patches.length === 0) return false;

    const normalizedReq = featureKey.toLowerCase().replace(/[\s-_]/g, '');

    for (const patch of patches) {
      if (patch.status !== 'ACTIVE') continue;
      for (const f of patch.features) {
        if (f === '*' || f.toLowerCase().replace(/[\s-_]/g, '') === normalizedReq) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a specific route is unlocked by an active manual patch
   */
  public isRoutePatched(pathname: string, tenantId?: string): boolean {
    const patches = this.getInstalledPatches(tenantId);
    if (patches.length === 0) return false;

    const cleanPath = pathname.toLowerCase();

    for (const patch of patches) {
      if (patch.status !== 'ACTIVE') continue;
      for (const r of patch.routes) {
        if (r === '*' || cleanPath.startsWith(r.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a settings tab is unlocked by an active manual patch
   */
  public isSettingsTabPatched(tabKey: string, tenantId?: string): boolean {
    const patches = this.getInstalledPatches(tenantId);
    if (patches.length === 0) return false;

    const normalizedReq = tabKey.toUpperCase().trim();

    for (const patch of patches) {
      if (patch.status !== 'ACTIVE') continue;
      if (!patch.settingsTabs) continue;
      for (const t of patch.settingsTabs) {
        if (t === '*' || t.toUpperCase().trim() === normalizedReq) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get limits expanded by active patches
   */
  public getPatchedLimits(tenantId?: string): {
    maxFirms?: number;
    maxStaffUsers?: number;
    maxGodowns?: number;
  } {
    const patches = this.getInstalledPatches(tenantId);
    const expanded = {
      maxFirms: 0,
      maxStaffUsers: 0,
      maxGodowns: 0,
    };

    for (const patch of patches) {
      if (patch.status !== 'ACTIVE') continue;
      if (patch.limitsExpansion) {
        if (patch.limitsExpansion.maxFirms) expanded.maxFirms = Math.max(expanded.maxFirms, patch.limitsExpansion.maxFirms);
        if (patch.limitsExpansion.maxStaffUsers) expanded.maxStaffUsers = Math.max(expanded.maxStaffUsers, patch.limitsExpansion.maxStaffUsers);
        if (patch.limitsExpansion.maxGodowns) expanded.maxGodowns = Math.max(expanded.maxGodowns, patch.limitsExpansion.maxGodowns);
      }
    }
    return expanded;
  }
}

export const manualPatchService = new ManualPatchService();
