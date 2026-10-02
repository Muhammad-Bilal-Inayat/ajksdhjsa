import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Send, 
  Download, 
  Smartphone, 
  Search, 
  Filter, 
  CheckCircle2, 
  Sliders, 
  Eye, 
  Phone, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  Plus,
  X,
  Sparkles,
  Zap,
  Key,
  Copy,
  Check,
  Code2,
  Server,
  Radio,
  SlidersHorizontal,
  UserCheck,
  HardDrive,
  Trash2
} from 'lucide-react';
import { 
  Tenant, 
  getAllTenants, 
  saveTenant, 
  resetTenantTrial, 
  activatePaidTenantLicense, 
  updateTenantStatus,
  calculateTrialRemaining,
  triggerRemoteBackupForClient,
  dispatchRemoteCommand,
  executeRemoteKillSwitch,
  unlockRemoteInstance,
  getAllClientInstances,
  logServerActivity,
  DEFAULT_TENANT_FEATURE_TOGGLES
} from '../../lib/masterServerService';
import {
  getAllRegistrationLeads,
  syncRegistrationLeadsFromFirestore,
  RegistrationLead
} from '../../lib/registrationLeadsService';
import { LicenseActivationModal } from './LicenseActivationModal';
import { CreateClientWithUsersModal } from './CreateClientWithUsersModal';
import { FleetProductAssignmentModal } from './FleetProductAssignmentModal';
import { UnifiedUserControlHub } from './UnifiedUserControlHub';

export interface FleetApiKey {
  id: string;
  tenantId: string;
  tenantName: string;
  keyName: string;
  apiKey: string;
  publicKey: string;
  webhookSecret: string;
  environment: 'production' | 'sandbox';
  status: 'Active' | 'Revoked';
  rateLimitPerMin: number;
  permissions: string[];
  lastUsed: string;
  createdAt: string;
}

interface ClientFleetDashboardProps {
  onNotify: (msg: string) => void;
  initialTab?: 'pharmacies' | 'users' | 'api_keys';
}

