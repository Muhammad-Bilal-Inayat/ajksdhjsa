import React, { useState, useEffect } from 'react';
import { 
  Key, ShieldCheck, Plus, RefreshCw, Copy, 
  Check, Clock, Monitor, Building2, Search 
} from 'lucide-react';

interface LicenseItem {
  id: string;
  tenant_id: string;
  license_key: string;
  plan: string;
  status: string;
  max_terminals: number;
  bound_hwid?: string;
  expires_at: string;
  tenant_name?: string;
  city?: string;
  owner_phone?: string;
}

export function LicenseVaultModule() {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    tenantId: '',
    plan: 'Business',
    validityDays: '365',
    maxTerminals: '5',
    boundHwid: ''
  });

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/licenses', {
        headers: { 'x-master-pin': '884422' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.licenses)) {
        setLicenses(data.licenses);
      }
    } catch (e) {
      console.warn('License fetch notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  const handleCopy = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/master/licenses/generate', {
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
          tenantId: '',
          plan: 'Business',
          validityDays: '365',
          maxTerminals: '5',
          boundHwid: ''
        });
        loadLicenses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const filtered = licenses.filter(l => 
    (l.license_key && l.license_key.toLowerCase().includes(search.toLowerCase())) ||
    (l.tenant_name && l.tenant_name.toLowerCase().includes(search.toLowerCase())) ||
    (l.tenant_id && l.tenant_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <span>Master License Vault ({licenses.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic serial keys, hardware HWID bindings & expiration records in <code className="text-amber-500 font-mono">mbi_licenses</code>
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadLicenses}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Refresh Licenses"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Serial Key</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by license key, store name, tenant ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* License List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">License Serial</th>
                <th className="py-3 px-4">Store / Tenant</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Terminals</th>
                <th className="py-3 px-4">HWID Binding</th>
                <th className="py-3 px-4">Expiration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                    <div className="flex items-center gap-1.5">
                      <span>{l.license_key}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(l.license_key)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        title="Copy Key"
                      >
                        {copiedKey === l.license_key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{l.tenant_name || l.tenant_id}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{l.tenant_id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      {l.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Monitor className="w-3.5 h-3.5 text-slate-400" />
                      <span>{l.max_terminals || 5} PCs</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {l.bound_hwid || 'Unbound (Floating)'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'Lifetime'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopy(l.license_key)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedKey === l.license_key ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Generate License */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Issue Cryptographic Serial Key</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Target Tenant ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. tenant-demo-01 or tenant_03001234567"
                  value={formData.tenantId}
                  onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Business">Business Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={formData.validityDays}
                    onChange={e => setFormData({ ...formData, validityDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Max Terminal Nodes</label>
                <input
                  type="number"
                  value={formData.maxTerminals}
                  onChange={e => setFormData({ ...formData, maxTerminals: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium"
                />
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
                  disabled={generating}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500"
                >
                  {generating ? 'Generating...' : 'Issue Serial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
