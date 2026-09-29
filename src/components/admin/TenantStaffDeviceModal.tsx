import React, { useState, useEffect } from 'react';
import { 
  X, Users, Laptop, Zap, Sliders, Lock, Unlock, Key, Plus,
  ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff,
  Copy, Smartphone, Radio, Calendar, Crown, Shield, Power, Trash2, ArrowRight
} from 'lucide-react';
import { 
  adminService, 
  TenantTelemetryRecord, 
  StaffUserRecord, 
  BoundDeviceRecord 
} from '../../services/adminService';
import { emitToast } from '../../contexts/ToastContext';

interface TenantStaffDeviceModalProps {
  tenant: TenantTelemetryRecord;
  isOpen: boolean;
  onClose: () => void;
  onOpenFeatureMatrix?: (tenant: TenantTelemetryRecord) => void;
  onTenantUpdated?: (updated: Partial<TenantTelemetryRecord>) => void;
}

export const TenantStaffDeviceModal: React.FC<TenantStaffDeviceModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onOpenFeatureMatrix,
  onTenantUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'devices' | 'controls'>('staff');
  const [isLoading, setIsLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffUserRecord[]>([]);
  const [devicesList, setDevicesList] = useState<BoundDeviceRecord[]>([]);
  
  // Quick Controls state
  const [currentPlan, setCurrentPlan] = useState<string>(tenant.plan || 'Gold');
  const [isLocked, setIsLocked] = useState<boolean>(tenant.isHardLocked || false);
  const [expiryDate, setExpiryDate] = useState<string>(tenant.trialExpiryDate || '2028-12-31');
  const [isExtendingLicense, setIsExtendingLicense] = useState(false);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);

  // Passcode visibility per user id
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});

  // Add staff modal state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Cashier');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPasscode, setNewStaffPasscode] = useState('1234');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Reset passcode modal state
  const [resetPasscodeUser, setResetPasscodeUser] = useState<StaffUserRecord | null>(null);
  const [newPasscodeValue, setNewPasscodeValue] = useState('1234');

  // Transfer device modal state
  const [transferDevice, setTransferDevice] = useState<BoundDeviceRecord | null>(null);
  const [newHwidInput, setNewHwidInput] = useState('');
  const [newDeviceModelInput, setNewDeviceModelInput] = useState('');

  // Fetch full nested staff & devices
  const loadStaffAndDevices = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getTenantStaffAndDevices(tenant.id);
      if (data.success) {
        setStaffList(data.staff);
        setDevicesList(data.devices);
      }
    } catch (err) {
      console.warn('Failed to load nested staff and devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenant.id) {
      setCurrentPlan(tenant.plan || 'Gold');
      setIsLocked(tenant.isHardLocked || false);
      setExpiryDate(tenant.trialExpiryDate || '2028-12-31');
      loadStaffAndDevices();
    }
  }, [isOpen, tenant.id]);

  // Real-time SSE listener for staff mutation or device auth
  useEffect(() => {
    if (!isOpen) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/fleet-stream');
      
      eventSource.addEventListener('admin_event', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.tenantId === tenant.id || parsed.tenantId === 'all') {
            loadStaffAndDevices();
          }
        } catch {}
      });

      eventSource.onmessage = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.tenantId === tenant.id || parsed.tenantId === 'all') {
            loadStaffAndDevices();
          }
        } catch {}
      };
    } catch {}

    return () => {
      eventSource?.close();
    };
  }, [isOpen, tenant.id]);

  if (!isOpen) return null;

  // 1-Click Shadow Switchboard
  const handleShadowSwitch = async () => {
    const res = await adminService.impersonateTenant(tenant.id);
    if (res.success && res.dashboardUrl) {
      window.open(res.dashboardUrl, '_blank');
      emitToast(`⚡ Shadow override session launched for ${tenant.name} in new tab!`, 'success');
    } else {
      emitToast(res.error || 'Failed to launch shadow session', 'error');
    }
  };

  // 1-Click Plan Upgrade
  const handleUpgradePlan = async (newPlan: string) => {
    setIsUpgradingPlan(true);
    const ok = await adminService.upgradeTenantPlan(tenant.id, newPlan);
    if (ok) {
      setCurrentPlan(newPlan);
      onTenantUpdated?.({ plan: newPlan, planId: newPlan });
      emitToast(`🏷️ Store subscription upgraded to ${newPlan}`, 'success');
    } else {
      emitToast('Failed to upgrade plan', 'error');
    }
    setIsUpgradingPlan(false);
  };

  // 1-Click License Extension
  const handleExtendLicense = async (extType: '30_days' | '6_months' | '1_year') => {
    setIsExtendingLicense(true);
    const res = await adminService.extendTenantLicense(tenant.id, extType);
    if (res.success && res.newExpiry) {
      setExpiryDate(res.newExpiry);
      onTenantUpdated?.({ trialExpiryDate: res.newExpiry });
      emitToast(`📅 License extended to ${res.newExpiry}`, 'success');
    } else {
      emitToast('Failed to extend license', 'error');
    }
    setIsExtendingLicense(false);
  };

  // Remote Kill-Switch toggle for store
  const handleToggleStoreLock = async () => {
    const nextLock = !isLocked;
    const ok = await adminService.toggleTenantLock(tenant.id, nextLock);
    if (ok) {
      setIsLocked(nextLock);
      onTenantUpdated?.({ isHardLocked: nextLock, status: nextLock ? 'Locked' : 'Active' });
      emitToast(
        nextLock ? `⛔ Emergency Kill-Switch engaged for ${tenant.name}` : `✅ Store unlocked and restored`,
        nextLock ? 'warning' : 'success'
      );
    }
  };

  // Toggle staff status / kill-switch
  const handleToggleStaffStatus = async (user: StaffUserRecord) => {
    if (user.isPrimaryOwner || user.role === 'Owner') {
      emitToast('Primary store owner account cannot be suspended', 'warning');
      return;
    }
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    const ok = await adminService.toggleStaffStatus(tenant.id, user.id, nextStatus);
    if (ok) {
      setStaffList(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus, isKillSwitchActive: nextStatus === 'Suspended' } : u));
      emitToast(`Staff user ${user.name} is now ${nextStatus}`, nextStatus === 'Active' ? 'success' : 'warning');
    }
  };

  // Toggle staff remote kill-switch
  const handleToggleStaffKillSwitch = async (user: StaffUserRecord) => {
    if (user.isPrimaryOwner || user.role === 'Owner') {
      emitToast('Primary store owner account is immune to remote kill-switch', 'warning');
      return;
    }
    const nextKill = !user.isKillSwitchActive;
    const ok = await adminService.toggleStaffKillSwitch(tenant.id, user.id, nextKill);
    if (ok) {
      setStaffList(prev => prev.map(u => u.id === user.id ? { ...u, isKillSwitchActive: nextKill, status: nextKill ? 'Suspended' : 'Active' } : u));
      emitToast(
        nextKill ? `⛔ Remote Kill-Switch locked terminal access for ${user.name}` : `✅ Terminal access restored for ${user.name}`,
        nextKill ? 'warning' : 'success'
      );
    }
  };

  // Submit Passcode Reset
  const handleConfirmResetPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasscodeUser) return;
    const ok = await adminService.resetStaffPasscode(tenant.id, resetPasscodeUser.id, newPasscodeValue);
    if (ok) {
      setStaffList(prev => prev.map(u => u.id === resetPasscodeUser.id ? { ...u, passcode: newPasscodeValue } : u));
      emitToast(`🔑 Passcode for ${resetPasscodeUser.name} updated to "${newPasscodeValue}"`, 'success');
      setResetPasscodeUser(null);
    } else {
      emitToast('Failed to reset passcode', 'error');
    }
  };

  // Add new staff member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    setIsCreatingStaff(true);
    const ok = await adminService.createStaffUser(tenant.id, {
      name: newStaffName.trim(),
      role: newStaffRole,
      phone: newStaffPhone.trim(),
      emailOrPhone: newStaffPhone.trim(),
      passcode: newStaffPasscode.trim() || '1234'
    });
    if (ok) {
      emitToast(`✅ Created sub-user "${newStaffName}" (${newStaffRole})`, 'success');
      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffPasscode('1234');
      loadStaffAndDevices();
    } else {
      emitToast('Failed to create staff member', 'error');
    }
    setIsCreatingStaff(false);
  };

  // Revoke device access
  const handleRevokeDevice = async (device: BoundDeviceRecord) => {
    const ok = await adminService.revokeDeviceSession(tenant.id, device.id);
    if (ok) {
      setDevicesList(prev => prev.map(d => d.id === device.id ? { ...d, status: 'REVOKED' } : d));
      emitToast(`⛔ Hardware device ${device.hwid} revoked`, 'warning');
    }
  };

  // Transfer License Slot
  const handleConfirmTransferSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferDevice || !newHwidInput.trim()) return;
    const ok = await adminService.transferDeviceSlot(tenant.id, transferDevice.hwid, newHwidInput.trim(), newDeviceModelInput.trim() || 'New POS Laptop');
    if (ok) {
      emitToast(`✅ Hardware slot transferred from ${transferDevice.hwid} to ${newHwidInput.trim()}`, 'success');
      setTransferDevice(null);
      setNewHwidInput('');
      setNewDeviceModelInput('');
      loadStaffAndDevices();
    } else {
      emitToast('Failed to transfer hardware slot', 'error');
    }
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    emitToast(`📋 ${label} copied to clipboard!`, 'info');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* MODAL HEADER & TENANT SUMMARY */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {tenant.name}
                </h2>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  currentPlan === 'Platinum' || currentPlan === 'Enterprise'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : currentPlan === 'Gold' || currentPlan === 'Business'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {currentPlan} Tier
                </span>
                {isLocked ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Hard Locked
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Owner: <strong className="text-slate-200">{tenant.ownerName}</strong> ({tenant.phone})</span>
                <span className="text-slate-600">•</span>
                <span>City: <strong className="text-slate-200">{tenant.city}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-400">ID: {tenant.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* ⚡ 1-Click Shadow Switch */}
            <button
              type="button"
              onClick={handleShadowSwitch}
              className="px-3 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-300 border border-purple-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              title="Open Shadow Session without logging client out"
            >
              <Zap className="w-3.5 h-3.5 fill-purple-300" />
              <span>⚡ Shadow Switch</span>
            </button>

            {/* 🎛️ 173 Feature Switchboard */}
            {onOpenFeatureMatrix && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFeatureMatrix(tenant);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>173 Features</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QUICK MASTER COMMAND STRIP */}
        <div className="bg-slate-950/60 p-3 px-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Plan Upgrade Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Plan:
            </span>
            <div className="flex items-center gap-1">
              {['Basic', 'Silver', 'Gold', 'Platinum'].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={isUpgradingPlan}
                  onClick={() => handleUpgradePlan(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    currentPlan === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* License Date Extension */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Expiry:
            </span>
            <span className="font-mono text-emerald-400 font-bold mr-1">{expiryDate}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isExtendingLicense}
                onClick={() => handleExtendLicense('30_days')}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold cursor-pointer"
              >
                +30 Days
              </button>
              <button
                type="button"
                disabled={isExtendingLicense}
                onClick={() => handleExtendLicense('6_months')}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold cursor-pointer"
              >
                +6 Mos
              </button>
              <button
                type="button"
                disabled={isExtendingLicense}
                onClick={() => handleExtendLicense('1_year')}
                className="px-2 py-1 rounded-lg bg-indigo-950 text-indigo-300 hover:text-white border border-indigo-800 text-[10px] font-bold cursor-pointer"
              >
                +1 Year
              </button>
            </div>
          </div>

          {/* Remote Kill-Switch */}
          <button
            type="button"
            onClick={handleToggleStoreLock}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLocked
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                : 'bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900'
            }`}
          >
            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Unlock Store' : '⛔ Remote Kill-Switch'}</span>
          </button>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-2 p-3 px-5 border-b border-slate-800 bg-slate-900/90 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Sub-Users &amp; Staff Accounts ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'devices'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>💻 Bound Hardware Devices ({devicesList.length})</span>
          </button>

          <button
            type="button"
            onClick={loadStaffAndDevices}
            className="ml-auto p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* TAB 1: SUB-USERS & STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Managed Cashiers, Pharmacists, Managers and Sub-Accounts under this pharmacy
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Staff Member</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Staff Name &amp; Contact</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Passcode / PIN</th>
                    <th className="py-2.5 px-3">Live Status</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-4 text-right">Admin Remote Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {staffList.map((user) => {
                    const isPasscodeShown = Boolean(visiblePasscodes[user.id]);
                    const isOwner = user.isPrimaryOwner || user.role === 'Owner';

                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isOwner && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-bold">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {user.phone || user.emailOrPhone || user.email || 'No phone'} • ID: {user.id}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            user.role === 'Owner'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : user.role === 'Manager'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : user.role === 'Pharmacist'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Passcode with reveal & copy */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                              {isPasscodeShown ? user.passcode || '1234' : '••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisiblePasscodes(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                              className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                              title={isPasscodeShown ? 'Hide Passcode' : 'Reveal Passcode'}
                            >
                              {isPasscodeShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(user.passcode || '1234', 'Passcode')}
                              className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                              title="Copy passcode"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Live Status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                            <span className={`text-[11px] font-bold ${
                              user.status === 'Suspended' || user.isKillSwitchActive
                                ? 'text-rose-400'
                                : user.isOnline
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}>
                              {user.status === 'Suspended' || user.isKillSwitchActive ? 'Suspended' : user.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </td>

                        {/* Admin Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reset Passcode */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetPasscodeUser(user);
                                setNewPasscodeValue(user.passcode || '1234');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 cursor-pointer"
                            >
                              Reset PIN
                            </button>

                            {/* Deactivate / Kill Switch */}
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => handleToggleStaffKillSwitch(user)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  user.isKillSwitchActive || user.status === 'Suspended'
                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                                    : 'bg-rose-950/80 text-rose-400 border-rose-900 hover:bg-rose-900'
                                }`}
                                title={user.isKillSwitchActive ? 'Unlock user access' : 'Lock / kill user terminal access'}
                              >
                                {user.isKillSwitchActive || user.status === 'Suspended' ? 'Restore' : 'Kill Switch'}
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
        )}

        {/* TAB 2: DEVICE FLEET & HARDWARE WHITELIST */}
        {activeTab === 'devices' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Bound Counter POS Terminals, PCs, Laptops, and Tablets for <strong className="text-white">{tenant.name}</strong>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Terminal &amp; Operator</th>
                    <th className="py-2.5 px-3">HWID Fingerprint</th>
                    <th className="py-2.5 px-3">Device Model &amp; OS</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-4 text-right">Hardware Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {devicesList.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{dev.deviceModel}</div>
                        <div className="text-[11px] text-slate-400">{dev.userName} ({dev.userRole})</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-indigo-300 font-bold">
                        <div className="flex items-center gap-1">
                          <span>{dev.hwid}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(dev.hwid, 'HWID')}
                            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {dev.os}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-400">
                        {dev.ipAddress} ({dev.locationCity || 'Pakistan'})
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          dev.status === 'ONLINE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : dev.status === 'REVOKED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {dev.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {dev.lastActive || 'Just now'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Transfer Slot */}
                          <button
                            type="button"
                            onClick={() => {
                              setTransferDevice(dev);
                              setNewHwidInput('');
                              setNewDeviceModelInput('');
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-800 text-[11px] font-bold cursor-pointer"
                          >
                            Transfer Slot
                          </button>

                          {/* Revoke Session */}
                          <button
                            type="button"
                            disabled={dev.status === 'REVOKED'}
                            onClick={() => handleRevokeDevice(dev)}
                            className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-900 text-[11px] font-bold cursor-pointer disabled:opacity-40"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-3 px-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-mono text-[11px]">
            Real-Time MariaDB Fleet Isolation • Bound Security ID: {tenant.id}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
          >
            Close Drill-Down
          </button>
        </div>

      </div>

      {/* SUB-MODAL: ADD NEW STAFF */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add New Staff Sub-User</h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  placeholder="e.g. Muhammad Bilal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Role</label>
                <select
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Cashier">Cashier (POS Billing Only)</option>
                  <option value="Pharmacist">Pharmacist (Inventory &amp; Expiring Stock)</option>
                  <option value="Manager">Store Manager (Discounts, Returns &amp; Reports)</option>
                  <option value="Accountant">Accountant (Ledgers &amp; Bank Accounts)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Phone Number (Login ID)</label>
                <input
                  type="text"
                  value={newStaffPhone}
                  onChange={e => setNewStaffPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Initial 4-Digit Passcode / PIN</label>
                <input
                  type="text"
                  required
                  value={newStaffPasscode}
                  onChange={e => setNewStaffPasscode(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-hidden focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer"
                >
                  {isCreatingStaff ? 'Creating User...' : 'Create & Issue Passcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: RESET PASSCODE */}
      {resetPasscodeUser && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Reset Passcode for {resetPasscodeUser.name}</h3>
              <button
                type="button"
                onClick={() => setResetPasscodeUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPasscode} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">New 4-Digit Passcode</label>
                <input
                  type="text"
                  required
                  value={newPasscodeValue}
                  onChange={e => setNewPasscodeValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono font-bold text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasscodeUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: TRANSFER LICENSE SLOT */}
      {transferDevice && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Transfer Hardware License Slot</h3>
              <button
                type="button"
                onClick={() => setTransferDevice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-xl text-xs text-indigo-300">
              Transferring license slot from <strong className="font-mono">{transferDevice.hwid}</strong> to a replacement machine.
            </div>

            <form onSubmit={handleConfirmTransferSlot} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">New Machine HWID Fingerprint</label>
                <input
                  type="text"
                  required
                  value={newHwidInput}
                  onChange={e => setNewHwidInput(e.target.value)}
                  placeholder="HWID-PK99-NEW-LAPTOP"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Replacement Device Model / Station</label>
                <input
                  type="text"
                  value={newDeviceModelInput}
                  onChange={e => setNewDeviceModelInput(e.target.value)}
                  placeholder="e.g. Lenovo ThinkPad Counter 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDevice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                >
                  Confirm Slot Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
