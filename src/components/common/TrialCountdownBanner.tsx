import React, { useState, useEffect } from 'react';
import { Clock, Key, ArrowRight, ShieldCheck, Sparkles, MessageSquare, PhoneCall, X } from 'lucide-react';
import { licenseService, TrialStatus, SUPPORT_HOTLINES } from '../../services/licenseService';

interface TrialCountdownBannerProps {
  onOpenLicenseModal?: () => void;
  className?: string;
}

export const TrialCountdownBanner: React.FC<TrialCountdownBannerProps> = ({
  onOpenLicenseModal,
  className = ''
}) => {
  const [status, setStatus] = useState<TrialStatus>(() => licenseService.getTrialStatus());
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const update = () => {
      setStatus(licenseService.getTrialStatus());
    };

    update();
    const interval = setInterval(update, 60000); // Check every minute

    window.addEventListener('mbi-license-updated', update);
    window.addEventListener('mbi-license-activated', update);
    window.addEventListener('mbi-trial-updated', update);
    window.addEventListener('storage', update);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mbi-license-updated', update);
      window.removeEventListener('mbi-license-activated', update);
      window.removeEventListener('mbi-trial-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  // Do not show banner if paid perpetual/annual license is active or trial expired (expired triggers full hard lock modal)
  if (!status.isTrial || status.paidLicenseActive || status.isExpired || isDismissed) {
    return null;
  }

  const daysText = status.daysRemaining === 1 
    ? '1 Day Remaining' 
    : `${status.daysRemaining} Days Remaining`;

  return (
    <div 
      id="trial-countdown-strip"
      role="banner"
      className={`relative w-full bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-3 sm:px-4 py-1.5 border-b border-blue-500/30 shadow-md text-xs z-40 select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Countdown Text */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30 shrink-0">
            <Clock className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
          </span>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-extrabold text-blue-200 tracking-tight flex items-center gap-1.5">
              <span>⏱️ Free Trial Active:</span>
              <span className="bg-blue-600/40 text-blue-100 px-2 py-0.5 rounded-full border border-blue-400/30 font-black text-[11px]">
                {daysText}
              </span>
            </span>
            <span className="text-slate-300 hidden md:inline text-[11.5px]">
              — Upgrade anytime to keep your business uninterrupted.
            </span>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* WhatsApp Support Hotline Shortcut */}
          <a
            href={licenseService.getWhatsAppLink(SUPPORT_HOTLINES[0].raw, status.customerName)}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat with MBI Support Hotline on WhatsApp"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-emerald-400" />
            <span>0328-1302636</span>
          </a>

          {/* Activate License Key Button */}
          <button
            type="button"
            onClick={onOpenLicenseModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer border border-blue-400/40"
          >
            <Key className="w-3.5 h-3.5 text-amber-300" />
            <span>Activate License Key</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {/* Discreet close banner icon */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Minimize banner"
            aria-label="Minimize"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default TrialCountdownBanner;
