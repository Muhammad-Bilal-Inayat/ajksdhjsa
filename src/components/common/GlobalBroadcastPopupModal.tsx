import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Info, Bell, X, CheckCircle, Volume2 } from 'lucide-react';

export interface BroadcastPayload {
  id: string;
  title: string;
  message: string;
  priority?: 'urgent' | 'alert' | 'notice' | 'info';
  senderName?: string;
  targetTenantId?: string;
  targetUserId?: string;
  createdAt?: string;
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

  const checkPendingBroadcasts = async () => {
    try {
      const activeTenant = localStorage.getItem('mbi_active_business_id') || localStorage.getItem('mbi_active_tenant') || 'all';
      const res = await fetch(`/api/master/lan/active-broadcasts?tenantId=${encodeURIComponent(activeTenant)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.broadcasts) && data.broadcasts.length > 0) {
        // Find latest unacknowledged broadcast
        for (const b of data.broadcasts) {
          const ackKey = `mbi_bcast_ack_${b.id}`;
          if (!localStorage.getItem(ackKey)) {
            setActiveBroadcast(b);
            if (b.playChime !== false) {
              playNotificationChime();
            }
            break;
          }
        }
      }
    } catch (e) {
      // Offline fallback
    }
  };

  useEffect(() => {
    // Initial check on mount
    checkPendingBroadcasts();

    // Listen to real-time SSE broadcasts
    const handleSseBroadcast = (e: CustomEvent<BroadcastPayload>) => {
      const b = e.detail;
      if (!b || !b.id) return;

      const ackKey = `mbi_bcast_ack_${b.id}`;
      if (localStorage.getItem(ackKey)) return;

      setActiveBroadcast(b);
      if (b.playChime !== false) {
        playNotificationChime();
      }
    };

    window.addEventListener('mbi-new-broadcast' as any, handleSseBroadcast);
    const interval = setInterval(checkPendingBroadcasts, 60000);

    return () => {
      window.removeEventListener('mbi-new-broadcast' as any, handleSseBroadcast);
      clearInterval(interval);
    };
  }, []);

  if (!activeBroadcast) return null;

  const priority = activeBroadcast.priority || 'urgent';

  const getPriorityTheme = () => {
    switch (priority) {
      case 'urgent':
        return {
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          headerBg: 'bg-gradient-to-r from-rose-950/80 to-slate-900 border-rose-800/60',
          icon: <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />,
          btnBg: 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-950/50',
          borderColor: 'border-rose-500/50'
        };
      case 'alert':
        return {
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          headerBg: 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-800/60',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />,
          btnBg: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-950/50',
          borderColor: 'border-amber-500/50'
        };
      case 'notice':
        return {
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          headerBg: 'bg-gradient-to-r from-purple-950/80 to-slate-900 border-purple-800/60',
          icon: <Bell className="w-6 h-6 text-purple-400 shrink-0" />,
          btnBg: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-950/50',
          borderColor: 'border-purple-500/50'
        };
      default:
        return {
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          headerBg: 'bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-800/60',
          icon: <Info className="w-6 h-6 text-blue-400 shrink-0" />,
          btnBg: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-950/50',
          borderColor: 'border-blue-500/50'
        };
    }
  };

  const theme = getPriorityTheme();

  const handleAcknowledge = () => {
    if (activeBroadcast) {
      localStorage.setItem(`mbi_bcast_ack_${activeBroadcast.id}`, new Date().toISOString());
    }
    setActiveBroadcast(null);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg bg-slate-900 border ${theme.borderColor} rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-in zoom-in-95 duration-200`}
      >
        {/* Header Bar */}
        <div className={`p-4 border-b ${theme.headerBg} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                  {priority} Notice
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {activeBroadcast.createdAt ? new Date(activeBroadcast.createdAt).toLocaleTimeString() : 'Live'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {activeBroadcast.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss Announcement"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans select-text">
            {activeBroadcast.message}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>From: <strong className="text-slate-200">{activeBroadcast.senderName || 'Master Command Admin'}</strong></span>
            <span className="font-mono text-[11px] text-slate-500">ID: {activeBroadcast.id}</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Official terminal broadcast</span>
          </span>

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
  );
}
