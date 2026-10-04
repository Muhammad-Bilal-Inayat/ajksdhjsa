import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Megaphone, Check, CheckCheck, Trash2, 
  ExternalLink, Sparkles, AlertTriangle, Info, X, Clock,
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BroadcastRecord } from '../admin/MasterBroadcastCenterTab';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemHWIDSync } from '../../lib/hardwareFingerprint';

export interface NotificationBellDropdownProps {
  className?: string;
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastRecord | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { business, tenant, currentUser } = useAuth();
  const navigate = useNavigate();

  const isPermissionBroadcast = (b: BroadcastRecord) => {
    if (!b || !b.id) return false;
    return (
      b.id.startsWith('perm_') ||
      b.id.startsWith('security_') ||
      b.id.startsWith('toggle_') ||
      (b as any).type === 'permission_update' ||
      (b as any).category === 'FEATURE_TOGGLE' ||
      b.title?.toLowerCase().includes('permission') ||
      b.title?.toLowerCase().includes('security & access')
    );
  };

  const isTargetedToCurrentClient = (b: BroadcastRecord): boolean => {
    if (!b || !b.id) return false;
    if (isPermissionBroadcast(b)) return false;

    const currentTenant = 
      tenant?.id || 
      business?.id || 
      localStorage.getItem('mbi_active_business_id') || 
      localStorage.getItem('mbi_active_tenant') || 
      localStorage.getItem('mbi_tenant_id') || '';

    const currentUserId = 
      currentUser?.id || 
      localStorage.getItem('mbi_current_user_id') || 
      localStorage.getItem('mbi_user_id') || '';

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

  const loadBroadcasts = async () => {
    try {
      let res = await fetch('/api/master/broadcast/history');
      if (!res.ok) {
        res = await fetch('/api/admin/broadcast/history');
      }
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.broadcasts)) {
          const validBroadcasts = data.broadcasts.filter((b: BroadcastRecord) => isTargetedToCurrentClient(b));
          setBroadcasts(validBroadcasts);
          
          // Calculate unread set
          const unreads = new Set<string>();
          for (const b of validBroadcasts) {
            const seen = localStorage.getItem(`mbi_broadcast_seen_${b.id}`);
            if (!seen) {
              unreads.add(b.id);
            }
          }
          setUnreadIds(unreads);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadBroadcasts();

    // Listen for SSE broadcast arrivals
    const handleNewBroadcast = (e: any) => {
      const b = e.detail;
      if (b && b.id && !isPermissionBroadcast(b)) {
        setBroadcasts(prev => [b, ...prev.filter(x => x.id !== b.id)]);
        setUnreadIds(prev => new Set(prev).add(b.id));
      }
    };

    const handleBroadcastRead = (e: any) => {
      const id = e.detail?.id;
      if (id) {
        setUnreadIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    };

    window.addEventListener('mbi-new-broadcast', handleNewBroadcast as any);
    window.addEventListener('mbi-broadcast-read', handleBroadcastRead as any);

    return () => {
      window.removeEventListener('mbi-new-broadcast', handleNewBroadcast as any);
      window.removeEventListener('mbi-broadcast-read', handleBroadcastRead as any);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sendReceiptToServer = (broadcastId: string) => {
    try {
      const currentHwid = getSystemHWIDSync();
      const currentTenantId = tenant?.id || business?.id || 'local_store';
      const currentStoreName = business?.name || tenant?.name || 'Local Pharmacy';
      const currentOwnerName = (business as any)?.ownerName || (tenant as any)?.ownerName || currentUser?.name || 'Store Admin';
      const currentCity = (business as any)?.city || (tenant as any)?.city || 'Pakistan';

      fetch(`/api/admin/broadcasts/${broadcastId}/seen`, {
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
    } catch {}
  };

  const markAllAsRead = () => {
    broadcasts.forEach(b => {
      localStorage.setItem(`mbi_broadcast_seen_${b.id}`, 'true');
      sendReceiptToServer(b.id);
    });
    setUnreadIds(new Set());
  };

  const handleOpenBroadcast = (b: BroadcastRecord) => {
    localStorage.setItem(`mbi_broadcast_seen_${b.id}`, 'true');
    sendReceiptToServer(b.id);
    setUnreadIds(prev => {
      const next = new Set(prev);
      next.delete(b.id);
      return next;
    });
    setSelectedBroadcast(b);
  };

  const unreadCount = unreadIds.size;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center"
        title="Fleet Broadcasts & Notices"
      >
        <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Fleet Broadcasts & Notices
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
            {broadcasts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <Bell className="w-6 h-6 mx-auto opacity-30 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No broadcasts received yet</p>
                <p className="text-[10px] text-slate-400">Official server notices will appear here</p>
              </div>
            ) : (
              broadcasts.map((b) => {
                const isUnread = unreadIds.has(b.id);
                const isUrgent = b.priority === 'critical_notice' || b.type === 'urgent';
                const isOffer = b.priority === 'special_offer' || b.type === 'success';

                return (
                  <div
                    key={b.id}
                    onClick={() => handleOpenBroadcast(b)}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3 ${
                      isUnread ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      isUnread ? 'bg-blue-600 animate-pulse' : 'bg-transparent'
                    }`} />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          isUrgent
                            ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : isOffer
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {b.priority?.replace('_', ' ') || b.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(b.dispatchedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {b.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {b.body.replace(/[*_#]/g, '')}
                      </p>

                      {b.imageUrl && (
                        <div className="mt-1 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                          <img 
                            src={b.imageUrl} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Broadcast Reader Modal */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {selectedBroadcast.imageUrl && (
              <div className="w-full h-40 bg-slate-950 relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
                <img 
                  src={selectedBroadcast.imageUrl} 
                  alt={selectedBroadcast.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedBroadcast(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                Fleet Announcement Archive
              </span>
              {!selectedBroadcast.imageUrl && (
                <button
                  type="button"
                  onClick={() => setSelectedBroadcast(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  selectedBroadcast.priority === 'critical_notice' || selectedBroadcast.type === 'urgent'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300'
                    : selectedBroadcast.priority === 'special_offer' || selectedBroadcast.type === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300'
                }`}>
                  {selectedBroadcast.priority?.replace('_', ' ') || selectedBroadcast.type}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(selectedBroadcast.dispatchedAt).toLocaleString('en-PK')}
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {selectedBroadcast.title}
              </h3>
              {selectedBroadcast.subtitle && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedBroadcast.subtitle}
                </p>
              )}
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedBroadcast.body}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Acknowledged & Saved</span>
              </div>

              <div className="flex items-center gap-2">
                {selectedBroadcast.ctaLabel && selectedBroadcast.ctaUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedBroadcast.ctaUrl!;
                      setSelectedBroadcast(null);
                      if (url.startsWith('http://') || url.startsWith('https://')) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                        navigate(url);
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedBroadcast.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBroadcast(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
