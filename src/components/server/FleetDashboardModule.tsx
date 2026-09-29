import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, ShieldCheck, Search, Plus, 
  RefreshCw, CheckCircle2, Clock, MapPin, Phone, 
  ExternalLink, Trash2, Edit3, Award, Sparkles, Filter, 
  Database, AlertTriangle, Play, ShieldAlert, GitBranch 
} from 'lucide-react';

interface TenantItem {
  id: string;
  tenant_id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  city: string;
  address: string;
  plan: string;
  status: string;
  drug_license_no?: string;
  ntn_number?: string;
  user_count?: number;
  invoice_count?: number;
  created_at?: string;
}

export function FleetDashboardModule({ onImpersonate }: { onImpersonate: (tenantId: string) => void }) {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Global Catalog Sync state
  const [syncingTenantId, setSyncingTenantId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Remote Wipe Modal state
  const [wipeModalTenant, setWipeModalTenant] = useState<TenantItem | null>(null);
  const [wipeAction, setWipeAction] = useState<'suspend' | 'wipe_data' | 'delete_permanent'>('suspend');
  const [wiping, setWiping] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    city: 'Lahore',
    address: '',
    plan: 'Business',
    status: 'Active',
    drug_license_no: '',
    ntn_number: ''
  });

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fleet/tenants', {
        headers: { 'x-master-pin': '884422' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tenants)) {
        setTenants(data.tenants);
      }
    } catch (e) {
      console.warn('Fleet fetch fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fleet/tenants/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-master-pin': '884422'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          owner_name: '',
          owner_phone: '',
          owner_email: '',
          city: 'Lahore',
          address: '',
          plan: 'Business',
          status: 'Active',
          drug_license_no: '',
          ntn_number: ''
        });
        loadTenants();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Push Master Medicine Catalog to Client Store
  const handleSyncGlobalMedicines = async (tenantId: string) => {
    setSyncingTenantId(tenantId);
    setSyncResult(null);
    try {
      const res = await fetch('/api/master/sync-global-medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-pin': '884422'
        },
        body: JSON.stringify({ target_tenant_id: tenantId })
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Synced ${data.syncedCount} master catalog medicines into ${tenantId}`);
      } else {
        setSyncResult('Sync error: ' + (data.error || 'Failed'));
      }
    } catch (err: any) {
      setSyncResult('Sync failed: ' + err?.message);
    } finally {
      setSyncingTenantId(null);
    }
  };

  // Execute Remote Account Wipe / Suspend / Delete
  const handleExecuteWipe = async () => {
    if (!wipeModalTenant) return;
    setWiping(true);
    try {
      const res = await fetch('/api/master/tenants/delete-wipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-pin': '884422'
        },
        body: JSON.stringify({
          target_tenant_id: wipeModalTenant.tenant_id,
          action: wipeAction
        })
      });
      const data = await res.json();
      if (data.success) {
        setWipeModalTenant(null);
        loadTenants();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWiping(false);
    }
  };

  const filtered = tenants.filter(t => {
    const matchQ = 
      (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
      (t.owner_name && t.owner_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.city && t.city.toLowerCase().includes(search.toLowerCase())) ||
      (t.tenant_id && t.tenant_id.toLowerCase().includes(search.toLowerCase())) ||
      (t.owner_phone && t.owner_phone.includes(search));
    const matchP = selectedPlan === 'ALL' || t.plan === selectedPlan;
    return matchQ && matchP;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Vyapar Multi-Company Fleet ({tenants.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Independent company databases, multi-firm branches & isolated ledgers in MariaDB <code className="text-blue-600 font-mono">mbi_tenants</code>
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadTenants}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Refresh Fleet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Company</span>
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{syncResult}</span>
          </div>
          <button type="button" onClick={() => setSyncResult(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name, owner, city, phone, tenant ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <select
            value={selectedPlan}
            onChange={e => setSelectedPlan(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
          >
            <option value="ALL">All Plans</option>
            <option value="Basic">Basic Plan</option>
            <option value="Business">Business Plan</option>
            <option value="Enterprise">Enterprise Plan</option>
          </select>
        </div>
      </div>

      {/* Grid of Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div 
            key={t.tenant_id || t.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500/50 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{t.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{t.city || 'Pakistan'}</span>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                  t.plan === 'Enterprise'
                    ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                    : t.plan === 'Business'
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                }`}>
                  {t.plan || 'Standard'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tenant ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{t.tenant_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{t.owner_name || 'Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{t.owner_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                  <span className="text-slate-400">Branches (Firms):</span>
                  <span className="font-semibold text-blue-600">Main + 1 Branch</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={syncingTenantId === t.tenant_id}
                  onClick={() => handleSyncGlobalMedicines(t.tenant_id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Push Master Medicine Catalog"
                >
                  <Database className={`w-3.5 h-3.5 ${syncingTenantId === t.tenant_id ? 'animate-spin' : ''}`} />
                  <span>{syncingTenantId === t.tenant_id ? 'Pushing...' : 'Push Meds'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onImpersonate(t.tenant_id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-[11px] font-bold cursor-pointer transition-colors border border-purple-200/50 dark:border-purple-800/40"
                  title="Launch Stealth Impersonation"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Stealth</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWipeModalTenant(t)}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  title="Remote Account Wipe / Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Provision Company */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Provision New Pharmacy Company</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Company / Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Shafi Pharmacy Group"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Asif"
                    value={formData.owner_name}
                    onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Owner Phone</label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={formData.owner_phone}
                    onChange={e => setFormData({ ...formData, owner_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Lahore / Karachi / Multan"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">SaaS Plan</label>
                  <select
                    value={formData.plan}
                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Business">Business Plan</option>
                    <option value="Enterprise">Enterprise Plan (Multi-Branch)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500"
                >
                  {saving ? 'Saving...' : 'Provision Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Remote Wipe & Delete */}
      {wipeModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold">Emergency Remote Account Wipe / Delete</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Target Company: <strong className="text-slate-900 dark:text-white">{wipeModalTenant.name}</strong> (<code className="font-mono">{wipeModalTenant.tenant_id}</code>)
              </p>
              
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                  <input
                    type="radio"
                    name="wipeAction"
                    value="suspend"
                    checked={wipeAction === 'suspend'}
                    onChange={() => setWipeAction('suspend')}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">1. Remote Lock & Suspend</div>
                    <div className="text-[11px] text-slate-400">Activates kill switch for all staff accounts</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                  <input
                    type="radio"
                    name="wipeAction"
                    value="wipe_data"
                    checked={wipeAction === 'wipe_data'}
                    onChange={() => setWipeAction('wipe_data')}
                    className="text-amber-600"
                  />
                  <div>
                    <div className="font-bold text-amber-600 dark:text-amber-400">2. Wipe Transactions & Ledgers</div>
                    <div className="text-[11px] text-slate-400">Deletes bills, ledgers, and batches (keeps store profile)</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 cursor-pointer">
                  <input
                    type="radio"
                    name="wipeAction"
                    value="delete_permanent"
                    checked={wipeAction === 'delete_permanent'}
                    onChange={() => setWipeAction('delete_permanent')}
                    className="text-rose-600"
                  />
                  <div>
                    <div className="font-bold text-rose-600 dark:text-rose-400">3. Complete Permanent Deletion</div>
                    <div className="text-[11px] text-rose-500">Purges company and all data from mbi72dn database</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setWipeModalTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wiping}
                onClick={handleExecuteWipe}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                {wiping ? 'Executing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
