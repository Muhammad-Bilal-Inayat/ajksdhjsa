import { v4 as uuidv4 } from 'uuid';
import { saveRecordToFirestore } from './firebase';

export interface LoginAttemptRecord {
  id: string;
  timestamp: string;
  username: string;
  targetSystem: 'Central Server Command Center' | 'Store POS Terminal' | 'Client Web Portal' | 'Direct Key Activation' | string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SUSPICIOUS';
  ipAddress: string;
  deviceId: string;
  deviceInfo: string;
  failureReason?: string;
  location?: string;
  threatScore?: number; // 0-100 score
  isWhitelisted?: boolean;
}

export interface BlockedIpRecord {
  ip: string;
  blockedAt: string;
  reason: string;
  blockedBy: string;
  attemptsCount: number;
  lastAttemptAt?: string;
}

export interface WhitelistedIpRecord {
  ip: string;
  whitelistedAt: string;
  whitelistedBy: string;
  reason: string;
  autoProtect: boolean;
}

export interface SecurityDefenseSettings {
  autoBlockEnabled: boolean;
  maxFailedAttempts: number; // e.g. 3 or 5
  timeWindowMinutes: number; // e.g. 10 minutes
  blockBotScanners: boolean;
  notifyOnAnomaly: boolean;
}

const LOGIN_AUDIT_KEY = 'mbi_security_login_audit_logs_v1';
const BLOCKED_IPS_KEY = 'mbi_security_blocked_ips_v1';
const WHITELISTED_IPS_KEY = 'mbi_security_whitelisted_ips_v1';
const SECURITY_SETTINGS_KEY = 'mbi_security_defense_settings_v1';
const CLIENT_IP_KEY = 'mbi_client_current_ip_v1';

// Default Defense Configuration
const DEFAULT_SECURITY_SETTINGS: SecurityDefenseSettings = {
  autoBlockEnabled: true,
  maxFailedAttempts: 3,
  timeWindowMinutes: 10,
  blockBotScanners: true,
  notifyOnAnomaly: true
};

/**
 * Get or determine current client IP
 */
export function getCurrentClientIp(): string {
  if (typeof window === 'undefined') return '127.0.0.1';
  let cached = localStorage.getItem(CLIENT_IP_KEY);
  if (!cached) {
    const octet3 = Math.floor(1 + Math.random() * 5);
    const octet4 = Math.floor(10 + Math.random() * 240);
    cached = `192.168.${octet3}.${octet4}`;
    localStorage.setItem(CLIENT_IP_KEY, cached);
  }
  return cached;
}

/**
 * Get Security Defense Settings
 */
export function getSecuritySettings(): SecurityDefenseSettings {
  if (typeof window === 'undefined') return DEFAULT_SECURITY_SETTINGS;
  try {
    const raw = localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(DEFAULT_SECURITY_SETTINGS));
      return DEFAULT_SECURITY_SETTINGS;
    }
    return { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SECURITY_SETTINGS;
  }
}

/**
 * Update Security Defense Settings
 */
export function saveSecuritySettings(settings: Partial<SecurityDefenseSettings>): SecurityDefenseSettings {
  const current = getSecuritySettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-security-settings-updated', { detail: updated }));
  }
  return updated;
}

/**
 * Get all Whitelisted (Admin-Approved & Safe) IPs
 * IPs in this list will NEVER be auto-blocked by automated threat heuristics!
 */
export function getWhitelistedIps(): WhitelistedIpRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WHITELISTED_IPS_KEY);
    if (!raw) {
      // Seed default trusted local/master subnet
      const seedWhitelist: WhitelistedIpRecord[] = [
        {
          ip: '127.0.0.1',
          whitelistedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          whitelistedBy: 'System Core Engine',
          reason: 'Localhost Loopback (Always Safe)',
          autoProtect: true
        },
        {
          ip: '192.168.1.104',
          whitelistedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          whitelistedBy: 'Master Admin (mbi786)',
          reason: 'Master Admin Verified Workstation (Admin Unblocked & Safe)',
          autoProtect: true
        }
      ];
      localStorage.setItem(WHITELISTED_IPS_KEY, JSON.stringify(seedWhitelist));
      return seedWhitelist;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse whitelisted IPs:', e);
    return [];
  }
}

/**
 * Check if an IP is in the Admin Whitelist (Safe from Auto-Block)
 */
export function isIpWhitelisted(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  const list = getWhitelistedIps();
  return list.some(item => item.ip.toLowerCase() === clean);
}

/**
 * Add an IP to the Admin Whitelist
 */
