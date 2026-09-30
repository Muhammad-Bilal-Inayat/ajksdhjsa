import React, { useState, useEffect } from 'react';
import { 
  Megaphone, X, Check, Sparkles, AlertTriangle, 
  Info, CheckCircle2, ArrowRight, ExternalLink, ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BroadcastRecord } from '../admin/MasterBroadcastCenterTab';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemHWIDSync } from '../../lib/hardwareFingerprint';

export const BroadcastAnnouncementModal: React.FC = () => {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastRecord | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { business, tenant, currentUser } = useAuth();
  const navigate = useNavigate();

  // Check if a broadcast is unseen
  const checkBroadcastSeen = (b: BroadcastRecord): boolean => {
    if (!b || !b.id) return false;
    // CRITICAL: Filter out any internal permission / feature update notifications so NO modal ever pops up
    if (
      b.id.startsWith('perm_') ||
      b.id.startsWith('security_') ||
      b.id.startsWith('toggle_') ||
      (b as any).type === 'permission_update' ||
      (b as any).category === 'FEATURE_TOGGLE' ||
      b.title?.toLowerCase().includes('permission') ||
      b.title?.toLowerCase().includes('security & access')
    ) {
      return false;
    }
    const seen = localStorage.getItem(`mbi_broadcast_seen_${b.id}`);
    return !seen;
  };

  const markBroadcastAsSeen = async (id: string, ctaUrl?: string) => {
    try {
      localStorage.setItem(`mbi_broadcast_seen_${id}`, 'true');
      
      // Send live read receipt to server
      const currentHwid = getSystemHWIDSync();
      const currentTenantId = tenant?.id || business?.id || 'local_store';
      const currentStoreName = business?.name || tenant?.name || 'Local Pharmacy';
      const currentOwnerName = (business as any)?.ownerName || (tenant as any)?.ownerName || currentUser?.name || 'Store Admin';
      const currentCity = (business as any)?.city || (tenant as any)?.city || 'Pakistan';

      fetch(`/api/admin/broadcasts/${id}/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          storeName: currentStoreName,
          ownerName: currentOwnerName,
          city: currentCity,
          userId: currentUser?.id,
          userName: currentUser?.name,
          hwid: currentHwid
        })
      }).catch(() => {});

      // Notify notification bell archive
      window.dispatchEvent(new CustomEvent('mbi-broadcast-read', { detail: { id } }));
    } catch {}

    setIsOpen(false);

    if (ctaUrl) {
      if (ctaUrl.startsWith('http://') || ctaUrl.startsWith('https://')) {
        window.open(ctaUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(ctaUrl);
      }
    }
  };

  useEffect(() => {
    // 1. Check existing latest broadcasts on mount
    const checkLatest = async () => {
      try {
        const res = await fetch('/api/admin/broadcast/history');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.broadcasts) && data.broadcasts.length > 0) {
            // Find the most recent unseen broadcast
            const unseen = data.broadcasts.find((b: BroadcastRecord) => checkBroadcastSeen(b));
            if (unseen) {
              setActiveBroadcast(unseen);
              setIsOpen(true);
            }
          }
        }
      } catch {}
    };

    const timer = setTimeout(checkLatest, 1200);

    // 2. Listen for Real-Time SSE broadcast announcement events
    const handleLiveBroadcast = (e: any) => {
      const detail = e.detail;
      if (detail && detail.id && checkBroadcastSeen(detail)) {
        setActiveBroadcast(detail);
        setIsOpen(true);
        window.dispatchEvent(new CustomEvent('mbi-play-chime', { detail: { severity: detail.type } }));
      }
    };

    window.addEventListener('mbi-new-broadcast', handleLiveBroadcast as any);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mbi-new-broadcast', handleLiveBroadcast as any);
    };
  }, []);

  if (!isOpen || !activeBroadcast) return null;

  const isUrgent = activeBroadcast.priority === 'critical_notice' || activeBroadcast.type === 'urgent';
  const isOffer = activeBroadcast.priority === 'special_offer' || activeBroadcast.type === 'success';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header with gradient banner */}
        <div className={`p-6 text-white relative ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600'
            : isOffer
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600'
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
        }`}>
          <button
            type="button"
            onClick={() => markBroadcastAsSeen(activeBroadcast.id)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="Dismiss Notice"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner mt-0.5">
              {isUrgent ? (
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              ) : isOffer ? (
                <Sparkles className="w-6 h-6 animate-spin" />
              ) : (
                <Megaphone className="w-6 h-6" />
              )}
            </div>
            <div className="pr-6">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                  {isUrgent ? 'Critical System Notice' : isOffer ? 'Special Offer' : 'Feature Update'}
                </span>
                <span className="text-[11px] text-white/80">
                  {new Date(activeBroadcast.dispatchedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black mt-1.5 leading-snug">
                {activeBroadcast.title}
              </h3>
              {activeBroadcast.subtitle && (
                <p className="text-xs text-white/90 font-medium mt-0.5">
                  {activeBroadcast.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Message Content Area */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
          {activeBroadcast.body}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Saved in your 🔔 Notification Bell</span>
          </div>

          <div className="flex items-center gap-2">
            {activeBroadcast.ctaLabel && (
              <button
                type="button"
                onClick={() => markBroadcastAsSeen(activeBroadcast.id, activeBroadcast.ctaUrl)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{activeBroadcast.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => markBroadcastAsSeen(activeBroadcast.id)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Got It</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
