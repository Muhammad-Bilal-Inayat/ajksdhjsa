import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldAlert, ShieldCheck, Lock, 
  Key, RefreshCw, Search, Eye, EyeOff, 
  AlertTriangle, Power, UserCheck 
} from 'lucide-react';

interface AppUserItem {
  id: string;
  tenant_id: string;
  name: string;
  username: string;
  email_or_phone: string;
  passcode: string;
  role: string;
  status: string;
  is_kill_switch_active: number | boolean;
  is_online?: number | boolean;
  last_login_at?: string;
  tenant_name?: string;
  city?: string;
}

export function UserGovernanceModule() {
  const [users, setUsers] = useState<AppUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/users', {
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
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

  const filtered = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.email_or_phone && u.email_or_phone.toLowerCase().includes(search.toLowerCase())) ||
    (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
    (u.tenant_name && u.tenant_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Master User Governance & Kill Switch ({users.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Staff accounts across all tenant stores in MariaDB <code className="text-indigo-600 font-mono">mbi_users</code>
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
          title="Refresh Users"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, mobile, store..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Assigned Store</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Passcode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Remote Kill Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filtered.map((u) => {
                const isKilled = u.is_kill_switch_active === 1 || u.is_kill_switch_active === true;
                const isUpdating = updatingId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.is_online ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online Now" />
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email_or_phone || u.username}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{u.tenant_name || u.tenant_id}</div>
                      <div className="text-[10px] text-slate-400">{u.city || 'Pakistan'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {u.role || 'Staff'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span>{visiblePasswords[u.id] ? u.passcode || '0000' : '••••'}</span>
                        <button
                          type="button"
                          onClick={() => toggleShowPasscode(u.id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          {visiblePasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isKilled ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 border border-rose-500/30">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => toggleKillSwitch(u)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isKilled
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={isKilled ? 'Deactivate Kill Switch (Unlock)' : 'Activate Kill Switch (Lock User Out)'}
                      >
                        <Power className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                        <span>{isKilled ? 'KILL SWITCH ON' : 'Lock User'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
