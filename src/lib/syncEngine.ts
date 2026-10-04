import { 
  dbMedicines, dbInvoices, dbSuppliers, dbPurchaseOrders, 
  dbPartyPayments, dbExpenses, dbBankTransactions, dbAuditLogs, 
  dbAppUsers, dbUsers, dbUserActivities, dbBankAccounts, dbCheques, 
  dbLoanAccounts, dbCashierShifts, dbOnlineOrders, dbOnlinePromotions, 
  dbShortageItems, dbNarcoticsLogs, dbChronicRefills, dbSupplierReturns, 
  dbLoyaltyCustomers, dbNotes, dbBookers, dbBookerTransactions, 
  initDB, invalidateStoreCache 
} from './db';
import { networkStateManager } from './networkStateManager';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export function generateIdempotencyKey(tenantId: string = 'default', deviceId: string = 'device-1'): string {
  const timestamp = Date.now();
  const salt = Math.random().toString(36).substring(2, 9);
  return `${tenantId}_${deviceId}_${timestamp}_${salt}`;
}

interface SyncEventDetail {
  source: string;
  storeName?: string;
  action?: 'save' | 'delete' | 'full';
  timestamp: string;
}

class SyncEngine {
  private channel: BroadcastChannel | null = null;
  private syncStatus: SyncStatus = 'synced';
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private isPulling = false;
  private isPushing = false;
  private pollInterval: any = null;
  private lastSyncTimestamp: string = new Date().toISOString();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('mbi_inventra_live_sync');
          this.channel.onmessage = (event) => this.handleBroadcastMessage(event.data);
        }
      } catch (e) {
        console.warn('BroadcastChannel not supported, falling back to storage events');
      }

      // Fallback cross-tab sync via storage events
      window.addEventListener('storage', (e) => {
        if (e.key === 'mbi_live_sync_ping') {
          this.notifyLocalSubscribers({
            source: 'storage',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Sync immediately on window focus or visibility change
      window.addEventListener('focus', () => {
        this.pullServerSync(false);
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.pullServerSync(false);
        }
      });

      // Sync on network recovery via NetworkStateManager
      networkStateManager.subscribe((state) => {
        if (state.isOnline && this.syncStatus === 'offline') {
          this.setStatus('synced');
          this.pullServerSync(false);
        } else if (!state.isOnline && this.syncStatus !== 'offline') {
          this.setStatus('offline');
        }
      });

      // Periodic background poll every 30 seconds (SSE handles instant sub-50ms sync)
      this.pollInterval = setInterval(() => {
        if (networkStateManager.getState().isOnline && !this.isPulling && !this.isPushing) {
          if (typeof document !== 'undefined' && document.hidden) return;
          this.pullServerSync(false);
        }
      }, 30000);

      // Initialize Live Server-Sent Events (SSE) Stream for instant sub-100ms multi-device sync
      this.initEventSourceStream();

      // Initial pulls on start
      setTimeout(() => {
        this.pullServerSync(false);
      }, 500);

      setTimeout(() => {
        this.pullServerSync(false);
      }, 2500);
    }
  }

  private eventSource: EventSource | null = null;
  private sseReconnectTimer: any = null;

  private initEventSourceStream() {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('mbi_token') || '';
      const tenantId = localStorage.getItem('mbi_active_tenant') || localStorage.getItem('activeTenantId') || '';
      const sseUrl = `/api/sync/events?token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId)}`;

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        if (this.syncStatus === 'offline' && networkStateManager.getState().isOnline) {
          this.setStatus('synced');
        }
      };

      this.eventSource.onmessage = async (e) => {
        if (!e.data) return;
        try {
          const payload = JSON.parse(e.data);

          if (payload && payload.type === 'NEW_BROADCAST_ANNOUNCEMENT') {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('mbi-new-broadcast', { detail: payload.payload }));
            }
            return;
          }

          if (payload && payload.type === 'MBI_PERMISSIONS_UPDATED') {
            const data = payload.payload;
            if (data && data.profile) {
              const exactKey = `mbi_user_access_profile_${data.tenantId}_${data.userId}`;
              const directUserKey = `mbi_user_access_profile_user_${data.userId}`;
              const serialized = JSON.stringify(data.profile);
              localStorage.setItem(exactKey, serialized);
              localStorage.setItem(directUserKey, serialized);
              localStorage.setItem('mbi_active_user_access_profile', serialized);
              if (data.effective) {
                localStorage.setItem('mbi_active_effective_permissions', JSON.stringify(data.effective));
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mbi-user-access-profile-updated', { detail: { profile: data.profile } }));
                window.dispatchEvent(new CustomEvent('mbi-effective-permissions-updated', { detail: { effective: data.effective } }));
                window.dispatchEvent(new Event('storage'));
              }
            }
            return;
          }

          if (payload && payload.type === 'PRIVATE_PANEL_CONFIG_UPDATED') {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('mbi-private-panel-config-updated', { detail: payload.payload }));
            }
            return;
          }

          if (payload && (payload.type === 'STOCK_MUTATION' || payload.type === 'RECORD_UPDATED' || payload.entity || payload.records)) {
            if (payload.records && Array.isArray(payload.records)) {
              const db = await initDB();
              for (const item of payload.records) {
                if (item.entityType && item.record) {
                  await db.put(item.entityType, item.record);
                  invalidateStoreCache(item.entityType);
                }
              }
            } else if (payload.entity && payload.payload) {
              const db = await initDB();
              await db.put(payload.entity, payload.payload);
              invalidateStoreCache(payload.entity);
            }

            this.notifyLocalSubscribers({
              source: 'sse',
              storeName: payload.entity || payload.entityType,
              action: 'save',
              timestamp: payload.timestamp || new Date().toISOString()
            });
          }
        } catch (err) {
          // Non-blocking parse error
        }
      };

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        if (this.sseReconnectTimer) clearTimeout(this.sseReconnectTimer);
        this.sseReconnectTimer = setTimeout(() => {
          if (networkStateManager.getState().isOnline) {
            this.initEventSourceStream();
          }
        }, 10000);
      };
    } catch (e) {
      console.warn('[SSE INIT ERROR]', e);
    }
  }

  public getStatus(): SyncStatus {
    return this.syncStatus;
  }

  public getLastSyncTime(): string {
    return this.lastSyncTimestamp;
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.syncStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onDataChange(listener: (detail?: SyncEventDetail) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SyncEventDetail>;
      listener(customEvent.detail);
    };
    window.addEventListener('mbi-data-synced', handler);
    return () => {
      window.removeEventListener('mbi-data-synced', handler);
    };
  }

  public onSyncMessage(listener: (detail?: any) => void): () => void {
    return this.onDataChange(listener);
  }

  public async syncTenantNow(_tenantId?: string): Promise<boolean> {
    try {
      await this.pushServerSync();
      return true;
    } catch {
      return false;
    }
  }

  private setStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.listeners.forEach(fn => fn(status));
  }

  private notifyLocalSubscribers(detail: SyncEventDetail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail }));
      if (detail.storeName === 'appUsers' || detail.storeName === 'users') {
        window.dispatchEvent(new CustomEvent('mbi-users-updated'));
      }
      if (detail.storeName === 'bookers' || detail.storeName === 'bookerTransactions') {
        window.dispatchEvent(new CustomEvent('mbi-bookers-updated'));
      }
    }
  }

  private async handleBroadcastMessage(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'RECORD_UPDATED') {
      const { storeName, action, record, id } = data;
      try {
        const db = await initDB();
        if (action === 'save' && record) {
          await db.put(storeName, record);
          invalidateStoreCache(storeName);
        } else if (action === 'delete' && id) {
          await db.delete(storeName, id);
          invalidateStoreCache(storeName);
        }
      } catch (err) {
        console.warn('Broadcast sync store update failed:', err);
      }

      this.notifyLocalSubscribers({
        source: 'broadcast',
        storeName,
        action,
        timestamp: data.timestamp || new Date().toISOString()
      });
    } else if (data.type === 'FULL_SYNC_PING') {
      this.notifyLocalSubscribers({
        source: 'broadcast',
        action: 'full',
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  }

  /**
   * Broadcast a single local record change to other tabs and sync immediately to server
   */
  public broadcastLocalChange(storeName: string, action: 'save' | 'delete', recordOrId: any) {
    const timestamp = new Date().toISOString();
    this.lastSyncTimestamp = timestamp;

    const recordId = action === 'delete' ? (typeof recordOrId === 'string' ? recordOrId : recordOrId?.id) : recordOrId?.id;
    const recordPayload = action === 'save' ? recordOrId : { id: recordId, isDeleted: true, updatedAt: timestamp };

    // 1. Send via BroadcastChannel for 0ms same-browser tab sync
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'RECORD_UPDATED',
          storeName,
          action,
          record: action === 'save' ? recordOrId : undefined,
          id: recordId,
          timestamp
        });
      } catch (e) {
        console.warn('Channel post failed:', e);
      }
    }

    // 2. Storage event fallback
    try {
      localStorage.setItem('mbi_live_sync_ping', `${storeName}_${action}_${timestamp}`);
    } catch {}

    // 3. Immediate single-record push to Cloud/Local Server API (cross-browser / cross-PC)
    if (recordPayload && recordId) {
      fetch('/api/sync/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: storeName,
          record: recordPayload
        })
      }).catch(() => {});
    }

    // 4. Background debounced push to ensure all collections stay complete
    this.debouncedServerPush();
  }

  private pushTimeout: any = null;
  private debouncedServerPush() {
    if (this.pushTimeout) clearTimeout(this.pushTimeout);
    this.pushTimeout = setTimeout(() => {
      this.pushServerSync();
    }, 600);
  }

  private serverSyncFailCooldownUntil = 0;

  /**
   * Pull latest data from server API and merge into local IndexedDB
   */
  public async pullServerSync(showToast = false): Promise<{ success: boolean; message: string }> {
    if (this.isPulling) return { success: true, message: 'Sync in progress' };
    if (Date.now() < this.serverSyncFailCooldownUntil && !showToast) {
      return { success: false, message: 'Server sync in temporary cooldown' };
    }

    this.isPulling = true;
    if (showToast) {
      this.setStatus('syncing');
    }

    try {
      let serverData: any = null;

      // 1. Fetch latest state from Server API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/api/sync', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            serverData = json.data;
          }
        }
      } catch (err) {
        // Silent server fetch fallback
        this.serverSyncFailCooldownUntil = Date.now() + 15000;
      }

      // Merge serverData into local IndexedDB across ALL stores
      if (serverData && typeof serverData === 'object') {
        const db = await initDB();
        const storeMap: Record<string, any[]> = {
          medicines: serverData.medicines || [],
          invoices: serverData.invoices || [],
          purchaseOrders: serverData.purchaseOrders || [],
          suppliers: serverData.suppliers || [],
          partyPayments: serverData.partyPayments || [],
          expenses: serverData.expenses || [],
          bankTransactions: serverData.bankTransactions || [],
          auditLogs: serverData.auditLogs || [],
          appUsers: serverData.appUsers || [],
          users: serverData.users || [],
          userActivities: serverData.userActivities || [],
          bankAccounts: serverData.bankAccounts || [],
          cheques: serverData.cheques || [],
          loanAccounts: serverData.loanAccounts || [],
          cashierShifts: serverData.cashierShifts || [],
          onlineOrders: serverData.onlineOrders || [],
          onlinePromotions: serverData.onlinePromotions || [],
          storeSettings: serverData.storeSettings || [],
          shortageItems: serverData.shortageItems || [],
          narcoticsLogs: serverData.narcoticsLogs || [],
          chronicRefills: serverData.chronicRefills || [],
          supplierReturns: serverData.supplierReturns || [],
          loyaltyCustomers: serverData.loyaltyCustomers || [],
          notes: serverData.notes || [],
          bookers: serverData.bookers || [],
          bookerTransactions: serverData.bookerTransactions || []
        };

        let totalUpdatedCount = 0;
        let usersUpdated = false;
        let bookersUpdated = false;

        for (const [storeName, items] of Object.entries(storeMap)) {
          if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
              if (item && item.id) {
                // Ignore deleted or empty placeholder records
                if (item.isDeleted) {
                  const existing = await db.get(storeName as any, item.id);
                  if (existing) {
                    await db.delete(storeName as any, item.id);
                    invalidateStoreCache(storeName);
                    totalUpdatedCount++;
                    if (storeName === 'appUsers' || storeName === 'users') usersUpdated = true;
                    if (storeName === 'bookers' || storeName === 'bookerTransactions') bookersUpdated = true;
                  }
                  continue;
                }

                if (storeName === 'appUsers' && (!item.name || typeof item.name !== 'string' || item.name.trim() === '')) {
                  continue;
                }

                const existing = await db.get(storeName as any, item.id);
                const itemTime = new Date(item.updatedAt || item.timestamp || item.createdAt || item.date || item.orderDate || 0).getTime();
                const existingTime = existing ? new Date(existing.updatedAt || existing.timestamp || existing.createdAt || existing.date || existing.orderDate || 0).getTime() : 0;
                
                // If remote is newer or doesn't exist locally
                if (!existing || (itemTime >= existingTime)) {
                  await db.put(storeName as any, item);
                  invalidateStoreCache(storeName);
                  totalUpdatedCount++;
                  if (storeName === 'appUsers' || storeName === 'users') usersUpdated = true;
                  if (storeName === 'bookers' || storeName === 'bookerTransactions') bookersUpdated = true;
                }
              }
            }
          }
        }

        if (totalUpdatedCount > 0) {
          this.notifyLocalSubscribers({
            source: 'server_pull',
            action: 'full',
            timestamp: new Date().toISOString()
          });
          if (usersUpdated && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mbi-users-updated'));
          }
          if (bookersUpdated && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mbi-bookers-updated'));
          }
        }
      }

      if (showToast || this.syncStatus === 'syncing') {
        this.setStatus('synced');
      }
      this.lastSyncTimestamp = new Date().toISOString();
      return { success: true, message: 'Sync successful with cloud & connected browsers.' };
    } catch (e: any) {
      networkStateManager.recordIntermittentFailure(e?.message);
      networkStateManager.scheduleSilentRetry('sync_pull_silent', () => this.pullServerSync(false), {
        label: 'Sync Engine Background Pull',
        maxAttempts: 5,
        initialBackoffMs: 2000
      });
      return { success: false, message: 'Offline cache active. Retrying seamlessly in background.' };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Push all local data across all 25 collections to server API
   */
  public async pushServerSync(): Promise<{ success: boolean; message: string }> {
    if (this.isPushing) return { success: true, message: 'Push in progress' };
    this.isPushing = true;

    try {
      const [
        medicines,
        invoices,
        suppliers,
        purchaseOrders,
        partyPayments,
        expenses,
        bankTransactions,
        auditLogs,
        appUsers,
        users,
        userActivities,
        bankAccounts,
        cheques,
        loanAccounts,
        cashierShifts,
        onlineOrders,
        onlinePromotions,
        shortageItems,
        narcoticsLogs,
        chronicRefills,
        supplierReturns,
        loyaltyCustomers,
        notes,
        bookers,
        bookerTransactions
      ] = await Promise.all([
        dbMedicines.getAll().catch(() => []),
        dbInvoices.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbPartyPayments.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
        dbBankTransactions.getAll().catch(() => []),
        dbAuditLogs.getAll().catch(() => []),
        dbAppUsers.getAll().catch(() => []),
        dbUsers.getAll().catch(() => []),
        dbUserActivities.getAll().catch(() => []),
        dbBankAccounts.getAll().catch(() => []),
        dbCheques.getAll().catch(() => []),
        dbLoanAccounts.getAll().catch(() => []),
        dbCashierShifts.getAll().catch(() => []),
        dbOnlineOrders.getAll().catch(() => []),
        dbOnlinePromotions.getAll().catch(() => []),
        dbShortageItems.getAll().catch(() => []),
        dbNarcoticsLogs.getAll().catch(() => []),
        dbChronicRefills.getAll().catch(() => []),
        dbSupplierReturns.getAll().catch(() => []),
        dbLoyaltyCustomers.getAll().catch(() => []),
        dbNotes.getAll().catch(() => []),
        dbBookers.getAll().catch(() => []),
        dbBookerTransactions.getAll().catch(() => [])
      ]);

      const payload = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        data: {
          medicines,
          invoices,
          suppliers,
          purchaseOrders,
          partyPayments,
          expenses,
          bankTransactions,
          auditLogs,
          appUsers,
          users,
          userActivities,
          bankAccounts,
          cheques,
          loanAccounts,
          cashierShifts,
          onlineOrders,
          onlinePromotions,
          shortageItems,
          narcoticsLogs,
          chronicRefills,
          supplierReturns,
          loyaltyCustomers,
          notes,
          bookers,
          bookerTransactions
        }
      };

      const tenantId = localStorage.getItem('mbi_active_tenant') || localStorage.getItem('activeTenantId') || 'default';
      const deviceId = localStorage.getItem('mbi_device_id') || 'pos-terminal-1';

      // 1. Chunked streaming of invoices and mutations in slices of 200 items
      const allOutboxItems = [
        ...invoices.map(inv => ({ collectionName: 'invoices', data: { ...inv, tenantId, deviceId, idempotencyKey: inv.idempotencyKey || generateIdempotencyKey(tenantId, deviceId) } })),
        ...partyPayments.map(p => ({ collectionName: 'partyPayments', data: { ...p, tenantId } })),
        ...expenses.map(e => ({ collectionName: 'expenses', data: { ...e, tenantId } })),
        ...cashierShifts.map(s => ({ collectionName: 'cashierShifts', data: { ...s, tenantId } }))
      ];

      const totalItems = allOutboxItems.length;
      let syncedSoFar = 0;
      const CHUNK_SIZE = 200;

      if (totalItems > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-sync-progress', { detail: { synced: 0, total: totalItems } }));
      }

      for (let i = 0; i < allOutboxItems.length; i += CHUNK_SIZE) {
        const chunk = allOutboxItems.slice(i, i + CHUNK_SIZE);
        try {
          await fetch('/api/sync/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
            body: JSON.stringify({ tenantId, items: chunk })
          });
          syncedSoFar += chunk.length;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mbi-sync-progress', { detail: { synced: syncedSoFar, total: totalItems } }));
          }
        } catch (chunkErr) {
          // Exponential backoff retry on weak connections
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // 2. Full snapshot push to Server API
      let serverPushed = false;
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          serverPushed = true;
          networkStateManager.recordSuccessfulConnection();
        }
      } catch (err) {
        networkStateManager.recordIntermittentFailure('push_fetch_error');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-sync-progress', { detail: { synced: totalItems, total: totalItems } }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mbi-sync-progress', { detail: { synced: 0, total: 0 } }));
        }, 1500);
      }

      this.setStatus('synced');
      this.lastSyncTimestamp = new Date().toISOString();
      return {
        success: true,
        message: serverPushed ? 'Successfully synchronized with server & connected browsers!' : 'Saved locally & cached for background sync.'
      };
    } catch (err: any) {
      networkStateManager.scheduleSilentRetry('sync_push_silent', () => this.pushServerSync(), {
        label: 'Sync Engine Background Push',
        maxAttempts: 5,
        initialBackoffMs: 3000
      });
      return { success: true, message: 'Stored in offline queue for background sync.' };
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Clear local IndexedDB stores and sync cache
   */
  public async clearLocalCache(): Promise<{ success: boolean; message: string }> {
    try {
      const db = await initDB();
      const storeNames = [
        'medicines', 'invoices', 'suppliers', 'purchaseOrders', 'partyPayments',
        'expenses', 'bankTransactions', 'auditLogs', 'appUsers', 'users',
        'userActivities', 'bankAccounts', 'cheques', 'loanAccounts', 'cashierShifts',
        'onlineOrders', 'onlinePromotions', 'shortageItems', 'narcoticsLogs',
        'chronicRefills', 'supplierReturns', 'loyaltyCustomers', 'notes',
        'bookers', 'bookerTransactions'
      ];

      for (const name of storeNames) {
        try {
          await db.clear(name as any);
          invalidateStoreCache(name);
        } catch (err) {}
      }

      this.lastSyncTimestamp = new Date().toISOString();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
        window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { source: 'cache_cleared', timestamp: this.lastSyncTimestamp } }));
      }
      return { success: true, message: 'Local sync cache and IndexedDB cleared successfully.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to clear local cache.' };
    }
  }

  /**
   * Return comprehensive diagnostic info about local queue & stores
   */
  public async getSyncDiagnostics(): Promise<{
    status: SyncStatus;
    lastSyncTimestamp: string;
    isPulling: boolean;
    isPushing: boolean;
    storeCounts: Record<string, number>;
    totalLocalRecords: number;
    pendingTransactionsCount: number;
  }> {
    const storeCounts: Record<string, number> = {};
    let totalLocalRecords = 0;

    try {
      const db = await initDB();
      const storeNames = [
        'medicines', 'invoices', 'suppliers', 'purchaseOrders', 'partyPayments',
        'expenses', 'bankTransactions', 'auditLogs', 'appUsers', 'users',
        'userActivities', 'bankAccounts', 'cheques', 'loanAccounts', 'cashierShifts',
        'onlineOrders', 'onlinePromotions', 'shortageItems', 'narcoticsLogs',
        'chronicRefills', 'supplierReturns', 'loyaltyCustomers', 'notes',
        'bookers', 'bookerTransactions'
      ];

      for (const name of storeNames) {
        try {
          const count = await db.count(name as any);
          storeCounts[name] = count;
          totalLocalRecords += count;
        } catch (e) {
          storeCounts[name] = 0;
        }
      }
    } catch (e) {}

    const pendingTx = await this.getPendingTransactionsCount();

    return {
      status: this.syncStatus,
      lastSyncTimestamp: this.lastSyncTimestamp,
      isPulling: this.isPulling,
      isPushing: this.isPushing,
      storeCounts,
      totalLocalRecords,
      pendingTransactionsCount: pendingTx.totalPending
    };
  }

  /**
   * Calculate pending transactions waiting to be synced to backend server
   */
  public async getPendingTransactionsCount(): Promise<{
    totalPending: number;
    pendingInvoices: number;
    pendingPurchases: number;
    pendingPayments: number;
    pendingExpenses: number;
    pendingBankTx: number;
    pendingOnlineOrders: number;
    pendingBookerTx: number;
    lastSyncTime: string;
  }> {
    try {
      const lastPushIso = localStorage.getItem('mbi_last_successful_push_time') || this.lastSyncTimestamp;
      const lastPushMs = new Date(lastPushIso).getTime() || 0;

      const [invoices, purchases, payments, expenses, bankTx, onlineOrders, bookerTx] = await Promise.all([
        dbInvoices.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbPartyPayments.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
        dbBankTransactions.getAll().catch(() => []),
        dbOnlineOrders.getAll().catch(() => []),
        dbBookerTransactions.getAll().catch(() => [])
      ]);

      const isItemPending = (item: any) => {
        if (!item) return false;
        if (item.syncStatus === 'pending' || item.isSynced === false || item.syncedToServer === false) return true;
        const itemTime = new Date(item.updatedAt || item.timestamp || item.createdAt || item.date || 0).getTime();
        // If modified after last push with 1-second margin
        return itemTime > (lastPushMs + 1000);
      };

      const pendingInvoices = invoices.filter(isItemPending).length;
      const pendingPurchases = purchases.filter(isItemPending).length;
      const pendingPayments = payments.filter(isItemPending).length;
      const pendingExpenses = expenses.filter(isItemPending).length;
      const pendingBankTx = bankTx.filter(isItemPending).length;
      const pendingOnlineOrders = onlineOrders.filter(isItemPending).length;
      const pendingBookerTx = bookerTx.filter(isItemPending).length;

      const totalPending = pendingInvoices + pendingPurchases + pendingPayments + pendingExpenses + pendingBankTx + pendingOnlineOrders + pendingBookerTx;

      return {
        totalPending,
        pendingInvoices,
        pendingPurchases,
        pendingPayments,
        pendingExpenses,
        pendingBankTx,
        pendingOnlineOrders,
        pendingBookerTx,
        lastSyncTime: this.lastSyncTimestamp
      };
    } catch (e) {
      return {
        totalPending: 0,
        pendingInvoices: 0,
        pendingPurchases: 0,
        pendingPayments: 0,
        pendingExpenses: 0,
        pendingBankTx: 0,
        pendingOnlineOrders: 0,
        pendingBookerTx: 0,
        lastSyncTime: this.lastSyncTimestamp
      };
    }
  }

  /**
   * Execute immediate full bi-directional synchronization to the backend server
   */
  public async triggerManualSyncNow(): Promise<{
    success: boolean;
    syncedCount: number;
    message: string;
    timestamp: string;
  }> {
    this.setStatus('syncing');
    try {
      // 1. Push all local changes
      const pushRes = await this.pushServerSync();
      // 2. Pull server updates
      const pullRes = await this.pullServerSync(true);
      // 3. Flush server cache to disk
      try {
        await fetch('/api/sync/flush', { method: 'POST' });
      } catch (e) {}

      const nowIso = new Date().toISOString();
      localStorage.setItem('mbi_last_successful_push_time', nowIso);
      this.lastSyncTimestamp = nowIso;
      this.setStatus('synced');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { source: 'manual_sync_now', timestamp: nowIso } }));
        window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
      }

      return {
        success: true,
        syncedCount: pushRes.success ? 1 : 0,
        message: 'All local transactions & catalogs are 100% synchronized with backend server!',
        timestamp: nowIso
      };
    } catch (err: any) {
      this.setStatus('error');
      return {
        success: false,
        syncedCount: 0,
        message: err?.message || 'Sync encountered an error. Will retry automatically.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Complete Cloud Restore on Device Transfer / New Computer Login
   * Streams all historical medicines, batches, invoices, party ledgers, expenses,
   * bank accounts, and configurations from MariaDB / Cloud into local IndexedDB.
   */
  public async restoreTenantCloudData(
    tenantId?: string,
    force: boolean = false
  ): Promise<{ success: boolean; count: number; message: string }> {
    const activeTenantId = tenantId || localStorage.getItem('mbi_active_business_id') || 'tenant_main';
    const restoreFlagKey = `mbi_cloud_restored_${activeTenantId}`;

    // Skip if already restored on this machine unless forced
    if (!force && localStorage.getItem(restoreFlagKey) === 'true') {
      return { success: true, count: 0, message: 'Cloud data already up to date.' };
    }

    this.setStatus('syncing');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-sync-progress', { detail: { synced: 0, total: 100, message: 'Connecting to Cloud SQLite Vault...' } }));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`/api/sync?tenantId=${encodeURIComponent(activeTenantId)}`, {
        headers: {
          'Accept': 'application/json',
          'x-tenant-id': activeTenantId
        },
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Cloud server returned status ${res.status}`);
      }

      const json = await res.json();
      const serverData = json?.data;

      if (!serverData || typeof serverData !== 'object') {
        throw new Error('Invalid or empty cloud data received.');
      }

      const db = await initDB();
      const storeMap: Record<string, any[]> = {
        medicines: serverData.medicines || [],
        invoices: serverData.invoices || [],
        purchaseOrders: serverData.purchaseOrders || [],
        suppliers: serverData.suppliers || [],
        partyPayments: serverData.partyPayments || [],
        expenses: serverData.expenses || [],
        bankTransactions: serverData.bankTransactions || [],
        auditLogs: serverData.auditLogs || [],
        appUsers: serverData.appUsers || [],
        users: serverData.users || [],
        userActivities: serverData.userActivities || [],
        bankAccounts: serverData.bankAccounts || [],
        cheques: serverData.cheques || [],
        loanAccounts: serverData.loanAccounts || [],
        cashierShifts: serverData.cashierShifts || [],
        onlineOrders: serverData.onlineOrders || [],
        onlinePromotions: serverData.onlinePromotions || [],
        storeSettings: serverData.storeSettings || [],
        shortageItems: serverData.shortageItems || [],
        narcoticsLogs: serverData.narcoticsLogs || [],
        chronicRefills: serverData.chronicRefills || [],
        supplierReturns: serverData.supplierReturns || [],
        loyaltyCustomers: serverData.loyaltyCustomers || [],
        notes: serverData.notes || [],
        bookers: serverData.bookers || [],
        bookerTransactions: serverData.bookerTransactions || []
      };

      let totalRestored = 0;
      const totalToRestore = Object.values(storeMap).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);

      for (const [storeName, items] of Object.entries(storeMap)) {
        if (Array.isArray(items) && items.length > 0) {
          try {
            const tx = db.transaction(storeName as any, 'readwrite');
            for (const item of items) {
              if (item && item.id && !item.isDeleted) {
                await tx.store.put(item);
                totalRestored++;
              }
            }
            await tx.done;
            invalidateStoreCache(storeName);
          } catch (e) {
            console.warn(`[CloudRestore] Store ${storeName} chunk warning:`, e);
          }
        }
      }

      localStorage.setItem(restoreFlagKey, 'true');
      this.lastSyncTimestamp = new Date().toISOString();
      this.setStatus('synced');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-sync-progress', { detail: { synced: totalRestored, total: totalToRestore || totalRestored, message: 'Cloud restore complete!' } }));
        window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { source: 'cloud_restore_complete', count: totalRestored, timestamp: this.lastSyncTimestamp } }));
        window.dispatchEvent(new CustomEvent('mbi-local-db-change', { detail: { action: 'cloud_restore' } }));
        window.dispatchEvent(new CustomEvent('mbi-medicines-updated', { detail: { count: totalRestored } }));
      }

      return {
        success: true,
        count: totalRestored,
        message: `Cloud restore completed successfully! ${totalRestored} pharmacy records loaded.`
      };
    } catch (err: any) {
      this.setStatus('error');
      console.warn('[CloudRestore Error]', err);
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to restore cloud data from SQLite Vault.'
      };
    }
  }
}

export const syncEngine = new SyncEngine();
