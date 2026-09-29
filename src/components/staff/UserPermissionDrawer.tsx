import React, { useState, useEffect } from 'react';
import { 
  X, Shield, ShieldCheck, Check, Sliders, CheckSquare, Square, 
  RotateCcw, Sparkles, User, AlertCircle, Save, Info,
  Home, ShoppingCart, Package, FileText, Users, Clock, Wallet, Landmark, BarChart2, Flame, Wrench, Bot, Lock
} from 'lucide-react';
import { AppUserRecord } from '../../types';
import { 
  ALL_SIDEBAR_MENUS, 
  ROLE_PRESET_PERMISSIONS, 
  DEFAULT_SECURITY_SWITCHES, 
  OperationalSecuritySwitches,
  getEffectiveAllowedMenus,
  getEffectiveSecuritySwitches
} from '../../utils/rolePermissions';

interface UserPermissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUserRecord | null;
  onSavePermissions: (userId: string, updatedPermissions: { allowed_menus: string[]; switches: OperationalSecuritySwitches }) => Promise<void>;
  isPrimaryAdmin?: boolean;
}

const MENU_ICONS: Record<string, React.ElementType> = {
  dashboard: Home,
  sale: ShoppingCart,
  inventory: Package,
  purchases: FileText,
  parties: Users,
  shifts: Clock,
  expenses: Wallet,
  bank: Landmark,
  reports: BarChart2,
  shortage: Flame,
  barcode: Wrench,
  aiNotes: Bot
};

