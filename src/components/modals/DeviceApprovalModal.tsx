import React, { useState, useEffect } from 'react';
import { 
  Laptop, ShieldAlert, Lock, MessageSquare, Copy, Check, 
  RefreshCw, ExternalLink, HardDrive, Key, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { deviceSecurityService, DeviceAuthStatus, SUPPORT_HOTLINES } from '../../services/deviceSecurityService';
import { syncEngine } from '../../lib/syncEngine';
import { emitToast } from '../../contexts/ToastContext';

export interface DeviceApprovalModalProps {
  tenantId?: string;
  userId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const DeviceApprovalModal: React.FC<DeviceApprovalModalProps> = ({
  tenantId,
  userId,
  isOpen = true,
  onClose
}) => {
  const [authStatus, setAuthStatus] = useState<DeviceAuthStatus>(() => 
    deviceSecurityService.checkDeviceAuthorization(tenantId, userId)
  );
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [enteredKey, setEnteredKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCheck = () => {
      const status = deviceSecurityService.checkDeviceAuthorization(tenantId, userId);
      setAuthStatus(status);
    };

    const handleDeviceApproved = async (e: any) => {
      const approvedTenant = e?.detail?.tenantId || tenantId;
      setIsRestoring(true);
      setRestoreMessage('Device approved by Master Admin! Restoring complete pharmacy data from Cloud MariaDB...');
      
      const res = await syncEngine.restoreTenantCloudData(approvedTenant, true);
      setIsRestoring(false);
      
      if (res.success) {
        emitToast(`Data restored: ${res.count} records synchronized!`, 'success');
        setAuthStatus(deviceSecurityService.checkDeviceAuthorization(tenantId, userId));
        if (onClose) onClose();
      }
    };

    const verifyCloudStatus = async () => {
      try {
        const response = await fetch('/api/license/verify-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenantId || localStorage.getItem('mbi_active_business_id') || 'tenant_main',
            userId: userId || 'user_active',
            hwid: authStatus.hwid
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.authorized) {
            try {
              localStorage.setItem('mbi_bound_hwid', authStatus.hwid);
            } catch {}
            setAuthStatus({
              isAuthorized: true,
              hwid: authStatus.hwid,
              currentHwid: authStatus.hwid,
              boundHwid: authStatus.hwid,
              reason: null
            });
            if (onClose) onClose();
          }
        }
      } catch {}
    };

    if (!authStatus.isAuthorized) {
      verifyCloudStatus();
    }

    window.addEventListener('mbi-devices-updated', handleCheck);
    window.addEventListener('mbi-device-authorized', handleDeviceApproved);
    window.addEventListener('storage', handleCheck);

    const interval = setInterval(() => {
      handleCheck();
      if (!authStatus.isAuthorized) {
        verifyCloudStatus();
      }
    }, 4000);

    return () => {
      window.removeEventListener('mbi-devices-updated', handleCheck);
      window.removeEventListener('mbi-device-authorized', handleDeviceApproved);
      window.removeEventListener('storage', handleCheck);
      clearInterval(interval);
    };
  }, [tenantId, userId, onClose, authStatus.hwid, authStatus.isAuthorized]);

  if (!isOpen || authStatus.isAuthorized) {
    return null;
  }

  const handleCopyHwid = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(authStatus.hwid);
      setCopiedHwid(true);
      emitToast('Device HWID copied to clipboard', 'info');
      setTimeout(() => setCopiedHwid(false), 2000);
    }
  };

  const handleActivateNewDevice = async () => {
    if (!enteredKey.trim()) {
      emitToast('Please enter your Multi-Device License Key.', 'warning');
      return;
    }

    setIsActivating(true);
    try {
      const result = await deviceSecurityService.activateDeviceWithKey(enteredKey, tenantId);
      if (result.success) {
        emitToast(result.message, 'success');
        setIsRestoring(true);
        setRestoreMessage('License verified! Restoring cloud database onto this device...');
        await syncEngine.restoreTenantCloudData(tenantId, true);
        setAuthStatus(deviceSecurityService.checkDeviceAuthorization(tenantId, userId));
        if (onClose) onClose();
      } else {
        emitToast(result.message, 'error');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Activation failed', 'error');
    } finally {
      setIsActivating(false);
      setIsRestoring(false);
    }
  };

  const handleManualCheckApproval = async () => {
    setIsRestoring(true);
    const status = deviceSecurityService.checkDeviceAuthorization(tenantId, userId);
    setAuthStatus(status);

    if (status.isAuthorized) {
      setRestoreMessage('Device approved! Restoring cloud database...');
      await syncEngine.restoreTenantCloudData(tenantId, true);
      emitToast('Device unlocked & data restored!', 'success');
      if (onClose) onClose();
    } else {
      emitToast('Device is still awaiting Master Admin approval or license key entry.', 'warning');
    }
    setIsRestoring(false);
  };

  const defaultWhatsappMsg = encodeURIComponent(
    `Salam! I am trying to log in on a new device. Device ID: [${authStatus.hwid}]. Please approve this device or transfer my active pharmacy license.`
  );

  return (
    <div 
      id="device-approval-modal-backdrop"
      className="fixed inset-0 z-[999998] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
    >
      <div 
        id="device-approval-modal"
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border-2 border-amber-500/80 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header Strip */}
        <div className="p-5 sm:p-6 text-white bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 relative">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/30 text-amber-200 flex items-center justify-center shrink-0 shadow-lg">
              <Laptop className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/30 border border-white/30 text-amber-200">
                HARDWARE BINDING GUARD
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                🔒 New Device Detected
              </h2>
              <p className="text-xs text-slate-100/90 leading-relaxed">
                Enter your License Key below or contact Master Support for instant hardware approval.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* HWID Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 font-bold leading-relaxed space-y-1">
            <p>
              🔒 Device Fingerprint: <code className="font-mono bg-white dark:bg-slate-950 px-2 py-0.5 rounded text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">{authStatus.hwid}</code>
            </p>
            <p className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
              Your Primary Device (Device-1) is bound. To authorize this additional terminal, enter your License Key or request Master Admin approval.
            </p>
          </div>

          {/* DEDICATED LICENSE KEY ACTIVATION BOX */}
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Have a Multi-Device License Key?</span>
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="MBI-XXXX-XXXX-XXXX" 
                value={enteredKey} 
                onChange={(e) => setEnteredKey(e.target.value)}
                className="flex-1 px-3 py-2 text-xs uppercase font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="button"
                disabled={isActivating || !enteredKey.trim()}
                onClick={handleActivateNewDevice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isActivating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>🔑 Activate</span>}
              </button>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              Entering a valid key automatically registers this HWID and unlocks the terminal instantly.
            </span>
          </div>

          {/* HWID Copy Box */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">DEVICE HARDWARE ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs truncate block">
                  {authStatus.hwid}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyHwid}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:border-blue-500 transition-all cursor-pointer shrink-0 ml-2"
            >
              {copiedHwid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHwid ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* WhatsApp Support Direct Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Or Contact Master Support:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORT_HOTLINES.map(h => (
                <a
                  key={h.phone}
                  href={`https://wa.me/${h.raw}?text=${defaultWhatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-black text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{h.phone}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          {restoreMessage && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{restoreMessage}</span>
            </div>
          )}

          {/* Check Status Button */}
          <button
            type="button"
            onClick={handleManualCheckApproval}
            disabled={isRestoring}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Checking Approval...' : 'Check Approval Status & Unlock'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceApprovalModal;
