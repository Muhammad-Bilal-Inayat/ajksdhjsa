import React, { useState, useEffect } from 'react';
import { 
  Eye, ExternalLink, ShieldCheck, RefreshCw, 
  Search, AlertCircle, Building2, GitBranch, Lock, 
  Sparkles, CheckCircle2, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StealthStore {
  tenant_id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  city: string;
  plan: string;
  firms?: Array<{ firmId: string; firmName: string; city: string }>;
}

export function StealthShadowModule() {
  const [stores, setStores] = useState<StealthStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFirmMap, setSelectedFirmMap] = useState<Record<string, string>>({});
  const [impersonatingTenantId, setImpersonatingTenantId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fleet/tenants', {
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tenants)) {
        // Mock / populate firms if not explicitly stored
        const mapped = data.tenants.map((t: any) => ({
          ...t,
          firms: [
            { firmId: 'firm_main', firmName: `${t.name} - Main Branch`, city: t.city || 'Lahore' },
            { firmId: 'firm_branch_2', firmName: `${t.name} - Express Counter`, city: t.city || 'Lahore' }
          ]
        }));
        setStores(mapped);
      }
    } catch (e) {
      console.warn('Stealth fetch notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleLaunchShadow = async (tenantId: string) => {
    setImpersonatingTenantId(tenantId);
    const targetFirm = selectedFirmMap[tenantId] || 'firm_main';

    try {
      const res = await fetch('/api/master/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-pin': 'Ami7788!@'
        },
        body: JSON.stringify({ 
          target_tenant_id: tenantId,
          target_firm_id: targetFirm
        })
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        // Save shadow session to localStorage
        localStorage.setItem('mock_session', JSON.stringify(data.user));
        localStorage.setItem('mbi_jwt_token', data.token);
        localStorage.setItem('mbi_active_tenant_id', tenantId);
        localStorage.setItem('mbi_active_firm_id', targetFirm);
        localStorage.setItem('mbi_is_shadow_mode', 'true');
        localStorage.setItem('mbi_shadow_target_name', data.tenant?.name || 'Client Pharmacy');

        // Redirect directly to client workspace
        navigate('/user', { replace: true });
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImpersonatingTenantId(null);
    }
  };

  const filtered = stores.filter(s => 
    (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
    (s.owner_name && s.owner_name.toLowerCase().includes(search.toLowerCase())) ||
    (s.city && s.city.toLowerCase().includes(search.toLowerCase())) ||
    (s.tenant_id && s.tenant_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Stealth Shadow Mode (Silent Impersonation & Remote Tech Assist)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log in to any client company workspace without modifying their credentials or alerting the store
          </p>
        </div>

        <button
          type="button"
          onClick={loadStores}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
          title="Refresh Companies"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Engineering Protocol Banner */}
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
        <div>
          <div className="font-bold text-sm">Vyapar Multi-Company Isolation Active</div>
          <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
            All shadow queries are scoped strictly to the selected <code className="font-mono font-bold">tenant_id</code>. The client workspace will display a fixed top engineering return bar to return instantly to Master Command Hub.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by company name, owner, city, tenant ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Grid of Stores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const activeFirm = selectedFirmMap[s.tenant_id] || 'firm_main';

          return (
            <div
              key={s.tenant_id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{s.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">tenant_id: {s.tenant_id}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    {s.plan || 'Standard'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>Owner: <span className="text-slate-700 dark:text-slate-300 font-semibold">{s.owner_name || 'Admin'}</span></div>
                  <div>City: <span className="text-slate-700 dark:text-slate-300">{s.city || 'Pakistan'}</span></div>
                </div>

                {/* Multi-Firm Branch Selector */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-purple-500" />
                    <span>Target Branch / Firm</span>
                  </label>
                  <select
                    value={activeFirm}
                    onChange={e => setSelectedFirmMap({ ...selectedFirmMap, [s.tenant_id]: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
                  >
                    <option value="firm_main">Main Branch (Central Store)</option>
                    <option value="firm_branch_2">Branch 2 (Express Counter)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={impersonatingTenantId === s.tenant_id}
                onClick={() => handleLaunchShadow(s.tenant_id)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Eye className={`w-3.5 h-3.5 ${impersonatingTenantId === s.tenant_id ? 'animate-spin' : ''}`} />
                <span>{impersonatingTenantId === s.tenant_id ? 'Authorizing...' : 'Launch Silent Shadow Mode'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
