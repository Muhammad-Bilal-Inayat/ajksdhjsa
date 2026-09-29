import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Key, Smartphone, QrCode, 
  CheckCircle2, X, RefreshCw, Copy, Check, Lock, Unlock, AlertTriangle, Info
} from 'lucide-react';
import { 
  generateBase32Secret, 
  buildOtpauthUri, 
  generateTotpQrDataUrl, 
  verifyTotpToken 
} from '../../services/totpService';
import { emitToast } from '../../contexts/ToastContext';

export interface Master2faConfig {
  enabled: boolean;
  secret: string;
  activatedAt?: string;
  emergencyKey: string;
}

const STORAGE_KEY = 'mbi_master_2fa_config';
const DEFAULT_EMERGENCY_KEY = '03082003';

export const Master2faSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<Master2faConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      enabled: false,
      secret: '',
      emergencyKey: DEFAULT_EMERGENCY_KEY,
    };
  });

  // Setup Flow State
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [tempSecret, setTempSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedEmergency, setCopiedEmergency] = useState(false);

  // Fetch initial config from server if online
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/system/master-2fa-config')
        .then(r => r.json())
        .then(data => {
          if (data && data.success && data.config) {
            setConfig(data.config);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Start Setup Flow
  const handleStartSetup = async () => {
    const newSecret = generateBase32Secret(20);
    setTempSecret(newSecret);
    setConfirmationCode('');
    setVerificationError(null);
    setIsSettingUp(true);

    const otpauth = buildOtpauthUri(newSecret, 'SuperAdmin', 'MBI Inventra Master Hub');
    try {
      const qrUrl = await generateTotpQrDataUrl(otpauth);
      setQrDataUrl(qrUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  // Verify and Activate 2FA
  const handleVerifyAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);
    setIsVerifying(true);

    try {
      // 1. Verify code matches secret
      const isValid = await verifyTotpToken(confirmationCode, tempSecret);
      if (!isValid && confirmationCode.trim() !== DEFAULT_EMERGENCY_KEY) {
        setVerificationError('Invalid 6-digit code. Check your Google Authenticator app and try again.');
        setIsVerifying(false);
        return;
      }

      const newConfig: Master2faConfig = {
        enabled: true,
        secret: tempSecret,
        activatedAt: new Date().toISOString(),
        emergencyKey: DEFAULT_EMERGENCY_KEY,
      };

      setConfig(newConfig);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));

      // Push to backend
      try {
        await fetch('/api/admin/system/master-2fa-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });
      } catch {}

      setIsSettingUp(false);
      emitToast('✅ Google Authenticator 2FA Activated for Master Hub!', 'success');
    } catch (err: any) {
      setVerificationError(err?.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Disable 2FA
  const handleDisable2fa = async () => {
    if (!window.confirm('Are you sure you want to disable Google Authenticator 2FA for the Master Command Center?')) {
      return;
    }

    const disabledConfig: Master2faConfig = {
      enabled: false,
      secret: '',
      emergencyKey: DEFAULT_EMERGENCY_KEY,
    };

    setConfig(disabledConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(disabledConfig));

    try {
      await fetch('/api/admin/system/master-2fa-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disabledConfig),
      });
    } catch {}

    emitToast('Google Authenticator 2FA disabled for Master Hub.', 'info');
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(tempSecret || config.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyEmergency = () => {
    navigator.clipboard.writeText(DEFAULT_EMERGENCY_KEY);
    setCopiedEmergency(true);
    setTimeout(() => setCopiedEmergency(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${config.enabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'}`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Master 2FA &amp; Google Authenticator</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${config.enabled ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {config.enabled ? 'ACTIVE / ENFORCED' : 'DISABLED'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Time-based One-Time Password (TOTP RFC 6238) for /server Super Admin Hub
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Toggle Status Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <strong className="text-sm font-bold block text-slate-900 dark:text-white">
              Google Authenticator 2-Factor Authentication
            </strong>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Require a live 6-digit TOTP code on every login to <code className="font-mono text-amber-600 dark:text-amber-400">/server</code>
            </p>
          </div>
          
          {config.enabled ? (
            <button
              type="button"
              onClick={handleDisable2fa}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-xs cursor-pointer transition-all"
            >
              Turn OFF
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSetup}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Turn ON</span>
            </button>
          )}
        </div>

        {/* Setup Modal Form (When Turning ON) */}
        {isSettingUp && (
          <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-emerald-500/30 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <QrCode className="w-4 h-4" />
              <span>Step 1: Scan QR Code with Google Authenticator or Microsoft Authenticator</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="TOTP QR Code" className="w-36 h-36 rounded-lg bg-white p-1 border shadow-xs" />
              ) : (
                <div className="w-36 h-36 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center animate-pulse text-xs text-slate-400">
                  Generating QR...
                </div>
              )}

              <div className="flex-1 space-y-2 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Open your mobile authenticator app, tap <strong>+ Add Account</strong> &gt; <strong>Scan QR Code</strong>.
                </p>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Or enter manual key:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg font-mono text-amber-600 dark:text-amber-400 font-bold text-xs tracking-wider border border-slate-200 dark:border-slate-800 select-all">
                      {tempSecret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer"
                      title="Copy Key"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Confirm 6-Digit Code */}
            <form onSubmit={handleVerifyAndActivate} className="space-y-3 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Step 2: Enter the 6-digit live code from your app to activate:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={confirmationCode}
                  onChange={(e) => {
                    setConfirmationCode(e.target.value.replace(/\D/g, ''));
                    setVerificationError(null);
                  }}
                  placeholder="123456"
                  className="w-44 text-center font-mono text-xl tracking-widest font-black py-2 px-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={confirmationCode.length !== 6 || isVerifying}
                  className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isVerifying ? 'Verifying...' : 'Verify & Enable 2FA'}</span>
                </button>
              </div>

              {verificationError && (
                <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Emergency Bypass Info Card */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
            <Key className="w-4 h-4" />
            <span>Master Emergency Bypass Key</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            If your mobile device is lost or unavailable, you can always use the Emergency Recovery Key to bypass 2FA at the Master Login screen:
          </p>
          <div className="flex items-center gap-2 pt-1">
            <code className="bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl font-mono text-amber-600 dark:text-amber-400 font-black text-sm tracking-widest border border-amber-500/40 select-all">
              {DEFAULT_EMERGENCY_KEY}
            </code>
            <button
              type="button"
              onClick={handleCopyEmergency}
              className="p-1.5 rounded-lg bg-amber-100 dark:bg-slate-800 hover:bg-amber-200 text-amber-900 dark:text-amber-300 cursor-pointer"
              title="Copy Emergency Key"
            >
              {copiedEmergency ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
