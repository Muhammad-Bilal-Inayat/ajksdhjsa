import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, X, ArrowRight, ShieldCheck, Zap, 
  CreditCard, Printer, CheckCircle2, ChevronRight, PhoneCall, ExternalLink
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
  ctaStyle?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  secondaryCtaType?: 'dismiss' | 'whatsapp' | 'link';
  themePreset?: string;
  gradientFrom?: string;
  gradientTo?: string;
  badgeColor?: string;
  showCountdown?: boolean;
  countdownLabel?: string;
  countdownTarget?: string;
  featureTags?: string[];
  animationStyle?: 'zoom_bounce' | 'slide_up' | 'fade_in' | 'flip_3d';
  frequency?: 'every_visit' | 'once_per_session' | 'once_per_day';
  autoDismissSeconds?: number;
  soundEffect?: boolean;
  type?: 'special_offer' | 'feature_update' | 'critical_notice' | 'info';
  autoShowDelayMs?: number;
  updatedAt?: string;
}

export const HomePagePopupModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [popup, setPopup] = useState<HomePagePopupConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; ended: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    ended: false
  });

  // Check if current route is strictly Home / Landing Page (Never show on POS, Dashboard, Server, etc.)
  const isHomePage = () => {
    const p = location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return p === '/' || p === '/home' || p === '/site' || p === '/landing';
  };

  const checkFrequencyDismissed = (conf: HomePagePopupConfig) => {
    const freq = conf.frequency || 'once_per_session';
    const key = `mbi_home_popup_dismissed_${conf.id}`;
    
    if (freq === 'every_visit') {
      return false;
    }
    
    if (freq === 'once_per_session') {
      return !!sessionStorage.getItem(key);
    }
    
    if (freq === 'once_per_day') {
      const stored = localStorage.getItem(key);
      if (!stored) return false;
      try {
        const parsed = JSON.parse(stored);
        const diffMs = Date.now() - (parsed.time || 0);
        // 24 hours
        if (diffMs < 24 * 60 * 60 * 1000) {
          return true;
        }
      } catch (e) {
        return !!stored;
      }
      return false;
    }
    
    return false;
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
          const isDismissed = checkFrequencyDismissed(conf);
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

  // Auto-dismiss timer if configured
  useEffect(() => {
    if (isOpen && popup && popup.autoDismissSeconds && popup.autoDismissSeconds > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, popup.autoDismissSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, popup]);

  // Live countdown timer calculation
  useEffect(() => {
    if (!isOpen || !popup?.showCountdown || !popup?.countdownTarget) return;

    const calc = () => {
      const targetTime = new Date(popup.countdownTarget!).getTime();
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setTimeLeft({ hours: h, minutes: m, seconds: s, ended: false });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [isOpen, popup?.showCountdown, popup?.countdownTarget]);

  if (!isOpen || !popup || !popup.enabled || !isHomePage()) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    if (popup.id) {
      const freq = popup.frequency || 'once_per_session';
      const key = `mbi_home_popup_dismissed_${popup.id}`;
      if (freq === 'once_per_session') {
        sessionStorage.setItem(key, 'true');
      } else if (freq === 'once_per_day') {
        localStorage.setItem(key, JSON.stringify({ dismissed: true, time: Date.now() }));
      }
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

  const handleSecondaryCtaClick = () => {
    const actionType = popup.secondaryCtaType || 'dismiss';
    if (actionType === 'whatsapp') {
      handleClose();
      const phone = popup.secondaryCtaUrl?.replace(/[^0-9]/g, '') || '923001234567';
      const waMsg = encodeURIComponent(`Hi MBI Inventra Team, I would like to learn more about the special offer: ${popup.title}`);
      window.open(`https://wa.me/${phone}?text=${waMsg}`, '_blank', 'noopener,noreferrer');
    } else if (actionType === 'link' && popup.secondaryCtaUrl) {
      handleClose();
      if (popup.secondaryCtaUrl.startsWith('http://') || popup.secondaryCtaUrl.startsWith('https://')) {
        window.open(popup.secondaryCtaUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(popup.secondaryCtaUrl);
      }
    } else {
      handleClose();
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
  const secondaryLabel = popup.secondaryCtaLabel || (popup.secondaryCtaType === 'whatsapp' ? 'Chat on WhatsApp' : 'Maybe Later');

  const gradientFrom = popup.gradientFrom || '#4338ca';
  const gradientTo = popup.gradientTo || '#7e22ce';
  const badgeColor = popup.badgeColor || '#fbbf24';

  const defaultFeatureTags = ['100% Free Full Access', '0ms Offline POS Sync', 'No Credit Card Needed', 'Thermal & A4 Invoice'];
  const featureTags = popup.featureTags && popup.featureTags.length > 0 ? popup.featureTags : defaultFeatureTags;

  const animationClass = popup.animationStyle === 'slide_up' 
    ? 'animate-in slide-in-from-bottom-8 duration-300'
    : popup.animationStyle === 'flip_3d'
    ? 'animate-in zoom-in-90 duration-300'
    : popup.animationStyle === 'fade_in'
    ? 'animate-in fade-in duration-300'
    : 'animate-in zoom-in-95 duration-200';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={handleClose}
    >
      <div 
        className={`relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Header with customizable colors */}
        <div 
          className="relative p-6 sm:p-7 text-white overflow-hidden transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`
          }}
        >
          {/* Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/25 rounded-full blur-xl pointer-events-none" />

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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: badgeColor }} />
              <span style={{ color: badgeColor }}>{badgeText}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-xs">
            {displayTitle}
          </h3>

          {/* Subtitle */}
          {displaySubtitle && (
            <p className="text-xs sm:text-sm text-white/90 font-medium mt-1.5 leading-relaxed drop-shadow-xs">
              {displaySubtitle}
            </p>
          )}

          {/* Countdown Clock Ticker (If enabled) */}
          {popup.showCountdown && (
            <div className="mt-4 p-2.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                {popup.countdownLabel || 'Limited Time Offer Closes In:'}
              </span>
              <div className="flex items-center gap-1 font-mono text-xs font-black text-white">
                <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                :
                <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                :
                <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-amber-300">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900 max-h-[65vh] overflow-y-auto">
          {/* Optional Banner Image */}
          {popup.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs max-h-48 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <img 
                src={popup.imageUrl} 
                alt={displayTitle}
                className="w-full h-full max-h-48 object-cover"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Body Description */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
            {displayBody}
          </p>

          {/* Feature Value Badges Grid */}
          {featureTags.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {featureTags.map((tag, idx) => (
                <div 
                  key={idx} 
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <div 
                    className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${gradientFrom}20`, color: gradientFrom }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{tag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-full sm:flex-1 py-3 px-6 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer group"
              style={{
                background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
                boxShadow: `0 8px 20px -4px ${gradientFrom}60`
              }}
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={handleSecondaryCtaClick}
              className="w-full sm:w-auto py-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer text-center"
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