export const UserPermissionDrawer: React.FC<UserPermissionDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onSavePermissions,
  isPrimaryAdmin = true
}) => {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [switches, setSwitches] = useState<OperationalSecuritySwitches>({ ...DEFAULT_SECURITY_SWITCHES });
  const [selectedPreset, setSelectedPreset] = useState<string>('Custom');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const currentMenus = getEffectiveAllowedMenus(user);
      const currentSwitches = getEffectiveSecuritySwitches(user);
      setSelectedMenus(currentMenus);
      setSwitches(currentSwitches);
      
      // Determine if it matches any role preset
      const userRole = user.role || 'Cashier';
      setSelectedPreset(userRole);
      setSaveSuccess(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isOwner = user.role === 'Primary Admin' || (user as any).isPrimaryOwner || (user as any).is_primary_owner === 1;

  const handleToggleMenu = (menuId: string) => {
    if (isOwner) return; // Owner always keeps all
    setSelectedMenus(prev => {
      const next = prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId];
      setSelectedPreset('Custom');
      return next;
    });
  };

  const handleToggleSwitch = (key: keyof OperationalSecuritySwitches) => {
    if (isOwner) return;
    setSwitches(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setSelectedPreset('Custom');
  };

  const handleApplyPreset = (roleName: string) => {
    if (ROLE_PRESET_PERMISSIONS[roleName]) {
      setSelectedMenus([...ROLE_PRESET_PERMISSIONS[roleName].menus]);
      setSwitches({ ...ROLE_PRESET_PERMISSIONS[roleName].switches });
      setSelectedPreset(roleName);
    }
  };

  const handleSelectAllMenus = () => {
    if (isOwner) return;
    setSelectedMenus(ALL_SIDEBAR_MENUS.map(m => m.id));
    setSelectedPreset('Custom');
  };

  const handleDeselectAllMenus = () => {
    if (isOwner) return;
    setSelectedMenus(['dashboard']); // Always keep dashboard as minimal baseline
    setSelectedPreset('Custom');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePermissions(user.id, {
        allowed_menus: selectedMenus,
        switches: switches
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to save permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Group menus by category
  const categories = ['Core Operations', 'Inventory & Stock', 'Finance & Accounts', 'Intelligence & Tools'] as const;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Staff Permissions & Sidebar Switchboard
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign allowed menus and configure operational security switches for <span className="font-semibold text-slate-700 dark:text-slate-200">{user.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* User Profile Overview & Preset Selector */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{user.emailOrPhone || user.email || 'No contact specified'}</p>
              </div>
            </div>

            {/* Role Preset Quick Dropdown */}
            {!isOwner && (
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Role Preset:</span>
                <select
                  value={selectedPreset}
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                >
                  <option value="Cashier">Cashier Preset</option>
                  <option value="Pharmacist">Pharmacist Preset</option>
                  <option value="Store Manager">Store Manager Preset</option>
                  <option value="Accountant">Accountant Preset</option>
                  <option value="Inventory Manager">Inventory Manager Preset</option>
                  <option value="Stock Keeper">Stock Keeper Preset</option>
                  <option value="Viewer">Viewer (Read-Only)</option>
                  <option value="Custom">Custom Assigned</option>
                </select>
              </div>
            )}
          </div>

          {/* Owner Notice if applicable */}
          {isOwner && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Primary Owner Account:</strong> This user holds root administrator privileges across all application menus and unrestricted operational switches.
              </span>
            </div>
          )}

          {/* SECTION 1: SIDEBAR MENU ASSIGNMENT SWITCHBOARD */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  1. Sidebar Menu Assignment Switchboard ({selectedMenus.length} / {ALL_SIDEBAR_MENUS.length} Active)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select which sidebar navigation menus appear for this user in their application workspace.
                </p>
              </div>

              {!isOwner && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllMenus}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllMenus}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {/* Menu Items by Category Grid */}
            <div className="space-y-4">
              {categories.map(category => {
                const categoryMenus = ALL_SIDEBAR_MENUS.filter(m => m.category === category);
                if (categoryMenus.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                      {category}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {categoryMenus.map(menu => {
                        const IconComponent = MENU_ICONS[menu.id] || Package;
                        const isEnabled = isOwner || selectedMenus.includes(menu.id);

                        return (
                          <div
                            key={menu.id}
                            onClick={() => handleToggleMenu(menu.id)}
                            className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 select-none ${
                              isEnabled
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                            } ${isOwner ? 'cursor-default' : 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700'}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                isEnabled 
                                  ? 'bg-blue-600 text-white dark:bg-blue-500' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <p className={`text-xs font-bold leading-tight ${
                                  isEnabled ? 'text-blue-950 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                  {menu.label}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-1">
                                  {menu.description}
                                </p>
                              </div>
                            </div>

                            {/* Toggle checkbox badge */}
                            <div className="shrink-0 mt-0.5">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                isEnabled 
                                  ? 'bg-blue-600 text-white dark:bg-blue-500' 
                                  : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}>
                                {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: OPERATIONAL ACTION SECURITY SWITCHES */}
          <div className="space-y-3.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                2. Operational Action Security Switches
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Grant or restrict critical financial and modification permissions for this staff member.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Can Edit Invoices */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canEditInvoices || isOwner
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Edit Invoices</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Modify saved bills & change items</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canEditInvoices || isOwner}
                  onChange={() => handleToggleSwitch('canEditInvoices')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              {/* Can Delete Invoices */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canDeleteInvoices || isOwner
                  ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Delete Invoices</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Void or remove finalized sales</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canDeleteInvoices || isOwner}
                  onChange={() => handleToggleSwitch('canDeleteInvoices')}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </label>

              {/* Can Record Payment In */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canRecordPaymentIn || isOwner
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Record Payment In</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Receive cash & customer recoveries</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canRecordPaymentIn || isOwner}
                  onChange={() => handleToggleSwitch('canRecordPaymentIn')}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>

              {/* Can Record Payment Out */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canRecordPaymentOut || isOwner
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Record Payment Out</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Supplier payouts & disbursements</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canRecordPaymentOut || isOwner}
                  onChange={() => handleToggleSwitch('canRecordPaymentOut')}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>

              {/* Can Apply Custom Discounts */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canApplyCustomDiscounts || isOwner
                  ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Apply Custom Discounts</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Override product discount % at POS</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canApplyCustomDiscounts || isOwner}
                  onChange={() => handleToggleSwitch('canApplyCustomDiscounts')}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </label>

              {/* Can View Wholesale Rates & Margin */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canViewWholesaleRatesAndMargin || isOwner
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can View Wholesale Rates & Margin</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Inspect cost prices and gross margins</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canViewWholesaleRatesAndMargin || isOwner}
                  onChange={() => handleToggleSwitch('canViewWholesaleRatesAndMargin')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Can Export Reports & Excel Sheets */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canExportReportsAndExcel || isOwner
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Export Reports & Excel</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Download Excel, CSV & PDF files</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canExportReportsAndExcel || isOwner}
                  onChange={() => handleToggleSwitch('canExportReportsAndExcel')}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {/* Can Manage Staff & Devices */}
              <label className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                switches.canManageStaffAndDevices || isOwner
                  ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔘 Can Manage Staff & Devices</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Add passcodes, HWID authorizations</p>
                </div>
                <input
                  type="checkbox"
                  disabled={isOwner}
                  checked={switches.canManageStaffAndDevices || isOwner}
                  onChange={() => handleToggleSwitch('canManageStaffAndDevices')}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </label>

            </div>
          </div>

        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" /> Permissions Saved & Synced!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Updating Permissions...' : 'Save & Enforce Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
