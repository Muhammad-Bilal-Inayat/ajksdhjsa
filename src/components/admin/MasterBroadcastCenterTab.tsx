import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Send, Radio, Users, Building2, User, 
  Crown, Sparkles, AlertTriangle, Info, Clock, Trash2, 
  RefreshCw, CheckCircle2, Check, ExternalLink, Search, 
  Eye, BarChart3, Filter, MessageSquare, ArrowRight, ShieldAlert, ShieldCheck,
  Smartphone, Layers, CheckCheck, Upload, Image as ImageIcon
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

export interface BroadcastReceipt {
  id: string;
  broadcastId: string;
  tenantId: string;
  storeName: string;
  ownerName: string;
  city: string;
  userId?: string;
  userName?: string;
  hwid: string;
  status: 'READ' | 'UNREAD';
  seenAt: string;
}

export interface BroadcastRecord {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  imageUrl?: string;
  type: 'info' | 'success' | 'urgent';
  priority?: 'feature_update' | 'special_offer' | 'critical_notice' | 'info' | 'success' | 'urgent';
  targetType: 'global' | 'store' | 'user' | 'plan';
  targetPlan?: string;
  targetStoreId?: string;
  targetStoreName?: string;
  targetUserId?: string;
  targetUserName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  author: string;
  dispatchedAt: string;
  deliveredCount: number;
  readCount: number;
  readPercentage: number;
  receipts?: BroadcastReceipt[];
}