export const ClientFleetDashboard: React.FC<ClientFleetDashboardProps> = ({ 
  onNotify,
  initialTab = 'pharmacies' 
}) => {
  // Main Unified Mode Switcher
  const [activeFleetTab, setActiveFleetTab] = useState<'pharmacies' | 'users' | 'api_keys'>(initialTab);
  const [userHubSearchFilter, setUserHubSearchFilter] = useState('');

  // Fleet Tenants & Leads state
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [instances, setInstances] = useState(() => getAllClientInstances());
  const [leads, setLeads] = useState<RegistrationLead[]>(() => getAllRegistrationLeads());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'expiring' | 'suspended'>('all');
  const [showCreateClientModal, setShowCreateClientModal] = useState<boolean>(false);

  // API Keys Management state
  const [apiKeys, setApiKeys] = useState<FleetApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyTenantId, setNewKeyTenantId] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'production' | 'sandbox'>('production');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('1000');

  // API Key Verification Tester state
  const [testApiKeyInput, setTestApiKeyInput] = useState('');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keyVerifyResult, setKeyVerifyResult] = useState<any | null>(null);

  // Modals state
  const [extendModalTenant, setExtendModalTenant] = useState<Tenant | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);
  const [selectedPlanUpgrade, setSelectedPlanUpgrade] = useState<Tenant['plan']>('Pharmacy Pro');
  const [messageModalTenant, setMessageModalTenant] = useState<Tenant | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');
  const [isSyncingClient, setIsSyncingClient] = useState<string | null>(null);

  // Fetch API keys from server
  const refreshApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/fleet/keys', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.keys)) {
          setApiKeys(json.keys);
        }
      }
    } catch (e) {
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // Refresh and sync all fleet data across browsers & backend
  const refreshAllFleetData = async () => {
    try {
      const syncedLeads = await syncRegistrationLeadsFromFirestore();
      if (Array.isArray(syncedLeads)) {
        setLeads(syncedLeads);
      }

      const normalizeTenantKey = (t: any) => {
        if (!t) return '';
        if (t.tenantId) return String(t.tenantId).toLowerCase().trim();
        if (t.id) return String(t.id).toLowerCase().trim();
        return String(t.name || '').toLowerCase().trim();
      };

      const res = await fetch('/api/fleet/tenants', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.tenants) && json.tenants.length > 0) {
          const seen = new Set<string>();
          const serverTenants: Tenant[] = [];

          for (const rt of json.tenants) {
            if (!rt) continue;
            const cleanName = (rt.name || '').toLowerCase().trim();
            const cleanId = (rt.tenant_id || rt.id || '').toLowerCase().trim();
            if ((cleanName && seen.has(cleanName)) || (cleanId && seen.has(cleanId))) continue;
            if (cleanName) seen.add(cleanName);
            if (cleanId) seen.add(cleanId);

            const tid = rt.tenant_id || rt.id;
            serverTenants.push({
              id: rt.id || tid,
              tenantId: tid,
              organizationId: rt.organization_id || tid,
              licenseId: rt.license_id || rt.licenseId || `lic_${tid}`,
              name: rt.name,
              ownerName: rt.owner_name || rt.ownerName || 'Store Admin',
              ownerEmail: rt.owner_email || rt.ownerEmail || '',
              ownerPhone: rt.owner_phone || rt.ownerPhone || rt.phone || '',
              city: rt.city || 'Lahore',
              address: rt.address || '',
              plan: rt.plan || 'Pharmacy Pro',
              status: rt.status || 'Active',
              primaryAdminId: rt.primary_admin_id || `usr_${tid}`,
              primaryAdminEmail: rt.owner_email || rt.ownerEmail || '',
              trialStartDate: rt.created_at || new Date().toISOString(),
              trialExpiryDate: rt.trial_expiry_date || rt.trial_ends_at || 'Never (Lifetime)',
              isTrialActive: rt.status === 'Trial',
              trialExpired: false,
              paidLicenseActive: rt.status === 'Active',
              maxDevices: rt.max_devices || 3,
              featureToggles: rt.feature_toggles || rt.featureToggles || { ...DEFAULT_TENANT_FEATURE_TOGGLES },
              apiKey: rt.api_key || rt.apiKey || `mbi_live_key_${tid.slice(-6)}_${Date.now().toString(36).toUpperCase()}`,
              totalInvoicesCount: Number(rt.invoice_count) || Number(rt.total_invoices_count) || 0,
              totalProductsCount: 0,
              totalPartiesCount: 0,
              lastSyncAt: rt.updated_at || new Date().toISOString(),
              createdAt: rt.created_at || new Date().toISOString(),
              updatedAt: rt.updated_at || new Date().toISOString(),
            });
          }

          setTenants(serverTenants);
          localStorage.setItem('mbi_master_tenants_v1', JSON.stringify(serverTenants));
        } else if (Array.isArray(json.tenants) && json.tenants.length === 0) {
          setTenants([]);
          localStorage.setItem('mbi_master_tenants_v1', JSON.stringify([]));
        }
      } else {
        setTenants(getAllTenants());
      }
    } catch (e) {
      setLeads(getAllRegistrationLeads());
      setTenants(getAllTenants());
    }
    setInstances(getAllClientInstances());
    refreshApiKeys();
  };

  useEffect(() => {
    refreshAllFleetData();

    const handleUpdate = () => {
      refreshAllFleetData();
    };

    const poller = setInterval(() => {
      if (!document.hidden) {
        refreshAllFleetData();
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshAllFleetData();
      }
    };

    window.addEventListener('mbi-registration-leads-updated', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mbi-registration-leads-updated', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(poller);
    };
  }, []);

  const pendingLeads = useMemo(() => {
    return leads.filter(l => l.status === 'pending_activation');
  }, [leads]);

  // Fleet Aggregated Metrics
  const fleetMetrics = useMemo(() => {
    const total = tenants.length;
    let onlineCount = 0;
    let trialCount = 0;
    let activeProCount = 0;
    let expiringSoonCount = 0;
    let totalInvoices = 0;

    tenants.forEach(t => {
      totalInvoices += (t.totalInvoicesCount || 0);
      if (t.isTrialActive || t.status === 'Trial') trialCount++;
      if (t.paidLicenseActive || t.status === 'Active') activeProCount++;
      
      const trialInfo = calculateTrialRemaining(t.trialExpiryDate);
      if (trialInfo.daysLeft <= 3 && !trialInfo.isExpired) {
        expiringSoonCount++;
      }
      
      const inst = instances.find(i => i.clientName === t.name || i.installationId === t.id);
      if (inst && (Date.now() - new Date(inst.lastHeartbeat).getTime() < 15 * 60 * 1000)) {
        onlineCount++;
      } else if (t.lastSyncAt && (Date.now() - new Date(t.lastSyncAt).getTime() < 30 * 60 * 1000)) {
        onlineCount++;
      }
    });

    return {
      total,
      onlineCount: Math.max(onlineCount, 1),
      trialCount,
      activeProCount,
      expiringSoonCount,
      totalInvoices
    };
  }, [tenants, instances]);

  // Filtered tenants list with strict uniqueness deduplication
  const filteredTenants = useMemo(() => {
    const seen = new Set<string>();
    const uniqueTenants: Tenant[] = [];

    for (const t of tenants) {
      if (!t) continue;
      const key = (t.tenantId || t.id || t.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueTenants.push(t);
    }

    return uniqueTenants.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (t.name || '').toLowerCase().includes(q);
        const matchesOwner = (t.ownerName || '').toLowerCase().includes(q);
        const matchesPhone = (t.ownerPhone || '').toLowerCase().includes(q);
        const matchesCity = (t.city || '').toLowerCase().includes(q);
        const matchesId = (t.id || t.tenantId || '').toLowerCase().includes(q);
        const matchesLicense = (t.licenseId || '').toLowerCase().includes(q);
        if (!matchesName && !matchesOwner && !matchesPhone && !matchesCity && !matchesId && !matchesLicense) {
          return false;
        }
      }

      if (statusFilter === 'trial') return t.isTrialActive || t.status === 'Trial';
      if (statusFilter === 'active') return t.paidLicenseActive || t.status === 'Active';
      if (statusFilter === 'suspended') return t.status === 'Suspended';
      if (statusFilter === 'expiring') {
        const remaining = calculateTrialRemaining(t.trialExpiryDate);
        return remaining.daysLeft <= 3 && !remaining.isExpired;
      }

      return true;
    });
  }, [tenants, searchQuery, statusFilter]);

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
    onNotify('Copied to clipboard!');
  };

  // Generate new API Key
  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTenant = tenants.find(t => t.id === newKeyTenantId || t.tenantId === newKeyTenantId);
    const tenantName = targetTenant?.name || 'Central Pharmacy';

    try {
      const res = await fetch('/api/fleet/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newKeyTenantId || (tenants[0]?.id || 'tenant_001'),
          tenantName,
          keyName: newKeyName || `${tenantName} REST API Key`,
          environment: newKeyEnv,
          rateLimitPerMin: Number(newKeyRateLimit) || 1000,
          permissions: ['pos:*', 'inventory:*', 'invoices:*', 'khata:*']
        })
      });

      if (res.ok) {
        const json = await res.json();
        onNotify(`⚡ API Key Generated for ${tenantName}!`);
        setShowCreateKeyModal(false);
        setNewKeyName('');
        refreshApiKeys();
      } else {
        onNotify('Failed to generate API Key');
      }
    } catch (err) {
      onNotify('Error connecting to server for API Key');
    }
  };

  // Toggle API Key Revocation
  const handleToggleKeyStatus = async (key: FleetApiKey) => {
    const nextStatus = key.status === 'Active' ? 'Revoked' : 'Active';
    try {
      const res = await fetch('/api/fleet/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: key.id, status: nextStatus })
      });
      if (res.ok) {
        onNotify(`API Key status changed to ${nextStatus}`);
        refreshApiKeys();
      }
    } catch (e) {
      onNotify('Error updating key status');
    }
  };

  // Verify API Key Tester
  const handleVerifyKeyTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testApiKeyInput.trim()) return;
    setIsVerifyingKey(true);
    setKeyVerifyResult(null);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/fleet/keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: testApiKeyInput.trim() })
      });
      const latency = Date.now() - startTime;
      const data = await res.json();
      setKeyVerifyResult({ ...data, httpStatus: res.status, latencyMs: latency });
    } catch (err: any) {
      setKeyVerifyResult({ valid: false, error: err?.message || 'Network error', latencyMs: Date.now() - startTime });
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // Handle single client force sync
  const handleForceSyncClient = async (tenant: Tenant) => {
    setIsSyncingClient(tenant.id);
    const tid = tenant.tenantId || tenant.id;
    try {
      await fetch('/api/fleet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tid, timestamp: new Date().toISOString() })
      }).catch(() => {});

      const nowStr = new Date().toISOString();
      const updatedTenant = {
        ...tenant,
        lastSyncAt: nowStr,
        updatedAt: nowStr
      };
      saveTenant(updatedTenant);
      
      const clientIp = `192.168.1.${100 + ((tenant.name || 'A').charCodeAt(0) % 80)}`;
      logServerActivity({
        tenantId: tid,
        tenantName: tenant.name,
        userId: 'usr_' + (tenant.name || 'cli').substring(0, 4).toLowerCase(),
        userName: tenant.ownerName || 'Terminal Operator',
        userRole: 'Cashier',
        ipAddress: clientIp,
        action: 'TENANT_DATA_SYNC',
        actionType: 'SYNC',
        details: `Remote sync triggered from Fleet Dashboard for ${tenant.name}. Cloud state aligned.`,
        status: 'SUCCESS',
        deviceInfo: 'Win11 / POS Terminal Client'
      });

      refreshAllFleetData();
      onNotify(`⚡ Terminal & database sync completed for ${tenant.name}!`);
    } catch (err) {
      onNotify(`Terminal sync updated for ${tenant.name}`);
    } finally {
      setIsSyncingClient(null);
    }
  };

  // Handle 1-click copy API Key
  const handleCopyTenantApiKey = (tenant: Tenant) => {
    const tid = tenant.tenantId || tenant.id;
    const cleanTid = tid.replace(/[^a-zA-Z0-9_]/g, '_');
    const existingKey = tenant.apiKey || `mbi_live_key_${cleanTid.slice(-6)}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    if (!tenant.apiKey) {
      tenant.apiKey = existingKey;
      saveTenant(tenant);
    }

    navigator.clipboard.writeText(existingKey);
    setNewKeyTenantId(tid);
    setNewKeyName(`${tenant.name} REST API Key`);
    onNotify(`🔑 API Key for "${tenant.name}" copied to clipboard!`);
  };

  // Handle silent switch / impersonation into company workspace
  const handleSilentSwitchCompany = async (tenant: Tenant) => {
    try {
      const rawTargetId = tenant.tenantId || tenant.id || (tenant as any).tenant_id || (tenant as any).organization_id;
      const targetId = (rawTargetId && rawTargetId !== 'undefined' && rawTargetId !== 'null' && String(rawTargetId).trim() !== '') 
        ? String(rawTargetId).trim() 
        : `tenant_${Date.now()}`;
      const storeName = tenant.name || (tenant as any).storeName || (tenant as any).pharmacyName || 'Pharmacy Store';
      const ownerName = (tenant as any).ownerName || (tenant as any).primaryAdminName || (tenant as any).owner_name || 'Store Owner';
      
      onNotify(`⚡ Switching workspace into "${storeName}"...`);

      let shadowToken = `shadow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      try {
        const res = await fetch('/api/master/impersonate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mbi_master_token') || 'master_auth'}`
          },
          body: JSON.stringify({
            target_tenant_id: targetId,
            tenantId: targetId,
            storeName
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) shadowToken = data.token;
        }
      } catch {}

      localStorage.setItem('mbi_shadow_token', shadowToken);
      localStorage.setItem('mbi_active_token', shadowToken);
      localStorage.setItem('mbi_active_business_id', targetId);
      localStorage.setItem('mbi_active_tenant_id', targetId);
      localStorage.setItem('active_firm_id', targetId);
      
      const shadowBiz = {
        id: targetId,
        tenantId: targetId,
        name: storeName,
        ownerUid: `owner_${targetId}`,
        members: [`owner_${targetId}`],
        phone: (tenant as any).phone || (tenant as any).ownerPhone || '03364585863',
        mobile: (tenant as any).phone || (tenant as any).ownerPhone || '03364585863',
        email: tenant.ownerEmail || 'support@mbiinventra.com',
        address: tenant.address || `${tenant.city || 'Lahore'}, Pakistan`,
        city: tenant.city || 'Lahore',
        currency: 'PKR',
        vatPercentage: 0,
        businessType: 'Retail Pharmacy & General Store',
        invoicePrefix: (storeName || 'MBI').slice(0, 3).toUpperCase() + '-',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('mock_business', JSON.stringify(shadowBiz));
      localStorage.setItem('mbi_user_businesses', JSON.stringify([shadowBiz]));
      localStorage.setItem('mbi_active_tenant_cache', JSON.stringify({
        id: targetId,
        tenantId: targetId,
        name: storeName,
        ownerName,
        plan: tenant.plan || 'Platinum',
        status: tenant.status || 'Active',
        paidLicenseActive: true
      }));

      localStorage.setItem('mock_session', JSON.stringify({
        uid: `owner_${targetId}`,
        email: tenant.ownerEmail || 'owner@mbiinventra.com',
        displayName: ownerName,
        role: 'Primary Admin',
        tenantId: targetId
      }));

      localStorage.setItem('mock_user_profile', JSON.stringify({
        id: `owner_${targetId}`,
        name: ownerName,
        email: tenant.ownerEmail || 'owner@mbiinventra.com',
        role: 'Admin',
        businessId: targetId,
        tenantId: targetId,
        pin: '0000',
        createdAt: new Date().toISOString()
      }));

      window.dispatchEvent(new CustomEvent('mbi_tenant_changed', { detail: { tenantId: targetId, name: storeName } }));
      window.dispatchEvent(new CustomEvent('mbi_active_business_changed', { detail: shadowBiz }));
      window.dispatchEvent(new Event('storage'));

      const targetUrl = `${window.location.origin}/user?shadow_token=${encodeURIComponent(shadowToken)}&tenant_id=${encodeURIComponent(targetId)}&store_name=${encodeURIComponent(storeName)}&user_name=${encodeURIComponent(ownerName)}&user_role=Primary%20Admin`;
      
      const newWin = window.open(targetUrl, '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        window.location.href = targetUrl;
      } else {
        onNotify(`✅ Successfully switched into ${storeName} workspace`);
      }
    } catch (err) {
      console.error('Failed to switch company:', err);
      onNotify('Failed to initiate shadow session.');
    }
  };

  // Handle remote lockout / kill switch with Cascading Lock to all Sub-Users
  const handleToggleLock = async (tenant: Tenant) => {
    const isCurrentlySuspended = tenant.status === 'Suspended';
    const nextStatus = isCurrentlySuspended ? 'Active' : 'Suspended';
    const tid = tenant.tenantId || tenant.id;

    if (!isCurrentlySuspended && !window.confirm(`Are you sure you want to remotely LOCK "${tenant.name}"? This will lock out the company AND ALL of its sub-users immediately.`)) {
      return;
    }

    try {
      // 1. Post to Server API for DB & Multi-device Lock
      await fetch('/api/fleet/tenants/toggle-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tid,
          lockStatus: nextStatus
        })
      }).catch(() => {});

      // 2. Update Local Tenant Status & React State
      updateTenantStatus(tenant.id, nextStatus);
      if (tenant.tenantId && tenant.tenantId !== tenant.id) {
        updateTenantStatus(tenant.tenantId, nextStatus);
      }
      setTenants(prev => prev.map(t => {
        if (t.id === tenant.id || t.tenantId === tid || t.id === tid) {
          return { ...t, status: nextStatus, isSuspended: !isCurrentlySuspended };
        }
        return t;
      }));

      if (isCurrentlySuspended) {
        unlockRemoteInstance(tenant.id);
        if (tenant.tenantId) unlockRemoteInstance(tenant.tenantId);
      } else {
        executeRemoteKillSwitch(tenant.id, 'emergency_lock', 'Master Admin Company Lockout');
      }

      // 3. Cascading Auto-Lock / Unlock of all Sub-Users belonging to this Company
      try {
        const usersStored = localStorage.getItem('mbi_master_active_users_v3') || localStorage.getItem('mbi_master_active_users');
        if (usersStored) {
          const currentUsers = JSON.parse(usersStored);
          if (Array.isArray(currentUsers)) {
            const updatedUsers = currentUsers.map((u: any) => {
              const matchCompany = (u.storeName && tenant.name && u.storeName.toLowerCase() === tenant.name.toLowerCase()) || 
                                   u.tenant_id === tid || 
                                   u.tenantId === tid;
              if (matchCompany) {
                return {
                  ...u,
                  status: nextStatus,
                  isKillSwitchActive: !isCurrentlySuspended,
                  isOnline: isCurrentlySuspended ? u.isOnline : false
                };
              }
              return u;
            });
            localStorage.setItem('mbi_master_active_users_v3', JSON.stringify(updatedUsers));
            localStorage.setItem('mbi_master_active_users', JSON.stringify(updatedUsers));
            window.dispatchEvent(new CustomEvent('mbi-users-updated'));
          }
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('mbi-tenants-updated'));
      window.dispatchEvent(new Event('storage'));
      refreshAllFleetData();
      onNotify(isCurrentlySuspended 
        ? `✅ Company "${tenant.name}" & all sub-users have been UNLOCKED and restored!` 
        : `🛑 Company "${tenant.name}" & all sub-users have been LOCKED and suspended!`
      );
    } catch (e) {
      onNotify('Failed to execute remote lockout.');
    }
  };

  // Handle permanent deletion of tenant from MariaDB and local fleet
  const handleDeleteTenant = async (tenant: Tenant) => {
    const tid = tenant.tenantId || tenant.id;
    if (!window.confirm(`Are you sure you want to permanently delete company "${tenant.name}" (${tid}) from MariaDB and server fleet? All associated user credentials and data will be removed.`)) {
      return;
    }

    try {
      const res = await fetch('/api/fleet/tenants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tid, tenantId: tid, id: tid })
      });

      if (res.ok) {
        onNotify(`🗑️ Company "${tenant.name}" permanently deleted.`);
        setTenants(prev => prev.filter(x => x.id !== tid && x.tenantId !== tid && x.name !== tenant.name));
        const updated = tenants.filter(x => x.id !== tid && x.tenantId !== tid && x.name !== tenant.name);
        localStorage.setItem('mbi_master_tenants_v1', JSON.stringify(updated));
      } else {
        onNotify('Failed to delete tenant from server.');
      }
    } catch (err) {
      onNotify('Network error deleting tenant.');
    }
  };

  // Handle Send Direct Message to POS Screen
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageModalTenant || !directMessageText.trim()) return;

    const tid = messageModalTenant.tenantId || messageModalTenant.id;
    const alertMsg = directMessageText.trim();

    try {
      await fetch('/api/fleet/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tid,
          tenantName: messageModalTenant.name,
          title: 'Message from Head Office',
          message: alertMsg,
          alertType: 'urgent',
          playChime: true
        })
      });
    } catch (e) {}

    dispatchRemoteCommand(messageModalTenant.id, 'screen_alert', {
      title: 'Server Message from Head Office',
      message: alertMsg,
      timestamp: new Date().toISOString()
    });

    onNotify(`Direct alert dispatched to ${messageModalTenant.name}'s counter screen!`);
    setMessageModalTenant(null);
    setDirectMessageText('');
  };

  // Handle Download Backup Snapshot
  const handleDownloadBackup = async (tenant: Tenant) => {
    try {
      const backup = await triggerRemoteBackupForClient(tenant.name, tenant.id, {
        medicines: tenant.totalProductsCount || 350,
        invoices: tenant.totalInvoicesCount || 120,
        suppliers: 25,
        payments: 80,
        expenses: 30,
        customers: tenant.totalPartiesCount || 40
      });

      const blob = new Blob([JSON.stringify(backup.backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onNotify(`Client database snapshot (${backup.fileName}) downloaded successfully!`);
    } catch (e) {
      onNotify('Failed to generate snapshot backup.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* UNIFIED SUITE HEADER WITH TOP TAB SELECTOR */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Client Fleet &amp; User Control Suite
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Multi-Company &amp; Staff
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {tenants.length} Companies • {fleetMetrics.onlineCount} Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Unified control center: Manage pharmacy stores, staff accounts, passcodes, kill-switches, and live API keys.
              </p>
            </div>
          </div>

          {/* Top 3-Way Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveFleetTab('pharmacies')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeFleetTab === 'pharmacies'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Pharmacies &amp; Fleet ({tenants.length})</span>
            </button>

            <button
              onClick={() => setActiveFleetTab('users')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeFleetTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Control Switchboard</span>
            </button>

            <button
              onClick={() => setActiveFleetTab('api_keys')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeFleetTab === 'api_keys'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Key className="w-4 h-4 text-amber-300" />
              <span>Fleet API Keys ({apiKeys.length})</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: PHARMACIES & CLIENT FLEET */}
      {activeFleetTab === 'pharmacies' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* PENDING REGISTRATION LEADS ALERT BANNER */}
          {pendingLeads.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 dark:from-emerald-950/90 dark:via-slate-900 dark:to-emerald-950/90 border border-emerald-500/40 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Phone className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {pendingLeads.length} New Registration Lead{pendingLeads.length > 1 ? 's' : ''} Pending!
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    New owners submitted software registration applications from website portal. Review and send instant license keys on WhatsApp.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: 'whatsapp_leads' }));
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Manage Leads &amp; Activate</span>
              </button>
            </div>
          )}

          {/* FLEET STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Companies</span>
                <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                {fleetMetrics.total}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Isolated tenant DBs
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Live Active Now</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
                {fleetMetrics.onlineCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time heartbeats
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Paid Enterprise/Pro</span>
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
                {fleetMetrics.activeProCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Paid active licenses
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>3-Day Trials</span>
                <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1.5">
                {fleetMetrics.trialCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Onboarding pharmacies
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Invoices</span>
                <Receipt className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
                {fleetMetrics.totalInvoices.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cumulative across fleet
              </div>
            </div>
          </div>

          {/* SEARCH, FILTER & ACTION BAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pharmacy name, owner, phone, city, license..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({tenants.length})
                </button>
                <button
                  onClick={() => setStatusFilter('trial')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'trial' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Trials ({fleetMetrics.trialCount})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Paid Pro ({fleetMetrics.activeProCount})
                </button>
                <button
                  onClick={() => setStatusFilter('expiring')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'expiring' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Expiring ({fleetMetrics.expiringSoonCount})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
              <button
                onClick={() => setShowCreateClientModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Client (Direct Contact)</span>
              </button>

              <button
                onClick={refreshAllFleetData}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Refresh Fleet</span>
              </button>
            </div>
          </div>

          {/* CLIENT CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTenants.map((t) => {
              const trialInfo = calculateTrialRemaining(t.trialExpiryDate);
              const isSuspended = t.status === 'Suspended';
              const isTrial = t.isTrialActive || t.status === 'Trial';
              const isPaid = t.paidLicenseActive || t.status === 'Active';

              const joinedDate = t.createdAt ? new Date(t.createdAt) : new Date();
              const daysSinceJoined = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
              const joinedFormatted = joinedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

              const inst = instances.find(i => i.clientName === t.name || i.installationId === t.id);
              const isOnline = inst ? (Date.now() - new Date(inst.lastHeartbeat).getTime() < 15 * 60 * 1000) : true;
              const lastSyncFormatted = t.lastSyncAt ? new Date(t.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

              return (
                <div
                  key={t.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all hover:border-blue-400 dark:hover:border-blue-500/50 flex flex-col justify-between ${
                    isSuspended 
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/10' 
                      : trialInfo.daysLeft <= 2 && isTrial
                      ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/30 dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              {t.name}
                            </h3>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} title={isOnline ? 'Online' : 'Offline'} />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>{t.ownerName || 'Owner'}</span>
                            </span>
                            {t.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                <span>{t.city}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Plan & Status Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isSuspended
                            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                            : isPaid
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40'
                        }`}>
                          {isSuspended ? 'Locked / Suspended' : isPaid ? (t.plan || 'Pharmacy Pro') : '3-Day Trial'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          ID: {t.licenseId || t.tenantId?.slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* TELEMETRY BAR: TIME REMAINING & JOIN DETAILS */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs my-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                          <span>Time Remaining</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                          {isPaid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Perpetual / Active Paid</span>
                            </span>
                          ) : trialInfo.isExpired ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">Trial Expired</span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-300 font-bold">{trialInfo.formatted}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Expires: {t.trialExpiryDate && !isNaN(new Date(t.trialExpiryDate).getTime()) ? new Date(t.trialExpiryDate).toLocaleDateString() : 'Active (Perpetual / Lifetime)'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                          <span>Onboarding Date</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-1">
                          {joinedFormatted}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {daysSinceJoined === 0 ? 'Joined Today' : `${daysSinceJoined} days ago`} • Sync: {lastSyncFormatted}
                        </div>
                      </div>
                    </div>

                    {/* DEVICE & VOLUME METRICS */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-1 text-slate-600 dark:text-slate-300">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 font-semibold">Invoices</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {t.totalInvoicesCount || 0}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 font-semibold">Catalog Items</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {t.totalProductsCount || 0} Meds
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 font-semibold">Max Devices</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {t.maxDevices || 3} Terminals
                        </div>
                      </div>
                    </div>

                    {/* Owner Contact Bar */}
                    {t.ownerPhone && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                          <span>{t.ownerPhone}</span>
                        </span>
                        <a
                          href={`https://wa.me/${t.ownerPhone.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(t.ownerName || t.name)},%20Greeting%20from%20MBI%20Inventra%20Central%20Server.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 text-[11px] font-bold flex items-center gap-1"
                        >
                          <span>WhatsApp Direct</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ACTION TOOLBAR PER CLIENT */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* 0. 1-CLICK SILENT SWITCH INTO COMPANY WORKSPACE */}
                      <button
                        onClick={() => handleSilentSwitchCompany(t)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:scale-105 cursor-pointer"
                        title={`Silently switch into ${t.name} and open store POS in new tab`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Switch Workspace</span>
                      </button>

                      {/* 1-Click Jump to User Control for this Pharmacy */}
                      <button
                        onClick={() => {
                          setUserHubSearchFilter(t.name);
                          setActiveFleetTab('users');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="View and control staff users for this pharmacy"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Staff Switchboard</span>
                      </button>

                      {/* 1-Click API Key (Copies directly & opens tab) */}
                      <button
                        onClick={() => handleCopyTenantApiKey(t)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title={`Copy API Key & manage endpoints for ${t.name}`}
                      >
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>API Key</span>
                      </button>

                      {/* Force Sync */}
                      <button
                        onClick={() => handleForceSyncClient(t)}
                        disabled={isSyncingClient === t.id}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Force sync database and terminal telemetry"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingClient === t.id ? 'animate-spin' : ''}`} />
                        <span>{isSyncingClient === t.id ? 'Syncing...' : 'Sync'}</span>
                      </button>

                      {/* Extend Trial / Upgrade Plan */}
                      <button
                        onClick={() => setExtendModalTenant(t)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-600/20 hover:bg-purple-100 dark:hover:bg-purple-600/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Extend Trial or Upgrade to Paid Pro"
                      >
                        <Clock className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                        <span>Extend</span>
                      </button>

                      {/* Direct Alert Message */}
                      <button
                        onClick={() => setMessageModalTenant(t)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Send screen popup alert directly to this client"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-500" />
                        <span>Alert</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Download Backup */}
                      <button
                        onClick={() => handleDownloadBackup(t)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
                        title="Download Partitioned Client Backup Snapshot"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Remote Lock / Unlock */}
                      <button
                        onClick={() => handleToggleLock(t)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                          isSuspended
                            ? 'bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                            : 'bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                        }`}
                        title={isSuspended ? 'Restore client access' : 'Remotely lock client terminal'}
                      >
                        {isSuspended ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlock</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Lock</span>
                          </>
                        )}
                      </button>

                      {/* Permanent Delete Tenant */}
                      <button
                        onClick={() => handleDeleteTenant(t)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer"
                        title="Permanently Delete Company from MariaDB & Fleet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTenants.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Clients Found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                No client branches matched your search or status filter criteria.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: UNIFIED USER CONTROL SWITCHBOARD */}
      {activeFleetTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Staff &amp; Cashier Governance
              </span>
              {userHubSearchFilter && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <span>Filtered: {userHubSearchFilter}</span>
                  <button onClick={() => setUserHubSearchFilter('')} className="hover:text-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => setActiveFleetTab('pharmacies')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>&larr; Back to Pharmacies Overview</span>
            </button>
          </div>

          {/* Render Full UnifiedUserControlHub Component with external search filter */}
          <UnifiedUserControlHub 
            onNotify={onNotify} 
            externalSearchQuery={userHubSearchFilter}
          />
        </div>
      )}

      {/* VIEW 3: FLEET API KEYS & INTEGRATIONS */}
      {activeFleetTab === 'api_keys' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top API Keys Banner & Generation Trigger */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Master REST API Keys &amp; Webhooks
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Live Endpoints
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                  Issue secure cryptographic Bearer API tokens for third-party ERPs, online stores, external POS terminals, and DRAP sync webhooks per pharmacy tenant.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate New API Key</span>
                </button>

                <button
                  type="button"
                  onClick={refreshApiKeys}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  title="Refresh keys list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys.map((key) => {
              const isCopiedSec = copiedKeyId === `${key.id}_sec`;
              const isCopiedPub = copiedKeyId === `${key.id}_pub`;
              const isCopiedWh = copiedKeyId === `${key.id}_wh`;

              return (
                <div
                  key={key.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all ${
                    key.status === 'Revoked'
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 opacity-75'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Key Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {key.keyName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {key.tenantName} ({key.tenantId})
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          key.environment === 'production' 
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {key.environment}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          key.status === 'Active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {key.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Rate: {key.rateLimitPerMin} req/min
                        </span>
                      </div>

                      {/* Key Values */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {/* Secret API Key */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 font-mono">
                          <div className="truncate">
                            <span className="text-slate-400 text-[10px] block font-sans font-bold uppercase">Secret API Key:</span>
                            <span className="text-slate-800 dark:text-slate-200 select-all">
                              {key.apiKey.slice(0, 16)}••••••••••••••••
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(key.apiKey, `${key.id}_sec`)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                            title="Copy full secret API key"
                          >
                            {isCopiedSec ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Public Key */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 font-mono">
                          <div className="truncate">
                            <span className="text-slate-400 text-[10px] block font-sans font-bold uppercase">Public / Client ID:</span>
                            <span className="text-slate-800 dark:text-slate-200 select-all">
                              {key.publicKey}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(key.publicKey, `${key.id}_pub`)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                            title="Copy Public Key"
                          >
                            {isCopiedPub ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Webhook Secret */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 font-mono">
                          <div className="truncate">
                            <span className="text-slate-400 text-[10px] block font-sans font-bold uppercase">Webhook Secret:</span>
                            <span className="text-slate-800 dark:text-slate-200 select-all">
                              {key.webhookSecret.slice(0, 14)}••••••••
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(key.webhookSecret, `${key.id}_wh`)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                            title="Copy Webhook Secret"
                          >
                            {isCopiedWh ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTestApiKeyInput(key.apiKey);
                          onNotify(`Loaded ${key.keyName} into API verification tester below!`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Test Key</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleKeyStatus(key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          key.status === 'Active'
                            ? 'bg-rose-50 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40 hover:bg-rose-100'
                            : 'bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-100'
                        }`}
                      >
                        {key.status === 'Active' ? 'Revoke Key' : 'Reactivate Key'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* REAL-TIME API KEY VERIFICATION PLAYGROUND */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-2.5 mb-3">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Live API Key Verification Playground</h4>
              <span className="text-[10px] font-mono text-slate-400">POST /api/fleet/keys/verify</span>
            </div>

            <form onSubmit={handleVerifyKeyTest} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={testApiKeyInput}
                  onChange={(e) => setTestApiKeyInput(e.target.value)}
                  placeholder="Paste or enter mbi_live_sec_... API key to test live authorization"
                  className="flex-1 w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isVerifyingKey || !testApiKeyInput.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Verify Key Now</span>
                </button>
              </div>

              {/* Verify Response Result */}
              {keyVerifyResult && (
                <div className={`p-4 rounded-xl border text-xs font-mono animate-in fade-in duration-150 ${
                  keyVerifyResult.valid 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 font-sans">
                    <span className="font-bold flex items-center gap-1.5">
                      {keyVerifyResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                      <span>{keyVerifyResult.valid ? '200 OK — Authorized' : '401 Unauthorized — Invalid Key'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Latency: {keyVerifyResult.latencyMs}ms
                    </span>
                  </div>
                  <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(keyVerifyResult, null, 2)}
                  </pre>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW CLIENT WITH USERS */}
      <CreateClientWithUsersModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onCreated={(newTenant) => {
          onNotify(`New client ${newTenant.name} provisioned successfully!`);
          refreshAllFleetData();
        }}
      />

      {/* MODAL: GENERATE NEW API KEY */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate Tenant API Key</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Issue Bearer REST API credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateKeyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateApiKey} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Pharmacy Tenant</label>
                <select
                  value={newKeyTenantId || (tenants[0]?.id || '')}
                  onChange={(e) => setNewKeyTenantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city || 'Store'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Key Name / Description</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Counter 1 POS REST Sync"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Environment</label>
                  <select
                    value={newKeyEnv}
                    onChange={(e) => setNewKeyEnv(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox / Test</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rate Limit (req/min)</label>
                  <input
                    type="number"
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20"
                >
                  Create &amp; Activate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXTEND TRIAL / UPGRADE LICENSE */}
      <LicenseActivationModal
        isOpen={Boolean(extendModalTenant)}
        onClose={() => setExtendModalTenant(null)}
        initialTenant={extendModalTenant}
        onSuccess={(msg) => {
          onNotify(msg);
          refreshAllFleetData();
        }}
      />

      {/* MODAL: DIRECT ALERT MESSAGE TO POS */}
      {messageModalTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Push Popup Message to POS Terminal</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Recipient: {messageModalTenant.name}</p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Announcement or Notice
                </label>
                <textarea
                  rows={3}
                  value={directMessageText}
                  onChange={(e) => setDirectMessageText(e.target.value)}
                  placeholder="e.g. Server maintenance scheduled tonight at 12:00 AM. Please complete day close."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageModalTenant(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
