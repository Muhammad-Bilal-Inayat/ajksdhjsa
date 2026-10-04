import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, PhoneCall, AlertTriangle } from 'lucide-react';
import { getInstallationId } from '../../lib/licenseManager';

interface EmergencyLockState {
  isLocked: boolean;
  reason?: string;
  timestamp?: string;
  installationId?: string;
}

export const EmergencyLockScreen: React.FC = () => {
  const [lockState, setLockState] = useState<EmergencyLockState | null>(() => {
    try {
      const stored = localStorage.getItem('mbi_emergency_lock_active');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    const handleTrigger = (e: any) => {
      const detail = e.detail || {};
      setLockState({
        isLocked: true,
        reason: detail.reason || 'License Expired or Suspended by Master Server',
        timestamp: new Date().toISOString(),
        installationId: detail.installationId || getInstallationId()
      });
    };

    const handleRemove = () => {
      setLockState(null);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mbi_emergency_lock_active') {
        if (e.newValue) {
          try { setLockState(JSON.parse(e.newValue)); } catch (err) {}
        } else {
          setLockState(null);
        }
      }
    };

    window.addEventListener('mbi-emergency-lock-triggered', handleTrigger);
    window.addEventListener('mbi-emergency-lock-removed', handleRemove);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('mbi-emergency-lock-triggered', handleTrigger);
      window.removeEventListener('mbi-emergency-lock-removed', handleRemove);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Never lock out the Central Master Server Admin (/server)
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/server') || window.location.pathname.startsWith('/master'))) {
    return null;
  }

  if (!lockState || !lockState.isLocked) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="max-w-xl w-full bg-slate-900 border-2 border-rose-500/80 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Red Alarm Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 px-6 py-5 border-b border-rose-700/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-400/50 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-7 h-7 text-rose-300" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-500/50">
              Central Master Server Security Lockout
            </span>
            <h1 className="text-lg font-black text-white tracking-tight pt-1">
              TERMINAL ACCESS SUSPENDED
            </h1>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="bg-rose-950/40 border border-rose-600/40 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Lockout Reason:</span>
            </div>
            <p className="text-rose-100 font-semibold leading-relaxed">
              {lockState.reason || 'Unauthorized Access Detected / License Expired / Account Frozen by Master Administration.'}
            </p>
            <div className="text-[11px] text-rose-300/80 pt-1 font-mono">
              Timestamp: {lockState.timestamp ? new Date(lockState.timestamp).toLocaleString() : new Date().toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Installation ID</span>
              <span className="text-blue-300 font-bold break-all">{lockState.installationId || getInstallationId()}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Support Hotline</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <PhoneCall className="w-3 h-3" /> 0336-4585863
              </span>
            </div>
          </div>

          {/* Super Admin Remote Lockout Notice - Strictly Unlockable Only from /server */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Station Suspended by Central Master Server</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                This workstation has been locked from the Master Server Control Panel. Terminal access can strictly only be unlocked remotely by the Master Administrator from <code className="text-blue-400 font-mono">/server</code>.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-medium">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Helpline & Support: 0336-4585863 / 0328-1302636</span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Please contact MBI INVENTRA central server administration to resume your station access.
          </div>
        </div>

      </div>
    </div>
  );
};
