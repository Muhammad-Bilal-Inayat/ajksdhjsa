import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, Search, Filter, Play, Pause, Trash2, 
  Building2, User, Zap, Globe, Clock, ShieldCheck, 
  CheckCircle2, ShoppingBag, DollarSign, RefreshCw, AlertCircle,
  Sliders, Lock, Unlock, Phone, Smartphone, Laptop, Terminal,
  UserCheck, ShieldAlert, KeyRound, HardDrive, ArrowRight, Eye, Sparkles
} from 'lucide-react';
import { adminService, TenantTelemetryRecord } from '../../services/adminService';
import { emitToast } from '../../contexts/ToastContext';

export interface FleetActivityItem {
  id: string;
  tenantId: string;
  storeName: string;
  city: string;
  userName: string;
  userRole: string;
  actionType: 'SALE' | 'PURCHASE' | 'LOGIN' | 'STOCK_TRANSFER' | 'PRICE_EDIT' | 'SYSTEM' | 'STAFF_MUTATION' | 'DEVICE_AUTH' | 'NEW_REGISTRATION' | 'PLAN_UPGRADE' | 'LICENSE_EXTENSION';
  actionDetails: string;
  ipAddress: string;
  deviceInfo: string;
  timestamp: string;
  relativeTime: string;
}

const SEED_ACTIVITIES: FleetActivityItem[] = [
  {
    id: 'act_01',
    tenantId: 'tenant_main_pharmacy',
    storeName: 'Inventra Central Pharmacy',
    city: 'Lahore',
    userName: 'Bilal Cashier',
    userRole: 'Cashier Terminal #1',
    actionType: 'SALE',
    actionDetails: 'Generated POS Invoice #INV-4921 (Rs. 4,350.00) - 3 Items',
    ipAddress: '182.185.24.11',
    deviceInfo: 'Dell OptiPlex / Win 11 Pro',
    timestamp: new Date().toISOString(),
    relativeTime: 'Just now'
  },
  {
    id: 'act_02',
    tenantId: 'tenant_hassan_medicos',
    storeName: 'Hassan Medicos',
    city: 'Sargodha',
    userName: 'Hassan Ali',
    userRole: 'Primary Admin',
    actionType: 'PURCHASE',
    actionDetails: 'Saved Inward Purchase Bill #PB-104 from GlaxoSmithKline (Rs. 82,500.00)',
    ipAddress: '39.40.112.95',
    deviceInfo: 'HP ProBook 450 / Chrome 128',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    relativeTime: '30s ago'
  },
  {
    id: 'act_03',
    tenantId: 'tenant_main_pharmacy',
    storeName: 'Inventra Central Pharmacy',
    city: 'Lahore',
    userName: 'Dr. Kashif Ahmed',
    userRole: 'Primary Owner',
    actionType: 'LOGIN',
    actionDetails: 'User Authenticated via Dual-Factor HWID Lock',
    ipAddress: '182.185.24.11',
    deviceInfo: 'Dell OptiPlex / Win 11 Pro',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    relativeTime: '2m ago'
  },
  {
    id: 'act_04',
    tenantId: 'tenant_alshifa_med',
    storeName: 'Al-Shifa Medicine Hub',
    city: 'Rawalpindi',
    userName: 'Usman Farooq',
    userRole: 'Inventory Manager',
    actionType: 'STOCK_TRANSFER',
    actionDetails: 'Inter-Godown Gate Pass Dispatch #GP-88 (40 Packs Panadol Extra)',
    ipAddress: '119.160.67.42',
    deviceInfo: 'Lenovo ThinkCentre / Win 10',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    relativeTime: '5m ago'
  }
];

