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
  signature: string;         // Cryptographic integrity checksum
}

export interface InstalledPatch extends FeaturePatchPayload {
  installedAt: string;
  installedByEmail?: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
}

const INSTALLED_PATCHES_KEY = 'mbi_installed_feature_patches_v1';
const PATCH_INTEGRITY_SALT = 'MBI_INVENTRA_SECURE_PATCH_ENGINE_2026_PROD';

/**
 * Generate a reproducible hash signature for tamper detection
 */
function computePatchSignature(payload: Omit<FeaturePatchPayload, 'signature'>): string {
  const serialized = JSON.stringify({
    patchId: payload.patchId,
    title: payload.title,
    targetTenantId: payload.targetTenantId,
    issuedAt: payload.issuedAt,
    features: payload.features.sort(),
    routes: payload.routes.sort(),
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
   * Generates a signed patch object and downloadable format (Developer / Master Tool)
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
    expiresInDays?: number | null; // null = lifetime
    issuedBy?: string;
  }): { patch: FeaturePatchPayload; rawCode: string; encodedBase64: string } {
    const patchId = `PATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const issuedAt = new Date().toISOString();
    let expiresAt: string | null = null;

    if (params.expiresInDays && params.expiresInDays > 0) {
      const expDate = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const rawPayload: Omit<FeaturePatchPayload, 'signature'> = {
      patchId,
      version: '1.0',
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
    };

    const signature = computePatchSignature(rawPayload);
    const fullPatch: FeaturePatchPayload = {
      ...rawPayload,
      signature
    };

    const rawCode = JSON.stringify(fullPatch, null, 2);
    const encodedBase64 = `MBI-PATCH-v1:${btoa(encodeURIComponent(rawCode))}`;

    return {
      patch: fullPatch,
      rawCode,
      encodedBase64
    };
  }

  /**
   * Parse raw patch string (JSON or Base64 .mbipatch format)
   */
  public parsePatch(rawInput: string): { patch: FeaturePatchPayload | null; error: string | null } {
    if (!rawInput || typeof rawInput !== 'string') {
      return { patch: null, error: 'Empty patch content provided.' };
    }

    let jsonString = rawInput.trim();

    // Check if base64 format with prefix
    if (jsonString.startsWith('MBI-PATCH-v1:')) {
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
        return { patch: null, error: 'Malformed patch data structure. Missing patchId, title, or features.' };
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
   * Apply and install a patch into local storage and tenant configuration
   */
  public applyPatch(rawInput: string, currentTenantId?: string): { success: boolean; message: string; patch?: InstalledPatch } {
    const { patch, error } = this.parsePatch(rawInput);
    if (error || !patch) {
      return { success: false, message: error || 'Failed to parse patch' };
    }

    // Tenant Isolation Check
    const activeTid = currentTenantId || (typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id') : undefined);
    if (patch.targetTenantId !== '*' && patch.targetTenantId !== 'ALL') {
      if (activeTid && patch.targetTenantId !== activeTid) {
        return {
          success: false,
          message: `This patch is issued exclusively for Tenant ID "${patch.targetTenantId}". Your current active tenant is "${activeTid}".`
        };
      }
    }

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

    // Broadcast patch update live across application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-patch-applied', { detail: installedRecord }));
      window.dispatchEvent(new CustomEvent('saas-plans-updated'));
    }

    return {
      success: true,
      message: isAlreadyInstalled 
        ? `Patch "${patch.title}" re-applied and updated successfully!`
        : `Feature Patch "${patch.title}" installed successfully! Unlocked ${patch.features.length} feature(s).`,
      patch: installedRecord
    };
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