export const MasterBroadcastCenterTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => {
  const [subView, setSubView] = useState<'compose' | 'analytics' | 'archive'>('compose');
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [stores, setStores] = useState<Array<{ id: string; name: string; city?: string; plan?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchArchive, setSearchArchive] = useState('');

  // Compose Form State
  const [targetType, setTargetType] = useState<'global' | 'store' | 'user' | 'plan' | 'homepage'>('global');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('Gold');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState<'feature_update' | 'special_offer' | 'critical_notice'>('feature_update');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  // Analytics Selection State
  const [selectedBroadcastForReceipts, setSelectedBroadcastForReceipts] = useState<BroadcastRecord | null>(null);
  const [receiptsList, setReceiptsList] = useState<BroadcastReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  const getAuthHeaders = () => {
    const token = 
      localStorage.getItem('mbi_master_token') || 
      localStorage.getItem('mbi_master_session_token') || 
      localStorage.getItem('mbi_jwt_token') || 
      localStorage.getItem('admin_session_token') || '';
    return {
      'Content-Type': 'application/json',
      'x-master-password': 'Ami7788!@',
      'x-master-pin': 'Ami7788!@',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Load Broadcast History & Stores
  const fetchBroadcastHistory = async () => {
    setIsLoading(true);
    try {
      let res = await fetch('/api/master/broadcast/history', { headers: getAuthHeaders() });
      if (!res.ok) {
        res = await fetch('/api/admin/broadcast/history', { headers: getAuthHeaders() });
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.broadcasts) {
          setBroadcasts(data.broadcasts);
          if (!selectedBroadcastForReceipts && data.broadcasts.length > 0) {
            setSelectedBroadcastForReceipts(data.broadcasts[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load broadcast history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStoresList = async () => {
    try {
      let res = await fetch('/api/fleet/tenants', { headers: getAuthHeaders() });
      if (!res.ok) {
        res = await fetch('/api/admin/tenants', { headers: getAuthHeaders() });
      }
      if (!res.ok) {
        res = await fetch('/api/master/tenants', { headers: getAuthHeaders() });
      }
      if (res.ok) {
        const data = await res.json();
        const list = (data.tenants || data || []).map((t: any) => ({
          id: t.id || t.tenant_id,
          name: t.name || t.store_name || t.pharmacy_name || 'Store',
          city: t.city || 'Pakistan',
          plan: t.subscription_plan || t.plan || 'Gold'
        }));
        setStores(list);
        if (list.length > 0 && !selectedStoreId) {
          setSelectedStoreId(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stores list:', err);
    }
  };

  const fetchReceiptsForBroadcast = async (broadcastId: string) => {
    setIsLoadingReceipts(true);
    try {
      let res = await fetch(`/api/master/broadcasts/${broadcastId}/receipts`, { headers: getAuthHeaders() });
      if (!res.ok) {
        res = await fetch(`/api/admin/broadcasts/${broadcastId}/receipts`, { headers: getAuthHeaders() });
      }
      if (res.ok) {
        const data = await res.json();
        setReceiptsList(data.receipts || []);
      }
    } catch (err) {
      console.warn('Failed to load receipts:', err);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  useEffect(() => {
    fetchBroadcastHistory();
    fetchStoresList();
  }, []);

  useEffect(() => {
    if (selectedBroadcastForReceipts) {
      fetchReceiptsForBroadcast(selectedBroadcastForReceipts.id);
    }
  }, [selectedBroadcastForReceipts]);

  // Quick Preset Templates
  const applyTemplate = (type: 'update' | 'offer' | 'notice') => {
    if (type === 'update') {
      setTitle('🚀 MBI INVENTRA v4.2.2 Engine Update');
      setSubtitle('Nano-Second POS Speed & 100% Offline Bulk Sync');
      setBody('**What\'s New in this Release:**\n- ⚡ **0.2s POS Billing**: Instant barcode detection & sub-second cash billing\n- 🔄 **Zero-Conflict Bulk Sync**: Reliable offline queue syncing for weak connections\n- 🛡️ **Anti-Tamper Hardware Security**: Automatic primary device registration\n\n*No app restart required. Enjoy seamless automated updates!*');
      setImageUrl('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80');
      setPriority('feature_update');
      setCtaLabel('Explore POS Screen');
      setCtaUrl('/billing');
    } else if (type === 'offer') {
      setTitle('💎 Upgrade to Enterprise (Platinum) - Save 40% Today');
      setSubtitle('Unlock Multi-Godown Transfers & WhatsApp Bot Automation');
      setBody('**Exclusive Upgrade Deal for Your Pharmacy:**\n- 🏬 **Multi-Branch Transfers**: Send medicine between branches with auto-challans\n- 📱 **WhatsApp Online Storefront**: Patients can order medicines directly on WhatsApp\n- 📊 **Executive P&L Analytics**: Real-time margin protection and loss-sale locking\n\n*Contact Master Support to claim your discount coupon.*');
      setImageUrl('https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80');
      setPriority('special_offer');
      setCtaLabel('Chat with Support on WhatsApp');
      setCtaUrl('https://wa.me/923281302636');
    } else if (type === 'notice') {
      setTitle('⚠️ Scheduled Database Maintenance Notice');
      setSubtitle('Tonight 02:00 AM - 02:30 AM PKT');
      setBody('**Notice to All Counter Operators:**\n- Scheduled MariaDB index optimization tonight from **02:00 AM to 02:30 AM PKT**.\n- Local offline billing remains **100% active and uninterrupted**.\n- All pending receipts will auto-sync once server maintenance completes.');
      setImageUrl('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80');
      setPriority('critical_notice');
      setCtaLabel('View System Health');
      setCtaUrl('/utilities');
    } else if ((type as string) === 'trial') {
      setTargetType('homepage');
      setTitle('Welcome to MBI INVENTRA Cloud POS');
      setSubtitle('Experience 0ms Ultra-Fast Pharmacy Billing & Management');
      setBody('Start your 10-day full access free trial with automated FEFO batching, thermal printing, and 100% offline desktop sync mode.');
      setImageUrl('');
      setPriority('special_offer');
      setCtaLabel('Claim 10-Day Free Trial');
      setCtaUrl('/register');
    }
  };

  // Dispatch Broadcast
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      emitToast('Please enter both title and message body', 'error');
      return;
    }

    const selectedStore = stores.find(s => s.id === selectedStoreId);

    const typeMapping = 
      priority === 'critical_notice' ? 'urgent' :
      priority === 'special_offer' ? 'success' : 'info';

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      body: body.trim(),
      imageUrl: imageUrl.trim() || undefined,
      type: typeMapping,
      priority,
      targetType,
      targetPlan: targetType === 'plan' ? selectedPlan : undefined,
      targetStoreId: targetType === 'store' ? selectedStoreId : undefined,
      targetStoreName: targetType === 'store' ? selectedStore?.name : undefined,
      targetUserId: targetType === 'user' ? selectedUserId : undefined,
      targetUserName: targetType === 'user' ? (selectedUserName || selectedUserId) : undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      author: 'MBI INVENTRA',
      dispatchedAt: new Date().toISOString()
    };

    setIsSending(true);
    try {
      if (targetType === 'homepage') {
        const hpPayload = {
          id: `hp_pop_${Date.now()}`,
          enabled: true,
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          body: body.trim(),
          badgeText: priority === 'critical_notice' ? 'CRITICAL SYSTEM NOTICE' : priority === 'special_offer' ? 'SPECIAL OFFER' : 'FREE 10-DAY TRIAL',
          imageUrl: imageUrl.trim() || undefined,
          ctaLabel: ctaLabel.trim() || 'Claim 10-Day Free Trial',
          ctaUrl: ctaUrl.trim() || '/register',
          type: priority,
          autoShowDelayMs: 1500
        };

        const res = await fetch('/api/admin/homepage-popup', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(hpPayload)
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          emitToast('✨ Home Page Isolated Popup published live! Visible strictly on Home Page only.', 'success');
          // Also save in broadcast history for audit record
          await fetch('/api/master/broadcast', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
          }).catch(() => {});

          window.dispatchEvent(new CustomEvent('mbi-homepage-popup-updated', { detail: hpPayload }));
          localStorage.removeItem(`mbi_home_popup_dismissed_${hpPayload.id}`);
          sessionStorage.removeItem(`mbi_home_popup_dismissed_${hpPayload.id}`);

          setTitle('');
          setSubtitle('');
          setBody('');
          setImageUrl('');
          setCtaLabel('');
          setCtaUrl('');
          fetchBroadcastHistory();
          setSubView('analytics');
          return;
        } else {
          emitToast(data.error || 'Failed to publish Home Page popup', 'error');
          return;
        }
      }

      let res = await fetch('/api/master/broadcast', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        emitToast('🚀 Broadcast announcement dispatched live via SSE with instant popup & notification sync!', 'success');
        setTitle('');
        setSubtitle('');
        setBody('');
        setImageUrl('');
        setCtaLabel('');
        setCtaUrl('');
        fetchBroadcastHistory();
        setSubView('analytics');
      } else {
        emitToast(data.error || 'Failed to dispatch broadcast announcement', 'error');
      }
    } catch (err: any) {
      console.error(err);
      emitToast('Network error while dispatching broadcast', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Resend Broadcast
  const handleResend = async (broadcast: BroadcastRecord) => {
    if (!window.confirm(`Resend "${broadcast.title}" to target audience?`)) return;
    try {
      let res = await fetch(`/api/master/broadcast/${broadcast.id}/resend`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        res = await fetch(`/api/admin/broadcast/${broadcast.id}/resend`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
      }
      if (res.ok) {
        emitToast('🔄 Broadcast re-dispatched live successfully!', 'success');
        fetchBroadcastHistory();
      } else {
        emitToast('Failed to resend broadcast', 'error');
      }
    } catch {
      emitToast('Network error while resending', 'error');
    }
  };

  // Delete Broadcast
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this broadcast announcement from history?')) return;
    try {
      let res = await fetch(`/api/master/broadcast/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        res = await fetch(`/api/admin/broadcast/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      }
      if (res.ok) {
        emitToast('Broadcast deleted from history', 'info');
        setBroadcasts(prev => prev.filter(b => b.id !== id));
        if (selectedBroadcastForReceipts?.id === id) {
          setSelectedBroadcastForReceipts(broadcasts.find(b => b.id !== id) || null);
        }
      }
    } catch {
      emitToast('Failed to delete broadcast', 'error');
    }
  };

  const qArchive = (searchArchive || '').toLowerCase().trim();
  const filteredArchive = (broadcasts || []).filter(b => {
    if (!b) return false;
    if (!qArchive) return true;
    return (
      (b.title || '').toLowerCase().includes(qArchive) ||
      (b.body || '').toLowerCase().includes(qArchive) ||
      (b.targetStoreName || '').toLowerCase().includes(qArchive)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Master Broadcast & Telemetry Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Granular targeting, 1-Time client popup, live read receipts & historical audit
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubView('compose')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'compose' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose & Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('analytics')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'analytics' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Read Receipts</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('archive')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'archive' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History ({broadcasts.length})</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 1: COMPOSE & DISPATCH
      ───────────────────────────────────────────────────────────── */}
      {subView === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Compose Form (8 cols) */}
          <form onSubmit={handleDispatch} noValidate className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              
              {/* Audience Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  1. Target Audience
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTargetType('global')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      targetType === 'global'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>Global (All Stores)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('store')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      targetType === 'store'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Specific Store</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('plan')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      targetType === 'plan'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Plan Tier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('user')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      targetType === 'user'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Specific User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('homepage')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      targetType === 'homepage'
                        ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-600 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20 shadow-sm'
                        : 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100/60'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    <span>🌐 Home Page Only</span>
                  </button>
                </div>

                {/* Sub Target Dropdowns & Isolation Details */}
                {targetType === 'homepage' && (
                  <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-purple-50/90 to-indigo-50/90 dark:from-purple-950/50 dark:to-indigo-950/50 border border-purple-200 dark:border-purple-800/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-purple-900 dark:text-purple-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Strict Public Home Page Isolation Guaranteed</span>
                    </div>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
                      This broadcast popup will <strong>ONLY</strong> be displayed to visitors on the Public Home / Landing Page (<code>/</code>, <code>/home</code>, <code>/site</code>, <code>/landing</code>). It is completely isolated and will <strong>NEVER</strong> appear inside client POS billing, cashier shifts, or back-office workspaces.
                    </p>
                  </div>
                )}

                {/* Sub Target Dropdowns */}
                {targetType === 'store' && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Select Target Pharmacy Store:
                    </label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.city}) - [{s.plan || 'Gold'}]</option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'plan' && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Select Subscription Tier:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Silver / Basic', 'Gold / Business', 'Platinum / Enterprise'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSelectedPlan(p.split(' ')[0])}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                            selectedPlan === p.split(' ')[0]
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {targetType === 'user' && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Target User ID:</label>
                      <input
                        type="text"
                        placeholder="e.g. usr_17109283"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Staff / Cashier Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Counter Cashier 1"
                        value={selectedUserName}
                        onChange={(e) => setSelectedUserName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Priority Level */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  2. Priority Level & Banner Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPriority('feature_update')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      priority === 'feature_update'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Info className="w-4 h-4 text-blue-600" />
                    <div className="text-left">
                      <span className="block font-black">Feature Update</span>
                      <span className="text-[10px] text-slate-400 font-normal">Blue info banner</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority('special_offer')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      priority === 'special_offer'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div className="text-left">
                      <span className="block font-black">Special Offer</span>
                      <span className="text-[10px] text-slate-400 font-normal">Emerald badge</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority('critical_notice')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      priority === 'critical_notice'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-600 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <div className="text-left">
                      <span className="block font-black">Critical System Notice</span>
                      <span className="text-[10px] text-slate-400 font-normal">Red alert pulsing</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Content & Message
                </label>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Broadcast Title (e.g. 🎉 New FEFO Batch Expiry Radar Released)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Subtitle / Tagline (e.g. Prevent expired medicine losses with 0.2s auto batch dispatch)"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  />
                </div>
                <div>
                  <textarea
                    required
                    rows={5}
                    placeholder="Message Body (Supports markdown: **bold**, - bullet points, links)..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs leading-relaxed font-sans text-slate-900 dark:text-white custom-scrollbar"
                  />
                </div>
              </div>

              {/* Attach Image Banner */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    4. Attach Banner Image (Upload File or URL)
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Image
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Local File Picker Button */}
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/50 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Upload from Device (Max 2MB)</span>
                      <input 
                        type="file" 
                        accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const rawData = event.target?.result as string;
                              if (rawData) {
                                // Auto-Optimize & Resize via Canvas
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const maxW = 1200;
                                  const maxH = 630;
                                  let width = img.width;
                                  let height = img.height;

                                  if (width > maxW || height > maxH) {
                                    if (width / height > maxW / maxH) {
                                      height = Math.round((height * maxW) / width);
                                      width = maxW;
                                    } else {
                                      width = Math.round((width * maxH) / height);
                                      height = maxH;
                                    }
                                  }

                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    ctx.drawImage(img, 0, 0, width, height);
                                    const optimizedDataUrl = canvas.toDataURL('image/webp', 0.85);
                                    setImageUrl(optimizedDataUrl);
                                    emitToast(`✨ Image auto-optimized & resized to ${width}x${height}px!`, 'success');
                                  } else {
                                    setImageUrl(rawData);
                                    emitToast('Image attached successfully!', 'success');
                                  }
                                };
                                img.onerror = () => {
                                  setImageUrl(rawData);
                                  emitToast('Image attached successfully!', 'success');
                                };
                                img.src = rawData;
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {/* Direct URL Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Or paste image URL (https://...)"
                        value={imageUrl.startsWith('data:') ? '📎 [Attached File from Computer]' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Device Size & Dimensions Recommendation Card */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span>Recommended Dimensions (All Device Compatibility):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[10px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white block">🖥️ Desktop / Wide Banner</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">1200 x 600 px</span>
                        <span className="text-slate-400 block text-[9px]">Aspect 2:1 (Best for header)</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white block">📱 Mobile & Tablet Card</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">800 x 450 px</span>
                        <span className="text-slate-400 block text-[9px]">Aspect 16:9 (Universal)</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white block">🔲 Square Promo Badge</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">600 x 600 px</span>
                        <span className="text-slate-400 block text-[9px]">Aspect 1:1 (Max size 2MB)</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Image Presets */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-bold self-center">Quick Stock Presets:</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      🏥 POS & Pharmacy
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      💎 Upgrade Offer
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      ⚠️ System Radar
                    </button>
                  </div>

                  {/* Image Preview in Form */}
                  {imageUrl && (
                    <div className="mt-2 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-44 bg-slate-950 flex items-center justify-center">
                      <img 
                        src={imageUrl} 
                        alt="Broadcast Attachment Preview" 
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button Config */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  5. Optional Action Button (CTA)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Button Label (e.g. Try Feature Now / Chat on WhatsApp)"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Action URL / Route (e.g. /billing or https://wa.me/...)"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Dispatch */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Emits real-time SSE event & triggers instant client popups</span>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-xl shadow-blue-600/30 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>🚀 Dispatch Live Broadcast</span>
                </button>
              </div>

            </div>
          </form>

          {/* Quick Preset Templates & Live Preview Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Quick Templates */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick 1-Click Templates
              </span>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('update')}
                  className="w-full p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-left hover:bg-blue-100/60 transition-all cursor-pointer"
                >
                  <span className="text-xs font-black text-blue-700 dark:text-blue-300 block">⚡ App Version Update Notice</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Highlights 0.2s POS speed, offline sync & security</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('offer')}
                  className="w-full p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-left hover:bg-emerald-100/60 transition-all cursor-pointer"
                >
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 block">💎 Enterprise Plan Upgrade Deal</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Promo copy with WhatsApp CTA link</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('notice')}
                  className="w-full p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-left hover:bg-rose-100/60 transition-all cursor-pointer"
                >
                  <span className="text-xs font-black text-rose-700 dark:text-rose-300 block">⚠️ Scheduled Midnight Maintenance</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Database indexing reminder for cashiers</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('trial' as any)}
                  className="w-full p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-left hover:bg-purple-100/60 transition-all cursor-pointer"
                >
                  <span className="text-xs font-black text-purple-700 dark:text-purple-300 block">🌐 Public 10-Day Trial Offer</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Auto-fills 10-Day Free Trial for Home Page</span>
                </button>
              </div>
            </div>

            {/* Live Client Preview Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Live Client Popup Preview
              </span>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
                {imageUrl && (
                  <div className="w-full h-32 bg-slate-900 overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className={`p-3 text-white ${
                  priority === 'critical_notice' ? 'bg-gradient-to-r from-rose-600 to-red-700' :
                  priority === 'special_offer' ? 'bg-gradient-to-r from-emerald-600 to-teal-700' :
                  'bg-gradient-to-r from-blue-600 to-indigo-700'
                }`}>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {priority.replace('_', ' ').toUpperCase()}
                  </span>
                  <h4 className="text-xs font-black mt-1 leading-snug truncate">
                    {title || 'Sample Announcement Title'}
                  </h4>
                  {subtitle && <p className="text-[10px] opacity-80 truncate">{subtitle}</p>}
                </div>

                <div className="p-3 text-[11px] text-slate-300 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-line">
                  {body || 'Broadcast body will render here with full markdown formatting.'}
                </div>

                {ctaLabel && (
                  <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex justify-end">
                    <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black">
                      {ctaLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 2: LIVE ANALYTICS & READ RECEIPTS ("Who Saw This?")
      ───────────────────────────────────────────────────────────── */}
      {subView === 'analytics' && (
        <div className="space-y-6">
          
          {/* Header & Broadcast Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Audience Engagement Telemetry
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Live Read Receipts & Client Acknowledgment
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Select Broadcast:</label>
              <select
                value={selectedBroadcastForReceipts?.id || ''}
                onChange={(e) => {
                  const b = broadcasts.find(x => x.id === e.target.value);
                  if (b) setSelectedBroadcastForReceipts(b);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              >
                {(broadcasts || []).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title || 'Untitled'} ({b.dispatchedAt ? new Date(b.dispatchedAt).toLocaleDateString() : 'Recent'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedBroadcastForReceipts && (
            <>
              {/* Engagement Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Total Dispatched Fleet</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
                    {selectedBroadcastForReceipts.deliveredCount || 1} Stores / Devices
                  </span>
                  <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Target: {String(selectedBroadcastForReceipts.targetType || 'Global').toUpperCase()}</span>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Total Acknowledged & Seen</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                    {receiptsList.length} Verified Reads
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Live hardware fingerprint verified</span>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Read Rate Percentage</span>
                  <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
                    {Math.min(100, Math.round((receiptsList.length / Math.max(1, selectedBroadcastForReceipts.deliveredCount)) * 100))}%
                  </span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.round((receiptsList.length / Math.max(1, selectedBroadcastForReceipts.deliveredCount)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Live Receipts Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    Who Saw & Acknowledged This Broadcast? ({receiptsList.length})
                  </span>

                  <button
                    type="button"
                    onClick={() => fetchReceiptsForBroadcast(selectedBroadcastForReceipts.id)}
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReceipts ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Pharmacy Store</th>
                        <th className="py-3 px-4">Owner / User</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Acknowledgment Status</th>
                        <th className="py-3 px-4">Seen Timestamp</th>
                        <th className="py-3 px-4">Terminal HWID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {receiptsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No receipts recorded yet. Target stores will appear as soon as they open the 1-time popup or notification bell.
                          </td>
                        </tr>
                      ) : (
                        receiptsList.map((rc) => (
                          <tr key={rc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {rc.storeName}
                            </td>
                            <td className="py-3.5 px-4">
                              {rc.userName || rc.ownerName}
                            </td>
                            <td className="py-3.5 px-4">
                              {rc.city}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCheck className="w-3 h-3" />
                                🟢 Read & Acknowledged
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                              {new Date(rc.seenAt).toLocaleString('en-PK')}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                              {rc.hwid}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 3: HISTORICAL BROADCAST ARCHIVE
      ───────────────────────────────────────────────────────────── */}
      {subView === 'archive' && (
        <div className="space-y-4">
          
          {/* Search and Filters */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search past broadcasts by title, content or target store..."
                value={searchArchive}
                onChange={(e) => setSearchArchive(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <button
              type="button"
              onClick={fetchBroadcastHistory}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredArchive.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                <Megaphone className="w-8 h-8 mx-auto opacity-30 text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No broadcasts found</p>
                <p className="text-xs text-slate-500">Dispatch an announcement from the Compose tab above</p>
              </div>
            ) : (
              filteredArchive.map((b) => (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        b.type === 'urgent' ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300' :
                        b.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300' :
                        'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300'
                      }`}>
                        {b.priority || b.type}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        Target: {b.targetStoreName || String(b.targetType || 'Global').toUpperCase()}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">
                        {b.dispatchedAt ? new Date(b.dispatchedAt).toLocaleString('en-PK') : 'Recent'}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {b.title || 'Untitled Broadcast'}
                    </h4>
                    {b.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{b.subtitle}</p>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {(b.body || '').replace(/[*_#]/g, '')}
                    </p>
                  </div>

                  {/* Right Actions & Read Rate */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBroadcastForReceipts(b);
                        setSubView('analytics');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="View Read Receipts"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Receipts ({b.readCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResend(b)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Resend to Target Fleet"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Broadcast"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
};
