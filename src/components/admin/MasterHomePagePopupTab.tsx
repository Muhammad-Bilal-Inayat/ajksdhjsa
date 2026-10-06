import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Globe, Eye, Save, RefreshCw, CheckCircle2, 
  AlertCircle, ArrowRight, ExternalLink, Image as ImageIcon, 
  Layers, ToggleLeft, ToggleRight, Trash2, Clock, Check, ShieldCheck
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

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

export const MasterHomePagePopupTab: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewDark, setPreviewDark] = useState(true);

  // Form State
  const [id, setId] = useState('hp_pop_master');
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('Welcome to MBI INVENTRA Cloud POS');
  const [subtitle, setSubtitle] = useState('Experience 0ms Ultra-Fast Pharmacy Billing & Management');
  const [body, setBody] = useState('Start your 10-day full access free trial with automated FEFO batching, thermal printing, and 100% offline desktop sync mode.');
  const [badgeText, setBadgeText] = useState('FREE 10-DAY TRIAL');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Claim 10-Day Free Trial');
  const [ctaUrl, setCtaUrl] = useState('/register');
  const [autoShowDelayMs, setAutoShowDelayMs] = useState(1500);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = 
      localStorage.getItem('mbi_master_token') || 
      localStorage.getItem('mbi_master_session_token') || 
      localStorage.getItem('admin_session_token') || '';
    return {
      'Content-Type': 'application/json',
      'x-master-password': 'Ami7788!@',
      'x-master-pin': 'Ami7788!@',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const loadPopupConfig = async () => {
    setLoading(true);
    try {
      let res = await fetch('/api/homepage-popup', { headers: getAuthHeaders() });
      if (!res.ok) {
        res = await fetch('/api/public/homepage-popup');
      }
      if (res.ok) {
        const data = await res.json();
        const p: HomePagePopupConfig = data.popup;
        if (p) {
          setId(p.id || 'hp_pop_master');
          setEnabled(p.enabled !== false);
          setTitle(p.title || '');
          setSubtitle(p.subtitle || '');
          setBody(p.body || '');
          setBadgeText(p.badgeText || 'SPECIAL ANNOUNCEMENT');
          setImageUrl(p.imageUrl || '');
          setCtaLabel(p.ctaLabel || 'Get Started Now');
          setCtaUrl(p.ctaUrl || '/register');
          setAutoShowDelayMs(Number(p.autoShowDelayMs) || 1500);
          setLastUpdated(p.updatedAt || null);
        }
      }
    } catch (err) {
      console.warn('Failed to load homepage popup configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPopupConfig();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !body.trim()) {
      emitToast('Please enter Title and Message body for Home Page popup.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: id || `hp_pop_${Date.now()}`,
        enabled,
        title: title.trim(),
        subtitle: subtitle.trim(),
        body: body.trim(),
        badgeText: badgeText.trim() || 'SPECIAL ANNOUNCEMENT',
        imageUrl: imageUrl.trim(),
        ctaLabel: ctaLabel.trim() || 'Get Started Now',
        ctaUrl: ctaUrl.trim() || '/register',
        autoShowDelayMs: Number(autoShowDelayMs) || 1500
      };

      const res = await fetch('/api/admin/homepage-popup', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastUpdated(new Date().toISOString());
        emitToast('✨ Home Page Public Popup updated & published live!', 'success');
        // Clear local dismissal so admin can test directly
        localStorage.removeItem(`mbi_home_popup_dismissed_${payload.id}`);
        sessionStorage.removeItem(`mbi_home_popup_dismissed_${payload.id}`);
      } else {
        emitToast(data.error || 'Failed to save Home Page popup.', 'error');
      }
    } catch (err: any) {
      emitToast(err.message || 'Error communicating with Master Hub.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistoryAndTest = () => {
    if (id) {
      localStorage.removeItem(`mbi_home_popup_dismissed_${id}`);
      sessionStorage.removeItem(`mbi_home_popup_dismissed_${id}`);
    }
    window.open('/', '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/80 to-purple-950/90 border border-blue-700/50 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Public Home Page Isolated Popup</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span>🌐 Landing / Home Page Popup Center</span>
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
            Configure standalone public announcements, discounts, and trial banners for <strong>Home Page visitors only</strong>. This popup will <strong>NEVER</strong> appear inside client /user workspaces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearHistoryAndTest}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            title="Open Home Page in new tab to test popup"
          >
            <Eye className="w-4 h-4 text-emerald-300" />
            <span>Test on Home Page</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Live...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Publish Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Form & Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Popup Content & Settings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize copy, visual banner, button link and timing</p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {enabled ? 'Active (Live)' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className="cursor-pointer focus:outline-none"
              >
                {enabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* 1-Click Quick Preset Templates */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              1-Click Professional Copy Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBadgeText('FREE 10-DAY TRIAL');
                  setTitle('Transform Your Pharmacy With MBI INVENTRA');
                  setSubtitle('Experience 0.2s POS billing, automated FEFO expiry alerts & 0ms offline sync.');
                  setBody('Join 1,000+ modern pharmacies across Pakistan. Get full access for 10 days with zero credit card required.');
                  setCtaLabel('Claim 10-Day Free Trial');
                  setCtaUrl('/register');
                  emitToast('Applied 10-Day Free Trial Template', 'info');
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-left text-xs text-slate-200 transition-all cursor-pointer truncate font-bold hover:border-blue-500"
              >
                🌟 10-Day Free Trial
              </button>
              <button
                type="button"
                onClick={() => {
                  setBadgeText('ULTRA-FAST BILLING');
                  setTitle('0.2s POS & 100% Offline Pharmacy Engine');
                  setSubtitle('Never let slow systems or internet disconnects halt your sales counter.');
                  setBody('Unmatched speed: instant barcode lookup, thermal receipts, customer WhatsApp statements, and zero cloud delay.');
                  setCtaLabel('Experience 0.2s POS');
                  setCtaUrl('/register');
                  emitToast('Applied 0.2s POS Template', 'info');
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-left text-xs text-slate-200 transition-all cursor-pointer truncate font-bold hover:border-blue-500"
              >
                ⚡ 0.2s POS Engine
              </button>
              <button
                type="button"
                onClick={() => {
                  setBadgeText('ZERO EXPIRY LOSS');
                  setTitle('Automated FEFO Expiry Radar & Returns');
                  setSubtitle('Protect your pharmacy margin with proactive 30/60/90 day expiry tracking.');
                  setBody('Eliminate expiry dumping. Auto-prioritize oldest batches at checkout and generate supplier debit notes with 1-click.');
                  setCtaLabel('Protect My Pharmacy');
                  setCtaUrl('/register');
                  emitToast('Applied FEFO Expiry Template', 'info');
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-left text-xs text-slate-200 transition-all cursor-pointer truncate font-bold hover:border-blue-500"
              >
                🛡️ Zero Expiry Loss
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Badge Text */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Top Badge Text <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. FREE 10-DAY TRIAL, SPECIAL OFFER, NEW RELEASE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Popup Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Popup Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Start Your 10-Day Free Pharmacy Trial"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Subtitle (Optional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Zero Credit Card Required • Instant Cloud Activation"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Detailed Message / Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your announcement, offer, features, or welcome message..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {/* Image Banner URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Optional Banner Image URL
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Grid: CTA Button Label & CTA URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Claim 10-Day Free Trial"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  CTA Button Target URL
                </label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="/register or /checkout or https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Auto-Show Delay (ms) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Auto-Popup Delay on Home Page</span>
                <span className="text-slate-400 font-normal">{(autoShowDelayMs / 1000).toFixed(1)} seconds</span>
              </label>
              <input
                type="range"
                min={500}
                max={5000}
                step={500}
                value={autoShowDelayMs}
                onChange={(e) => setAutoShowDelayMs(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Ready to save'}
              </span>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Live Home Page Preview</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewDark(false)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${!previewDark ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'} transition-all`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDark(true)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${previewDark ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'} transition-all`}
                >
                  Dark
                </button>
              </div>
            </div>

            {/* Preview Modal Card */}
            <div className={`rounded-2xl border ${previewDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl overflow-hidden transition-colors`}>
              {/* Header */}
              <div className="p-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider border border-white/25">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{badgeText || 'SPECIAL ANNOUNCEMENT'}</span>
                  </span>
                </div>

                <h4 className="text-lg font-black tracking-tight leading-snug">
                  {title || 'Your Popup Title Here'}
                </h4>

                {subtitle && (
                  <p className="text-xs text-blue-100/90 font-medium mt-0.5 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-36 bg-slate-100 dark:bg-slate-950">
                    <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}

                <p className={`text-xs ${previewDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
                  {body || 'Your message body will appear here for visitors.'}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg ${previewDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} border flex items-center gap-1.5 text-[10px] font-bold`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>100% Free Full Access</span>
                  </div>
                  <div className={`p-2 rounded-lg ${previewDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} border flex items-center gap-1.5 text-[10px] font-bold`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>0ms Offline POS Sync</span>
                  </div>
                  <div className={`p-2 rounded-lg ${previewDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} border flex items-center gap-1.5 text-[10px] font-bold`}>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span>No Card Required</span>
                  </div>
                  <div className={`p-2 rounded-lg ${previewDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} border flex items-center gap-1.5 text-[10px] font-bold`}>
                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Thermal &amp; A4 Print</span>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25">
                    <span>{ctaLabel || 'Claim 10-Day Free Trial'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Isolation Info Card */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/50 text-blue-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Strict Vault Isolation Guarantee</span>
            </div>
            <p className="text-[11px] text-blue-300/80 leading-relaxed">
              • <strong>Home Page Visitors:</strong> Only receive this public popup.<br />
              • <strong>In-App /user Workspace:</strong> Only receives tenant & staff broadcasts dispatched from the Universal Broadcast Center.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
