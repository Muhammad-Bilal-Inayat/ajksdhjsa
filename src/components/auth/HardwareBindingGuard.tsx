import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Laptop, Smartphone, Monitor, RefreshCw, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { getSystemHWIDSync, getHardwareFingerprint } from '../../lib/hardwareFingerprint';
import { getLocalInstallationId, detectCurrentDeviceInfo } from '../../lib/deviceSecurityService';
import { useAuth } from '../../contexts/AuthContext';

export interface HardwareBindingGuardProps {
  children: React.ReactNode;
  tenantId?: string;
  userId?: string;
  onAuthorized?: () => void;
}

export const HardwareBindingGuard: React.FC<HardwareBindingGuardProps> = ({
  children,
  tenantId: propTenantId,
  userId: propUserId,
  onAuthorized
}) => {
  const { tenant, business, currentUser, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string>('');
  const [currentHwid, setCurrentHwid] = useState<string>('');
  const [boundCount, setBoundCount] = useState<number>(1);
  const [maxTerminals, setMaxTerminals] = useState<number>(2);

  useEffect(() => {
    let isMounted = true;

    const verifyDevice = async () => {
      try {
        let hwid = '';
        try {
          hwid = await getHardwareFingerprint();
        } catch {
          hwid = getLocalInstallationId() || getSystemHWIDSync();
        }

        if (!hwid) {
          hwid = `HWID-DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        if (isMounted) {
          setCurrentHwid(hwid);
        }

        const effectiveTenant = tenant || business;
        const currentTenantId = propTenantId || effectiveTenant?.id || effectiveTenant?.tenantId || localStorage.getItem('mbi_active_business_id') || 'tenant_main_pharmacy';
        const license = (effectiveTenant as any)?.license || (effectiveTenant as any)?.licenseInfo;
        const planTier = (effectiveTenant as any)?.plan || license?.plan_tier || license?.plan || 'trial';

        // 1. If currently registering, free trial, or demo session -> Auto-Authorize immediately
        const isNewUserOrTrial = !license || planTier === 'trial' || planTier === 'Basic' || planTier === 'Standard POS';

        let boundList: string[] = [];
        const rawBound = license?.bound_hardware_ids || license?.boundHardwareIds;
        if (typeof rawBound === 'string') {
          try {
            boundList = JSON.parse(rawBound);
          } catch (e) {
            boundList = rawBound.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(rawBound)) {
          boundList = [...rawBound];
        }

        // Filter out dummy/placeholder values
        boundList = boundList.filter(id => id && id !== 'HWID-PRIMARY-DEVICE' && id !== 'HWID-LOCAL');

        // Check local storage bound hardware cache
        const localBoundHwid = localStorage.getItem('mbi_bound_hwid');
        if (localBoundHwid && !boundList.includes(localBoundHwid)) {
          boundList.push(localBoundHwid);
        }

        const terminalLimit = license?.max_terminals || license?.maxDevices || (planTier === 'Platinum' ? 10 : planTier === 'Gold' ? 5 : 2);
        if (isMounted) {
          setMaxTerminals(terminalLimit);
        }

        // 2. RULE: If no devices bound yet OR device already in list OR new user / trial -> 100% AUTHORIZED
        if (boundList.length === 0 || boundList.includes(hwid) || isNewUserOrTrial) {
          // Auto-bind this device into storage & cache
          if (!boundList.includes(hwid)) {
            boundList.push(hwid);
            try {
              localStorage.setItem('mbi_bound_hwid', hwid);
            } catch {}

            // Fire background sync to update license in DB
            fetch('/api/license/auto-bind-primary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                hwid,
                tenantId: currentTenantId,
                userId: propUserId || (currentUser as any)?.uid || (currentUser as any)?.id || 'user_active',
                deviceModel: detectCurrentDeviceInfo().suggestedName,
                os: detectCurrentDeviceInfo().os
              })
            }).catch(() => {});
          }

          if (isMounted) {
            setBoundCount(boundList.length || 1);
            setIsLocked(false);
            setIsChecking(false);
            onAuthorized?.();
          }
          return;
        }

        // 3. RULE: If slots are available (< max_terminals) -> Auto-bind terminal
        if (boundList.length < terminalLimit) {
          boundList.push(hwid);
          try {
            localStorage.setItem('mbi_bound_hwid', hwid);
          } catch {}

          fetch('/api/license/auto-bind-primary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hwid,
              tenantId: currentTenantId,
              userId: propUserId || (currentUser as any)?.uid || (currentUser as any)?.id || 'user_active',
              deviceModel: detectCurrentDeviceInfo().suggestedName,
              os: detectCurrentDeviceInfo().os
            })
          }).catch(() => {});

          if (isMounted) {
            setBoundCount(boundList.length);
            setIsLocked(false);
            setIsChecking(false);
            onAuthorized?.();
          }
          return;
        }

        // 4. Fallback server verification check
        try {
          const deviceInfo = detectCurrentDeviceInfo();
          const response = await fetch('/api/license/verify-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: currentTenantId,
              userId: propUserId || (currentUser as any)?.uid || (currentUser as any)?.id || 'user_active',
              hwid,
              deviceModel: deviceInfo.suggestedName,
              os: deviceInfo.os
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.authorized) {
              if (isMounted) {
                setIsLocked(false);
                setBoundCount(data.totalBound || boundList.length);
                setMaxTerminals(data.maxDevices || terminalLimit);
                setIsChecking(false);
                onAuthorized?.();
              }
              return;
            }
          }
        } catch {}

        // 5. ONLY lock if limit strictly exceeded AND device is unknown
        if (isMounted) {
          setIsLocked(true);
          setLockReason(`Terminal authorization limit reached (${boundList.length}/${terminalLimit} active terminals).`);
          setBoundCount(boundList.length);
          setIsChecking(false);
        }
      } catch (err) {
        // On any error, default to allowing access rather than locking the user
        if (isMounted) {
          setIsLocked(false);
          setIsChecking(false);
        }
      }
    };

    if (!loading) {
      verifyDevice();
    }
  }, [tenant, business, currentUser, loading, propTenantId, propUserId]);

  const handleForceBind = async () => {
    try {
      setIsChecking(true);
      const activeTenant = propTenantId || tenant?.id || business?.id || localStorage.getItem('mbi_active_business_id') || 'tenant_main_pharmacy';
      const response = await fetch('/api/license/bind-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeTenant,
          hwid: currentHwid,
          override: true
        })
      });

      if (response.ok) {
        try {
          localStorage.setItem('mbi_bound_hwid', currentHwid);
        } catch {}
        setIsLocked(false);
      }
    } catch (e) {
      setIsLocked(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Terminal Authorization Guard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lockReason || `This device is awaiting hardware license binding (${boundCount}/${maxTerminals} active terminals).`}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Terminal HWID:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{currentHwid}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">Terminal Limit Reached</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleForceBind}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorize This Terminal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default HardwareBindingGuard;