export function whitelistIpAddress(ip: string, reason: string = 'Approved & Protected by Master Admin', whitelistedBy: string = 'Master Admin'): WhitelistedIpRecord[] {
  if (!ip || !ip.trim()) return getWhitelistedIps();
  const clean = ip.trim();
  const current = getWhitelistedIps();
  const existingIdx = current.findIndex(item => item.ip.toLowerCase() === clean.toLowerCase());

  let updated: WhitelistedIpRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx].reason = reason;
    updated[existingIdx].whitelistedAt = new Date().toISOString();
    updated[existingIdx].whitelistedBy = whitelistedBy;
  } else {
    const newEntry: WhitelistedIpRecord = {
      ip: clean,
      whitelistedAt: new Date().toISOString(),
      whitelistedBy,
      reason,
      autoProtect: true
    };
    updated = [newEntry, ...current];
  }

  localStorage.setItem(WHITELISTED_IPS_KEY, JSON.stringify(updated));

  // If this IP was currently blocked, unblock it
  unblockIpAddress(clean, false); // pass false to avoid recursion

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-whitelisted-ips-updated', { detail: updated }));
  }
  return updated;
}

/**
 * Remove an IP from Whitelist
 */
export function removeWhitelistedIp(ip: string): WhitelistedIpRecord[] {
  if (!ip) return getWhitelistedIps();
  const clean = ip.trim().toLowerCase();
  const current = getWhitelistedIps();
  const filtered = current.filter(item => item.ip.toLowerCase() !== clean);
  localStorage.setItem(WHITELISTED_IPS_KEY, JSON.stringify(filtered));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-whitelisted-ips-updated', { detail: filtered }));
  }
  return filtered;
}

/**
 * Get all Blocked IPs
 */
export function getBlockedIps(): BlockedIpRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BLOCKED_IPS_KEY);
    if (!raw) {
      const initialBlocked: BlockedIpRecord[] = [
        {
          ip: '198.51.100.44',
          blockedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          reason: 'Automated brute-force password guessing detected (5 consecutive failures)',
          blockedBy: 'Automated Master Firewall',
          attemptsCount: 8,
          lastAttemptAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          ip: '203.0.113.195',
          blockedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          reason: 'Unregistered unauthorized foreign subnet port scan on port 3000',
          blockedBy: 'Master Admin (mbi786)',
          attemptsCount: 14,
          lastAttemptAt: new Date(Date.now() - 86400000 * 3).toISOString()
        }
      ];
      localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(initialBlocked));
      return initialBlocked;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse blocked IPs:', e);
    return [];
  }
}

/**
 * Check if an IP is currently blocked
 */
export function isIpBlocked(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.trim().toLowerCase();
  const list = getBlockedIps();
  return list.some(item => item.ip.toLowerCase() === cleanIp);
}

/**
 * Block an IP Address
 */
export function blockIpAddress(ip: string, reason: string = 'Blocked by Master Admin', blockedBy: string = 'Master Admin'): BlockedIpRecord[] {
  if (!ip || !ip.trim()) return getBlockedIps();
  const cleanIp = ip.trim();
  const current = getBlockedIps();
  const existingIdx = current.findIndex(item => item.ip.toLowerCase() === cleanIp.toLowerCase());

  let updated: BlockedIpRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx].reason = reason;
    updated[existingIdx].blockedAt = new Date().toISOString();
    updated[existingIdx].blockedBy = blockedBy;
    updated[existingIdx].attemptsCount += 1;
  } else {
    const newEntry: BlockedIpRecord = {
      ip: cleanIp,
      blockedAt: new Date().toISOString(),
      reason,
      blockedBy,
      attemptsCount: 1,
      lastAttemptAt: new Date().toISOString()
    };
    updated = [newEntry, ...current];
  }

  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(updated));

  // If it was in whitelist and Admin explicitly blocks it, remove from whitelist
  if (blockedBy !== 'Automated AI Threat Defense') {
    removeWhitelistedIp(cleanIp);
  }

  // Sync to Firestore if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    saveRecordToFirestore('security_blocked_ips', cleanIp.replace(/[^a-zA-Z0-9_-]/g, '_'), {
      ip: cleanIp,
      blockedAt: new Date().toISOString(),
      reason,
      blockedBy
    }).catch(() => {});
  }

  // Dispatch event for live UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-blocked-ips-updated', { detail: updated }));
  }

  return updated;
}

/**
 * Unblock an IP Address
 * ⭐️ CRITICAL RULE: When Admin unblocks an IP, it is automatically added to the Whitelist
 * so it will NEVER be auto-blocked by automated heuristics again!
 */
export function unblockIpAddress(ip: string, addToWhitelist: boolean = true): BlockedIpRecord[] {
  if (!ip) return getBlockedIps();
  const cleanIp = ip.trim();
  const current = getBlockedIps();
  const filtered = current.filter(item => item.ip.toLowerCase() !== cleanIp.toLowerCase());
  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(filtered));

  // Auto-register in Whitelist so automated threat scanner never blocks it again
  if (addToWhitelist) {
    whitelistIpAddress(cleanIp, 'Admin Verified — Exempt from Auto-Block', 'Master Admin');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-blocked-ips-updated', { detail: filtered }));
  }
  return filtered;
}

