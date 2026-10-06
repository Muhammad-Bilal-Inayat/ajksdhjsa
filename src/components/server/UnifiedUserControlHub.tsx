import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  EyeOff,
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
  Smartphone,
  User
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
  const [revealedPasscodes, setRevealedPasscodes] = useState<Record<string, boolean>>({});

  const tenants = useMemo(() => getAllTenants(), []);

  // New Sub-User Form State
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    username: '',
    emailOrPhone: '',
    passcode: '1234',
    role: 'Cashier' as MasterActiveUser['role'],
    storeName: tenants[0]?.name || 'MBI INVENTRA Main Pharmacy',
    tenantId: tenants[0]?.tenantId || tenants[0]?.id || 'tenant_main'
  });

  // Strict Helper: Exclude Primary Admins & Owners (Show ONLY Sub-Users)
  const isPrimaryAdminOrOwner = (u: any) => {
    const roleStr = String(u.role || '').toLowerCase().trim();
    return roleStr.includes('primary admin') ||
      roleStr.includes('primary owner') ||
      roleStr === 'owner' ||
      roleStr === 'primary_admin' ||
      roleStr === 'primary_owner' ||
      Boolean(u.isPrimaryOwner) ||
      Boolean(u.is_primary_owner) ||
      Boolean(u.isPrimaryAdmin);
  };

  // Distinct Sub-Users list (excluding root owners/primary admins)
  const subUsersList = useMemo(() => {
    return users.filter(u => !isPrimaryAdminOrOwner(u));
  }, [users]);

  // Distinct Companies & Sub-User Counts breakdown
  const companyStats = useMemo(() => {
    const counts = new Map<string, number>();
    subUsersList.forEach(u => {
      const store = u.storeName || 'Pharmacy Store';
      counts.set(store, (counts.get(store) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [subUsersList]);

  // Sync users with backend server API & listen to events
  const refreshUsersList = async () => {
    try {
      const res = await fetch('/api/fleet/users', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users)) {
          const DUMMY_TENANT_IDS = new Set(['tenant_main', 'NODE-CLIENT', 'default', 'undefined', 'null', '']);
          const serverUsers: MasterActiveUser[] = json.users
            .filter((ru: any) => {
              const tid = String(ru.tenant_id || ru.tenantId || ru.installationId || '').trim();
              return tid && !DUMMY_TENANT_IDS.has(tid);
            })
            .map((ru: any) => ({
              id: ru.id,
              name: ru.name,
              username: ru.username || ru.emailOrPhone || ru.id,
              emailOrPhone: ru.emailOrPhone || '',
              role: ru.role || 'Cashier',
              status: ru.isKillSwitchActive ? 'Suspended' : (ru.status || 'Active'),
              passcode: ru.passcode || '1234',
              storeName: ru.storeName || 'Pharmacy Store',
              tenantId: ru.tenant_id || ru.tenantId || ru.installationId || '',
              installationId: ru.installationId || ru.tenant_id || '',
              boundHwid: ru.boundHwid || null,
              lastSyncTime: ru.lastSyncTime || new Date().toISOString(),
              isOnline: true,
              isSilentMonitored: Boolean(ru.isSilentMonitored),
              isKillSwitchActive: Boolean(ru.isKillSwitchActive),
              totalTransactions: Number(ru.totalTransactions) || 0,
              sessionDurationMinutes: 120,
              totalActiveHours: 24,
              allowedModules: { ...DEFAULT_MODULES },
              permissions: { ...DEFAULT_USER_PERMISSIONS },
              createdAt: ru.createdAt || new Date().toISOString(),
              updatedAt: ru.updatedAt || new Date().toISOString(),
            }));
          setUsers(serverUsers);
          localStorage.setItem('mbi_master_active_users_v3', JSON.stringify(serverUsers));
          return;
        }
      }
    } catch (e) { }
    setUsers(getMasterActiveUsers());
  };

  useEffect(() => {
    refreshUsersList();

    const handleUpdate = () => refreshUsersList();
    window.addEventListener('mbi-users-updated', handleUpdate);
    window.addEventListener('mbi-master-users-wiped', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshUsersList();
    }, 15000);
    return () => {
      window.removeEventListener('mbi-users-updated', handleUpdate);
      window.removeEventListener('mbi-master-users-wiped', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Helper to get owner name for any user based on their company
  const getOwnerForUser = (user: MasterActiveUser) => {
    const uTenant = (user as any).tenantId;
    const targetTenant = tenants.find(t => t.id === uTenant || t.tenantId === uTenant || t.name === user.storeName);
    return targetTenant?.ownerName || (targetTenant as any)?.primaryAdminName || 'M Bilal Inayat';
  };

  // Effective search combines internal and external search bar
  const activeSearch = (externalSearchQuery || searchQuery).trim().toLowerCase();

  // Filtered Sub-Users List (Strictly Sub-Users)
  const filteredUsers = useMemo(() => {
    return subUsersList.filter(user => {
      // Company / Store filter
      if (companyFilter !== 'all' && (user.storeName || 'Pharmacy Store') !== companyFilter) {
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
  }, [subUsersList, companyFilter, roleFilter, statusFilter, activeSearch, tenants]);

  // ACTION 0: 1-CLICK SILENT SHADOW SWITCH INTO SUB-USER WORKSPACE
  const handleSilentSwitchUser = async (user: MasterActiveUser) => {
    try {
      const rawTargetTenantId = user.tenantId || (user as any).storeId || (user as any).tenant_id || (user as any).businessId;
      const targetTenantId = (rawTargetTenantId && rawTargetTenantId !== 'undefined' && rawTargetTenantId !== 'null' && String(rawTargetTenantId).trim() !== '')
        ? String(rawTargetTenantId).trim()
        : 'default';
      const storeName = user.storeName || (user as any).companyName || 'Pharmacy Store';
      const userName = user.name || 'Staff User';
      const userRole = user.role || 'Cashier';

      onNotify(`⚡ Silent switching into ${userName} (${userRole} - ${storeName})...`);

      let shadowToken = `shadow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      try {
        const res = await fetch('/api/master/impersonate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mbi_master_token') || 'master_auth'}`
          },
          body: JSON.stringify({
            target_tenant_id: targetTenantId,
            tenantId: targetTenantId,
            userId: user.id,
            userName,
            userRole,
            storeName
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) shadowToken = data.token;
        }
      } catch { }

      localStorage.setItem('mbi_shadow_token', shadowToken);
      localStorage.setItem('mbi_active_token', shadowToken);
      localStorage.setItem('mbi_active_business_id', targetTenantId);
      localStorage.setItem('mbi_active_tenant_id', targetTenantId);
      localStorage.setItem('active_firm_id', targetTenantId);

      const shadowBiz = {
        id: targetTenantId,
        tenantId: targetTenantId,
        name: storeName,
        ownerUid: user.id || `owner_${targetTenantId}`,
        members: [user.id || `owner_${targetTenantId}`],
        phone: user.emailOrPhone || '03364585863',
        mobile: user.emailOrPhone || '03364585863',
        email: user.emailOrPhone?.includes('@') ? user.emailOrPhone : `${targetTenantId}@mbiinventra.com`,
        address: `${storeName}, Pakistan`,
        city: 'Lahore',
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
        id: targetTenantId,
        tenantId: targetTenantId,
        name: storeName,
        ownerName: getOwnerForUser(user),
        plan: 'Platinum',
        status: 'Active',
        paidLicenseActive: true
      }));

      localStorage.setItem('mock_session', JSON.stringify({
        uid: user.id,
        email: user.emailOrPhone || 'user@mbiinventra.com',
        displayName: userName,
        role: userRole,
        tenantId: targetTenantId
      }));

      localStorage.setItem('mock_user_profile', JSON.stringify({
        id: user.id,
        name: userName,
        email: user.emailOrPhone || 'user@mbiinventra.com',
        role: userRole,
        businessId: targetTenantId,
        tenantId: targetTenantId,
        pin: user.passcode || '0000',
        createdAt: new Date().toISOString()
      }));

      const appUserRecord = {
        id: user.id,
        name: userName,
        emailOrPhone: user.emailOrPhone,
        role: userRole,
        status: 'Active',
        passcode: user.passcode || '0000',
        tenantId: targetTenantId,
        canEditInvoices: user.permissions?.canEditBill ?? false
      };
      localStorage.setItem('active_simulated_user', JSON.stringify(appUserRecord));
      localStorage.setItem('active_simulated_role', userRole);

      window.dispatchEvent(new CustomEvent('mbi_tenant_changed', { detail: { tenantId: targetTenantId, name: storeName } }));
      window.dispatchEvent(new CustomEvent('mbi_active_business_changed', { detail: shadowBiz }));
      window.dispatchEvent(new CustomEvent('mbi-user-role-changed', { detail: { role: userRole, user: appUserRecord } }));
      window.dispatchEvent(new Event('storage'));

      const targetUrl = `${window.location.origin}/user?shadow_token=${encodeURIComponent(shadowToken)}&tenant_id=${encodeURIComponent(targetTenantId)}&store_name=${encodeURIComponent(storeName)}&user_name=${encodeURIComponent(userName)}&user_role=${encodeURIComponent(userRole)}`;

      const newWin = window.open(targetUrl, '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        window.location.href = targetUrl;
      }
    } catch (err: any) {
      console.error('Silent switch failed:', err);
      onNotify(`⚠️ Silent switch error: ${err?.message || 'Unknown error'}`);
    }
  };

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

    fetch('/api/fleet/users/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        isSilentMonitored: nextSilentState
      })
    }).catch(() => { });

    logMasterAudit(
      nextSilentState ? 'Silent Monitoring Engaged' : 'Silent Monitoring Disengaged',
      'SECURITY',
      `Silent monitoring ${nextSilentState ? 'ACTIVATED' : 'DEACTIVATED'} for Sub-User ${user.name} (${user.role})`,
      user.storeName
    );

    onNotify(nextSilentState
      ? `🔕 Silent Monitoring Activated: Sub-User ${user.name}'s actions will be stealth audited.`
      : `🔔 Silent Monitoring Deactivated: ${user.name} returned to standard alert mode.`
    );
  };

  // ACTION 2: KILL SWITCH TOGGLE (Emergency Sub-User Lock / Suspension)
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

    fetch('/api/fleet/users/kill-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        isKilled: nextKillState
      })
    }).catch(() => { });

    logMasterAudit(
      nextKillState ? 'Sub-User Kill Switch Activated' : 'Sub-User Kill Switch Released',
      'SECURITY',
      `Kill switch ${nextKillState ? 'SUSPENDED/LOCKED' : 'UNLOCKED'} sub-user ${user.name} (${user.role})`,
      user.storeName
    );

    onNotify(nextKillState
      ? `🛑 KILL SWITCH EXECUTED: Sub-User ${user.name} account is locked out and suspended.`
      : `✅ Sub-User Unlocked: ${user.name}'s account access restored.`
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

      fetch('/api/fleet/users/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: changePassUser.id,
          newPasscode: newPasscode.trim()
        })
      }).catch(() => { });

      onNotify(`🔑 Passcode for Sub-User ${changePassUser.name} updated successfully!`);
      setChangePassUser(null);
      setNewPasscode('');
      setConfirmPasscode('');
    } else {
      onNotify('Failed to update password.');
    }
  };

  // ACTION 4: EDIT SUB-USER DETAILS
  const handleSaveEditUser = async () => {
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

    try {
      await fetch('/api/fleet/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editUser.id,
          name: editUser.name,
          emailOrPhone: editUser.emailOrPhone,
          role: editUser.role,
          storeName: editUser.storeName,
          tenantId: editUser.tenantId,
          passcode: editUser.passcode,
          status: editUser.status
        })
      });
    } catch { }

    onNotify(`✨ Sub-User ${editUser.name} (${editUser.role}) updated successfully.`);
    setEditUser(null);
  };

  // ACTION 5: FORCE SYNC TERMINAL
  const handleForceSyncUser = async (user: MasterActiveUser) => {
    setSyncingUserId(user.id);

    try {
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

      const updatedUser: MasterActiveUser = {
        ...user,
        lastSyncTime: new Date().toISOString()
      };
      saveMasterActiveUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

      onNotify(`🔄 Terminal sync for Sub-User ${user.name} completed successfully.`);
    } catch (e) {
      onNotify(`Notice: Offline sync cached for ${user.name}.`);
    } finally {
      setTimeout(() => setSyncingUserId(null), 800);
    }
  };

  // ACTION 6: ADD NEW SUB-USER (STAFF)
  const handleAddNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.emailOrPhone.trim()) {
      onNotify('⚠️ Name and Email/Phone are required.');
      return;
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const selectedTenant = tenants.find(t => t.id === newUserForm.tenantId || t.tenantId === newUserForm.tenantId || t.name === newUserForm.storeName);
    const cleanTenantId = selectedTenant?.tenantId || selectedTenant?.id || newUserForm.tenantId || 'tenant_main';
    const cleanStoreName = selectedTenant?.name || newUserForm.storeName || 'Pharmacy Store';

    const createdUser: MasterActiveUser = {
      id: newId,
      name: newUserForm.name.trim(),
      username: newUserForm.username.trim() || newUserForm.emailOrPhone.trim(),
      emailOrPhone: newUserForm.emailOrPhone.trim(),
      role: newUserForm.role,
      status: 'Active',
      passcode: newUserForm.passcode.trim() || '1234',
      storeName: cleanStoreName,
      tenantId: cleanTenantId,
      installationId: cleanTenantId,
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

    try {
      await fetch('/api/fleet/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: createdUser.id,
          name: createdUser.name,
          username: createdUser.username,
          emailOrPhone: createdUser.emailOrPhone,
          role: createdUser.role,
          status: 'Active',
          passcode: createdUser.passcode,
          storeName: cleanStoreName,
          tenantId: cleanTenantId
        })
      });
    } catch { }

    onNotify(`✅ Sub-User ${createdUser.name} (${createdUser.role} - ${cleanStoreName}) successfully created.`);
    setShowAddUserModal(false);
    setNewUserForm({
      name: '',
      username: '',
      emailOrPhone: '',
      passcode: '1234',
      role: 'Cashier',
      storeName: tenants[0]?.name || 'MBI INVENTRA Main Pharmacy',
      tenantId: tenants[0]?.tenantId || tenants[0]?.id || 'tenant_main'
    });
  };

  const killedCount = subUsersList.filter(u => u.isKillSwitchActive || u.status === 'Suspended').length;
  const silentCount = subUsersList.filter(u => u.isSilentMonitored).length;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION: TITLE, STATS & ADD SUB-USER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tenant Sub-Users &amp; Staff Control Switchboard
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {subUsersList.length} Sub-Users Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Company-Wise Staff Governance: Silent Switch • Edit • Passcode Reset • Kill Switch • Cloud Sync (Zero Primary Admin Clutter)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => refreshUsersList()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh Sub-Users"
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
              placeholder="Search sub-user by name, phone, store, role, or ID..."
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              All ({subUsersList.length})
            </button>

            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${statusFilter === 'online'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online Now</span>
            </button>

            <button
              onClick={() => setStatusFilter('silent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${statusFilter === 'silent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Silent Monitored ({silentCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('killed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${statusFilter === 'killed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Killed / Suspended ({killedCount})</span>
            </button>

            {/* Distinct Company / Tenant Filter Dropdown */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">🏢 All Companies ({subUsersList.length} Sub-Users)</option>
              {companyStats.map((cs) => (
                <option key={cs.name} value={cs.name}>
                  {cs.name} ({cs.count})
                </option>
              ))}
            </select>

            {/* Sub-User Role Filter Dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Sub-User Roles</option>
              <option value="Store Manager">Store Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Pharmacist">Pharmacist</option>
              <option value="Sales Staff">Sales Staff</option>
              <option value="Accountant">Accountant</option>
              <option value="Auditor">Auditor</option>
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
                <th className="px-4 py-3.5">Sub-User &amp; Company Attribution</th>
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
                    <p className="font-bold">No Sub-Users found matching your filters.</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Primary Admins &amp; Owners are hidden here. Click <strong>"+ Add Staff User"</strong> to create Cashiers, Managers, or Pharmacists for your companies.
                    </p>
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
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isKilled ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                        }`}
                    >
                      {/* 1. Sub-User & Company Attribution */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${isKilled
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
                                <span>{user.storeName || 'Pharmacy Store'}</span>
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
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${(user.role as string) === 'Store Manager'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : (user.role as string) === 'Cashier'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : (user.role as string) === 'Pharmacist'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
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
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <Key className="w-3 h-3 text-amber-500" />
                            <span>Passcode: <strong className="text-slate-700 dark:text-slate-200 font-bold">
                              {revealedPasscodes[user.id] ? (user.passcode || '••••') : '••••••••'}
                            </strong></span>
                            <button
                              type="button"
                              onClick={() => setRevealedPasscodes(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
                              title={revealedPasscodes[user.id] ? "Hide Passcode" : "Show Passcode"}
                            >
                              {revealedPasscodes[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
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

                      {/* 5. Unified Controls (All-in-One Functional Buttons) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Silent Switch Button */}
                          <button
                            onClick={() => handleSilentSwitchUser(user)}
                            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                            title="Instant Silent Switch into this Sub-User workspace"
                          >
                            <span className="text-amber-300">⚡</span>
                            <span>Silent Switch</span>
                          </button>

                          {/* 2. View Profile */}
                          <button
                            onClick={() => setViewUser(user)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="View Sub-User Details & Permissions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Silent Monitoring Mode Toggle */}
                          <button
                            onClick={() => handleToggleSilentSwitch(user)}
                            className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${isSilent
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            title={isSilent ? 'Disable Silent Stealth Monitoring' : 'Enable Silent Stealth Monitoring'}
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Silent: {isSilent ? 'ON' : 'OFF'}</span>
                          </button>

                          {/* 4. Edit User */}
                          <button
                            onClick={() => setEditUser(user)}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                            title="Edit Sub-User Role / Info"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. Change Password / PIN */}
                          <button
                            onClick={() => {
                              setChangePassUser(user);
                              setNewPasscode('');
                              setConfirmPasscode('');
                            }}
                            className="px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Change Passcode / PIN"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Pass</span>
                          </button>

                          {/* 6. Kill Switch / Remote Deactivate */}
                          <button
                            onClick={() => handleToggleKillSwitch(user)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${isKilled
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}
                            title={isKilled ? 'Reactivate & Unlock Sub-User Account' : 'Emergency Suspend / Lock Sub-User Account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isKilled ? 'Unlock' : 'Kill Switch'}</span>
                          </button>

                          {/* 7. Force Terminal Sync */}
                          <button
                            onClick={() => handleForceSyncUser(user)}
                            disabled={isCurrentlySyncing}
                            className={`p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer ${isCurrentlySyncing ? 'opacity-50' : ''
                              }`}
                            title="Force Instant Terminal Sync"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isCurrentlySyncing ? 'animate-spin' : ''}`} />
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

      {/* MODAL 1: VIEW SUB-USER PROFILE */}
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
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Company / Store</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{viewUser.storeName || 'Main Store'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Owner</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{getOwnerForUser(viewUser)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Number / Login</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{viewUser.emailOrPhone}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Passcode / PIN</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-bold text-amber-600 text-xs">
                      {revealedPasscodes[viewUser.id] ? (viewUser.passcode || '••••') : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealedPasscodes(prev => ({ ...prev, [viewUser.id]: !prev[viewUser.id] }))}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                      title={revealedPasscodes[viewUser.id] ? "Hide Passcode" : "Show Passcode"}
                    >
                      {revealedPasscodes[viewUser.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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
                ⚡ Switch Into This Sub-User
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
                    Change Sub-User Passcode / PIN
                  </h3>
                  <p className="text-xs text-slate-500">Sub-User: {changePassUser.name}</p>
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
                Update Passcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SUB-USER DETAILS */}
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
                    Edit Sub-User Profile
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
                  Sub-User Role
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Sales Staff">Sales Staff</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assigned Company / Store
                </label>
                <select
                  value={editUser.tenantId || ''}
                  onChange={(e) => {
                    const selTenant = tenants.find(t => t.id === e.target.value || t.tenantId === e.target.value);
                    setEditUser({
                      ...editUser,
                      tenantId: e.target.value,
                      storeName: selTenant?.name || editUser.storeName
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                >
                  {tenants.map(t => (
                    <option key={t.id || t.tenantId} value={t.tenantId || t.id}>
                      {t.name} (Owner: {t.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Passcode / PIN
                </label>
                <input
                  type="text"
                  value={editUser.passcode || ''}
                  onChange={(e) => setEditUser({ ...editUser, passcode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white font-mono"
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

      {/* MODAL 4: ADD NEW SUB-USER (STAFF) */}
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
                    Add New Staff / Sub-User
                  </h3>
                  <p className="text-xs text-slate-500">Create staff account under a specific company</p>
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
                  placeholder="e.g. Asim Raza (Cashier)"
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
                    Staff Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Sales Staff">Sales Staff</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Auditor">Auditor</option>
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
                  Assign Company / Store
                </label>
                <select
                  value={newUserForm.tenantId}
                  onChange={(e) => {
                    const selTenant = tenants.find(t => t.id === e.target.value || t.tenantId === e.target.value);
                    setNewUserForm({
                      ...newUserForm,
                      tenantId: e.target.value,
                      storeName: selTenant?.name || 'Main Pharmacy Store'
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-white"
                >
                  {tenants.map(t => (
                    <option key={t.id || t.tenantId} value={t.tenantId || t.id}>
                      🏢 {t.name} (Owner: {t.ownerName})
                    </option>
                  ))}
                </select>
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
                  Create Sub-User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
