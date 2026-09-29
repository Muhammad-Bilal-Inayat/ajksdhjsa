import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Key, Users, Database, ShieldCheck, Lock, Unlock,
  RefreshCw, Search, CheckCircle2, AlertTriangle, Clock, Phone, MapPin, 
  Sparkles, Zap, ShieldAlert, ChevronRight, Server, ArrowRight, Eye, EyeOff,
  Sliders, DollarSign, Cpu, Radio, X, Check, Power, Activity, Upload, 
  Globe, Package, AlertCircle, ShoppingCart, Laptop, Terminal, Trash2, Edit,
  Crown, Calendar, Layers, Cloud, HardDrive, Bot, PhoneCall, MessageSquare, Smartphone, CreditCard
} from 'lucide-react';
import { adminService, TenantTelemetryRecord } from '../services/adminService';
import { TenantFeatureMap, getDefaultFeatureMap } from '../types/features';
import { predictiveInventoryService, PredictiveSummary } from '../services/predictiveInventoryService';
import { developerVaultService, JsonPatchRecord } from '../services/developerVaultService';
import { deviceSecurityService, DeviceSessionRecord } from '../services/deviceSecurityService';
import { FleetActivityStream } from '../components/admin/FleetActivityStream';
import { TenantStaffDeviceModal } from '../components/admin/TenantStaffDeviceModal';
import { TenantFeatureMatrixModal } from '../components/admin/TenantFeatureMatrixModal';
import { MasterDbExplorerTab } from '../components/admin/MasterDbExplorerTab';
import { AiSupportTelemetryTab } from '../components/admin/AiSupportTelemetryTab';
import { DeveloperVaultTab } from '../components/admin/DeveloperVaultTab';
import { ApiRequestInspectorTab } from '../components/admin/ApiRequestInspectorTab';
import { MasterBroadcastCenterTab } from '../components/admin/MasterBroadcastCenterTab';
import { MasterGlobalSearchBar } from '../components/admin/MasterGlobalSearchBar';
import { Master2faSettingsModal } from '../components/admin/Master2faSettingsModal';
import { CheckoutLeadsTab } from '../components/admin/CheckoutLeadsTab';
import { emitToast } from '../contexts/ToastContext';

type TabType = 'stream' | 'broadcast' | 'stores' | 'checkout_orders' | 'database_studio' | 'predictions' | 'vault' | 'ai_support' | 'traffic' | 'subdomains' | 'devices' | '2fa';