/**
 * Get all Login Audit Logs
 */
export function getLoginAuditLogs(): LoginAttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOGIN_AUDIT_KEY);
    if (!raw) {
      const now = Date.now();
      const seedLogs: LoginAttemptRecord[] = [
        {
          id: 'LOG-88192',
          timestamp: new Date(now - 1000 * 60 * 3).toISOString(),
          username: 'mastermindbyali@gmail.com',
          targetSystem: 'Central Server Command Center',
          status: 'SUCCESS',
          ipAddress: '192.168.1.104',
          deviceId: 'MBI-LP-B44B46B9',
          deviceInfo: 'Laptop MBI-LP (Windows 11 / Chrome 124)',
          location: 'Lahore, Pakistan',
          threatScore: 0,
          isWhitelisted: true
        },
        {
          id: 'LOG-88191',
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
          username: 'vivo_admin_v2310',
          targetSystem: 'Central Server Command Center',
          status: 'SUCCESS',
          ipAddress: '172.16.4.88',
          deviceId: 'VIVO-V2310-10FDCU07',
          deviceInfo: 'Vivo V2310 (Android 15 / Funtouch OS)',
          location: 'Lahore, Pakistan',
          threatScore: 5
        },
        {
          id: 'LOG-88190',
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
          username: 'root_admin_unauth',
          targetSystem: 'Central Server Command Center',
          status: 'FAILED',
          ipAddress: '198.51.100.44',
          deviceId: 'UNKNOWN-HWID-9921',
          deviceInfo: 'Mozilla/5.0 (X11; Linux x86_64) Unknown Bot',
          failureReason: 'Invalid credentials & hardware token not whitelisted',
          location: 'Foreign Subnet (Untrusted)',
          threatScore: 85
        },
        {
          id: 'LOG-88189',
          timestamp: new Date(now - 1000 * 60 * 80).toISOString(),
          username: 'cashier_usman',
          targetSystem: 'Store POS Terminal',
          status: 'SUCCESS',
          ipAddress: '192.168.1.112',
          deviceId: 'POS-TERM-LAHORE-01',
          deviceInfo: 'Win10 POS Terminal / Edge 124',
          location: 'Model Town Branch, Lahore',
          threatScore: 0
        },
        {
          id: 'LOG-88188',
          timestamp: new Date(now - 1000 * 60 * 140).toISOString(),
          username: 'hacker_brute_77',
          targetSystem: 'Central Server Command Center',
          status: 'BLOCKED',
          ipAddress: '198.51.100.44',
          deviceId: 'BOT-NET-SCANNER-404',
          deviceInfo: 'Python-urllib/3.11 Automated Scanner',
          failureReason: 'Auto-Blocked: Repeated brute-force password guessing detected',
          location: 'Blocked Threat Vector',
          threatScore: 98
        },
        {
          id: 'LOG-88187',
          timestamp: new Date(now - 1000 * 60 * 220).toISOString(),
          username: 'dr_tariq_karachi',
          targetSystem: 'Client Web Portal',
          status: 'SUCCESS',
          ipAddress: '10.0.12.14',
          deviceId: 'TAB-ANDROID-SAMSUNG',
          deviceInfo: 'Android 14 Chrome / Galaxy Tab',
          location: 'Clifton Pharmacy, Karachi',
          threatScore: 0
        }
      ];
      localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify(seedLogs));
      return seedLogs;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse login audit logs:', e);
    return [];
  }
}

/**
 * Evaluates login behavior and auto-blocks anomalies if threshold is reached.
 * 🛡️ RESPECTS WHITELIST: If IP is whitelisted by Admin, it NEVER auto-blocks.
 */
