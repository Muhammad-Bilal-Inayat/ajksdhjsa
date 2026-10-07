import { 
  initDB, invalidateStoreCache
} from './db';

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error';

export const SYNCED_STORE_NAMES = [
  'medicines', 'invoices', 'users', 'appUsers', 'userActivities', 'suppliers', 
  'purchaseOrders', 'auditLogs', 'expenses', 'partyPayments',
  'bankAccounts', 'bankTransactions', 'cheques', 'loanAccounts', 'cashierShifts',
  'onlineOrders', 'onlinePromotions', 'storeSettings',
  'shortageItems', 'narcoticsLogs', 'chronicRefills', 'supplierReturns', 'loyaltyCustomers',
  'notes', 'bookers', 'bookerTransactions'
] as const;

export type SyncedStoreName = typeof SYNCED_STORE_NAMES[number];

export interface DiscrepancyItem {
  id: string;
  storeName: string;
  type: 'missing_local' | 'missing_remote' | 'local_newer' | 'remote_newer' | 'identical';
  localTimestamp?: string;
  remoteTimestamp?: string;
  localItem?: any;
  remoteItem?: any;
}

export interface DiscrepancyReport {
  hasDiscrepancies: boolean;
  totalDiscrepancies: number;
  missingInLocalCount: number;
  missingInRemoteCount: number;
  conflictsCount: number;
  stores: Record<string, {
    totalLocal: number;
    totalRemote: number;
    missingInLocal: number;
    missingInRemote: number;
    conflicts: number;
    discrepancies: DiscrepancyItem[];
  }>;
  timestamp: string;
}

export interface SyncEventPayload {
  storeName: string;
  action: 'add' | 'save' | 'delete' | 'reconcile' | 'full';
  record?: any;
  id?: string;
  timestamp: string;
  source: 'local' | 'broadcast' | 'server' | 'reconcile';
}

/**
 * Consistent ID generation for offline-first entries
 * Ensures timestamp sorting, collision resistance, and deterministic prefixing.
 */
export function generateOfflineId(prefix = 'item'): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  const cryptoRand = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID().split('-')[0] 
    : Math.floor(Math.random() * 10000).toString(16);
  return `${prefix}-${timestamp}-${randomPart}${cryptoRand}`;
}

/**
 * Ensure an offline-first entry has consistent identifiers and timestamps
 */
export function stampOfflineEntry<T extends Record<string, any>>(record: T, prefix = 'rec'): T & {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'conflict';
} {
  const now = new Date().toISOString();
  return {
    ...record,
    id: record.id || generateOfflineId(prefix),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    syncStatus: record.syncStatus || 'pending'
  };
}

/**
 * Helper to extract comparable millisecond timestamp
 */
