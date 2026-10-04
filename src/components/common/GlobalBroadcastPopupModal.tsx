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
  const [currentRoute, setCurrentRoute] = useState<string>(() => 
    typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : ''
  );

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

  // Check if current broadcast matches tenant/user filter
  const isTargetedToCurrentClient = (b: BroadcastPayload): boolean => {
    if (!b || !b.id) return false;
    
    // Ignore internal permission broadcasts
    if (
      b.id.startsWith('perm_') || 
      b.id.startsWith('security_') || 
      b.id.startsWith('toggle_') ||
      (b as any).category === 'FEATURE_TOGGLE' ||
      b.title?.toLowerCase().includes('permission')
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
    // Suppress popups ONLY on the Master Infrastructure console (/server & /master)
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/server') || path.startsWith('/master')) {
      return;
    }

    try {
      let res = await fetch('/api/master/broadcast/history');
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

      const path = window.location.pathname.toLowerCase();
      // Suppress only on server or master console
      if (path.startsWith('/server') || path.startsWith('/master')) {
        return;
      }

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

  // Suppress display only on master admin console
  const isExcludedRoute = 
    currentRoute.startsWith('/server') || 
    currentRoute.startsWith('/master');

  if (!activeBroadcast || isExcludedRoute) return null;

  const rawPriority = activeBroadcast.priority || activeBroadcast.type || 'feature_update';
  const displayImage = activeBroadcast.imageUrl || activeBroadcast.image_url;
  const messageText = activeBroadcast.body || activeBroadcast.message || '';

  const getPriorityTheme = () => {
    if (rawPriority === 'critical_notice' || rawPriority === 'urgent') {
      return {
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        headerBg: 'bg-gradient-to-r from-rose-950/90 via-red-900/80 to-slate-900 border-rose-700/60',
        icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />,
        btnBg: 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-950/50',
        borderColor: 'border-rose-500/60',
        label: 'Critical Notice'
      };
    } else if (rawPriority === 'special_offer' || rawPriority === 'success') {
      return {
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        headerBg: 'bg-gradient-to-r from-emerald-950/90 via-teal-900/80 to-slate-900 border-emerald-700/60',
        icon: <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />,
        btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-950/50',
        borderColor: 'border-emerald-500/60',
        label: 'Special Offer'
      };
    } else {
      return {
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        headerBg: 'bg-gradient-to-r from-blue-950/90 via-indigo-900/80 to-slate-900 border-blue-700/60',
        icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
        btnBg: 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/50',
        borderColor: 'border-blue-500/60',
        label: 'Feature Update'
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

      fetch(`/api/admin/broadcasts/${broadcastId}/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, storeName, ownerName, city, userId, userName, hwid })
      }).catch(() => {
        fetch(`/api/master/broadcasts/${broadcastId}/seen`, {
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
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg bg-slate-900 border ${theme.borderColor} rounded-3xl shadow-2xl shadow-black/90 overflow-hidden animate-in zoom-in-95 duration-200`}
      >
        {/* Optional Attached Banner Image */}
        {displayImage && (
          <div className="w-full h-44 bg-slate-950 relative overflow-hidden border-b border-slate-800">
            <img 
              src={displayImage} 
              alt={activeBroadcast.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
            <button
              type="button"
              onClick={handleAcknowledge}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-xs transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className={`p-4 border-b ${theme.headerBg} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10 shrink-0">
              {theme.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                  {theme.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeBroadcast.dispatchedAt ? new Date(activeBroadcast.dispatchedAt).toLocaleTimeString() : 'Live'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white mt-1 leading-snug">
                {activeBroadcast.title}
              </h3>
              {activeBroadcast.subtitle && (
                <p className="text-xs text-slate-300 font-semibold mt-0.5 opacity-90">
                  {activeBroadcast.subtitle}
                </p>
              )}
            </div>
          </div>

          {!displayImage && (
            <button
              type="button"
              onClick={handleAcknowledge}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Dismiss Announcement"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Message Body */}
        <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          <div className="p-4 rounded-2xl bg-slate-950/75 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans select-text">
            {messageText}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Dispatched by: <strong className="text-slate-200">{activeBroadcast.author || activeBroadcast.senderName || 'Master Command Center'}</strong></span>
            <span className="font-mono text-[10px] text-slate-500">ID: {activeBroadcast.id}</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Targeted Terminal Notice</span>
          </span>

          <div className="flex items-center gap-2">
            {activeBroadcast.ctaLabel && activeBroadcast.ctaUrl && (
              <button
                type="button"
                onClick={handleCtaClick}
                className="px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
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