function evaluateThreatAndAutoBlock(
  clientIp: string, 
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED', 
  deviceInfo: string, 
  recentLogs: LoginAttemptRecord[]
): { isThreat: boolean; autoBlocked: boolean; threatScore: number; reason?: string } {
  const settings = getSecuritySettings();
  const whitelisted = isIpWhitelisted(clientIp);

  // If Whitelisted by Admin, calculate benign score and NEVER block!
  if (whitelisted) {
    return {
      isThreat: false,
      autoBlocked: false,
      threatScore: status === 'FAILED' ? 15 : 0,
      reason: 'Admin Whitelisted (Exempt from Automated Blocking)'
    };
  }

  let threatScore = 0;
  const reasons: string[] = [];

  // 1. Check for Bot / Automated Scanner User-Agents
  const lowerAgent = (deviceInfo || '').toLowerCase();
  const isBotOrScanner = lowerAgent.includes('python') || 
                         lowerAgent.includes('curl') || 
                         lowerAgent.includes('wget') || 
                         lowerAgent.includes('postman') || 
                         lowerAgent.includes('headlesschrome') ||
                         lowerAgent.includes('nikto') ||
                         lowerAgent.includes('sqlmap');

  if (isBotOrScanner && settings.blockBotScanners) {
    threatScore += 70;
    reasons.push('Automated bot or vulnerability scanner fingerprint detected');
  }

  // 2. Count recent failures in the rolling time window
  const windowMs = settings.timeWindowMinutes * 60 * 1000;
  const now = Date.now();
  const recentIpLogs = recentLogs.filter(l => 
    l.ipAddress?.toLowerCase() === clientIp.toLowerCase() && 
    (now - new Date(l.timestamp).getTime()) <= windowMs
  );

  const failureCount = recentIpLogs.filter(l => l.status === 'FAILED').length + (status === 'FAILED' ? 1 : 0);

  if (failureCount >= 2) {
    threatScore += 30 * (failureCount - 1);
  }

  if (status === 'FAILED') {
    threatScore += 25;
  }

  threatScore = Math.min(100, Math.max(0, threatScore));

  // Auto-Block Decision
  let shouldAutoBlock = false;
  if (settings.autoBlockEnabled && !whitelisted) {
    if (failureCount >= settings.maxFailedAttempts) {
      shouldAutoBlock = true;
      reasons.push(`Exceeded threshold of ${settings.maxFailedAttempts} consecutive failed attempts in ${settings.timeWindowMinutes}m`);
    } else if (threatScore >= 80) {
      shouldAutoBlock = true;
      reasons.push('High-severity anomaly score (>80) triggered by defense radar');
    }
  }

  if (shouldAutoBlock && !isIpBlocked(clientIp)) {
    const combinedReason = `Auto-Blocked by AI Threat Shield: ${reasons.join('; ')}`;
    blockIpAddress(clientIp, combinedReason, 'Automated AI Threat Defense');
    return {
      isThreat: true,
      autoBlocked: true,
      threatScore,
      reason: combinedReason
    };
  }

  return {
    isThreat: threatScore >= 50,
    autoBlocked: false,
    threatScore,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined
  };
}

/**
 * Record a login attempt (Success, Failed, or Blocked) with automated threat analysis
 */
export function recordLoginAttempt(entry: {
  username: string;
  targetSystem: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  ipAddress?: string;
  deviceId?: string;
  deviceInfo?: string;
  failureReason?: string;
  location?: string;
}): LoginAttemptRecord {
  const currentLogs = getLoginAuditLogs();
  const clientIp = entry.ipAddress || getCurrentClientIp();
  const whitelisted = isIpWhitelisted(clientIp);
  const deviceInfo = entry.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client');

  // Evaluate Automated Anomaly Defense
  const threatResult = evaluateThreatAndAutoBlock(clientIp, entry.status, deviceInfo, currentLogs);

  // If IP is blocked, elevate status to BLOCKED automatically
  let effectiveStatus: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SUSPICIOUS' = entry.status;
  let effectiveReason = entry.failureReason;

  if (isIpBlocked(clientIp) || threatResult.autoBlocked) {
    effectiveStatus = 'BLOCKED';
    effectiveReason = threatResult.reason || effectiveReason || 'Access forbidden: IP address is in Firewall Blocklist';
  } else if (threatResult.isThreat && entry.status === 'FAILED') {
    effectiveStatus = 'SUSPICIOUS';
    effectiveReason = threatResult.reason || effectiveReason;
  }

  const newRecord: LoginAttemptRecord = {
    id: 'LOG-' + Math.floor(10000 + Math.random() * 90000),
    timestamp: new Date().toISOString(),
    username: entry.username || 'Anonymous',
    targetSystem: entry.targetSystem || 'Central Server Command Center',
    status: effectiveStatus,
    ipAddress: clientIp,
    deviceId: entry.deviceId || (typeof navigator !== 'undefined' ? `${navigator.platform || 'WEB'}-${navigator.userAgent.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}` : 'DEV-UNSPECIFIED'),
    deviceInfo,
    failureReason: effectiveReason,
    location: entry.location || 'Local Network / Cloud Host',
    threatScore: threatResult.threatScore,
    isWhitelisted: whitelisted
  };

  const updatedLogs = [newRecord, ...currentLogs].slice(0, 500);
  localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify(updatedLogs));

  // Sync to Firestore if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    saveRecordToFirestore('security_login_audits', newRecord.id, newRecord).catch(() => {});
  }

  // Dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-security-audit-updated', { detail: newRecord }));
  }

  return newRecord;
}

/**
 * Purge or clear login audit logs
 */
export function clearLoginAuditLogs(): void {
  localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify([]));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-security-audit-updated', { detail: null }));
  }
}

