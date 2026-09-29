import React, { useState, useEffect } from 'react';
import { 
  Key, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, X, 
  HardDrive, Lock, PhoneCall, MessageSquare, Copy, Check, Sparkles, ExternalLink
} from 'lucide-react';
import { licenseService, SUPPORT_HOTLINES } from '../../services/licenseService';
import { getInstallationId, getLicenseInfo, LicenseInfo } from '../../lib/licenseManager';
import { emitToast } from '../../contexts/ToastContext';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  isHardLock?: boolean;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isHardLock = false,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [trialStatus, setTrialStatus] = useState(() => licenseService.getTrialStatus());

  const installationId = getInstallationId();

  useEffect(() => {
    if (isOpen) {
      setTrialStatus(licenseService.getTrialStatus());
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Handle escape key: prevent closing if hard-locked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isHardLock && onClose) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isHardLock, onClose]);

  if (!isOpen) return null;

  const handleCopyInstallationId = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(installationId);
      setCopiedId(true);
      emitToast('Installation ID copied to clipboard', 'info');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleFormatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInputKey(val);
  };

  const handleValidateAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim().toUpperCase();

    if (!clean) {
      setStatusMessage({ text: 'Please enter your License Key.', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setStatusMessage(null);

    try {
      const result = await licenseService.validateAndActivateLicense(clean);

      if (result.success) {
        setStatusMessage({
          text: result.message || 'License verified and unlocked successfully!',
          type: 'success'
        });
        emitToast(result.message || 'Software activated successfully!', 'success');

        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1200);
      } else {
        setStatusMessage({
          text: result.message || 'Invalid or unregistered License Key. Please contact support.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'Verification connection failed. Please verify key or network.',
        type: 'error'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickKeyFill = (key: string) => {
    setInputKey(key);
    setStatusMessage(null);
  };

  return (
    <div 
      id="license-activation-modal-backdrop"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={() => {
        // Prevent dismissal on backdrop click if in hard-lock mode
        if (!isHardLock && onClose) onClose();
      }}
    >
      <div 
        id="license-activation-modal"
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className={`p-6 sm:p-7 text-white relative ${
          isHardLock 
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-700' 
            : 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900'
        }`}>
          {/* Close button: ONLY if NOT in hard-lock mode */}
          {!isHardLock && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start gap-4">
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isHardLock ? 'bg-black/30 border border-white/30 text-amber-200' : 'bg-blue-600 text-white'
            }`}>
              {isHardLock ? <Lock className="w-7 h-7 text-amber-200" /> : <Key className="w-7 h-7 text-white" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isHardLock 
                    ? 'bg-black/30 border-white/30 text-amber-200' 
                    : 'bg-blue-500/20 border-blue-400/30 text-blue-200'
                }`}>
                  {isHardLock ? 'HARD LOCK PAYWALL' : 'LICENSE ACTIVATION'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isHardLock 
                  ? '🔒 Your 10-Day Free Trial Has Expired' 
                  : '🔑 Activate MBI INVENTRA License'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-100/90 leading-relaxed">
                {isHardLock 
                  ? 'To continue using MBI INVENTRA and access your pharmacy data please enter your License Key provided by MBI Support.' 
                  : 'Enter your valid product key to unlock Silver, Gold, or Platinum plan features.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <div className="leading-snug">{statusMessage.text}</div>
            </div>
          )}

          {/* WhatsApp Support Hotline Quick Cards */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp Support Hotline:
              </span>
              <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Instant Response
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORT_HOTLINES.map((hotline) => (
                <a
                  key={hotline.phone}
                  href={licenseService.getWhatsAppLink(hotline.raw, trialStatus.customerName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all hover:shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <span>{hotline.phone}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                </a>
              ))}
            </div>
          </div>

          {/* Installation HWID Box */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-500" /> Installation ID:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                {installationId}
              </span>
              <button
                type="button"
                onClick={handleCopyInstallationId}
                className="p-1 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                title="Copy Installation ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* License Key Input Form */}
          <form onSubmit={handleValidateAndActivate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                License Key Input Field
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputKey}
                  onChange={handleFormatInput}
                  placeholder="MBI-XXXX-XXXX-XXXX"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 rounded-2xl font-mono font-black text-base text-slate-900 dark:text-white tracking-widest uppercase transition-all shadow-inner focus:outline-none"
                />
                <Key className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official format: <code className="font-mono text-blue-600 dark:text-blue-400 font-bold">MBI-XXXX-XXXX-XXXX</code>. Verified against MariaDB table <code className="font-mono text-slate-700 dark:text-slate-300 font-bold">mbi_licenses</code>.
              </p>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isVerifying || !inputKey.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-sm tracking-wide shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying License with MariaDB...</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5 text-amber-300" />
                  <span>🔑 Validate & Activate Software</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Buttons for Developer Testing */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Available Test License Tiers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickKeyFill('MBI-SILV-2026-9901')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Silver Plan Key
              </button>
              <button
                type="button"
                onClick={() => handleQuickKeyFill('MBI-GOLD-2026-8802')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-800 cursor-pointer"
              >
                Gold Plan Key
              </button>
              <button
                type="button"
                onClick={() => handleQuickKeyFill('MBI-PLAT-2026-7703')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-200 dark:border-purple-800 cursor-pointer"
              >
                Platinum Plan Key
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LicenseActivationModal;
