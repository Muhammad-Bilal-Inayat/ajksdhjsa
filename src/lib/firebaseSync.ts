import { useState, useEffect } from 'react';
import { 
  saveRecordToFirestore, 
  saveBatchToFirestore,
  deleteRecordFromFirestore 
} from './firebase';
import { bulkUpsertRecordsFromCloud, getCurrentBusinessContext } from './db';
import { unifiedSyncService } from './syncService';
import { emitToast } from '../contexts/ToastContext';

export type FirebaseSyncState = 'synced' | 'syncing' | 'offline' | 'unsynced' | 'error';

export interface PendingSyncItem {
  id: string;
  collectionName: string;
  data: any;
  action: 'set' | 'delete';
  timestamp: number;
  retryCount: number;
}

export interface SyncStatusInfo {
  state: FirebaseSyncState;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
  isOnline: boolean;
  consecutiveFailures: number;
  backoffDelayMs: number;
  nextRetryTimestamp: number;
  isConnectionStable: boolean;
  triggerRetry: () => Promise<{ totalPulled: number; pushedCount: number; error?: string }>;
  pullFromCloud: (isSilent?: boolean) => Promise<{ totalPulled: number; pushedCount: number; error?: string }>;
}

class NativeCloudSyncManager {
  private listeners: Set<(info: SyncStatusInfo) => void> = new Set();
  private currentState: FirebaseSyncState = 'synced';
  private lastSyncTime: string = new Date().toISOString();
  private queue: PendingSyncItem[] = [];

  public subscribe(callback: (info: SyncStatusInfo) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): SyncStatusInfo {
    return {
      state: this.currentState,
      pendingCount: this.queue.length,
      lastSyncTime: this.lastSyncTime,
      lastError: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      consecutiveFailures: 0,
      backoffDelayMs: 0,
      nextRetryTimestamp: 0,
      isConnectionStable: true,
      triggerRetry: async () => {
        await this.flushQueue();
        const res = await unifiedSyncService.reconcileDiscrepancies();
        this.lastSyncTime = new Date().toISOString();
        return { totalPulled: res.reconciledCount, pushedCount: 0 };
      },
      pullFromCloud: (silent?: boolean) => this.pullAllFromFirestore(silent)
    };
  }

  public getQueue(): PendingSyncItem[] {
    return this.queue;
  }

  public async flushQueue(): Promise<{ pushedCount: number; error?: string }> {
    const count = this.queue.length;
    this.queue = [];
    return { pushedCount: count };
  }

  public async pullAllFromFirestore(isSilent?: boolean): Promise<{ totalPulled: number; pushedCount: number; error?: string }> {
    const res = await unifiedSyncService.reconcileDiscrepancies();
    this.lastSyncTime = new Date().toISOString();
    return { totalPulled: res.reconciledCount, pushedCount: 0 };
  }

  public startRealtimeListeners(): () => void {
    return () => {};
  }

  public stopRealtimeListeners(): void {}

  public async queueRecord(
    collectionName: string,
    id: string,
    data: any,
    action: 'set' | 'delete' = 'set'
  ): Promise<void> {
    if (action === 'delete') {
      await deleteRecordFromFirestore(collectionName, id);
    } else {
      await saveRecordToFirestore(collectionName, id, data);
    }
  }

  public async syncAllDataToCloud(): Promise<{ total: number; uploaded: number }> {
    return { total: 0, uploaded: 0 };
  }

  public async forcePullFromCloud(): Promise<void> {
    await this.pullAllFromFirestore();
  }

  public startRealtimeSync(): () => void {
    return () => {};
  }
}

export const firebaseSyncManager = new NativeCloudSyncManager();

export function useFirebaseSyncStatus(): SyncStatusInfo {
  const [status, setStatus] = useState<SyncStatusInfo>(() => firebaseSyncManager.getStatus());

  useEffect(() => {
    return firebaseSyncManager.subscribe(setStatus);
  }, []);

  return status;
}
