import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Crown, 
  Lock, 
  Key, 
  Check, 
  AlertTriangle, 
  Search, 
  Sparkles, 
  Building2, 
  Clock, 
  Eye, 
  EyeOff,
  UserCheck,
  UserX,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppUser, UserRole, UserPermissionSet } from '../../types/user';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';

export interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: UserRole | string;
}

const AVAILABLE_ROLES: { role: UserRole; label: string; desc: string; color: string }[] = [
  { role: 'Manager', label: 'Store Manager', desc: 'Full billing, inventory & supplier permissions', color: 'indigo' },
  { role: 'Pharmacist', label: 'Pharmacist', desc: 'Prescription dispensing, batch & FEFO management', color: 'teal' },
  { role: 'Cashier', label: 'POS Cashier', desc: 'Fast retail sales checkout & cash drawer', color: 'blue' },
  { role: 'Stock Manager', label: 'Stock Manager', desc: 'Medicine catalog, transfers, godown & purchase orders', color: 'purple' },
  { role: 'Accountant', label: 'Accountant', desc: 'Ledgers, reports, payments & expenses', color: 'emerald' },
  { role: 'Auditor', label: 'Stock Auditor', desc: 'Physical audit & stock verification only', color: 'amber' },
  { role: 'Viewer', label: 'Read-Only Viewer', desc: 'View dashboards and invoices without edit rights', color: 'slate' }
];

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserRole = 'Owner'
}) => {
  const { currentUser, activeRole, business } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for Add / Edit User
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    emailOrPhone: string;
    phone: string;
    role: UserRole;
    passcode: string;
    status: 'Active' | 'Inactive';
    permissions: UserPermissionSet;
    notes: string;
  }>({
    name: '',
    username: '',
    emailOrPhone: '',
    phone: '',
    role: 'Cashier',
    passcode: '',
    status: 'Active',
    permissions: {
      canManageStaff: false,
      canAccessMasterServer: false,
      canEditInvoices: false,
      canDeleteInvoices: false,
      canReprintInvoices: true,
      canGiveDiscounts: false,
      canViewReports: false,
      canManageInventory: false,
      canManageSuppliers: false,
      canAccessSettings: false
    },
    notes: ''
  });

  const [showPasscode, setShowPasscode] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Load Users
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const fetched = await userService.getAllUsers(business?.id);
      setUsers(fetched);
    } catch (err: any) {
      console.error('Error loading users:', err);
      emitToast('Failed to load staff list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Role Access Guard: Only Owner, Super Admin, Admin can access
  const hasAccess = useMemo(() => {
    const role = (activeRole || currentUser?.role || currentUserRole || 'Owner').toString().toLowerCase();
    return role === 'owner' || role === 'admin' || role === 'super admin';
  }, [activeRole, currentUser, currentUserRole]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.emailOrPhone && u.emailOrPhone.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const handleOpenAddForm = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      username: '',
      emailOrPhone: '',
      phone: '',
      role: 'Cashier',
      passcode: Math.floor(1000 + Math.random() * 9000).toString(),
      status: 'Active',
      permissions: {
        canManageStaff: false,
        canAccessMasterServer: false,
        canEditInvoices: false,
        canDeleteInvoices: false,
        canReprintInvoices: true,
        canGiveDiscounts: false,
        canViewReports: false,
        canManageInventory: false,
        canManageSuppliers: false,
        canAccessSettings: false
      },
      notes: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (user: AppUser) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username || '',
      emailOrPhone: user.emailOrPhone || '',
      phone: user.phone || '',
      role: user.role,
      passcode: user.passcode || '',
      status: user.status === 'Inactive' ? 'Inactive' : 'Active',
      permissions: user.permissions || {
        canManageStaff: false,
        canAccessMasterServer: false,
        canEditInvoices: user.role === 'Manager' || user.role === 'Pharmacist',
        canDeleteInvoices: false,
        canReprintInvoices: true,
        canGiveDiscounts: user.role === 'Manager',
        canViewReports: user.role === 'Manager' || user.role === 'Accountant',
        canManageInventory: user.role === 'Pharmacist' || user.role === 'Manager',
        canManageSuppliers: user.role === 'Manager',
        canAccessSettings: false
      },
      notes: user.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      emitToast('Please provide a staff member name', 'warning');
      return;
    }
    if (!formData.passcode.trim()) {
      emitToast('Please assign a 4-digit PIN / passcode', 'warning');
      return;
    }

    try {
      if (editingUserId) {
        await userService.updateUser(editingUserId, formData);
        emitToast(`✅ Staff member ${formData.name} updated!`, 'success');
      } else {
        await userService.createUser(formData);
        emitToast(`✅ New staff member ${formData.name} added!`, 'success');
      }
      setIsFormOpen(false);
      loadUsers();
    } catch (err: any) {
      emitToast(err?.message || 'Operation failed', 'error');
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    if (userService.isPrimaryOwner(user)) {
      emitToast('👑 Primary Store Owner account cannot be deactivated', 'warning');
      return;
    }

    try {
      const updatedStatus = await userService.toggleUserStatus(user);
      emitToast(`User ${user.name} is now ${updatedStatus}`, 'info');
      loadUsers();
    } catch (err: any) {
      emitToast(err?.message || 'Failed to toggle user status', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userService.isPrimaryOwner(userToDelete)) {
      emitToast('👑 Primary Store Owner account cannot be deleted', 'error');
      setUserToDelete(null);
      return;
    }

    try {
      await userService.deleteUser(userToDelete);
      emitToast(`Staff member ${userToDelete.name} deleted successfully`, 'success');
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      emitToast(err?.message || 'Failed to delete user', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Staff &amp; Role-Based Access Control (RBAC)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Security Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage Pharmacy Cashiers, Pharmacists, Counter PINs &amp; Permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAccess && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 cursor-pointer transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ACCESS DENIED SCREEN IF SUB-USER ATTEMPTS ACCESS */}
        {!hasAccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Access Denied (Staff Management Restricted)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only the Primary Store Owner and authorized Administrators can manage pharmacy staff and sub-user accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
            {/* SEARCH & STATS BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff by name, role or phone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
                <span>Total Staff: <strong className="text-slate-900 dark:text-white">{users.length}</strong></span>
                <span>Active: <strong className="text-emerald-600 dark:text-emerald-400">{users.filter(u => u.status === 'Active').length}</strong></span>
                <button
                  type="button"
                  onClick={loadUsers}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 cursor-pointer"
                  title="Refresh staff list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* STAFF LIST TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Role &amp; Privilege</th>
                    <th className="py-3 px-3">PIN / Passcode</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No staff members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isOwner = userService.isPrimaryOwner(user);

                      return (
                        <tr 
                          key={user.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            isOwner ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          {/* Name & Contact */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                isOwner 
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700' 
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}>
                                {isOwner ? '👑' : (user.name ? user.name.slice(0, 2).toUpperCase() : 'US')}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isOwner && (
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                      <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>Primary Owner</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {user.emailOrPhone || user.username || 'No contact'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                              isOwner 
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                : user.role === 'Manager'
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                : user.role === 'Pharmacist'
                                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            }`}>
                              <ShieldCheck className="w-3 h-3" />
                              <span>{isOwner ? 'Store Owner / Root' : user.role}</span>
                            </span>
                          </td>

                          {/* Passcode / PIN */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                              {user.passcode ? `•••• (${user.passcode})` : 'None'}
                            </span>
                          </td>

                          {/* Status Toggle (Primary Owner is Immutable) */}
                          <td className="py-3 px-3 text-center">
                            {isOwner ? (
                              <span 
                                title="Root account cannot be modified"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-not-allowed opacity-90"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>Active (Immune)</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(user)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                  user.status === 'Active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 hover:bg-emerald-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {user.status === 'Active' ? '● Active' : '○ Inactive'}
                              </button>
                            )}
                          </td>

                          {/* Actions (Owner cannot be deleted) */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(user)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                title="Edit staff member"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {!isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(user)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Delete sub-user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span 
                                  title="Root account cannot be deleted"
                                  className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              )}
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
        )}

        {/* ADD / EDIT USER MODAL FORM */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>{editingUserId ? 'Edit Staff Member' : 'Add New Staff Member'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Full Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                      Staff Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Kashif Ali"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                      Unique Login Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      placeholder="e.g. kashif_pos"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Role & PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                      Assigned Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                    >
                      {AVAILABLE_ROLES.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                      4-Digit PIN / Passcode *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasscode ? 'text' : 'password'}
                        maxLength={6}
                        required
                        value={formData.passcode}
                        onChange={(e) => setFormData(prev => ({ ...prev, passcode: e.target.value }))}
                        placeholder="1234"
                        className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasscode(!showPasscode)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email / Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value, emailOrPhone: e.target.value }))}
                      placeholder="0300-1234567"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                      Account Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                    >
                      <option value="Active">Active (Can Login)</option>
                      <option value="Inactive">Inactive (Blocked)</option>
                    </select>
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Granular Sub-User Permissions
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.canEditInvoices}
                        onChange={(e) => setFormData(p => ({ ...p, permissions: { ...p.permissions, canEditInvoices: e.target.checked } }))}
                        className="rounded text-blue-600"
                      />
                      <span>Edit Invoices</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.canGiveDiscounts}
                        onChange={(e) => setFormData(p => ({ ...p, permissions: { ...p.permissions, canGiveDiscounts: e.target.checked } }))}
                        className="rounded text-blue-600"
                      />
                      <span>Give Discounts</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.canManageInventory}
                        onChange={(e) => setFormData(p => ({ ...p, permissions: { ...p.permissions, canManageInventory: e.target.checked } }))}
                        className="rounded text-blue-600"
                      />
                      <span>Manage Stock</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.canViewReports}
                        onChange={(e) => setFormData(p => ({ ...p, permissions: { ...p.permissions, canViewReports: e.target.checked } }))}
                        className="rounded text-blue-600"
                      />
                      <span>View Reports</span>
                    </label>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md shadow-blue-600/25 cursor-pointer"
                  >
                    {editingUserId ? 'Save Changes' : 'Create Staff User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE MODAL */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Staff Member?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{userToDelete.name}</strong> ({userToDelete.role})? Their login PIN will be revoked immediately.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-extrabold text-white shadow-md shadow-rose-600/25 cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffManagementModal;
