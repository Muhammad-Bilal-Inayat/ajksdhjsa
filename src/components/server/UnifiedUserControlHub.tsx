import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  Edit,
  Key,
  Power,
  RefreshCw,
  Plus,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Radio,
  VolumeX,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Clock,
  Laptop,
  Check,
  X,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Database,
  Smartphone
} from 'lucide-react';
import {
  MasterActiveUser,
  getMasterActiveUsers,
  saveMasterActiveUser,
  resetMasterUserPasscode,
  updateMasterUserStatus,
  updateMasterUserCredentials,
  DEFAULT_MODULES,
  DEFAULT_USER_PERMISSIONS,
  logMasterAudit,
  getAllTenants
} from '../../lib/masterServerService';
import { handleSilentSwitchUser } from '../../services/adminService';

interface UnifiedUserControlHubProps {
  onNotify: (msg: string) => void;
  externalSearchQuery?: string;
}

export const UnifiedUserControlHub: React.FC<UnifiedUserControlHubProps> = ({
  onNotify,
  externalSearchQuery = ''
}) => {
  const [users, setUsers] = useState<MasterActiveUser[]>(() => getMasterActiveUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'silent' | 'killed' | 'online'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Modal States
  const [viewUser, setViewUser] = useState<MasterActiveUser | null>(null);
  const [editUser, setEditUser] = useState<MasterActiveUser | null>(null);
  const [changePassUser, setChangePassUser] = useState<MasterActiveUser | null>(null);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);

  // Distinct Companies & User Counts breakdown
  const companyStats = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach(u => {
      const store = u.storeName || 'MBI INVENTRA Headquarters';
      counts.set(store, (counts.get(store) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [users]);

  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    username: '',
    emailOrPhone: '',
    passcode: '1234',
    role: 'Cashier' as MasterActiveUser['role'],
    storeName: 'MBI INVENTRA Main Pharmacy'
  });

  const tenants = useMemo(() => getAllTenants(), []);

  // Sync users with backend server API & listen to events
  const refreshUsersList = async () => {
    try {
      const res = await fetch('/api/fleet/users', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users) && json.users.length > 0) {
          const localList = getMasterActiveUsers();
          const map = new Map<string, MasterActiveUser>();
          localList.forEach(u => map.set(u.id, u));
          
          json.users.forEach((ru: any) => {
            if (ru && ru.id) {
              const ex = map.get(ru.id);
              map.set(ru.id, {
                ...ex,
                ...ru,
                status: ru.isKillSwitchActive ? 'Suspended' : (ru.status || 'Active'),
                isSilentMonitored: Boolean(ru.isSilentMonitored),
                isKillSwitchActive: Boolean(ru.isKillSwitchActive)
              });
            }
          });
          const merged = Array.from(map.values());
          setUsers(merged);
          return;
        }
      }
    } catch (e) {}
    setUsers(getMasterActiveUsers());
  };

  useEffect(() => {
    refreshUsersList();

    const handleUpdate = () => refreshUsersList();
    window.addEventListener('mbi-users-updated', handleUpdate);
    window.addEventListener('mbi-master-users-wiped', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const interval = setInterval(refreshUsersList, 6000);
    return () => {
      window.removeEventListener('mbi-users-updated', handleUpdate);
      window.removeEventListener('mbi-master-users-wiped', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Helper to get owner name for any user based on their company
  const getOwnerForUser = (user: MasterActiveUser) => {
    const targetTenant = tenants.find(t => t.id === user.tenantId || t.tenantId === user.tenantId || t.name === user.storeName);
    return targetTenant?.ownerName || targetTenant?.primaryAdminName || 'M Bilal Inayat';
  };

  // Effective search combines internal and external search bar
  const activeSearch = (externalSearchQuery || searchQuery).trim().toLowerCase();

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Company / Store filter
      if (companyFilter !== 'all' && (user.storeName || 'MBI INVENTRA Headquarters') !== companyFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === 'active' && (user.isKillSwitchActive || user.status === 'Suspended')) return false;
      if (statusFilter === 'silent' && !user.isSilentMonitored) return false;
      if (statusFilter === 'killed' && !user.isKillSwitchActive && user.status !== 'Suspended') return false;
      if (statusFilter === 'online' && !user.isOnline) return false;

      // Search match (Name, Contact, Role, Store, Owner, ID)
      if (activeSearch) {
        const matchesName = (user.name || '').toLowerCase().includes(activeSearch);
        const matchesContact = (user.emailOrPhone || '').toLowerCase().includes(activeSearch);
        const matchesRole = (user.role || '').toLowerCase().includes(activeSearch);
        const matchesStore = (user.storeName || '').toLowerCase().includes(activeSearch);
        const matchesOwner = getOwnerForUser(user).toLowerCase().includes(activeSearch);
        const matchesId = (user.id || '').toLowerCase().includes(activeSearch);
        if (!matchesName && !matchesContact && !matchesRole && !matchesStore && !matchesOwner && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [users, companyFilter, roleFilter, statusFilter, activeSearch, tenants]);

  // ACTION 1: SILENT SWITCH TOGGLE (Stealth Monitoring Mode)
  const handleToggleSilentSwitch = async (user: MasterActiveUser) => {
    const nextSilentState = !user.isSilentMonitored;
    const updatedUser: MasterActiveUser = {
      ...user,
      isSilentMonitored: nextSilentState,
      updatedAt: new Date().toISOString()
    };

    saveMasterActiveUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

    // Post to Server API
    fetch('/api/fleet/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        action: 'SILENT_SWITCH_TOGGLE',
        updates: { isSilentMonitored: nextSilentState }
      })
    }).catch(() => {});

    logMasterAudit(
      nextSilentState ? 'Silent Monitoring Engaged' : 'Silent Monitoring Disengaged',
      'SECURITY',
      `Silent monitoring ${nextSilentState ? 'ACTIVATED' : 'DEACTIVATED'} for ${user.name} (${user.role})`,
      user.storeName
    );

    onNotify(nextSilentState 
      ? `🔕 Silent Monitoring Activated: ${user.name}'s actions will be stealth audited without terminal UI notifications.`
      : `🔔 Silent Monitoring Deactivated: ${user.name} returned to standard alert mode.`
    );
  };

  // ACTION 2: KILL SWITCH TOGGLE (Emergency Terminal Lock / Suspension)
  const handleToggleKillSwitch = async (user: MasterActiveUser) => {
    const nextKillState = !user.isKillSwitchActive;
    const nextStatus = nextKillState ? 'Suspended' : 'Active';

    const updatedUser: MasterActiveUser = {
      ...user,
      isKillSwitchActive: nextKillState,
      status: nextStatus,
      isOnline: nextKillState ? false : user.isOnline,
      updatedAt: new Date().toISOString()
    };

    saveMasterActiveUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

    // Post to Server API
    fetch('/api/fleet/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        action: 'KILL_SWITCH_TOGGLE',
        updates: { 
          isKillSwitchActive: nextKillState,
          status: nextStatus
        }
      })
    }).catch(() => {});

    logMasterAudit(
      nextKillState ? 'Emergency User Kill Switch Activated' : 'User Kill Switch Released',
      'SECURITY',
      `Kill switch ${nextKillState ? 'SUSPENDED/LOCKED' : 'UNLOCKED'} user account ${user.name} (${user.role})`,
      user.storeName
    );

    onNotify(nextKillState 
      ? `🛑 KILL SWITCH EXECUTED: ${user.name}'s account is locked out and suspended immediately.`
      : `✅ Account Unlocked: ${user.name}'s account access has been restored.`
    );
  };

  // ACTION 3: CHANGE PASSWORD / PIN
  const handleSavePassword = async () => {
    if (!changePassUser) return;
    if (!newPasscode.trim()) {
      onNotify('⚠️ Please enter a valid new password or PIN.');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      onNotify('⚠️ New password and confirmation do not match.');
      return;
    }

    const res = resetMasterUserPasscode(changePassUser.id, newPasscode.trim());
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === changePassUser.id ? { ...u, passcode: newPasscode.trim() } : u));
      
      // Post to central server API & MariaDB
      fetch('/api/fleet/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: changePassUser.id,
          action: 'PASSWORD_CHANGE',
          updates: { passcode: newPasscode.trim() }
        })
      }).catch(() => {});

      onNotify(`🔑 Password for ${changePassUser.name} changed successfully!`);
      setChangePassUser(null);
      setNewPasscode('');
      setConfirmPasscode('');
    } else {
      onNotify('Failed to update password.');
    }
  };

  // ACTION 4: EDIT USER CREDENTIALS
  const handleSaveEditUser = () => {
    if (!editUser) return;
    
    updateMasterUserCredentials(editUser.id, {
      name: editUser.name,
      emailOrPhone: editUser.emailOrPhone,
      role: editUser.role,
      storeName: editUser.storeName,
      passcode: editUser.passcode
    });

    saveMasterActiveUser(editUser);
    setUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));

    // Post to Server API
    fetch('/api/fleet/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editUser.id,
        action: 'USER_EDIT',
        updates: {
          name: editUser.name,
          emailOrPhone: editUser.emailOrPhone,
          role: editUser.role,
          storeName: editUser.storeName,
          passcode: editUser.passcode
        }
      })
    }).catch(() => {});

    onNotify(`✨ User details for ${editUser.name} saved successfully.`);
    setEditUser(null);
  };

  // ACTION 5: FORCE SYNC TERMINAL
  const handleForceSyncUser = async (user: MasterActiveUser) => {
    setSyncingUserId(user.id);
    
    try {
      // Trigger background sync
      await fetch('/api/sync/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'appUsers',
          record: {
            ...user,
            lastSyncTime: new Date().toISOString()
          }
        })
      });

      // Update local user sync time
      const updatedUser: MasterActiveUser = {
        ...user,
        lastSyncTime: new Date().toISOString()
      };
      saveMasterActiveUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

      onNotify(`🔄 Terminal synchronization for ${user.name} completed successfully.`);
    } catch (e) {
      onNotify(`Notice: Offline sync cached for ${user.name}.`);
    } finally {
      setTimeout(() => setSyncingUserId(null), 800);
    }
  };

  // ACTION 6: ADD NEW USER
  const handleAddNewUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.emailOrPhone.trim()) {
      onNotify('⚠️ Name and Email/Phone are required.');
      return;
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const createdUser: MasterActiveUser = {
      id: newId,
      name: newUserForm.name.trim(),
      emailOrPhone: newUserForm.emailOrPhone.trim(),
      role: newUserForm.role,
      status: 'Active',
      passcode: newUserForm.passcode.trim() || '1234',
      storeName: newUserForm.storeName.trim() || 'Main Store',
      lastSyncTime: nowIso,
      isOnline: true,
      totalTransactions: 0,
      isSilentMonitored: false,
      isKillSwitchActive: false,
      allowedModules: { ...DEFAULT_MODULES },
      permissions: { ...DEFAULT_USER_PERMISSIONS },
      createdAt: nowIso,
      updatedAt: nowIso
    };

    saveMasterActiveUser(createdUser);
    setUsers(prev => [createdUser, ...prev]);

    // Post to Server API & MariaDB
    fetch('/api/fleet/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: createdUser.id,
        action: 'CREATE_USER',
        updates: createdUser
      })
    }).catch(() => {});

    onNotify(`✅ User ${createdUser.name} (${createdUser.role}) successfully created.`);
    setShowAddUserModal(false);
    setNewUserForm({
      name: '',
      username: '',
      emailOrPhone: '',
      passcode: '1234',
      role: 'Cashier',
      storeName: 'MBI INVENTRA Main Pharmacy'
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION: TITLE, STATS & ADD USER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Unified Server User Control Switchboard
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {users.length} Users Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized User Management: View Profile • Silent Switch • Edit • Change Password • Kill Switch • Instant Cloud Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => refreshUsersList()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh User Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff User</span>
            </button>
          </div>
        </div>

        {/* QUICK FILTER BAR */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Internal Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user by name, phone, email, store, or role..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({users.length})
            </button>

            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                statusFilter === 'online'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Online Now
            </button>

            <button
              onClick={() => setStatusFilter('silent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                statusFilter === 'silent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              Silent Monitored ({users.filter(u => u.isSilentMonitored).length})
            </button>

            <button
              onClick={() => setStatusFilter('killed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                statusFilter === 'killed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              Killed / Suspended ({users.filter(u => u.isKillSwitchActive || u.status === 'Suspended').length})
            </button>

            {/* Company / Pharmacy Filter Dropdown */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 focus:outline-none cursor-pointer"
            >
              <option value="all">🏢 All Companies ({users.length} Users)</option>
              {companyStats.map(c => (
                <option key={c.name} value={c.name}>
                  🏢 {c.name} ({c.count} {c.count === 1 ? 'User' : 'Users'})
                </option>
              ))}
            </select>

            {/* Role dropdown filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="Primary Admin">Primary Admin</option>
              <option value="Store Manager">Store Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Accountant">Accountant</option>
            </select>
          </div>
        </div>
      </div>

      {/* UNIFIED USERS TABLE & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">User &amp; Company Attribution</th>
                <th className="px-4 py-3.5">Role &amp; Terminal</th>
                <th className="px-4 py-3.5">Contact / Passcode</th>
                <th className="px-4 py-3.5">Status &amp; Stealth Mode</th>
                <th className="px-4 py-3.5 text-right">Unified Controls (All-in-One)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold">No users found matching your search or company filter.</p>
                    <p className="text-[11px] mt-1">Try selecting "All Companies" or reset status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isKilled = user.isKillSwitchActive || user.status === 'Suspended';
                  const isSilent = Boolean(user.isSilentMonitored);
                  const isCurrentlySyncing = syncingUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isKilled ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* 1. User & Company Attribution */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isKilled 
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {user.name}
                              </span>
                              {user.isOnline && !isKilled && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  LIVE
                                </span>
                              )}
                            </div>
                            
                            {/* Prominent Company & Owner Attribution Badges */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                <Building2 className="w-3 h-3 text-indigo-500" />
                                <span>{user.storeName || 'MBI INVENTRA Headquarters'}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <span className="font-bold text-slate-400">Owner:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{getOwnerForUser(user)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role & Terminal */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            user.role === 'Primary Admin'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : user.role === 'Store Manager'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {user.role}
                          </span>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                            <Laptop className="w-3 h-3 text-slate-400" />
                            <span>ID: {user.id.slice(-6)}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Contact / Passcode */}
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.emailOrPhone}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-500" />
                            <span>Passcode: <strong className="text-slate-700 dark:text-slate-200 font-bold">{user.passcode || '****'}</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Status & Stealth Mode */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          {isKilled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <Power className="w-3 h-3 text-rose-600" />
                              KILLED / LOCKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ACTIVE
                            </span>
                          )}

                          {isSilent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <VolumeX className="w-3 h-3 text-amber-600" />
                              SILENT ON
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Standard Alerts
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. UNIFIED ACTION CONTROLS (All-in-One Menu Row) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 0. 1-CLICK SILENT SHADOW SWITCH BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              onNotify(`Switching silently into ${user.name} (${user.role} - ${user.storeName})...`);
                              handleSilentSwitchUser(user);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                            title={`Open ${user.name}'s workspace in new tab silently (Shadow Mode)`}
                          >
                            ⚡ Silent Switch
                          </button>

                          {/* 1. VIEW BUTTON */}
                          <button
                            type="button"
                            onClick={() => setViewUser(user)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                            title="View Full Profile & System Telemetry"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. SILENT SWITCH TOGGLE (Working Stealth Monitor) */}
                          <button
                            type="button"
                            onClick={() => handleToggleSilentSwitch(user)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              isSilent
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                            title={isSilent ? 'Disable Silent Monitoring' : 'Enable Working Silent Stealth Monitoring'}
                          >
                            {isSilent ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span>Silent: {isSilent ? 'ON' : 'OFF'}</span>
                          </button>

                          {/* 3. EDIT USER BUTTON */}
                          <button
                            type="button"
                            onClick={() => setEditUser(user)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                            title="Edit User Details & Role"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </button>

                          {/* 4. CHANGE PASS BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              setChangePassUser(user);
                              setNewPasscode(user.passcode || '');
                              setConfirmPasscode(user.passcode || '');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Instant Password / PIN Reset"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Pass</span>
                          </button>

                          {/* 5. KILL SWITCH BUTTON (Emergency Account Terminate / Restore) */}
                          <button
                            type="button"
                            onClick={() => handleToggleKillSwitch(user)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              isKilled
                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80'
                            }`}
                            title={isKilled ? 'Restore / Unlock Account' : 'Emergency Kill Switch: Lock out user account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isKilled ? 'Restore' : 'Kill Switch'}</span>
                          </button>

                          {/* 6. CLOUD SYNC BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleForceSyncUser(user)}
                            disabled={isCurrentlySyncing}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                            title="Force Instant Terminal Sync"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isCurrentlySyncing ? 'animate-spin text-blue-500' : ''}`} />
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

      {/* MODAL 1: VIEW USER PROFILE */}
      {viewUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg border border-blue-300 dark:border-blue-700">
                  {viewUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {viewUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Role: <strong className="text-blue-600">{viewUser.role}</strong> • User ID: {viewUser.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Store / Branch</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{viewUser.storeName || 'Main Store'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Owner</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{getOwnerForUser(viewUser)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Number / Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{viewUser.emailOrPhone}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Passcode / PIN</span>
                  <span className="font-mono font-bold text-amber-600 text-xs mt-0.5 block">{viewUser.passcode || '1234'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Status</span>
                  <span className={`font-bold text-xs mt-0.5 block ${viewUser.isKillSwitchActive ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {viewUser.isKillSwitchActive ? 'LOCKED / KILLED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Silent Stealth Monitoring:</span>
                  <strong className={viewUser.isSilentMonitored ? 'text-amber-500' : 'text-slate-400'}>
                    {viewUser.isSilentMonitored ? 'ACTIVE (Stealth Auditing)' : 'DISABLED'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Cloud Sync:</span>
                  <span className="font-mono">{viewUser.lastSyncTime ? new Date(viewUser.lastSyncTime).toLocaleString() : 'Recent'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hardware Fingerprint ID:</span>
                  <span className="font-mono text-slate-400">{viewUser.boundHwid || 'HWID-AUTO-VERIFIED'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onNotify(`Switching silently into ${viewUser.name} (${viewUser.role} - ${viewUser.storeName})...`);
                  handleSilentSwitchUser(viewUser);
                  setViewUser(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                ⚡ Switch Into This User
              </button>
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE PASSWORD */}
      {changePassUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Change Password / PIN
                  </h3>
                  <p className="text-xs text-slate-500">User: {changePassUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setChangePassUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  New Password or PIN
                </label>
                <input
                  type="text"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="Enter new password / PIN..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="text"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter password to confirm..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setChangePassUser(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT USER DETAILS */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit User Profile
                  </h3>
                  <p className="text-xs text-slate-500">ID: {editUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone / Username / Email
                </label>
                <input
                  type="text"
                  value={editUser.emailOrPhone}
                  onChange={(e) => setEditUser({ ...editUser, emailOrPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Role
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Primary Admin">Primary Admin</option>
                  <option value="Sales Staff">Sales Staff</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assigned Store / Pharmacy Name
                </label>
                <input
                  type="text"
                  value={editUser.storeName || ''}
                  onChange={(e) => setEditUser({ ...editUser, storeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditUser}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NEW USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add New Staff User
                  </h3>
                  <p className="text-xs text-slate-500">Create new operator with granular access</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewUserSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Asim Raza"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mobile Number / Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.emailOrPhone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, emailOrPhone: e.target.value })}
                  placeholder="e.g. 03001234567 or asim.cashier"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Primary Admin">Primary Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Passcode
                  </label>
                  <input
                    type="text"
                    value={newUserForm.passcode}
                    onChange={(e) => setNewUserForm({ ...newUserForm, passcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign Store / Pharmacy
                </label>
                <input
                  type="text"
                  value={newUserForm.storeName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
