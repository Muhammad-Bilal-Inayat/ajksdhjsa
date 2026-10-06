import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, X, ArrowRight, ShieldCheck, Zap, 
  CreditCard, Printer, CheckCircle2, ChevronRight
} from 'lucide-react';

export interface HomePagePopupConfig {
  id: string;
  enabled: boolean;
  title: string;
  subtitle?: string;
  body: string;
  badgeText?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  type?: 'special_offer' | 'feature_update' | 'critical_notice' | 'info';
  autoShowDelayMs?: number;
  updatedAt?: string;
}

export const HomePagePopupModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [popup, setPopup] = useState<HomePagePopupConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check if current route is strictly Home / Landing Page (Never show on POS, Dashboard, Server, etc.)
  const isHomePage = () => {
    const p = location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return p === '/' || p === '/home' || p === '/site' || p === '/landing';
  };

  const fetchPopupConfig = async () => {
    if (!isHomePage()) {
      setIsOpen(false);
      return;
    }

    try {
      let res = await fetch('/api/homepage-popup');
      if (!res.ok) {
        res = await fetch('/api/public/homepage-popup');
      }
      if (res.ok) {
        const data = await res.json();
        const conf: HomePagePopupConfig = data.popup;
        if (conf && conf.enabled) {
          setPopup(conf);
          const dismissedKey = `mbi_home_popup_dismissed_${conf.id}`;
          const isDismissed = sessionStorage.getItem(dismissedKey) || localStorage.getItem(dismissedKey);
          if (!isDismissed) {
            const delay = Number(conf.autoShowDelayMs) || 1200;
            setTimeout(() => {
              if (isHomePage()) {
                setIsOpen(true);
              }
            }, delay);
          }
        } else {
          setIsOpen(false);
        }
      }
    } catch (e) {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchPopupConfig();

    // Listen to real-time updates when Master Admin updates the Home Page popup
    const handleHomePopupUpdate = (e: any) => {
      const updated = e?.detail?.payload || e?.detail;
      if (updated && updated.id) {
        setPopup(updated);
        if (updated.enabled && isHomePage()) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } else {
        fetchPopupConfig();
      }
    };

    window.addEventListener('mbi-homepage-popup-updated' as any, handleHomePopupUpdate);
    return () => {
      window.removeEventListener('mbi-homepage-popup-updated' as any, handleHomePopupUpdate);
    };
  }, [location.pathname]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, popup]);

  if (!isOpen || !popup || !popup.enabled || !isHomePage()) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    if (popup.id) {
      sessionStorage.setItem(`mbi_home_popup_dismissed_${popup.id}`, 'true');
    }
  };

  const handleCtaClick = () => {
    handleClose();
    const url = popup.ctaUrl || '/register';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const isDummyText = (txt?: string) => {
    if (!txt) return true;
    const clean = txt.trim().toLowerCase();
    return clean === 'hi' || clean === 'test' || clean === 'hello' || clean.length < 3;
  };

  const badgeText = (!isDummyText(popup.badgeText) ? popup.badgeText : null) || 'FREE 10-DAY FULL ACCESS TRIAL';
  const displayTitle = (!isDummyText(popup.title) ? popup.title : null) || 'Transform Your Pharmacy With MBI INVENTRA';
  const displaySubtitle = (!isDummyText(popup.subtitle) ? popup.subtitle : null) || 'Pakistan\'s #1 Next-Gen Pharmacy POS & Multi-Branch Cloud ERP';
  const displayBody = (!isDummyText(popup.body) ? popup.body : null) || 'Join 1,000+ successful pharmacies nationwide. Experience ultra-fast 0.2s thermal billing, automated FEFO expiry radar, and 100% offline desktop sync.';
  const ctaLabel = (!isDummyText(popup.ctaLabel) ? popup.ctaLabel : null) || 'Claim 10-Day Free Trial';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Header with ambient luminous mesh */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-800 text-white overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-400/25 rounded-full blur-xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer z-10"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/30 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{badgeText}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            {displayTitle}
          </h3>

          {/* Subtitle */}
          {displaySubtitle && (
            <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-1.5 leading-relaxed">
              {displaySubtitle}
            </p>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900">
          {/* Optional Banner Image */}
          {popup.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs max-h-44 bg-slate-100 dark:bg-slate-950">
              <img 
                src={popup.imageUrl} 
                alt={displayTitle}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Body Description */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
            {displayBody}
          </p>

          {/* 4 Feature Value Pills */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">100% Free Full Access</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">0ms Offline POS Sync</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">No Card Required</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Thermal &amp; A4 Printing</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-full sm:flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer group"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto py-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer text-center"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

