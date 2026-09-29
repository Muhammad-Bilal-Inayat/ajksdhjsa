import { getMasterActiveUsers, saveMasterActiveUser, MasterActiveUser } from './masterServerService';
import { generateHardwareFingerprint } from './deviceSecurityService';

const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds live heartbeat
let heartbeatTimer: any = null;

export interface LiveSessionInfo {
  userId: string;
  userName: string;
  userEmailOrPhone: string;
  role: string;
  storeName: string;
  tenantId: string;
  installationId?: string;
  currentRoute?: string;
}

/**
 * Report active user heartbeat to Master Server & Local Sync Registry
 */
export async function sendUserHeartbeat(session: LiveSessionInfo): Promise<void> {
  if (!session || !session.userId) return;

  const hwid = generateHardwareFingerprint() || 'HWID-CLIENT-NODE';
  const now = new Date().toISOString();

  const userPayload: MasterActiveUser = {
    id: session.userId,
    name: session.userName || 'Active User',
    emailOrPhone: session.userEmailOrPhone || session.userId,
    role: (session.role as any) || 'Cashier',
    status: 'Active',
    passcode: '1234',
    storeName: session.storeName || 'Primary Store',
    installationId: session.installationId || session.tenantId || 'NODE-01',
    boundHwid: hwid,
    lastSyncTime: now,
    isOnline: true,
    updatedAt: now
  };

  // 1. Save locally for instant UI update on same client
  try {
    saveMasterActiveUser(userPayload);
  } catch (e) {}

  // 2. Broadcast via BroadcastChannel & Storage Event to all tabs
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mbi_active_user_ping', JSON.stringify({ ...userPayload, pingTime: Date.now() }));
    }
  } catch (e) {}

  // 3. Send to Node.js Backend Server API (/api/master/users/heartbeat)
  try {
    await fetch('/api/master/users/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-master-secret': 'MBI-SECRET-KEY-PROD-2026-X99'
      },
      body: JSON.stringify(userPayload)
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Start automatic periodic heartbeat reporting for the currently logged in user
 */
export function startUserHeartbeat(getSession: () => LiveSessionInfo | null): () => void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  const trigger = () => {
    const s = getSession();
    if (s && s.userId && s.userId !== 'usr_guest') {
      sendUserHeartbeat(s);
    }
  };

  // Fire immediately
  trigger();

  // Then periodically every 10 seconds
  heartbeatTimer = setInterval(trigger, HEARTBEAT_INTERVAL_MS);

  return () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };
}
