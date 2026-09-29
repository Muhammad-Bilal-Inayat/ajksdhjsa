import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Ban, 
  RefreshCw, 
  Copy, 
  Share2, 
  Zap, 
  ShieldAlert,
  Search,
  Building,
  Smartphone,
  Check,
  Calendar,
  Sparkles,
  ShieldCheck,
  Laptop,
  Users,
  Layers,
  X
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

export const UltimateLicenseManager: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // New License Form State
  const [newKey, setNewKey] = useState({
    pharmacyName: '',
    ownerName: '',
    ownerContact: '',
    tier: 'Gold Business',
    durationYears: '1',
    maxUsers: 5,
    maxBranches: 5,
    maxTerminals: 5
  });

  const fetchLicenses = async () => {
    try {
      const res = await fetch('/api/admin/licenses');
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
      }
    } catch (e) {
      console.error('Failed to load licenses:', e);
    }
  };

  useEffect(() => {
    fetchLicenses();
    const timer = setInterval(fetchLicenses, 20000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (action: string, licenseKey: string, payload: any = {}) => {
    setActionInProgress(licenseKey + action);
    try {
      const res = await fetch('/api/admin/licenses/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, licenseKey, ...payload })
      });
      const data = await res.json();
      if (data.success) {
        emitToast(data.message || 'Action executed successfully', 'success');
        fetchLicenses();
      } else {
        emitToast(data.error || 'Action failed', 'error');
      }
    } catch (e) {
      emitToast('Network error while performing master action', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.pharmacyName.trim()) {
      emitToast('Pharmacy Name is required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/licenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      });
      const data = await res.json();
      if (data.success) {
        emitToast(`License generated! Key: ${data.licenseKey}`, 'success');
        setIsCreateModalOpen(false);
        setNewKey({
          pharmacyName: '',
          ownerName: '',
          ownerContact: '',
          tier: 'Gold Business',
          durationYears: '1',
          maxUsers: 5,
          maxBranches: 5,
          maxTerminals: 5
        });
        fetchLicenses();
      } else {
        emitToast(data.error || 'Failed to generate license', 'error');
      }
    } catch (e) {
      emitToast('Network error generating license', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = licenses.filter(l => 
    (l.pharmacy_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.license_key || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.owner_contact || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.owner_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = licenses.length;
  const activeCount = licenses.filter(l => l.status === 'active' || l.status === 'Active').length;
  const suspendedCount = licenses.filter(l => l.status === 'suspended' || l.status === 'Suspended').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>Ultimate License & Multi-Tenant HQ</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                Auto-Sync Active
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Centralized license keys, quota allocations, HWID device bindings & remote suspension controls.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New License</span>
        </button>
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>TOTAL LICENSES</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-blue-500">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across all registered pharmacies</div>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>ACTIVE & RUNNING</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-500">{activeCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">100% operational POS nodes</div>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>SUSPENDED / FROZEN</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-rose-500">{suspendedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Overdue / Remote locked</div>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>TOTAL HWID TERMINALS</span>
            <Laptop className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-indigo-500">
            {licenses.reduce((sum, l) => sum + (Number(l.max_terminals) || 5), 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Allocated device counters</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Pharmacy Name, Key, Phone, or Owner..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' 
                : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 shadow-sm'
            }`}
          />
        </div>
        <div className="text-xs font-semibold text-slate-400">
          Showing <strong>{filtered.length}</strong> of <strong>{totalCount}</strong> licenses
        </div>
      </div>

      {/* Licenses Table */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-black uppercase tracking-wider ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="p-4">Pharmacy & Owner</th>
                <th className="p-4">License Key</th>
                <th className="p-4">Plan & Quotas</th>
                <th className="p-4">Status & Expiry</th>
                <th className="p-4 text-right">Master Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No matching licenses found.
                  </td>
                </tr>
              ) : (
                filtered.map((lic) => {
                  const isSuspended = lic.status === 'suspended' || lic.status === 'Suspended' || lic.status === 'Locked';
                  const keyStr = lic.license_key || lic.licenseKey || 'MBI-KEY-EMPTY';
                  const isBusy = actionInProgress?.startsWith(keyStr);

                  return (
                    <tr key={lic.id || keyStr} className="hover:bg-blue-500/5 transition-colors">
                      {/* Pharmacy Info */}
                      <td className="p-4">
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{lic.pharmacy_name || lic.client_name || 'Registered Pharmacy'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Owner: <span className="font-medium text-slate-300">{lic.owner_name || 'Store Owner'}</span> • {lic.owner_contact || 'No contact'}
                        </div>
                      </td>

                      {/* License Key with Copy */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 select-all">
                            {keyStr}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(keyStr);
                              emitToast('License Key copied to clipboard', 'success');
                            }}
                            title="Copy License Key"
                            className="p-1 hover:text-white text-slate-400 hover:bg-slate-700/50 rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Plan Quotas */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lic.plan_tier || lic.plan || 'Gold Business'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {lic.max_users || 5} Users • {lic.max_branches || 5} Branches • <strong className="text-blue-400">{lic.max_terminals || 5} Terminals</strong>
                        </div>
                      </td>

                      {/* Status & Expiry */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className={`font-bold capitalize ${isSuspended ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {lic.status || 'Active'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Expires: <span className="font-mono">{lic.expiry_date ? String(lic.expiry_date).substring(0, 10) : 'Lifetime'}</span>
                        </div>
                      </td>

                      {/* Master Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Extend +30 Days */}
                          <button
                            disabled={isBusy}
                            onClick={() => handleAction('extend_days', keyStr, { days: 30 })}
                            title="Extend Validity +30 Days"
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            +30d
                          </button>

                          {/* Extend +1 Year */}
                          <button
                            disabled={isBusy}
                            onClick={() => handleAction('extend_days', keyStr, { days: 365 })}
                            title="Extend Validity +1 Year (365 Days)"
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            +1 Year
                          </button>

                          {/* Grant +1 Terminal Slot */}
                          <button
                            disabled={isBusy}
                            onClick={() => handleAction('grant_terminal_slot', keyStr)}
                            title="Add Emergency Terminal Counter Slot"
                            className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Zap className="w-3 h-3" />
                            <span>+1 Slot</span>
                          </button>

                          {/* Reset Fingerprint */}
                          <button
                            disabled={isBusy}
                            onClick={() => handleAction('reset_fingerprint', keyStr)}
                            title="Reset Hardware HWID Fingerprint for Laptop Replacement"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke / Suspend */}
                          <button
                            disabled={isBusy}
                            onClick={() => handleAction(isSuspended ? 'reactivate' : 'suspend', keyStr)}
                            title={isSuspended ? 'Reactivate License' : 'Suspend / Freeze License'}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isSuspended 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate New License Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Generate Master License</h3>
                <p className="text-xs text-slate-400">Instantly provision key and quotas for pharmacy</p>
              </div>
            </div>

            <form onSubmit={handleCreateLicense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Pharmacy / Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Shifa Pharmacy"
                  value={newKey.pharmacyName}
                  onChange={(e) => setNewKey({ ...newKey, pharmacyName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Kashif"
                    value={newKey.ownerName}
                    onChange={(e) => setNewKey({ ...newKey, ownerName: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Owner Contact / Phone</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={newKey.ownerContact}
                    onChange={(e) => setNewKey({ ...newKey, ownerContact: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Subscription Tier</label>
                  <select
                    value={newKey.tier}
                    onChange={(e) => setNewKey({ ...newKey, tier: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Bronze Standard">Bronze Standard</option>
                    <option value="Silver Professional">Silver Professional</option>
                    <option value="Gold Business">Gold Business</option>
                    <option value="Diamond Enterprise">Diamond Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Duration</label>
                  <select
                    value={newKey.durationYears}
                    onChange={(e) => setNewKey({ ...newKey, durationYears: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="0.08">1 Month (30 Days)</option>
                    <option value="1">1 Year</option>
                    <option value="3">3 Years</option>
                    <option value="5">5 Years</option>
                    <option value="99">Lifetime License</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Max Users</label>
                  <input
                    type="number"
                    min="1"
                    value={newKey.maxUsers}
                    onChange={(e) => setNewKey({ ...newKey, maxUsers: Number(e.target.value) })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Max Branches</label>
                  <input
                    type="number"
                    min="1"
                    value={newKey.maxBranches}
                    onChange={(e) => setNewKey({ ...newKey, maxBranches: Number(e.target.value) })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Max Terminals</label>
                  <input
                    type="number"
                    min="1"
                    value={newKey.maxTerminals}
                    onChange={(e) => setNewKey({ ...newKey, maxTerminals: Number(e.target.value) })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  {loading ? 'Generating...' : 'Generate & Issue Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