export const LiveFleetMatrixStream: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [activeSubTab, setActiveSubTab] = useState<'stream' | 'switchboard'>('stream');
  const [activities, setActivities] = useState<FleetActivityItem[]>(SEED_ACTIVITIES);
  const [isPaused, setIsPaused] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Switchboard state
  const [tenants, setTenants] = useState<TenantTelemetryRecord[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantTelemetryRecord | null>(null);

  // Load telemetry
  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      const data = await adminService.getTenantsTelemetry();
      setTenants(data);
      if (data.length > 0 && !selectedTenant) {
        setSelectedTenant(data[0]);
      }
    } catch (e) {
      console.error('Failed to load tenants:', e);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  // SSE Stream Listener
  useEffect(() => {
    if (isPaused) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/fleet-stream');

      eventSource.onmessage = (event) => {
        try {
          const item: FleetActivityItem = JSON.parse(event.data);
          if (item && item.actionType) {
            setActivities((prev) => [
              { ...item, relativeTime: 'Just now' },
              ...prev.slice(0, 99)
            ]);
          }
        } catch (e) {}
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch (e) {}

    return () => {
      eventSource?.close();
    };
  }, [isPaused]);

  // Master Actions
  const handleToggleKillSwitch = async (tenant: TenantTelemetryRecord) => {
    const nextLocked = !tenant.isHardLocked;
    try {
      await adminService.toggleTenantLock(tenant.id, nextLocked);
      emitToast(`Tenant ${tenant.name} ${nextLocked ? 'FROZEN / LOCKED' : 'REACTIVATED'}`, 'success');
      loadTenants();
    } catch (e) {
      emitToast('Failed to toggle kill switch', 'error');
    }
  };

  const handleForceLogoutStaff = async (tenant: TenantTelemetryRecord) => {
    try {
      await adminService.forceDisconnectAllSessions(tenant.id);
      emitToast(`Forced logout broadcasted to all terminals for ${tenant.name}`, 'success');
      loadTenants();
    } catch (e) {
      emitToast('Failed to execute forced logout', 'error');
    }
  };

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.storeName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        act.userName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        act.actionDetails.toLowerCase().includes(searchFilter.toLowerCase()) ||
        act.city.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesType = typeFilter === 'ALL' || act.actionType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [activities, searchFilter, typeFilter]);

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PURCHASE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'LOGIN':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'STOCK_TRANSFER':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'STAFF_MUTATION':
      case 'DEVICE_AUTH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Sub-Nav */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>Live Fleet Matrix & Remote Switchboard</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>REAL-TIME SSE</span>
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consolidated command view of real-time transactions, active hardware logins & remote kill-switches.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveSubTab('stream')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'stream'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Activity Stream
          </button>
          <button
            onClick={() => setActiveSubTab('switchboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'switchboard'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unified User Switchboard
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE ACTIVITY STREAM */}
      {activeSubTab === 'stream' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by Pharmacy, User, City or Details..."
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                <option value="ALL">All Actions</option>
                <option value="SALE">Sales / POS</option>
                <option value="PURCHASE">Purchases</option>
                <option value="LOGIN">Staff Logins</option>
                <option value="STOCK_TRANSFER">Stock Transfers</option>
                <option value="STAFF_MUTATION">Staff & Devices</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isPaused 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume Stream' : 'Live Connected'}</span>
              </button>

              <button
                onClick={() => setActivities([])}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Clear Activity Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Activity Feed Cards */}
          <div className="space-y-2.5">
            {filteredActivities.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${
                isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <Radio className="w-8 h-8 mx-auto text-slate-500 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">Listening for real-time fleet events...</p>
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id + Math.random()}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-blue-500/40 ${
                    isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0 mt-0.5 ${getActionBadge(act.actionType)}`}>
                      {act.actionType}
                    </div>

                    <div>
                      <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                        <span className="text-slate-100">{act.storeName}</span>
                        <span className="text-[10px] text-slate-400">({act.city})</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-blue-400 font-medium">{act.userName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {act.userRole}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 mt-1 font-mono">
                        {act.actionDetails}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>IP: {act.ipAddress}</span>
                        <span>Device: {act.deviceInfo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono font-bold text-slate-400">{act.relativeTime}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: UNIFIED USER SWITCHBOARD */}
      {activeSubTab === 'switchboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Tenant Selector List */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Registered Pharmacies ({tenants.length})
              </div>

              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {tenants.map((t) => {
                  const isSelected = selectedTenant?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTenant(t)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/50 text-white'
                          : isDarkMode
                          ? 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{t.name}</span>
                        <span className={`w-2 h-2 rounded-full ${t.isHardLocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {t.city} • Plan: {t.plan} • {t.totalStaffCount || 1} Staff
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Tenant Switchboard Controls */}
            {selectedTenant && (
              <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-6 ${
                isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-inherit pb-4">
                  <div>
                    <h2 className="text-base font-black flex items-center gap-2">
                      <span>{selectedTenant.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedTenant.isHardLocked
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {selectedTenant.isHardLocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Owner: {selectedTenant.ownerName} ({selectedTenant.phone}) • Tenant ID: <span className="font-mono">{selectedTenant.id}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleKillSwitch(selectedTenant)}
                    className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedTenant.isHardLocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-lg shadow-emerald-600/30'
                        : 'bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-lg shadow-rose-600/30'
                    }`}
                  >
                    {selectedTenant.isHardLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{selectedTenant.isHardLocked ? 'Unfreeze Tenant' : 'Master Kill Switch'}</span>
                  </button>
                </div>

                {/* Quick Switchboard Actions */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleForceLogoutStaff(selectedTenant)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Force Terminals Logout</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Disconnect all active POS cashier sessions</div>
                  </button>

                  <button
                    onClick={() => {
                      emitToast(`Password reset link sent to ${selectedTenant.phone}`, 'success');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <KeyRound className="w-4 h-4" />
                      <span>Reset Passcode</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Reset owner credentials to default pin</div>
                  </button>

                  <button
                    onClick={() => {
                      emitToast(`Storage quota for ${selectedTenant.name} increased to 10,000 MB`, 'success');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <HardDrive className="w-4 h-4" />
                      <span>Expand Cloud Storage</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Increase MariaDB row quota limit</div>
                  </button>
                </div>

                {/* Bound HWID Terminals */}
                <div>
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                    Bound HWID POS Terminals ({selectedTenant.boundHwids?.length || 1})
                  </div>
                  <div className="space-y-2">
                    {(selectedTenant.boundHwids && selectedTenant.boundHwids.length > 0 ? selectedTenant.boundHwids : [selectedTenant.activeHwid || 'HWID-PK99-WIN11-SEC01']).map((hwid, idx) => (
                      <div
                        key={hwid + idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                          isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-blue-400" />
                          <span className="font-bold">{hwid}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            Counter #{idx + 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">Lock Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
