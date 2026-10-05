import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, AlertTriangle, Info, Bell, X, CheckCircle, 
  Volume2, ExternalLink, Sparkles, ArrowRight, Image as ImageIcon 
} from 'lucide-react';
import { getSystemHWIDSync } from '../../lib/hardwareFingerprint';

export interface BroadcastPayload {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  message?: string;
  imageUrl?: string;
  image_url?: string;
  type?: 'info' | 'success' | 'urgent';
  priority?: 'feature_update' | 'special_offer' | 'critical_notice' | 'urgent' | 'alert' | 'notice' | 'info' | 'success';
  targetType?: 'global' | 'store' | 'user' | 'plan';
  targetStoreId?: string;
  targetUserId?: string;
  targetPlan?: string;
  senderName?: string;
  author?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  createdAt?: string;
  dispatchedAt?: string;
  requireAck?: boolean;
  playChime?: boolean;
}

// Gentle synthesised chime sound via standard Web Audio API (100% offline compatible)
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio autoplay restrictions bypass gracefully
  }
}

export function GlobalBroadcastPopupModal() {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [currentRoute, setCurrentRoute] = useState<string>(() => 
    typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : ''
  );

  // Dynamic Dark / Light theme detection for active user / tenant
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('mbi_landing_theme') === 'dark' ||
             localStorage.getItem('mbi_server_theme') === 'dark' ||
             localStorage.getItem('theme') === 'dark';
    }
    return true;
  });

  useEffect(() => {
    const checkTheme = () => {
      if (typeof document !== 'undefined') {
        const isDomDark = document.documentElement.classList.contains('dark');
        const isStoredDark = localStorage.getItem('mbi_landing_theme') === 'dark' ||
                             localStorage.getItem('mbi_server_theme') === 'dark' ||
                             localStorage.getItem('theme') === 'dark';
        setIsDark(isDomDark || isStoredDark);
      }
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', checkTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  // Track route changes
  useEffect(() => {
    const updateRoute = () => {
      setCurrentRoute(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', updateRoute);
    const interval = setInterval(updateRoute, 1000);
    return () => {
      window.removeEventListener('popstate', updateRoute);
      clearInterval(interval);
    };
  }, []);

  // 10-Second Auto-Dismiss Countdown Timer
  useEffect(() => {
    if (!activeBroadcast) {
      setTimeLeft(10);
      return;
    }

    setTimeLeft(10);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAcknowledge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeBroadcast?.id]);

  // Check if current broadcast matches tenant/user filter
  const isTargetedToCurrentClient = (b: BroadcastPayload): boolean => {
    if (!b || !b.id) return false;
    
    // Ignore internal permission broadcasts
    if (
      b.id.startsWith('perm_') || 
      b.id.startsWith('security_') || 
      b.id.startsWith('toggle_') ||
      (b as any).category === 'FEATURE_TOGGLE' ||
      (b.title || '').toLowerCase().includes('permission')
    ) {
      return false;
    }

    const currentTenant = 
      localStorage.getItem('mbi_active_business_id') || 
      localStorage.getItem('mbi_active_tenant') || 
      localStorage.getItem('mbi_tenant_id') || '';

    const currentUserId = 
      localStorage.getItem('mbi_current_user_id') || 
      localStorage.getItem('mbi_user_id') || '';

    // Target Check
    if (b.targetType === 'store' && b.targetStoreId) {
      if (currentTenant && b.targetStoreId !== currentTenant && b.targetStoreId !== 'all') {
        return false;
      }
    }

    if (b.targetType === 'user' && b.targetUserId) {
      if (currentUserId && b.targetUserId !== currentUserId) {
        return false;
      }
    }

    return true;
  };

  const checkPendingBroadcasts = async () => {
    // Suppress in-app tenant/user popups on Public Pages (Home, Landing, Login, Register, Checkout, Blog) and Master Console (/server, /master)
    const path = window.location.pathname.toLowerCase();
    const isPublicOrServerRoute = 
      path === '' ||
      path === '/' || 
      path === '/home' || 
      path === '/site' || 
      path === '/landing' || 
      path === '/plans' || 
      path === '/checkout' || 
      path === '/login' || 
      path === '/register' || 
      path.startsWith('/blog') ||
      path.startsWith('/server') || 
      path.startsWith('/master');

    if (isPublicOrServerRoute) {
      if (activeBroadcast) setActiveBroadcast(null);
      return;
    }

    try {
      let res = await fetch('/api/broadcasts/active');
      if (!res.ok) {
        res = await fetch('/api/master/broadcast/history');
      }
      if (!res.ok) {
        res = await fetch('/api/admin/broadcast/history');
      }
      if (!res.ok) {
        const activeTenant = localStorage.getItem('mbi_active_business_id') || localStorage.getItem('mbi_active_tenant') || 'all';
        res = await fetch(`/api/master/lan/active-broadcasts?tenantId=${encodeURIComponent(activeTenant)}`);
      }

      if (res.ok) {
        const data = await res.json();
        const list: BroadcastPayload[] = data.broadcasts || (Array.isArray(data) ? data : []);
        if (Array.isArray(list) && list.length > 0) {
          for (const b of list) {
            const ackKey = `mbi_bcast_ack_${b.id}`;
            const seenKey = `mbi_broadcast_seen_${b.id}`;
            if (!localStorage.getItem(ackKey) && !localStorage.getItem(seenKey)) {
              if (isTargetedToCurrentClient(b)) {
                setActiveBroadcast(b);
                if (b.playChime !== false) {
                  playNotificationChime();
                }
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }
  };

  useEffect(() => {
    checkPendingBroadcasts();

    // Listen to real-time SSE broadcasts
    const handleSseBroadcast = (e: CustomEvent<BroadcastPayload>) => {
      const b = e.detail;
      if (!b || !b.id) return;
      if ((b as any).entity === 'homepage_popup' || (b as any).type === 'HOMEPAGE_POPUP_UPDATED') return;

      const path = window.location.pathname.toLowerCase();
      const isPublicOrServerRoute = 
        path === '' ||
        path === '/' || 
        path === '/home' || 
        path === '/site' || 
        path === '/landing' || 
        path === '/plans' || 
        path === '/checkout' || 
        path === '/login' || 
        path === '/register' || 
        path.startsWith('/blog') ||
        path.startsWith('/server') || 
        path.startsWith('/master');

      if (isPublicOrServerRoute) return;

      const ackKey = `mbi_bcast_ack_${b.id}`;
      const seenKey = `mbi_broadcast_seen_${b.id}`;
      if (localStorage.getItem(ackKey) || localStorage.getItem(seenKey)) return;

      if (isTargetedToCurrentClient(b)) {
        setActiveBroadcast(b);
        if (b.playChime !== false) {
          playNotificationChime();
        }
      }
    };

    window.addEventListener('mbi-new-broadcast' as any, handleSseBroadcast);
    const interval = setInterval(checkPendingBroadcasts, 30000);

    return () => {
      window.removeEventListener('mbi-new-broadcast' as any, handleSseBroadcast);
      clearInterval(interval);
    };
  }, []);

  // Suppress display on Home Page, Public Landing Pages, and Master Admin Console
  const isExcludedRoute = 
    currentRoute === '' ||
    currentRoute === '/' || 
    currentRoute === '/home' || 
    currentRoute === '/site' || 
    currentRoute === '/landing' || 
    currentRoute === '/plans' || 
    currentRoute === '/checkout' || 
    currentRoute === '/login' || 
    currentRoute === '/register' || 
    currentRoute.startsWith('/blog') ||
    currentRoute.startsWith('/server') || 
    currentRoute.startsWith('/master');

  if (!activeBroadcast || isExcludedRoute) return null;

  const rawPriority = activeBroadcast.priority || activeBroadcast.type || 'feature_update';
  const displayImage = activeBroadcast.imageUrl || activeBroadcast.image_url;
  const messageText = activeBroadcast.body || activeBroadcast.message || '';

  const getPriorityTheme = () => {
    if (rawPriority === 'critical_notice' || rawPriority === 'urgent') {
      return {
        badgeBg: isDark 
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
          : 'bg-rose-50 text-rose-700 border-rose-200',
        headerBg: isDark 
          ? 'bg-gradient-to-r from-rose-950/90 via-red-900/80 to-slate-900 border-rose-700/60' 
          : 'bg-gradient-to-r from-rose-50 via-red-50 to-white border-rose-200',
        icon: <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />,
        btnBg: 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-950/30',
        borderColor: isDark ? 'border-rose-500/60' : 'border-rose-300',
        label: 'Critical Notice',
        timerColor: 'bg-rose-500'
      };
    } else if (rawPriority === 'special_offer' || rawPriority === 'success') {
      return {
        badgeBg: isDark 
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        headerBg: isDark 
          ? 'bg-gradient-to-r from-emerald-950/90 via-teal-900/80 to-slate-900 border-emerald-700/60' 
          : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200',
        icon: <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />,
        btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-950/30',
        borderColor: isDark ? 'border-emerald-500/60' : 'border-emerald-300',
        label: 'Special Offer',
        timerColor: 'bg-emerald-500'
      };
    } else {
      return {
        badgeBg: isDark 
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
          : 'bg-blue-50 text-blue-700 border-blue-200',
        headerBg: isDark 
          ? 'bg-gradient-to-r from-blue-950/90 via-indigo-900/80 to-slate-900 border-blue-700/60' 
          : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-200',
        icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
        btnBg: 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/30',
        borderColor: isDark ? 'border-blue-500/60' : 'border-blue-300',
        label: 'Feature Update',
        timerColor: 'bg-blue-500'
      };
    }
  };

  const theme = getPriorityTheme();

  const sendReceiptToServer = (broadcastId: string) => {
    try {
      const hwid = getSystemHWIDSync();
      const tenantId = localStorage.getItem('mbi_active_business_id') || localStorage.getItem('mbi_active_tenant') || 'local_store';
      const storeName = localStorage.getItem('mbi_store_name') || 'Local Pharmacy';
      const ownerName = localStorage.getItem('mbi_owner_name') || 'Store Admin';
      const city = localStorage.getItem('mbi_store_city') || 'Pakistan';
      const userId = localStorage.getItem('mbi_current_user_id') || undefined;
      const userName = localStorage.getItem('mbi_user_name') || undefined;

      fetch(`/api/broadcasts/${broadcastId}/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, storeName, ownerName, city, userId, userName, hwid })
      }).catch(() => {
        fetch(`/api/admin/broadcasts/${broadcastId}/seen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, storeName, ownerName, city, userId, userName, hwid })
        }).catch(() => {});
      });
    } catch {}
  };

  const handleAcknowledge = () => {
    if (activeBroadcast) {
      const bId = activeBroadcast.id;
      localStorage.setItem(`mbi_bcast_ack_${bId}`, new Date().toISOString());
      localStorage.setItem(`mbi_broadcast_seen_${bId}`, 'true');
      sendReceiptToServer(bId);
      window.dispatchEvent(new CustomEvent('mbi-broadcast-read', { detail: { id: bId } }));
    }
    setActiveBroadcast(null);
  };

  const handleCtaClick = () => {
    if (!activeBroadcast?.ctaUrl) return;
    const url = activeBroadcast.ctaUrl;
    handleAcknowledge();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg ${
          isDark 
            ? 'bg-slate-900 border-slate-700/80 text-white shadow-2xl shadow-black/80' 
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/20'
        } border ${theme.borderColor} rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200 relative max-h-[92vh] flex flex-col`}
      >
        {/* Top 10-Second Auto-Dismiss Countdown Bar */}
        <div className={`w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} h-1 overflow-hidden relative shrink-0`}>
          <div 
            className={`h-full ${theme.timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>

        {/* Optional Attached Banner Image */}
        {displayImage && (
          <div className={`w-full h-44 ${isDark ? 'bg-slate-950' : 'bg-slate-100'} relative overflow-hidden border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} shrink-0`}>
            <img 
              src={displayImage} 
              alt={activeBroadcast.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-slate-900 via-transparent to-black/30' : 'from-white/80 via-transparent to-black/20'}`} />
            <button
              type="button"
              onClick={handleAcknowledge}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-xs transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Bar with Logo and Info */}
        <div className={`p-4 border-b ${theme.headerBg} flex items-center justify-between gap-3 shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Crisp Visible Brand Logo Badge */}
            <div className={`w-11 h-11 rounded-2xl ${
              isDark 
                ? 'bg-slate-800/90 border-slate-700/80 shadow-md' 
                : 'bg-white border-slate-200 shadow-sm'
            } border p-1.5 flex items-center justify-center shrink-0`}>
              <img 
                src="/mbi-logo.png" 
                alt="MBI INVENTRA Logo" 
                className="w-full h-full object-contain dark:brightness-125" 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }} 
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                  {theme.label}
                </span>
                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-mono`}>
                  {activeBroadcast.dispatchedAt ? new Date(activeBroadcast.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                  ⏱️ {timeLeft}s
                </span>
              </div>
              <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-950'} mt-1 leading-snug truncate`}>
                {activeBroadcast.title}
              </h3>
              {activeBroadcast.subtitle && (
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} font-semibold mt-0.5 opacity-90 truncate`}>
                  {activeBroadcast.subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcknowledge}
            className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'} transition-colors cursor-pointer shrink-0`}
            title="Dismiss Announcement"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Body - Full display without unnecessary scrollbars */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          <div className={`p-4 sm:p-5 rounded-2xl ${
            isDark 
              ? 'bg-slate-950/75 border-slate-800 text-slate-100' 
              : 'bg-slate-50 border-slate-200 text-slate-800'
          } border text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans select-text break-words`}>
            {messageText}
          </div>

          {/* Clean Author Footer without raw ID display */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Dispatched by: <strong className={`${isDark ? 'text-slate-200' : 'text-slate-800'} font-bold`}>
                {activeBroadcast.author && activeBroadcast.author !== 'Super Admin' ? activeBroadcast.author : 'MBI INVENTRA'}
              </strong>
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className={`p-4 ${
          isDark 
            ? 'bg-slate-950 border-slate-800/80 text-slate-400' 
            : 'bg-slate-50 border-slate-200 text-slate-600'
        } border-t flex flex-wrap items-center justify-between gap-3 shrink-0`}>
          <span className="text-[11px] flex items-center gap-1.5 font-medium">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Auto-dismissing in <strong className={isDark ? 'text-slate-300' : 'text-slate-900'}>{timeLeft}s</strong></span>
          </span>

          <div className="flex items-center gap-2">
            {activeBroadcast.ctaLabel && activeBroadcast.ctaUrl && (
              <button
                type="button"
                onClick={handleCtaClick}
                className="px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
              >
                <span>{activeBroadcast.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleAcknowledge}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${theme.btnBg}`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>I Have Read & Understood</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
