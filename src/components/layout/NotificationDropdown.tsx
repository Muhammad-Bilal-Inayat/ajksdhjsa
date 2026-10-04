import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCheck, Trash2, RefreshCw, 
  AlertTriangle, Info, X, Volume2, VolumeX, Package, 
  CreditCard, Clock, CheckCircle2, ShieldAlert, ArrowRight,
  Shield, FileText, History
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbInvoices, getCurrentBusinessContext } from '../../lib/db';
import { Medicine, Supplier, Invoice } from '../../types';

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AppNotification {
  id: string;
  type: 'stock' | 'expiry' | 'due' | 'system' | 'shift' | 'narcotics';
  severity: NotificationSeverity;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  unread: boolean;
  link?: string;
  actionLabel?: string;
}

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

// Sound chime generator using browser Web Audio API
export const playNotificationChime = (severity: NotificationSeverity = 'info') => {
  try {
    const isSoundEnabled = localStorage.getItem('mbi_notification_sound') !== 'false';
    if (!isSoundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (severity === 'critical') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio context may be blocked prior to user interaction
  }
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'stock' | 'dues' | 'system'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('mbi_notification_sound') !== 'false');

  // Toggle alert chime sound
  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('mbi_notification_sound', nextVal ? 'true' : 'false');
    if (nextVal) {
      playNotificationChime('info');
    }
  };

  // Close on outside click or ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const bellBtn = (event.target as HTMLElement)?.closest('[data-notification-trigger="true"]');
        if (!bellBtn) {
          onClose();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getTenantNotificationKeys = () => {
    const ctx = getCurrentBusinessContext();
    const tid = ctx.tenantId || 'default';
    return {
      readKey: `mbi_read_notifications_${tid}`,
      dismissedKey: `mbi_dismissed_notifications_${tid}`
    };
  };

  // Load notifications from local DB
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const { readKey, dismissedKey } = getTenantNotificationKeys();
      let readIds = new Set<string>();
      let dismissedIds = new Set<string>();
      try {
        const storedRead = localStorage.getItem(readKey) || localStorage.getItem('mbi_read_notifications');
        if (storedRead) readIds = new Set(JSON.parse(storedRead));
        const storedDismissed = localStorage.getItem(dismissedKey) || localStorage.getItem('mbi_dismissed_notifications');
        if (storedDismissed) dismissedIds = new Set(JSON.parse(storedDismissed));
      } catch {}

      const generated: AppNotification[] = [];
      const now = Date.now();

      // 1. Stock & Expiry Check
      try {
        const medicines: Medicine[] = await dbMedicines.getAll();
        const lowStock = medicines.filter(m => (m.quantity ?? (m as any).stock ?? 0) <= (m.lowStockThreshold ?? (m as any).minStock ?? 5));
        
        if (lowStock.length > 0) {
          const id = `low-stock-alert-${lowStock.length}`;
          if (!dismissedIds.has(id)) {
            generated.push({
              id,
              type: 'stock',
              severity: 'warning',
              title: `${lowStock.length} Item(s) on Low Stock`,
              description: `Replenishment required for ${lowStock.slice(0, 2).map(m => m.name).join(', ')}${lowStock.length > 2 ? ` and ${lowStock.length - 2} more` : ''}.`,
              time: 'Live',
              timestamp: now,
              unread: !readIds.has(id),
              link: '/items',
              actionLabel: 'Check Stock'
            });
          }
        }

        // Near Expiry Check
        const today = new Date();
        const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
        const nearExpiry = medicines.filter(m => {
          if (!m.expiryDate) return false;
          const exp = new Date(m.expiryDate);
          return exp <= ninetyDays;
        });

        if (nearExpiry.length > 0) {
          const id = `near-expiry-radar-${nearExpiry.length}`;
          if (!dismissedIds.has(id)) {
            generated.push({
              id,
              type: 'expiry',
              severity: 'critical',
              title: `${nearExpiry.length} Near-Expiry Batch Alert (FEFO)`,
              description: `Stock batches expiring within 90 days: ${nearExpiry.slice(0, 2).map(m => m.name).join(', ')}.`,
              time: 'FEFO Radar',
              timestamp: now,
              unread: !readIds.has(id),
              link: '/reports?report=fefo_expiry_report',
              actionLabel: 'View Expiries'
            });
          }
        }
      } catch {}

      // 2. Pending Supplier Payables Check
      try {
        const suppliers: Supplier[] = await dbSuppliers.getAll();
        const dueSuppliers = suppliers.filter(s => (s.balance || 0) > 0);
        if (dueSuppliers.length > 0) {
          const totalPayable = dueSuppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
          const id = `supplier-dues-alert`;
          if (!dismissedIds.has(id)) {
            generated.push({
              id,
              type: 'due',
              severity: 'warning',
              title: `Supplier Payables Due: Rs ${Math.round(totalPayable).toLocaleString()}`,
              description: `${dueSuppliers.length} supplier khatas have pending balances awaiting settlement.`,
              time: 'Khata',
              timestamp: now,
              unread: !readIds.has(id),
              link: '/parties/suppliers',
              actionLabel: 'Open Suppliers'
            });
          }
        }
      } catch {}

      // 3. Broadcast Announcements from Master Server
      try {
        let res = await fetch('/api/master/broadcast/history');
        if (!res.ok) {
          res = await fetch('/api/admin/broadcast/history');
        }
        if (res.ok) {
          const bData = await res.json();
          const bList = bData.broadcasts || (Array.isArray(bData) ? bData : []);
          if (Array.isArray(bList)) {
            for (const b of bList.slice(0, 10)) {
              if (
                !b.id ||
                b.id.startsWith('perm_') ||
                b.id.startsWith('security_') ||
                b.id.startsWith('toggle_') ||
                (b.title || '').toLowerCase().includes('permission')
              ) {
                continue;
              }

              if (!dismissedIds.has(b.id)) {
                const isSeen = !!localStorage.getItem(`mbi_broadcast_seen_${b.id}`) || readIds.has(b.id);
                generated.push({
                  id: b.id,
                  type: 'system',
                  severity: b.type === 'urgent' ? 'critical' : b.type === 'success' ? 'success' : 'info',
                  title: b.title || 'Broadcast Announcement',
                  description: (b.body || b.subtitle || '').replace(/[*_#]/g, ''),
                  time: b.dispatchedAt ? new Date(b.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live',
                  timestamp: b.dispatchedAt ? new Date(b.dispatchedAt).getTime() : now,
                  unread: !isSeen,
                  link: b.ctaUrl || undefined,
                  actionLabel: b.ctaLabel || 'View Notice'
                });
              }
            }
          }
        }
      } catch {}

      // 4. System Data Health Notification
      const systemId = 'system-status-ok';
      if (!dismissedIds.has(systemId)) {
        generated.push({
          id: systemId,
          type: 'system',
          severity: 'info',
          title: 'Hardware IndexedDB Sync Active',
          description: 'Local offline transactions and master drug catalogue are in sync.',
          time: 'Ready',
          timestamp: now,
          unread: !readIds.has(systemId),
          link: '/settings',
          actionLabel: 'System Status'
        });
      }

      setNotifications(generated);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleNewBroadcastEvent = () => {
      loadNotifications();
    };
    window.addEventListener('mbi-new-broadcast', handleNewBroadcastEvent);
    window.addEventListener('mbi-broadcast-read', handleNewBroadcastEvent);
    return () => {
      window.removeEventListener('mbi-new-broadcast', handleNewBroadcastEvent);
      window.removeEventListener('mbi-broadcast-read', handleNewBroadcastEvent);
    };
  }, []);

  // Update unread count for parent navbar
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.unread).length;
  }, [notifications]);

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { readKey } = getTenantNotificationKeys();
    const allIds = notifications.map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    try {
      localStorage.setItem(readKey, JSON.stringify(allIds));
    } catch {}
  };

  const handleDismissNotification = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    const { dismissedKey } = getTenantNotificationKeys();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notifId);
      try {
        let dismissedIds: string[] = [];
        const stored = localStorage.getItem(dismissedKey);
        if (stored) dismissedIds = JSON.parse(stored);
        if (!dismissedIds.includes(notifId)) {
          dismissedIds.push(notifId);
          localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds));
        }
      } catch {}
      return updated;
    });
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { dismissedKey } = getTenantNotificationKeys();
    const idsToDismiss = notifications.map(n => n.id);
    setNotifications([]);
    try {
      let dismissedIds: string[] = [];
      const stored = localStorage.getItem(dismissedKey);
      if (stored) dismissedIds = JSON.parse(stored);
      const combined = Array.from(new Set([...dismissedIds, ...idsToDismiss]));
      localStorage.setItem(dismissedKey, JSON.stringify(combined));
    } catch {}
  };

  const handleNotificationClick = (notif: AppNotification) => {
    const { readKey } = getTenantNotificationKeys();
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, unread: false } : n);
      try {
        const readIds = updated.filter(n => !n.unread).map(n => n.id);
        localStorage.setItem(readKey, JSON.stringify(readIds));
      } catch {}
      return updated;
    });

    onClose();
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'unread') return n.unread;
      if (activeTab === 'stock') return n.type === 'stock' || n.type === 'expiry';
      if (activeTab === 'dues') return n.type === 'due';
      if (activeTab === 'system') return n.type === 'system' || n.type === 'shift';
      return true;
    });
  }, [notifications, activeTab]);

  if (!isOpen) return null;

  return (
    <>
      {/* Dim Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/25 dark:bg-slate-950/50 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dual-Theme Styled Dropdown Container */}
      <div 
        ref={containerRef}
        className="fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1.5 w-auto sm:w-[400px] max-w-[calc(100vw-1rem)] sm:max-w-[400px] bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-[#e2e8f0] dark:border-[#334155] z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh] sm:max-h-[min(480px,calc(100vh-5rem))] text-[#0f172a] dark:text-[#f8fafc]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notifications & Alerts"
      >
        {/* Top Header: Clean Dual-Theme with Unread Badge & Mark All Read */}
        <div className="p-3.5 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-xs text-[#0f172a] dark:text-white">Notifications</h3>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-2xs">
                    {unreadCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                    All clear
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}

            {/* Sound Mute/Unmute */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                soundEnabled 
                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadNotifications()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Refresh Notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rounded Micro-Pills Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-[#f8fafc] dark:bg-slate-900 border-b border-[#e2e8f0] dark:border-[#334155] text-[11px] overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-2.5 py-1 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'unread'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-2.5 py-1 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            Stock & Expiry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dues')}
            className={`px-2.5 py-1 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dues'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            Dues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-2.5 py-1 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'system'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            System
          </button>
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 divide-y-0">
          {filteredNotifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/80" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No notifications in this view</p>
              <p className="text-[10.5px] text-slate-400 mt-0.5">Everything is up-to-date and running smoothly</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isWarning = notif.severity === 'warning';
              const isCritical = notif.severity === 'critical';
              const isSuccess = notif.severity === 'success';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    notif.unread
                      ? 'bg-blue-50/50 dark:bg-slate-800/80 border-blue-200 dark:border-blue-900/60 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Icon Category Pill */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isCritical 
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900' 
                        : isWarning 
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                        : isSuccess
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                    }`}>
                      {notif.type === 'stock' && <Package className="w-3.5 h-3.5" />}
                      {notif.type === 'expiry' && <Clock className="w-3.5 h-3.5" />}
                      {notif.type === 'due' && <CreditCard className="w-3.5 h-3.5" />}
                      {notif.type === 'system' && <Shield className="w-3.5 h-3.5" />}
                      {notif.type === 'shift' && <Clock className="w-3.5 h-3.5" />}
                      {notif.type === 'narcotics' && <ShieldAlert className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-xs font-bold truncate ${notif.unread ? 'text-blue-950 dark:text-blue-100 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                          {notif.title}
                        </h4>
                        {notif.unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-tight">
                        {notif.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                        <span>{notif.time}</span>
                        {notif.actionLabel && (
                          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:underline">
                            {notif.actionLabel}
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Individual Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDismissNotification(e, notif.id)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar: Clear All & View All in Audit Log */}
        <div className="p-2.5 bg-[#f8fafc] dark:bg-[#1e293b] border-t border-[#e2e8f0] dark:border-[#334155] flex items-center justify-between text-xs shrink-0">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/audit-logs');
            }}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline transition cursor-pointer flex items-center gap-1"
          >
            <History className="w-3 h-3" />
            <span>View Audit Log</span>
          </button>
        </div>
      </div>
    </>
  );
};
