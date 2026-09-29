import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldAlert, ShieldCheck, Lock, 
  Key, RefreshCw, Search, Eye, EyeOff, 
  AlertTriangle, Power, UserCheck, Building2,
  Phone, Laptop, Zap, CheckCircle2, VolumeX, Volume2
} from 'lucide-react';
import { handleSilentSwitchUser } from '../../services/adminService';

interface AppUserItem {
  id: string;
  tenant_id: string;
  tenantId?: string;
  name: string;
  username: string;
  email_or_phone: string;
  emailOrPhone?: string;
  passcode: string;
  role: string;
  status: string;
  is_kill_switch_active: number | boolean;
  is_online?: number | boolean;
  is_silent_monitored?: number | boolean;
  last_login_at?: string;
  tenant_name?: string;
  storeName?: string;
  city?: string;
}

export const UnifiedUserGovernancePanel: React.FC = () => {
  const [users, setUsers] = useState<AppUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fleet/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          setUsers(data.users);
          return;
        }
      }
      // Fallback
      const masterRes = await fetch('/api/master/users', {
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const masterData = await masterRes.json();
      if (masterData.success && Array.isArray(masterData.users)) {
        setUsers(masterData.users);
      }
    } catch (e) {
      console.warn('User fetch notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleKillSwitch = async (user: AppUserItem) => {
    const currentState = !!user.is_kill_switch_active;
    const newState = !currentState;
    setUpdatingId(user.id);
    try {
      const res = await fetch('/api/master/users/kill-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-pin': 'Ami7788!@'
        },
        body: JSON.stringify({
          userId: user.id,
          isKillSwitchActive: newState
        })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_kill_switch_active: newState ? 1 : 0 } : u));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleShowPasscode = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = users.filter(u => {
    const term = search.toLowerCase();
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(term)) ||
      ((u.email_or_phone || u.emailOrPhone) && (u.email_or_phone || u.emailOrPhone || '').toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      ((u.tenant_name || u.storeName) && (u.tenant_name || u.storeName || '').toLowerCase().includes(term));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const isKilled = !!u.is_kill_switch_active;
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && !isKilled) ||
      (statusFilter === 'killed' && isKilled);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Unified Server User Control Switchboard
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {users.length} Users Total
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instant 1-Click Silent Shadow Switch • Profile Inspection • Emergency Kill Switch • Cloud Governance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadUsers}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user, store, phone or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Roles</option>
            <option value="Primary Admin">Primary Admin</option>
            <option value="Store Manager">Store Manager</option>
            <option value="Cashier">Cashier</option>
            <option value="Pharmacist">Pharmacist</option>
            <option value="Accountant">Accountant</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="killed">Killed / Locked</option>
          </select>
        </div>
      </div>

      {/* Unified Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">USER &amp; STORE DETAILS</th>
                <th className="px-4 py-3.5">ROLE &amp; TERMINAL</th>
                <th className="px-4 py-3.5">CONTACT / PASSCODE</th>
                <th className="px-4 py-3.5">STATUS</th>
                <th className="px-4 py-3.5 text-right">UNIFIED CONTROLS (ALL-IN-ONE)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading unified user switchboard...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isKilled = !!user.is_kill_switch_active;
                  const store = user.tenant_name || user.storeName || 'Pharmacy Store';
                  const contact = user.email_or_phone || user.emailOrPhone || '—';

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isKilled ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* User & Store Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isKilled 
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                          }`}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[160px]">{store}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Terminal */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {user.role}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-slate-400" />
                          <span>ID: {user.id.slice(-6)}</span>
                        </div>
                      </td>

                      {/* Contact / Passcode */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{contact}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-500" />
                          <span>
                            {visiblePasswords[user.id] ? (
                              <strong className="text-slate-900 dark:text-white font-bold">{user.passcode || '****'}</strong>
                            ) : (
                              '••••'
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPasscode(user.id)}
                            className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                          >
                            {visiblePasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isKilled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 w-fit">
                            <Power className="w-3 h-3 text-rose-600" />
                            KILLED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* UNIFIED CONTROLS (ALL-IN-ONE) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1-Click Silent Shadow Switch Button */}
                          <button
                            type="button"
                            onClick={() => handleSilentSwitchUser(user)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                            title="Open User Workspace in New Tab Silently (Shadow Mode)"
                          >
                            ⚡ Silent Switch
                          </button>

                          {/* Kill Switch Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleKillSwitch(user)}
                            disabled={updatingId === user.id}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              isKilled
                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80'
                            }`}
                            title={isKilled ? 'Restore user account' : 'Lockout / Terminate user account'}
                          >
                            <Power className="w-3 h-3" />
                            <span>{isKilled ? 'Restore' : 'Kill Switch'}</span>
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
    </div>
  );
};