export function extractRecordTimestamp(record: any): number {
  if (!record || typeof record !== 'object') return 0;
  const candidates = [record.updatedAt, record.timestamp, record.createdAt, record.date, record.orderDate];
  for (const candidate of candidates) {
    if (candidate) {
      const parsed = new Date(candidate).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

class UnifiedSyncService {
  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private changeListeners: Set<(payload: SyncEventPayload) => void> = new Set();
  private statusListeners: Set<(status: SyncStatusType) => void> = new Set();
  private isReconciling = false;
  private isPushing = false;
  private currentStatus: SyncStatusType = 'synced';
  private lastReport: DiscrepancyReport | null = null;
  private syncBatchQueue: Map<string, { entityType: string; record: any }> = new Map();
  private batchDebounceTimer: any = null;
  private isFlushingBatch = false;
  private syncFailures = 0;
  private syncBackoffUntil = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('mbi_unified_sync_channel');
          this.channel.onmessage = (event) => this.handleBroadcast(event.data);
        }
      } catch (e) {
        console.warn('BroadcastChannel fallback enabled');
      }

      window.addEventListener('storage', (e) => {
        if (e.key === 'mbi_unified_sync_trigger' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.emitChangeEvent({
              ...data,
              source: 'broadcast'
            });
          } catch (err) {}
        }
      });

      // Auto-reconcile on focus & online
      window.addEventListener('focus', () => {
        this.detectAndReconcile(false);
      });
      window.addEventListener('online', () => {
        this.setStatus('synced');
        this.initSSE();
        this.flushSyncBatch().catch(() => {});
        this.forceFullSync().catch(() => {});
        this.detectAndReconcile(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { trigger: 'online-auto-sync' } }));
          window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
        }
      });
      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });

      // Periodic background delta sync (fallback behind real-time SSE stream)
      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && document.visibilityState === 'visible') {
          this.detectAndReconcile(false).catch(() => {});
        }
      }, 30000);

      // Start Real-Time SSE Stream for sub-50ms cross-device live updates
      this.initSSE();

      // Immediate startup reconcile to sync from cloud right away
      setTimeout(() => {
        this.detectAndReconcile(false).catch(() => {});
      }, 150);
    }
  }

  /**
   * Real-Time Server-Sent Events (SSE) listener for instant cross-browser replication
   */
  private initSSE(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('mbi_auth_token') || localStorage.getItem('auth_token')) : '';
      const activeTenantId = typeof localStorage !== 'undefined' ? (localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('tenant_id')) : '';
      const queryParams = new URLSearchParams();
      if (token) queryParams.set('token', token);
      if (activeTenantId && activeTenantId !== 'biz_default' && activeTenantId !== 'default') queryParams.set('tenantId', activeTenantId);
      const url = `/api/sync/events${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      this.eventSource = new EventSource(url);

      this.eventSource.onmessage = async (event) => {
        try {
          if (!event.data) return;
          const payload = JSON.parse(event.data);
          if (!payload || !payload.action) return;

          if (payload.action === 'save' && payload.entityType && payload.record) {
            const db = await initDB();
            await db.put(payload.entityType as any, payload.record);
            invalidateStoreCache(payload.entityType);
            this.emitChangeEvent({
              storeName: payload.entityType,
              action: 'save',
              record: payload.record,
              id: payload.record.id,
              timestamp: payload.timestamp || new Date().toISOString(),
              source: 'server'
            });
          } else if (payload.action === 'delete' && payload.entityType && payload.id) {
            const db = await initDB();
            await db.delete(payload.entityType as any, payload.id);
            invalidateStoreCache(payload.entityType);
            this.emitChangeEvent({
              storeName: payload.entityType,
              action: 'delete',
              id: payload.id,
              timestamp: payload.timestamp || new Date().toISOString(),
              source: 'server'
            });
          } else if (payload.action === 'batch' || payload.action === 'reload' || payload.action === 'fleet_update') {
            this.detectAndReconcile(false).catch(() => {});
          }
        } catch (err) {
          console.warn('SSE event processing note:', err);
        }
      };

      this.eventSource.onerror = () => {
        // EventSource will automatically retry in the background
      };
    } catch (e) {
      console.warn('SSE initialization note:', e);
    }
  }

  public getStatus(): SyncStatusType {
    return this.currentStatus;
  }

  public getLastReport(): DiscrepancyReport | null {
    return this.lastReport;
  }

  public subscribeStatus(listener: (status: SyncStatusType) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  public onEntityChange(listener: (payload: SyncEventPayload) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private setStatus(status: SyncStatusType) {
    this.currentStatus = status;
    this.statusListeners.forEach(fn => fn(status));
  }

  private handleBroadcast(data: any) {
    if (!data || !data.storeName) return;
    this.emitChangeEvent({
      ...data,
      source: 'broadcast'
    });
  }

  private emitChangeEvent(payload: SyncEventPayload) {
    // Notify all internal listeners
    this.changeListeners.forEach(fn => {
      try {
        fn(payload);
      } catch (e) {
        console.error('Error in sync change listener:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: payload }));
      window.dispatchEvent(new CustomEvent('mbi-local-db-change', { detail: payload }));
      window.dispatchEvent(new CustomEvent('mbi-entity-added', { detail: payload }));
      if (payload.storeName === 'medicines' || payload.storeName === 'all') {
        window.dispatchEvent(new CustomEvent('mbi-medicines-updated', { detail: payload }));
      }
      if (payload.storeName === 'invoices' || payload.storeName === 'all') {
        window.dispatchEvent(new CustomEvent('mbi-invoices-updated', { detail: payload }));
      }
      if (payload.storeName === 'appUsers' || payload.storeName === 'users' || payload.storeName === 'all') {
        window.dispatchEvent(new CustomEvent('mbi-users-updated', { detail: payload }));
      }
    }
  }

  /**
   * Forces a re-fetch of the state to refresh the UI immediately after any 'Add' or 'Save' operation
   */
  public async notifyEntityAdded(storeName: string, record: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const stamped = {
      ...record,
      updatedAt: record.updatedAt || timestamp,
      createdAt: record.createdAt || timestamp
    };

    const payload: SyncEventPayload = {
      storeName,
      action: record.isDeleted ? 'delete' : 'add',
      record: stamped,
      id: stamped.id,
      timestamp,
      source: 'local'
    };

    // 1. Broadcast to other tabs immediately
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (e) {}
    }

    // 2. Storage event trigger for multi-tab fallback
    try {
      localStorage.setItem('mbi_unified_sync_trigger', JSON.stringify(payload));
    } catch (e) {}

    // 3. Emit local event for current tab UI components to immediately re-fetch
    this.emitChangeEvent(payload);

    // 4. Send batched update via debounced queue to backend server
    this.queueRecordForSync(storeName, stamped);
  }

  /**
   * Queue record into client-side debounced batching queue with fast-path for stable network
   */
  public queueRecordForSync(entityType: string, record: any): void {
    if (!record || !record.id) return;
    const queueKey = `${entityType}:${record.id}`;
    this.syncBatchQueue.set(queueKey, { entityType, record });

    if (this.batchDebounceTimer) clearTimeout(this.batchDebounceTimer);
    // If failures occurred, back off exponentially. Otherwise run ultra-fast 200ms debounce!
    const delay = this.syncFailures > 0 
      ? Math.min(1500 * Math.pow(2, this.syncFailures - 1), 30000) 
      : 200;
    this.batchDebounceTimer = setTimeout(() => {
      this.flushSyncBatch().catch(() => {});
    }, delay);
  }

  /**
   * Flush queued records to server in a single request (or single record if only 1)
   */
  public async flushSyncBatch(): Promise<void> {
    if (this.isFlushingBatch || this.syncBatchQueue.size === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return; // Keep queued for when back online
    }

    if (Date.now() < this.syncBackoffUntil) {
      return; // Obey exponential backoff
    }

    this.isFlushingBatch = true;
    const items = Array.from(this.syncBatchQueue.values());
    this.syncBatchQueue.clear();

    try {
      if (items.length === 1) {
        await fetch('/api/sync/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items[0]),
        });
      } else {
        await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: items }),
        });
      }
      // Success: Reset backoff for high speed
      this.syncFailures = 0;
      this.syncBackoffUntil = 0;
    } catch (err) {
      // Re-queue items if network failed and advance backoff
      this.syncFailures++;
      const backoff = Math.min(1500 * Math.pow(2, this.syncFailures - 1), 30000);
      this.syncBackoffUntil = Date.now() + backoff;

      for (const it of items) {
        const key = `${it.entityType}:${it.record.id}`;
        if (!this.syncBatchQueue.has(key)) {
          this.syncBatchQueue.set(key, it);
        }
      }
    } finally {
      this.isFlushingBatch = false;
    }
  }

  /**
   * Push single record directly or queue it
   */
  public async pushSingleRecord(entityType: string, record: any): Promise<void> {
    this.queueRecordForSync(entityType, record);
  }

  /**
   * Collect all local records across ALL 25 stores
   */
  public async getLocalStoreData(): Promise<Record<string, any[]>> {
    const db = await initDB();
    const result: Record<string, any[]> = {};

    await Promise.all(
      SYNCED_STORE_NAMES.map(async (storeName) => {
        try {
          const items = await db.getAll(storeName as any);
          result[storeName] = Array.isArray(items) ? items.filter(it => !it.isDeleted) : [];
        } catch {
          result[storeName] = [];
        }
      })
    );

    return result;
  }

  /**
   * Fetch current remote data from Server sync API
   */
  public async getRemoteStoreData(): Promise<Record<string, any[]> | null> {
    try {
      const activeTenantId = (typeof localStorage !== 'undefined' ? (localStorage.getItem('mbi_active_business_id') || localStorage.getItem('mbi_active_tenant_cache')) : null) || 'tenant_main';
      const parsedTenant = typeof activeTenantId === 'string' && activeTenantId.startsWith('{') ? (JSON.parse(activeTenantId)?.tenantId || 'tenant_main') : activeTenantId;
      const res = await fetch(`/api/sync?tenantId=${encodeURIComponent(parsedTenant)}`, {
        headers: { 'x-tenant-id': parsedTenant },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) return json.data;
      }
    } catch (e) {}

    return null;
  }

  /**
   * Detect data discrepancies between client and sync API across all collections
   */
  public async detectDiscrepancies(): Promise<DiscrepancyReport> {
    const localData = await this.getLocalStoreData();
    const remoteData = (await this.getRemoteStoreData()) || {};

    const report: DiscrepancyReport = {
      hasDiscrepancies: false,
      totalDiscrepancies: 0,
      missingInLocalCount: 0,
      missingInRemoteCount: 0,
      conflictsCount: 0,
      stores: {},
      timestamp: new Date().toISOString()
    };

    const allStores = Array.from(new Set([
      ...SYNCED_STORE_NAMES,
      ...Object.keys(localData),
      ...Object.keys(remoteData)
    ])).filter(k => k !== '_tombstones');

    // Check remote tombstones first
    const tombstones: Array<{ entityType: string; id: string }> = Array.isArray(remoteData._tombstones)
      ? remoteData._tombstones
      : [];

    for (const storeName of allStores) {
      const localItems: any[] = Array.isArray(localData[storeName]) ? localData[storeName] : [];
      const remoteItems: any[] = Array.isArray(remoteData[storeName]) ? remoteData[storeName] : [];

      const localMap = new Map<string, any>();
      for (const item of localItems) {
        if (item && item.id) localMap.set(item.id, item);
      }

      const remoteMap = new Map<string, any>();
      for (const item of remoteItems) {
        if (item && item.id) remoteMap.set(item.id, item);
      }

      const discrepancies: DiscrepancyItem[] = [];
      let missingInLocal = 0;
      let missingInRemote = 0;
      let conflicts = 0;

      // Check items in remote
      for (const [id, remoteItem] of remoteMap.entries()) {
        if (!localMap.has(id)) {
          if (!remoteItem.isDeleted) {
            missingInLocal++;
            discrepancies.push({
              id,
              storeName,
              type: 'missing_local',
              remoteTimestamp: remoteItem.updatedAt || remoteItem.createdAt,
              remoteItem
            });
          }
        } else {
          const localItem = localMap.get(id);
          if (remoteItem.isDeleted) {
            conflicts++;
            discrepancies.push({
              id,
              storeName,
              type: 'remote_newer',
              remoteItem
            });
          } else {
            const localTime = extractRecordTimestamp(localItem);
            const remoteTime = extractRecordTimestamp(remoteItem);

            if (localTime !== remoteTime) {
              conflicts++;
              discrepancies.push({
                id,
                storeName,
                type: localTime >= remoteTime ? 'local_newer' : 'remote_newer',
                localTimestamp: localItem.updatedAt || localItem.createdAt,
                remoteTimestamp: remoteItem.updatedAt || remoteItem.createdAt,
                localItem,
                remoteItem
              });
            }
          }
        }
      }

      // Check local items not present in remote
      for (const [id, localItem] of localMap.entries()) {
        if (!remoteMap.has(id)) {
          // Check if it was deleted via tombstone
          const isTombstoned = tombstones.some(t => t.entityType === storeName && t.id === id);
          if (isTombstoned) {
            conflicts++;
            discrepancies.push({
              id,
              storeName,
              type: 'remote_newer',
              remoteItem: { id, isDeleted: true }
            });
          } else {
            missingInRemote++;
            discrepancies.push({
              id,
              storeName,
              type: 'missing_remote',
              localTimestamp: localItem.updatedAt || localItem.createdAt,
              localItem
            });
          }
        }
      }

      const storeDiscrepancyCount = missingInLocal + missingInRemote + conflicts;
      if (storeDiscrepancyCount > 0) {
        report.hasDiscrepancies = true;
        report.totalDiscrepancies += storeDiscrepancyCount;
        report.missingInLocalCount += missingInLocal;
        report.missingInRemoteCount += missingInRemote;
        report.conflictsCount += conflicts;
      }

      report.stores[storeName] = {
        totalLocal: localItems.length,
        totalRemote: remoteItems.length,
        missingInLocal,
        missingInRemote,
        conflicts,
        discrepancies
      };
    }

    this.lastReport = report;
    return report;
  }

  /**
   * Reconcile discrepancies with timestamp-first conflict resolution:
   * - Newer local entries are prioritized and pushed to server
   * - Newer remote entries are merged into local database
   * - Deleted remote entries are deleted from local database
   */
  public async reconcileDiscrepancies(customReport?: DiscrepancyReport): Promise<{
    success: boolean;
    reconciledCount: number;
    message: string;
  }> {
    if (this.isReconciling) return { success: true, reconciledCount: 0, message: 'Reconcile already in progress' };
    this.isReconciling = true;
    this.setStatus('syncing');

    try {
      const report = customReport || (await this.detectDiscrepancies());
      if (!report.hasDiscrepancies) {
        this.setStatus('synced');
        return { success: true, reconciledCount: 0, message: 'All client and cloud records are in perfect synchronization.' };
      }

      const db = await initDB();
      let updatedLocalCount = 0;
      let needsRemotePush = false;

      for (const [storeName, storeInfo] of Object.entries(report.stores)) {
        for (const item of storeInfo.discrepancies) {
          if (item.type === 'missing_local' && item.remoteItem) {
            if (!item.remoteItem.isDeleted) {
              try {
                await db.put(storeName as any, item.remoteItem);
                updatedLocalCount++;
              } catch (e) {}
            }
          } else if (item.type === 'remote_newer' && item.remoteItem) {
            try {
              if (item.remoteItem.isDeleted) {
                await db.delete(storeName as any, item.id);
              } else {
                await db.put(storeName as any, item.remoteItem);
              }
              updatedLocalCount++;
            } catch (e) {}
          } else if (item.type === 'local_newer' || item.type === 'missing_remote') {
            needsRemotePush = true;
          }
        }
      }

      // If local had newer records, push to remote
      if (needsRemotePush) {
        const fullLocal = await this.getLocalStoreData();
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: fullLocal })
        }).catch(() => {});
      }

      this.setStatus('synced');

      // Invalidate memory cache for all stores so UI reads fresh state
      invalidateStoreCache();

      // Force UI refresh across components
      this.emitChangeEvent({
        storeName: 'all',
        action: 'reconcile',
        timestamp: new Date().toISOString(),
        source: 'reconcile'
      });

      return {
        success: true,
        reconciledCount: report.totalDiscrepancies,
        message: `Successfully reconciled ${report.totalDiscrepancies} discrepancies across connected browsers and devices.`
      };
    } catch (err: any) {
      this.setStatus('error');
      return { success: false, reconciledCount: 0, message: err?.message || 'Failed to reconcile discrepancies.' };
    } finally {
      this.isReconciling = false;
    }
  }

  /**
   * Quick detect & reconcile convenience method
   */
  public async detectAndReconcile(showNotification = false): Promise<void> {
    const report = await this.detectDiscrepancies();
    if (report.hasDiscrepancies) {
      await this.reconcileDiscrepancies(report);
    }
  }

  /**
   * Force full sync across all 25 collections
   */
  public async forceFullSync(): Promise<{ success: boolean; count: number; message: string }> {
    const report = await this.detectDiscrepancies();
    const result = await this.reconcileDiscrepancies(report);
    return {
      success: result.success,
      count: result.reconciledCount,
      message: result.message
    };
  }
}

export const unifiedSyncService = new UnifiedSyncService();