export const MasterCommandCenter: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => adminService.isAuthenticated());
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('stream');

  // Telemetry & Fleet State
  const [tenants, setTenants] = useState<TenantTelemetryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [drillDownTenant, setDrillDownTenant] = useState<TenantTelemetryRecord | null>(null);
  const [isDrillDownModalOpen, setIsDrillDownModalOpen] = useState(false);

  const [featureMatrixTenant, setFeatureMatrixTenant] = useState<TenantTelemetryRecord | null>(null);
  const [isFeatureMatrixModalOpen, setIsFeatureMatrixModalOpen] = useState(false);

  // Storage Quota Modal State
  const [storageModalTenant, setStorageModalTenant] = useState<TenantTelemetryRecord | null>(null);
  const [selectedStorageLimit, setSelectedStorageLimit] = useState<number>(5000);
  const [isUpdatingStorage, setIsUpdatingStorage] = useState(false);

  // Private Transaction Engine Modal State
  const [privateConfigTenant, setPrivateConfigTenant] = useState<TenantTelemetryRecord | null>(null);
  const [privateEnabled, setPrivateEnabled] = useState(true);
  const [privateShortcut, setPrivateShortcut] = useState('Alt+P');
  const [privatePin, setPrivatePin] = useState('7860');
  const [allowOwnerAggregates, setAllowOwnerAggregates] = useState(true);
  const [isSavingPrivateConfig, setIsSavingPrivateConfig] = useState(false);

  // 2FA Google Authenticator Modal State
  const [isTotpModalOpen, setIsTotpModalOpen] = useState(false);

  // Predictive Stock State
  const [predictiveData, setPredictiveData] = useState<PredictiveSummary | null>(null);
  const [isLoadingPredictive, setIsLoadingPredictive] = useState(false);

  // Subdomains State
  const [subdomainsList, setSubdomainsList] = useState<any[]>([
    { id: 'sub_01', subdomain: 'alshifa.mbiinventra.com', tenantId: 'tenant_alshifa_med', tenantName: 'Al-Shifa Medicine Hub', status: 'ACTIVE', ssl: 'SECURE' },
    { id: 'sub_02', subdomain: 'central.mbiinventra.com', tenantId: 'tenant_main_pharmacy', tenantName: 'Inventra Central Pharmacy', status: 'ACTIVE', ssl: 'SECURE' },
    { id: 'sub_03', subdomain: 'hassanmed.mbiinventra.com', tenantId: 'tenant_hassan_medicos', tenantName: 'Hassan Medicos', status: 'ACTIVE', ssl: 'SECURE' }
  ]);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [selectedTenantForSubdomain, setSelectedTenantForSubdomain] = useState('');

  // Device Security State
  const [devicesList, setDevicesList] = useState<DeviceSessionRecord[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Load telemetry data
  const loadTelemetry = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getTenantsTelemetry();
      setTenants(data);
    } catch (e) {
      console.error('Failed to load telemetry:', e);
      emitToast('Failed to load fleet telemetry', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPredictive = async () => {
    setIsLoadingPredictive(true);
    try {
      const data = await predictiveInventoryService.generateDepletionPredictions();
      setPredictiveData(data);
    } finally {
      setIsLoadingPredictive(false);
    }
  };

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const devs = await deviceSecurityService.getFleetDevices();
      setDevicesList(devs);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTelemetry();
      loadPredictive();
      loadDevices();
    }
  }, [isAuthenticated]);

  // Real-time SSE listener for Master Hub
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/fleet-stream');

      eventSource.addEventListener('admin_event', (e: MessageEvent) => {
        try {
          loadTelemetry();
          loadDevices();
        } catch {}
      });

      eventSource.onmessage = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.actionType === 'STAFF_MUTATION' || parsed.actionType === 'DEVICE_AUTH' || parsed.actionType === 'NEW_REGISTRATION') {
            loadTelemetry();
            loadDevices();
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await adminService.authenticate(password, recoveryKey);
      if (result.success) {
        setIsAuthenticated(true);
        emitToast('🔐 Master Super Admin Authenticated via Dual Guard', 'success');
      } else {
        setAuthError(result.error || 'Authentication Failed');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Access Denied: Invalid Credentials');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    adminService.logout();
    setIsAuthenticated(false);
    emitToast('Master Session Locked', 'info');
  };

  const handleReturnToWorkspace = () => {
    const isAuth = !!localStorage.getItem('mbi_active_user') || 
                   !!localStorage.getItem('mbi_active_token') || 
                   !!localStorage.getItem('mbi_active_business_id');
    if (isAuth) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  // Toggle Remote Hard Lock / Kill Switch
  const handleToggleLock = async (tenant: TenantTelemetryRecord) => {
    const nextLocked = !tenant.isHardLocked;
    const confirmMsg = nextLocked
      ? `CRITICAL: Activate emergency remote kill-switch for ${tenant.name}? Cashier and POS terminals will be locked immediately.`
      : `Release remote lock for ${tenant.name}? POS terminals will resume operations.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const success = await adminService.toggleTenantLock(tenant.id, nextLocked);
      if (success) {
        setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, isHardLocked: nextLocked, status: nextLocked ? 'Locked' : 'Active' } : t));
        emitToast(nextLocked ? `🔒 ${tenant.name} locked remotely.` : `🔓 ${tenant.name} lock released.`, nextLocked ? 'warning' : 'success');
      } else {
        emitToast('Failed to change lock state', 'error');
      }
    } catch {
      emitToast('Action failed', 'error');
    }
  };

  // 1-Click Shadow Switch
  const handleImpersonate = async (tenant: TenantTelemetryRecord) => {
    try {
      const res = await adminService.impersonateTenant(tenant.id);
      if (res.success && res.dashboardUrl) {
        emitToast(`⚡ Shadow Switch active for ${tenant.name}! Opening store session...`, 'success');
        window.open(res.dashboardUrl, '_blank');
      } else {
        emitToast(res.error || 'Could not initialize shadow session', 'error');
      }
    } catch {
      emitToast('Shadow switch failed', 'error');
    }
  };

  // Open nested staff & devices modal
  const handleOpenStaffDeviceModal = (tenant: TenantTelemetryRecord) => {
    setDrillDownTenant(tenant);
    setIsDrillDownModalOpen(true);
  };

  // Open 173 Feature Matrix Modal
  const handleOpenFeatureDrawer = (tenant: TenantTelemetryRecord) => {
    setFeatureMatrixTenant(tenant);
    setIsFeatureMatrixModalOpen(true);
  };

  // Storage Quota Handlers
  const handleOpenStorageModal = (tenant: TenantTelemetryRecord) => {
    setStorageModalTenant(tenant);
    setSelectedStorageLimit(tenant.storageLimitMb || 5000);
  };

  const handleSaveStorageLimit = async (limitMb: number) => {
    if (!storageModalTenant) return;
    setIsUpdatingStorage(true);
    try {
      const success = await adminService.updateTenantStorageLimit(storageModalTenant.id, limitMb);
      if (success) {
        setTenants(prev => prev.map(t => t.id === storageModalTenant.id ? { ...t, storageLimitMb: limitMb } : t));
        emitToast(
          `💾 Storage quota for ${storageModalTenant.name} updated to ${limitMb === -1 ? 'Unlimited' : `${(limitMb / 1000).toFixed(0)} GB (${limitMb} MB)`}!`,
          'success'
        );
        setStorageModalTenant(null);
      } else {
        emitToast('Failed to update storage limit', 'error');
      }
    } catch {
      emitToast('Failed to update storage limit', 'error');
    } finally {
      setIsUpdatingStorage(false);
    }
  };

  // Private Transaction Engine Handlers
  const handleOpenPrivateConfigModal = async (tenant: TenantTelemetryRecord) => {
    setPrivateConfigTenant(tenant);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/private-panel-config`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setPrivateEnabled(typeof data.config.enabled === 'boolean' ? data.config.enabled : true);
          setPrivateShortcut(data.config.shortcutKey || 'Alt+P');
          setPrivatePin(data.config.unlockPin || '7860');
          setAllowOwnerAggregates(typeof data.config.allowOwnerAggregates === 'boolean' ? data.config.allowOwnerAggregates : true);
        }
      }
    } catch {
      // Default values
      setPrivateEnabled(true);
      setPrivateShortcut('Alt+P');
      setPrivatePin('7860');
      setAllowOwnerAggregates(true);
    }
  };

  const handleSavePrivateConfig = async () => {
    if (!privateConfigTenant) return;
    setIsSavingPrivateConfig(true);
    try {
      const payload = {
        enabled: privateEnabled,
        shortcutKey: privateShortcut.trim() || 'Alt+P',
        unlockPin: privatePin.trim() || '7860',
        allowOwnerAggregates: allowOwnerAggregates,
      };

      const res = await fetch(`/api/admin/tenants/${privateConfigTenant.id}/private-panel-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        emitToast(`🔒 Private Transaction Engine settings updated & pushed for ${privateConfigTenant.name}!`, 'success');
        setPrivateConfigTenant(null);
      } else {
        emitToast('Failed to save private panel config', 'error');
      }
    } catch {
      emitToast('Failed to save private panel config', 'error');
    } finally {
      setIsSavingPrivateConfig(false);
    }
  };

  // Subdomain handler
  const handleAddSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubdomain.trim() || !selectedTenantForSubdomain) return;

    const tenant = tenants.find(t => t.id === selectedTenantForSubdomain);
    const newEntry = {
      id: `sub_${Date.now()}`,
      subdomain: newSubdomain.trim(),
      tenantId: selectedTenantForSubdomain,
      tenantName: tenant?.name || 'Selected Pharmacy',
      status: 'ACTIVE',
      ssl: 'SECURE'
    };

    setSubdomainsList(prev => [newEntry, ...prev]);
    setNewSubdomain('');
    setSelectedTenantForSubdomain('');
    emitToast(`✅ Custom Subdomain ${newEntry.subdomain} successfully bound!`, 'success');
  };

  // Metrics
  const totalRevenue = useMemo(() => tenants.reduce((acc, t) => acc + (t.salesRevenue || 0), 0), [tenants]);
  const activeStores = useMemo(() => tenants.filter(t => !t.isHardLocked).length, [tenants]);
  const totalStaffAcrossFleet = useMemo(() => tenants.reduce((acc, t) => acc + (t.totalStaffCount || 1), 0), [tenants]);
  const totalOnlineStaff = useMemo(() => tenants.reduce((acc, t) => acc + (t.onlineStaffCount || 1), 0), [tenants]);

  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.ownerName.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.activeHwid.toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  // If not authenticated, render login guard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-blue-500/20">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              MBI Server Master Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zero-Backdoor Master Control Tower for MariaDB Fleet
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Master Super Admin Passcode *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Master Password..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Emergency 2FA Recovery Key (Optional)
              </label>
              <input
                type="password"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="03082003 or TOTP token"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>{isAuthenticating ? 'Authenticating...' : 'Unlock Master Control Hub'}</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              MariaDB Database: <strong>mbi72dn</strong> • 23 Master Tables
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* TOP MASTER BAR */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                MBI Inventra Master Control Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                MariaDB Live (mbi72dn)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Super Admin Multi-Tenant Fleet • Sub-User Accounts • Hardware HWID Whitelist • AI Support Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleReturnToWorkspace}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Return to Pharmacy Workspace (or Login)"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>User Workspace &gt;</span>
          </button>

          <button
            type="button"
            onClick={loadTelemetry}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            title="Reload Fleet Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Hub</span>
          </button>
        </div>
      </header>

      {/* 10 MASTER NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('stream')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'stream'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
          <span>1. Live Fleet Stream</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'broadcast'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          <span>2. 📢 Master Broadcast &amp; Announcements</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stores')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'stores'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>3. Tenants, Staff &amp; 5GB Quotas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checkout_orders')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'checkout_orders'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>🛒 Checkout Orders &amp; Proofs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database_studio')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'database_studio'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>3. 🗄️ 23-Table MariaDB Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('predictions')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'predictions'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>4. AI Stock Depletion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vault')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'vault'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>5. Targeted Updates &amp; Drive Sync</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai_support')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'ai_support'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bot className="w-4 h-4 text-purple-400" />
          <span>6. MBI AI &amp; Support Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('traffic')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'traffic'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>7. ⚡ API Traffic &amp; Sync Replay</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subdomains')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'subdomains'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>8. Subdomains &amp; White-Label</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'devices'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>9. Device Fleet &amp; HWID</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('2fa')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === '2fa'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>10. 🔐 Master 2FA &amp; Google Authenticator</span>
        </button>
      </div>

      {/* TAB 1: LIVE FLEET ACTIVITY STREAM */}
      {activeTab === 'stream' && (
        <FleetActivityStream />
      )}

      {/* TAB 2: MASTER BROADCAST & ANNOUNCEMENTS */}
      {activeTab === 'broadcast' && (
        <MasterBroadcastCenterTab />
      )}

      {/* TAB: CHECKOUT ORDERS & PAYMENT PROOFS */}
      {activeTab === 'checkout_orders' && (
        <CheckoutLeadsTab />
      )}

      {/* TAB 3: STORES, SUB-USERS, 5GB QUOTAS & CONNECTED DEVICES */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Active Fleet</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between">
                <span>{activeStores} / {tenants.length}</span>
                <Building2 className="w-5 h-5 text-blue-500 opacity-60" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Staff &amp; Cashiers</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono flex items-center justify-between">
                <span>{totalStaffAcrossFleet} Users ({totalOnlineStaff} Online)</span>
                <Users className="w-5 h-5 text-indigo-500 opacity-60" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sales Turnover</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-center justify-between">
                <span>Rs. {totalRevenue.toLocaleString('en-PK')}</span>
                <DollarSign className="w-5 h-5 text-emerald-500 opacity-60" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live SSE Bus State</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono flex items-center justify-between">
                <span>Real-Time (0ms)</span>
                <Radio className="w-5 h-5 text-purple-500 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stores, owners, HWID or city..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-white">{filteredTenants.length}</strong> stores
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Store &amp; City</th>
                  <th className="py-3 px-3">Owner Contact</th>
                  <th className="py-3 px-3">Plan / Status</th>
                  <th className="py-3 px-3">Storage Quota (5GB Def)</th>
                  <th className="py-3 px-3">Staff &amp; Bound Devices</th>
                  <th className="py-3 px-3 text-right">Sales Turnover</th>
                  <th className="py-3 px-4 text-right">Master Control Suite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTenants.map((tenant) => {
                  const staffCount = tenant.totalStaffCount || 1;
                  const deviceCount = tenant.totalDeviceCount || 1;
                  const usedMb = tenant.storageUsedMb || 140;
                  const limitMb = tenant.storageLimitMb || 5000;
                  const pct = limitMb > 0 ? ((usedMb / limitMb) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                          <span>{tenant.name}</span>
                          {tenant.isHardLocked && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[9px] uppercase font-bold">
                              Locked
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{tenant.city || 'Pakistan'}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-mono text-slate-400">{tenant.id}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{tenant.ownerName}</div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{tenant.phone}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          tenant.plan === 'Platinum'
                            ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : tenant.plan === 'Gold'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {tenant.plan}
                        </span>
                      </td>

                      {/* 💾 5GB Default Storage Quota Pill */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenStorageModal(tenant)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          title="Click to increase or customize VPS storage quota"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>
                            {limitMb === -1 
                              ? `💾 ${usedMb} MB / Unlimited` 
                              : `💾 ${usedMb} MB / ${limitMb} MB (${pct}%)`}
                          </span>
                        </button>
                      </td>

                      {/* Interactive Badge: 👥 [X] Staff Users • 💻 [Y] Devices */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenStaffDeviceModal(tenant)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-2xs group"
                          title="Click to view nested staff passcodes and bound device fleet"
                        >
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <strong>{staffCount}</strong> Staff
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <Laptop className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <strong>{deviceCount}</strong> Devices
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        Rs. {(tenant.salesRevenue || 0).toLocaleString('en-PK')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* ⚡ 1-Click Shadow Switch */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(tenant)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                            title="Open Super Admin Shadow Session in new tab"
                          >
                            <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>⚡ Switch</span>
                          </button>

                          {/* 👥 Staff & Devices Drawer */}
                          <button
                            type="button"
                            onClick={() => handleOpenStaffDeviceModal(tenant)}
                            className="px-2 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                            title="Manage Sub-Users &amp; Hardware Devices"
                          >
                            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Staff</span>
                          </button>

                          {/* 🎛️ 173 Features Switchboard */}
                          <button
                            type="button"
                            onClick={() => handleOpenFeatureDrawer(tenant)}
                            className="px-2 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>173</span>
                          </button>

                          {/* 🔒 Private Transaction Engine Settings */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrivateConfigModal(tenant)}
                            className="px-2 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                            title="Configure Private Transaction Panel &amp; PIN"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Private</span>
                          </button>

                          {/* ⛔ Remote Kill-Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleLock(tenant)}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              tenant.isHardLocked
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                                : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900'
                            }`}
                            title={tenant.isHardLocked ? 'Unlock Store' : 'Emergency Remote Kill-Switch'}
                          >
                            {tenant.isHardLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 23-TABLE MARIADB DATA STUDIO */}
      {activeTab === 'database_studio' && (
        <MasterDbExplorerTab tenants={tenants} />
      )}

      {/* TAB 4: AI PREDICTIVE STOCK DEPLETION ENGINE */}
      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>AI Predictive Stock Depletion Radar (30-Day Velocity)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculates daily burn rates and forecasts impending stock-outs with 1-click PO generator
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                Predicted Reorder Value: <strong className="text-emerald-600 dark:text-emerald-400">Rs. {predictiveData?.totalPredictedReorderValue.toLocaleString('en-PK')}</strong>
              </div>
              <button
                type="button"
                onClick={() => emitToast('✅ Smart Purchase Order Generated and Exported!', 'success')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>⚡ Generate Smart PO</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">🔴 Critical Depletion (&lt;3 Days)</span>
                <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{predictiveData?.criticalCount || 0} Items</div>
              </div>
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">🟡 Reorder Trigger (&lt;7 Days)</span>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{predictiveData?.reorderCount || 0} Items</div>
              </div>
              <ShoppingCart className="w-6 h-6 text-amber-500" />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">🟢 Healthy Stock Buffer (&gt;15 Days)</span>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{predictiveData?.healthyCount || 0} Items</div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Medicine Item</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">30-Day Sales</th>
                  <th className="py-2.5 px-3">Daily Burn Rate</th>
                  <th className="py-2.5 px-3">Days Left</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Recommended Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {predictiveData?.predictions.map((p) => (
                  <tr key={p.medicineId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{p.medicineName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.supplierName} • Batch {p.batchNumber}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{p.currentStock} Units</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{p.salesLast30Days} Units</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{p.avgDailySales} / day</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{p.daysRemaining} Days</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'critical'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : p.status === 'reorder'
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{p.recommendedReorderQty} Units (Rs. {p.estimatedCost.toFixed(2)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DEVELOPER VAULT & TARGETED UPDATE ENGINE */}
      {activeTab === 'vault' && (
        <DeveloperVaultTab tenants={tenants} />
      )}

      {/* TAB 6: MBI AI TELEMETRY & HUMAN SUPPORT HUB */}
      {activeTab === 'ai_support' && (
        <AiSupportTelemetryTab />
      )}

      {/* TAB 7: ⚡ API TRAFFIC INSPECTOR & ERROR REPLAY CONSOLE */}
      {activeTab === 'traffic' && (
        <ApiRequestInspectorTab />
      )}

      {/* TAB 8: WHITE-LABEL CUSTOM SUBDOMAINS */}
      {activeTab === 'subdomains' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>White-Label Custom Subdomain Router</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Map client domains (e.g. alshifa.mbiinventra.com) directly to designated tenant ID
              </p>
            </div>

            <form onSubmit={handleAddSubdomain} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value)}
                  placeholder="pharmacy-name.mbiinventra.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  required
                  value={selectedTenantForSubdomain}
                  onChange={(e) => setSelectedTenantForSubdomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Target Pharmacy...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  + Bind Subdomain
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Custom Subdomain</th>
                  <th className="py-2.5 px-3">Mapped Tenant Pharmacy</th>
                  <th className="py-2.5 px-3">SSL Certificate</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subdomainsList.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-300">{sub.subdomain}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{sub.tenantName} ({sub.tenantId})</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                        🔒 Auto TLS / SSL
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSubdomainsList(prev => prev.filter(s => s.id !== sub.id));
                          emitToast(`Subdomain mapping removed.`, 'info');
                        }}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: DEVICE SECURITY & HARDWARE HWID FLEET */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-500" />
                <span>Authorized Hardware &amp; Terminal Fleet Whitelist</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                HWID Fingerprint Lock stops credential sharing and restricts logins strictly to registered devices
              </p>
            </div>
            <button
              type="button"
              onClick={loadDevices}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Terminal / HWID</th>
                  <th className="py-2.5 px-3">Assigned Pharmacy</th>
                  <th className="py-2.5 px-3">Last Active User</th>
                  <th className="py-2.5 px-3">OS / Browser Info</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {devicesList.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <div>{dev.deviceModel}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{dev.hwid}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{dev.storeName}</td>
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{dev.userName} ({dev.userRole})</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{dev.os} • {dev.ipAddress}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        dev.status === 'ONLINE'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {dev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => emitToast(`Device ${dev.hwid} session revoked.`, 'info')}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold cursor-pointer"
                      >
                        Revoke Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 10: 🔐 MASTER 2FA & GOOGLE AUTHENTICATOR */}
      {activeTab === '2fa' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  🔐 Master 2FA &amp; Google Authenticator Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage TOTP Multi-Factor Authentication (RFC 6238) for Super Admin access to <code className="font-mono text-emerald-600 dark:text-emerald-400">/server</code>
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                Google Authenticator Two-Factor Authentication
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                When enabled, logging into <code className="font-mono text-emerald-600 dark:text-emerald-400">/server</code> requires both the Master Password (<code className="font-mono">Ami7788!@</code>) and a live 6-digit TOTP code generated on your mobile phone.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => setIsTotpModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2 whitespace-nowrap transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>Configure 2FA Setup &amp; QR Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Supported Authenticator Apps</span>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Google Authenticator (Android &amp; iOS)</li>
                <li>Microsoft Authenticator</li>
                <li>Twilio Authy / 1Password / Bitwarden TOTP</li>
                <li>Apple iOS Built-in Passwords Authenticator</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">Emergency Recovery Key</span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                In case your phone is lost or out of battery, the emergency master bypass passcode <code className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40">03082003</code> can be used to bypass the 2FA challenge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STORAGE QUOTA MODAL */}
      {storageModalTenant && (
        <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Edit Storage Quota
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setStorageModalTenant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{storageModalTenant.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Current Usage: <strong className="text-blue-600 dark:text-blue-400">{storageModalTenant.storageUsedMb || 140} MB</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Target Quota Tier:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '5 GB (Default)', value: 5000 },
                    { label: '10 GB', value: 10000 },
                    { label: '20 GB', value: 20000 },
                    { label: '50 GB (Enterprise)', value: 50000 },
                    { label: '♾️ Unlimited', value: -1 }
                  ].map(tier => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => setSelectedStorageLimit(tier.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedStorageLimit === tier.value
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStorageModalTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStorage}
                onClick={() => handleSaveStorageLimit(selectedStorageLimit)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isUpdatingStorage ? 'Updating...' : 'Save Quota'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NESTED TENANT STAFF & DEVICES DRILL-DOWN MODAL */}
      {drillDownTenant && (
        <TenantStaffDeviceModal
          tenant={drillDownTenant}
          isOpen={isDrillDownModalOpen}
          onClose={() => {
            setIsDrillDownModalOpen(false);
            setDrillDownTenant(null);
          }}
          onOpenFeatureMatrix={handleOpenFeatureDrawer}
          onTenantUpdated={(updated) => {
            setTenants(prev => prev.map(t => t.id === drillDownTenant.id ? { ...t, ...updated } : t));
          }}
        />
      )}

      {/* 173-FEATURE MATRIX MODAL (TENANT LEVEL) */}
      {featureMatrixTenant && (
        <TenantFeatureMatrixModal
          tenant={featureMatrixTenant}
          isOpen={isFeatureMatrixModalOpen}
          onClose={() => {
            setIsFeatureMatrixModalOpen(false);
            setFeatureMatrixTenant(null);
          }}
          onFeaturesSaved={(features) => {
            setTenants(prev => prev.map(t => t.id === featureMatrixTenant.id ? { ...t, features } : t));
          }}
        />
      )}

      {/* 🔒 PRIVATE TRANSACTION ENGINE SETTINGS MODAL */}
      {privateConfigTenant && (
        <div className="fixed inset-0 z-[10035] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    🔒 Private Transaction Engine Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Store: <strong className="text-slate-800 dark:text-slate-200">{privateConfigTenant.name}</strong> ({privateConfigTenant.city || 'Pakistan'})
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPrivateConfigTenant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Enable Private Panel Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Enable Private Panel</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Allow cashier/owner to launch isolated ledger</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivateEnabled(!privateEnabled)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    privateEnabled
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {privateEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Custom Shortcut Key Input */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Custom Shortcut Key (Default: <code className="font-mono text-amber-600 dark:text-amber-400">Alt+P</code>):
                </label>
                <input
                  type="text"
                  value={privateShortcut}
                  onChange={(e) => setPrivateShortcut(e.target.value)}
                  placeholder="e.g. Alt+P or Alt+K or Ctrl+Shift+P"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Supports standard key combos e.g. <code className="font-mono">Alt+P</code>, <code className="font-mono">Alt+K</code>, <code className="font-mono">Ctrl+Shift+P</code></span>
              </div>

              {/* Secret Unlock PIN */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Secret Unlock PIN (Default: <code className="font-mono text-amber-600 dark:text-amber-400">7860</code>):
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={privatePin}
                  onChange={(e) => setPrivatePin(e.target.value)}
                  placeholder="7860"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-amber-600 dark:text-amber-400 font-mono font-bold text-base outline-none focus:border-amber-500 text-center tracking-widest"
                />
                <span className="text-[10px] text-slate-500 block mt-1">4-to-8 digit secret security passcode required to unlock the panel</span>
              </div>

              {/* Allow Owner Aggregates Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Allow Owner Aggregates</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Enable 👁️ private turnover and gross profit totals</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowOwnerAggregates(!allowOwnerAggregates)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    allowOwnerAggregates
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {allowOwnerAggregates ? 'ON' : 'OFF'}
                </button>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPrivateConfigTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingPrivateConfig}
                onClick={handleSavePrivateConfig}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingPrivateConfig ? 'Saving & Broadcasting...' : 'Save & Push via SSE'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 MASTER 2FA GOOGLE AUTHENTICATOR SETTINGS MODAL */}
      <Master2faSettingsModal
        isOpen={isTotpModalOpen}
        onClose={() => setIsTotpModalOpen(false)}
      />

    </div>
  );
};

export default MasterCommandCenter;
