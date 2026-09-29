import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldCheck, UserPlus, RefreshCw, Key, 
  CheckCircle2, AlertCircle, ArrowRight, Activity, Lock, X,
  Edit2, Trash2, Eye, EyeOff, Search, Cloud, Laptop, Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_DEFINITIONS } from '../../lib/permissions';
import { AppUserRecord, UserRole } from '../../types';
import { ActivityLogModal } from '../common/ActivityLogModal';
import { AccountUsageService, TenantUsageInfo } from '../../lib/accountUsageService';
import { UpgradePlanModal } from '../common/UpgradePlanModal';
import { useSettings } from '../../contexts/SettingsContext';
import { syncEngine } from '../../lib/syncEngine';

export const UserManagementTab: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { 
    appUsers, 
    activeRole, 
    activeUser, 
    setActiveRole, 
    setActiveUser, 
    addAppUser, 
    updateAppUser,
    removeAppUser,
    activityLogs,
    tenantId,
    tenant,
    business
  } = useAuth();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUserRecord | null>(null);

  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeUsageInfo, setUpgradeUsageInfo] = useState<TenantUsageInfo | null>(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Pharmacist');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<'Joined' | 'Pending' | 'Inactive'>('Joined');

  const [searchQuery, setSearchQuery] = useState('');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncEngine.pullServerSync(true);
      showToast(res.message || 'Synced successfully with connected PCs & browsers');
    } catch (e: any) {
      showToast('Sync updated locally');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const currentTenantId = tenantId || tenant?.id || business?.tenantId || 'tenant-demo-01';
    const limitCheck = await AccountUsageService.checkLimitBeforeAction(currentTenantId, 'users');
    
    if (!limitCheck.allowed) {
      setUpgradeUsageInfo(limitCheck.usage);
      setIsUpgradeModalOpen(true);
      return;
    }

    await addAppUser({
      name: newUserName.trim(),
      emailOrPhone: newUserEmail.trim(),
      role: newUserRole,
      status: newUserStatus,
      passcode: newUserPin.trim() || '1234',
      tenantId: currentTenantId,
    });

    // Increment usage record
    AccountUsageService.incrementUsage(currentTenantId, 'users').catch(() => {});

    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPin('');
    setNewUserStatus('Joined');
    showToast(`Staff user ${newUserName} (${newUserRole}) added successfully`);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await updateAppUser(editingUser);
    setIsEditUserModalOpen(false);
    setEditingUser(null);
    showToast(`User ${editingUser.name} updated successfully`);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const name = userToDelete.name;
    await removeAppUser(userToDelete.id);
    setUserToDelete(null);
    showToast(`User ${name} removed`);
  };

  const filteredUsers = appUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.emailOrPhone && u.emailOrPhone.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.status && u.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 text-slate-800 text-[13px] relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Multi-Device Sync Live Bar */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-indigo-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Multi-Browser & Multi-PC Real-Time Cloud Sync</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Users, medicines, stock, invoices & permissions automatically synchronize across all your connected computers and browsers.
            </p>
          </div>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync & Refresh Now'}</span>
        </button>
      </div>

      {/* Users List & Role Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Registered Users */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Registered App Users ({appUsers.length})
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user / role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none w-36 sm:w-44"
                />
              </div>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Staff / User</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Passcode / PIN</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map(user => {
                  const isCurrent = activeUser?.id === user?.id || (!activeUser && user?.role === activeRole);
                  const displayName = user?.name || user?.emailOrPhone || 'User';
                  const initialChar = (displayName.charAt(0) || 'U').toUpperCase();
                  const isRevealed = showPins[user.id] || false;
                  return (
                    <tr key={user?.id || Math.random()} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-blue-50/40 font-semibold' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                            {initialChar}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{displayName}</p>
                            {isCurrent && <span className="text-[10px] text-blue-600 font-bold">[ACTIVE NOW]</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{user?.emailOrPhone || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10.5px]">
                          {user?.role || 'User'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                          <span>{isRevealed ? (user.passcode || '0000') : '••••'}</span>
                          <button
                            type="button"
                            onClick={() => setShowPins(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title={isRevealed ? 'Hide PIN' : 'View PIN'}
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          user?.status === 'Joined' || user?.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : user?.status === 'Pending' || user?.status === 'Invited'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user?.status === 'Pending' ? 'Pending Invite' : user?.status || 'Joined'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              if (user) {
                                setActiveUser(user);
                                setActiveRole(user.role);
                                showToast(`Switched active profile to ${displayName} (${user.role})`);
                              }
                            }}
                            disabled={isCurrent}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
                            }`}
                          >
                            {isCurrent ? 'Active' : 'Switch'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser({ ...user });
                              setIsEditUserModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {user.role !== 'Primary Admin' && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Role Matrix Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Role Permissions Breakdown</span>
          </h4>

          <div className="space-y-2 text-xs">
            {Object.entries(ROLE_DEFINITIONS).map(([roleName, def]) => (
              <div key={roleName} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{roleName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {Object.values(def.allowedModules).filter(Boolean).length} modules
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{def.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Activity Logs Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Recent User Audit & Security Trail</span>
          </h4>
          <button
            onClick={() => setIsActivityLogModalOpen(true)}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
          {activityLogs && activityLogs.length > 0 ? (
            activityLogs.slice(0, 5).map((log, idx) => (
              <div key={log?.id || idx} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between gap-2 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800">{log?.userName || 'User'}</span>
                  <span className="text-slate-500 ml-1">({log?.userRole || 'Staff'}):</span>
                  <span className="text-slate-700 ml-1">{log?.details || log?.action || 'Activity recorded'}</span>
                </div>
                <span className="text-[10.5px] text-slate-400 font-mono flex-shrink-0">
                  {log?.timestamp && !isNaN(new Date(log.timestamp).getTime())
                    ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-400">
              No recent audit actions logged yet.
            </div>
          )}
        </div>
      </div>

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={isActivityLogModalOpen}
        onClose={() => setIsActivityLogModalOpen(false)}
      />

      {/* Add Staff Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Add Staff User</span>
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asim Raza"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="user@mbinventra.com or 03001234567"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign Role</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="Pharmacist">Pharmacist (Clinical Dispensing, Batches & Sales)</option>
                  <option value="Cashier">Cashier (POS Counter Billing & Payments)</option>
                  <option value="Accountant">Accountant (Financials, Ledgers & Expenses)</option>
                  <option value="CA/Accountant">CA / Accountant (Financial Audit & Balance Sheet)</option>
                  <option value="Manager">Manager (Daily Operations & Staff Supervision)</option>
                  <option value="Store Manager">Store Manager (Inventory, Purchases & Sales Desk)</option>
                  <option value="Inventory Manager">Inventory Manager (Stock, Batches & Expiries)</option>
                  <option value="Stock Keeper">Stock Keeper (Inventory & Warehouse Items)</option>
                  <option value="Salesman">Salesman (Invoices, Orders & Parties)</option>
                  <option value="Sales Staff">Sales Staff (Counter Orders & Billing)</option>
                  <option value="Biller">Biller (Counter POS Billing)</option>
                  <option value="Secondary Admin">Secondary Admin (All except Settings)</option>
                  <option value="Viewer">Viewer (Read-Only Catalog & Reports)</option>
                  <option value="Custom Role">Custom Role (Configured Permissions)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Status</label>
                <select
                  value={newUserStatus}
                  onChange={(e: any) => setNewUserStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs"
                >
                  <option value="Joined">Joined (Active Immediately)</option>
                  <option value="Pending">Pending Invite (Awaiting User Acceptance)</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Security PIN / Passcode (4-8 digits)</label>
                <input
                  type="text"
                  placeholder="1234"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold tracking-widest text-center"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>Edit User: {editingUser.name}</span>
              </h3>
              <button onClick={() => setIsEditUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Phone *</label>
                <input
                  type="text"
                  required
                  value={editingUser.emailOrPhone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, emailOrPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="Primary Admin">Primary Admin (Account Owner)</option>
                  <option value="Secondary Admin">Secondary Admin</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Accountant">Accountant</option>
                  <option value="CA/Accountant">CA / Accountant</option>
                  <option value="Manager">Manager</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Stock Keeper">Stock Keeper</option>
                  <option value="Salesman">Salesman</option>
                  <option value="Sales Staff">Sales Staff</option>
                  <option value="Biller">Biller</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={editingUser.status || 'Joined'}
                  onChange={(e: any) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs"
                >
                  <option value="Joined">Joined / Active</option>
                  <option value="Pending">Pending Invite</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Passcode / PIN</label>
                <input
                  type="text"
                  value={editingUser.passcode || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, passcode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold tracking-widest text-center"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Remove User?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong>{userToDelete.name}</strong> ({userToDelete.role})? This user will no longer be able to log in on any computer or terminal.
            </p>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Quota & Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          resourceType="users"
          currentCount={upgradeUsageInfo?.userCount || appUsers.length}
          maxAllowed={upgradeUsageInfo?.maxUsers || 5}
          plan={upgradeUsageInfo?.plan || 'Free Starter'}
        />
      )}

    </div>
  );
};
