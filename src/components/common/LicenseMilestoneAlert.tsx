import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  X, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Phone, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { licenseService, MilestoneCheckResult, LicenseMilestoneId } from '../../services/licenseService';

interface LicenseMilestoneAlertProps {
  onOpenActivationModal?: () => void;
}

export const LicenseMilestoneAlert: React.FC<LicenseMilestoneAlertProps> = ({
  onOpenActivationModal
}) => {
  const [milestoneData, setMilestoneData] = useState<MilestoneCheckResult>(() => 
    licenseService.getLicenseMilestoneStatus()
  );
  const [isVisible, setIsVisible] = useState(false);

  const evaluateMilestone = useCallback(() => {
    const status = licenseService.getLicenseMilestoneStatus();
    setMilestoneData(status);

    // Only show if milestone is active, not expired (expired has its own paywall lock), and not already dismissed for this threshold
    if (status.hasActiveMilestone && status.milestoneId !== 'MILESTONE_EXPIRED' && !status.isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    evaluateMilestone();

    const handleLicenseUpdate = () => {
      evaluateMilestone();
    };

    window.addEventListener('mbi-license-updated', handleLicenseUpdate);
    window.addEventListener('mbi-license-activated', handleLicenseUpdate);
    window.addEventListener('storage', handleLicenseUpdate);

    // Periodic evaluation every 30 seconds
    const timer = setInterval(evaluateMilestone, 30000);

    return () => {
      window.removeEventListener('mbi-license-updated', handleLicenseUpdate);
      window.removeEventListener('mbi-license-activated', handleLicenseUpdate);
      window.removeEventListener('storage', handleLicenseUpdate);
      clearInterval(timer);
    };
  }, [evaluateMilestone]);

  const handleDismiss = () => {
    if (milestoneData.milestoneId) {
      licenseService.dismissMilestone(milestoneData.milestoneId);
    }
    setIsVisible(false);
  };

  const handleWhatsAppRenew = () => {
    const phone = '923281302636';
    const storeName = localStorage.getItem('mbi_active_business_name') || 'Our Pharmacy';
    const text = encodeURIComponent(
      `Salam MBI Support! Our pharmacy "${storeName}" has ${milestoneData.daysRemaining} days remaining on our MBI INVENTRA license (Expiry Date: ${milestoneData.expiryDate}). We want to renew our subscription. Please share payment details.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    handleDismiss();
  };

  if (!isVisible || !milestoneData.hasActiveMilestone) {
    return null;
  }

  const isCritical = milestoneData.severity === 'critical';
  const isWarning = milestoneData.severity === 'warning';

  const badgeColor = isCritical 
    ? 'bg-rose-500 text-white' 
    : isWarning 
      ? 'bg-amber-500 text-white' 
      : 'bg-blue-600 text-white';

  const glowBorder = isCritical
    ? 'border-rose-500/80 shadow-rose-500/20'
    : isWarning
      ? 'border-amber-500/80 shadow-amber-500/20'
      : 'border-blue-500/80 shadow-blue-500/20';

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 ${glowBorder} overflow-hidden animate-in zoom-in-95 duration-200 p-6 sm:p-7 space-y-5`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge & Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isCritical ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : isWarning ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'}`}>
              {isCritical ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${badgeColor}`}>
                <Clock className="w-3 h-3" />
                {milestoneData.daysRemaining} Days Remaining
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                ⚠️ License Renewal Notice — {milestoneData.daysRemaining} Days Remaining
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            title="Dismiss Notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Body Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            Your <span className="font-bold text-slate-900 dark:text-white">MBI INVENTRA</span> subscription will expire on <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{milestoneData.expiryDate}</span>. Please contact MBI Support at <span className="font-bold text-slate-900 dark:text-white">0328-1302636</span> to renew your plan and avoid any service interruptions.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expiry: <strong className="text-slate-900 dark:text-white">{milestoneData.expiryDate}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Helpline: <strong className="text-slate-900 dark:text-white">0328-1302636</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleWhatsAppRenew}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Renew on WhatsApp</span>
          </button>

          {onOpenActivationModal && (
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                onOpenActivationModal();
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enter Key</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <span>Dismiss Notice</span>
          </button>
        </div>

        {/* Subtitle assurance */}
        <div className="text-center">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            ✓ 1-Time Milestone Warning. This alert will not appear again until the next expiry threshold.
          </span>
        </div>
      </div>
    </div>
  );
};
