import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Globe, Eye, Save, RefreshCw, CheckCircle2, 
  ArrowRight, Image as ImageIcon, Upload, Trash2, Clock, Check, 
  ShieldCheck, Palette, Timer, Zap, Tag, Plus, X, PhoneCall, 
  Video, ExternalLink, HelpCircle, Laptop, Settings, Sliders,
  BellRing, Flame, Award, HeartHandshake, CheckSquare, Layers
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

const THEME_PRESETS = [
  { id: 'electric_indigo', name: 'Electric Violet', from: '#4338ca', to: '#7e22ce', badge: '#fbbf24', button: 'from-blue-600 via-indigo-600 to-purple-600' },
  { id: 'emerald_green', name: 'Emerald Pharma', from: '#047857', to: '#0f766e', badge: '#6ee7b7', button: 'from-emerald-600 to-teal-600' },
  { id: 'royal_cyan', name: 'Royal Tech Cyan', from: '#1d4ed8', to: '#0284c7', badge: '#38bdf8', button: 'from-blue-600 via-cyan-600 to-blue-700' },
  { id: 'sunset_rose', name: 'Sunset Flash', from: '#ea580c', to: '#e11d48', badge: '#fef08a', button: 'from-orange-500 via-amber-500 to-rose-600' },
  { id: 'crimson_red', name: 'Crimson Urgent', from: '#b91c1c', to: '#991b1b', badge: '#fca5a5', button: 'from-rose-600 to-red-700' },
  { id: 'gold_luxury', name: 'Gold Enterprise', from: '#b45309', to: '#ca8a04', badge: '#fef08a', button: 'from-amber-500 via-yellow-500 to-amber-600' },
  { id: 'midnight_dark', name: 'Midnight Cyber', from: '#0f172a', to: '#312e81', badge: '#818cf8', button: 'from-slate-800 via-indigo-900 to-slate-900' }
];

const BANNER_PRESETS = [
  { label: '🏥 Modern Pharmacy', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80' },
  { label: '⚡ Ultra POS Counter', url: 'https://images.unsplash.com/photo-1556742049-0a67e557224f?auto=format&fit=crop&w=800&q=80' },
  { label: '💊 Medicine Radar', url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80' },
  { label: '🎁 Limited Discount', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80' }
];

export const MasterHomePagePopupTab: React.FC<{ isDarkMode?: boolean }> = () => {
  const [saving, setSaving] = useState(false);
  const [previewDark, setPreviewDark] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Content State
  const [id, setId] = useState('hp_pop_master');
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('Welcome to MBI INVENTRA Cloud POS');
  const [subtitle, setSubtitle] = useState('Experience 0ms Ultra-Fast Pharmacy Billing & Management');
  const [body, setBody] = useState('Start your 10-day full access free trial with automated FEFO batching, thermal printing, and 100% offline desktop sync mode.');
  const [badgeText, setBadgeText] = useState('FREE 10-DAY TRIAL');
  const [imageUrl, setImageUrl] = useState('');
  
  // CTAs State
  const [ctaLabel, setCtaLabel] = useState('Claim 10-Day Free Trial');
  const [ctaUrl, setCtaUrl] = useState('/register');
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState('Maybe Later');
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState('');
  const [secondaryCtaType, setSecondaryCtaType] = useState<'dismiss' | 'whatsapp' | 'link'>('dismiss');

  // Theme & Styling State
  const [themePreset, setThemePreset] = useState('electric_indigo');
  const [gradientFrom, setGradientFrom] = useState('#4338ca');
  const [gradientTo, setGradientTo] = useState('#7e22ce');
  const [badgeColor, setBadgeColor] = useState('#fbbf24');

  // Countdown Timer State
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState('⚡ LIMITED OFFER EXPIRES IN:');
  const [countdownTarget, setCountdownTarget] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 48);
    return d.toISOString().slice(0, 16);
  });
  const [timeRemaining, setTimeRemaining] = useState({ days: 1, hours: 23, minutes: 59, seconds: 45 });

  // Feature Badges / Highlights
  const [featureTags, setFeatureTags] = useState<string[]>([
    '100% Free Full Access',
    '0ms Offline POS Sync',
    'No Card Required',
    'Thermal & A4 Print'
  ]);
  const [newTagInput, setNewTagInput] = useState('');

  // Behavior & Animation State
  const [animationStyle, setAnimationStyle] = useState<'zoom_bounce' | 'slide_up' | 'fade_in' | 'flip_3d'>('zoom_bounce');
  const [frequency, setFrequency] = useState<'every_visit' | 'once_per_session' | 'once_per_day'>('every_visit');
  const [autoDismissSeconds, setAutoDismissSeconds] = useState(0);
  const [soundEffect, setSoundEffect] = useState(false);
  const [autoShowDelayMs, setAutoShowDelayMs] = useState(1500);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Active sub-tab in settings panel
  const [activeSettingsTab, setActiveSettingsTab] = useState<'content' | 'theme' | 'timer' | 'features' | 'behavior'>('content');

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
          setSecondaryCtaLabel(p.secondaryCtaLabel || 'Maybe Later');
          setSecondaryCtaUrl(p.secondaryCtaUrl || '');
          setSecondaryCtaType(p.secondaryCtaType || 'dismiss');
          setThemePreset(p.themePreset || 'electric_indigo');
          setGradientFrom(p.gradientFrom || '#4338ca');
          setGradientTo(p.gradientTo || '#7e22ce');
          setBadgeColor(p.badgeColor || '#fbbf24');
          setShowCountdown(Boolean(p.showCountdown));
          setCountdownLabel(p.countdownLabel || '⚡ LIMITED OFFER EXPIRES IN:');
          if (p.countdownTarget) {
            setCountdownTarget(p.countdownTarget.slice(0, 16));
          }
          if (Array.isArray(p.featureTags) && p.featureTags.length > 0) {
            setFeatureTags(p.featureTags);
          }
          setAnimationStyle(p.animationStyle || 'zoom_bounce');
          setFrequency(p.frequency || 'every_visit');
          setAutoDismissSeconds(Number(p.autoDismissSeconds) || 0);
          setSoundEffect(Boolean(p.soundEffect));
          setAutoShowDelayMs(Number(p.autoShowDelayMs) || 1500);
          setLastUpdated(p.updatedAt || null);
        }
      }
    } catch (err) {
      console.warn('Failed to load homepage popup configuration:', err);
    }
  };

  useEffect(() => {
    loadPopupConfig();
  }, []);

  // Real-time ticking countdown for preview
  useEffect(() => {
    if (!showCountdown || !countdownTarget) return;

    const timer = setInterval(() => {
      const diff = new Date(countdownTarget).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeRemaining({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [showCountdown, countdownTarget]);

  // Image File Upload to Base64
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      emitToast('Image size exceeds 2MB. Please select an optimized banner image.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        emitToast('✨ Banner image uploaded & ready to publish!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Countdown Presets
  const setQuickCountdown = (hoursToAdd: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursToAdd);
    // Format YYYY-MM-DDTHH:mm
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCountdownTarget(iso);
    setShowCountdown(true);
    emitToast(`⏱️ Countdown timer set for ${hoursToAdd} hours from now!`, 'info');
  };

  // Apply Theme Preset
  const handleApplyTheme = (tp: typeof THEME_PRESETS[0]) => {
    setThemePreset(tp.id);
    setGradientFrom(tp.from);
    setGradientTo(tp.to);
    setBadgeColor(tp.badge);
    emitToast(`Applied "${tp.name}" Color Theme`, 'info');
  };

  // Add Feature Tag
  const handleAddFeatureTag = () => {
    if (!newTagInput.trim()) return;
    if (featureTags.length >= 6) {
      emitToast('Maximum 6 feature tags allowed for clean visual layout.', 'warning');
      return;
    }
    setFeatureTags([...featureTags, newTagInput.trim()]);
    setNewTagInput('');
  };

  // Remove Feature Tag
  const handleRemoveFeatureTag = (idx: number) => {
    setFeatureTags(featureTags.filter((_, i) => i !== idx));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !body.trim()) {
      emitToast('Please enter Title and Message body for Home Page popup.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: HomePagePopupConfig = {
        id: id || `hp_pop_${Date.now()}`,
        enabled,
        title: title.trim(),
        subtitle: subtitle.trim(),
        body: body.trim(),
        badgeText: badgeText.trim() || 'SPECIAL ANNOUNCEMENT',
        imageUrl: imageUrl.trim(),
        ctaLabel: ctaLabel.trim() || 'Get Started Now',
        ctaUrl: ctaUrl.trim() || '/register',
        secondaryCtaLabel: secondaryCtaLabel.trim() || 'Maybe Later',
        secondaryCtaUrl: secondaryCtaUrl.trim(),
        secondaryCtaType,
        themePreset,
        gradientFrom,
        gradientTo,
        badgeColor,
        showCountdown,
        countdownLabel: countdownLabel.trim(),
        countdownTarget,
        featureTags,
        animationStyle,
        frequency,
        autoDismissSeconds,
        soundEffect,
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
      <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/80 to-purple-950/90 border border-blue-700/50 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Public Home Page Isolated Popup Hub</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span>🌐 Landing / Home Page Popup Center Pro</span>
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
            Configure high-converting announcements, direct image banners, custom color gradients, flash sale countdown timers, and trial offers for <strong>Home Page visitors only</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearHistoryAndTest}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Open Home Page in new tab to test popup"
          >
            <Eye className="w-4 h-4 text-emerald-300" />
            <span>Test on Home Page</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Live...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save &amp; Publish Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Multi-Tab Settings Form & Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Header with Enable Switch & Sub-Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Popup Customizer &amp; Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Control visual style, images, timer, and links</p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className={`text-xs font-bold ${enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {enabled ? 'Active (Live)' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className="cursor-pointer focus:outline-none"
              >
                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSettingsTab('content')}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 ${activeSettingsTab === 'content' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Copy &amp; Image</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab('theme')}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 ${activeSettingsTab === 'theme' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>2. Color Themes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab('timer')}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 ${activeSettingsTab === 'timer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>3. Countdown Timer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab('features')}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 ${activeSettingsTab === 'features' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>4. Value Badges</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab('behavior')}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 ${activeSettingsTab === 'behavior' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>5. Actions &amp; Timing</span>
            </button>
          </div>

          {/* TAB 1: CONTENT & BANNER IMAGE UPLOAD */}
          {activeSettingsTab === 'content' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* 1-Click Quick Preset Templates */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>1-Click Professional Copy Presets</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBadgeText('FREE 10-DAY TRIAL');
                      setTitle('Transform Your Pharmacy With MBI INVENTRA');
                      setSubtitle('Experience 0.2s POS billing, automated FEFO expiry alerts & 0ms offline sync.');
                      setBody('Join 1,000+ modern pharmacies across Pakistan. Get full access for 10 days with zero credit card required.');
                      setCtaLabel('Claim 10-Day Free Trial');
                      setCtaUrl('/register');
                      handleApplyTheme(THEME_PRESETS[0]);
                      emitToast('Applied 10-Day Free Trial Template', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-left text-xs text-slate-200 transition-all cursor-pointer font-bold hover:border-blue-500"
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
                      handleApplyTheme(THEME_PRESETS[2]);
                      emitToast('Applied 0.2s POS Template', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-left text-xs text-slate-200 transition-all cursor-pointer font-bold hover:border-blue-500"
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
                      handleApplyTheme(THEME_PRESETS[1]);
                      emitToast('Applied FEFO Expiry Template', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-left text-xs text-slate-200 transition-all cursor-pointer font-bold hover:border-blue-500"
                  >
                    🛡️ Zero Expiry Loss
                  </button>
                </div>
              </div>

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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Direct Banner Image Upload & Presets */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Popup Banner Visual Image</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Image</span>
                    </button>
                  )}
                </div>

                {/* Upload Button + URL input */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload from Device</span>
                  </button>

                  <div className="w-full relative">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Or paste external image URL (https://...)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Preset Image Options */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Or choose quick banner preset:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BANNER_PRESETS.map((bp, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setImageUrl(bp.url);
                          emitToast(`Applied ${bp.label}`, 'info');
                        }}
                        className={`p-2 rounded-lg bg-slate-900 border text-left text-[11px] font-semibold transition cursor-pointer truncate ${imageUrl === bp.url ? 'border-blue-500 text-white' : 'border-slate-800 text-slate-300 hover:border-slate-700'}`}
                      >
                        {bp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLOR THEMES & CUSTOM GRADIENT DESIGNER */}
          {activeSettingsTab === 'theme' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>Choose Visual Color Theme Preset</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {THEME_PRESETS.map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => handleApplyTheme(tp)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${themePreset === tp.id ? 'border-white ring-2 ring-blue-500 bg-slate-800' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-5 h-5 rounded-full shadow-inner border border-white/30"
                          style={{ background: `linear-gradient(135deg, ${tp.from}, ${tp.to})` }}
                        />
                        <span className="text-xs font-bold text-white">{tp.name}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${tp.from}, ${tp.to})` }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dual Gradient Color Pickers */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Custom Gradient Start / End &amp; Badge Accent</span>
                  <span className="text-[11px] text-slate-400 font-normal">Fine-tune exact Hex colors</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block">Gradient Start Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={gradientFrom}
                        onChange={(e) => {
                          setGradientFrom(e.target.value);
                          setThemePreset('custom');
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={gradientFrom}
                        onChange={(e) => {
                          setGradientFrom(e.target.value);
                          setThemePreset('custom');
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block">Gradient End Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={gradientTo}
                        onChange={(e) => {
                          setGradientTo(e.target.value);
                          setThemePreset('custom');
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={gradientTo}
                        onChange={(e) => {
                          setGradientTo(e.target.value);
                          setThemePreset('custom');
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block">Badge Sparkle Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={badgeColor}
                        onChange={(e) => setBadgeColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={badgeColor}
                        onChange={(e) => setBadgeColor(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COUNTDOWN TIMER & FLASH SALE ENGINE */}
          {activeSettingsTab === 'timer' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Timer className="w-4 h-4 text-amber-400" />
                      <span>Live Animated Countdown Timer</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Display a live ticking urgency clock (Days, Hours, Minutes, Seconds) to boost trial signups.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={showCountdown}
                    onChange={(e) => setShowCountdown(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {showCountdown && (
                  <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Timer Headline / Banner Text
                      </label>
                      <input
                        type="text"
                        value={countdownLabel}
                        onChange={(e) => setCountdownLabel(e.target.value)}
                        placeholder="e.g. ⚡ FLASH SALE EXPIRES IN:"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Quick Duration Presets:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { label: '2 Hours', h: 2 },
                          { label: '6 Hours', h: 6 },
                          { label: '24 Hours', h: 24 },
                          { label: '48 Hours', h: 48 },
                          { label: '3 Days', h: 72 },
                          { label: '7 Days', h: 168 }
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setQuickCountdown(q.h)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-center text-xs font-bold text-slate-200 hover:border-amber-500 transition cursor-pointer"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Or Pick Specific Expiration Date &amp; Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={countdownTarget}
                        onChange={(e) => setCountdownTarget(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FEATURE BADGES & HIGHLIGHTS */}
          {activeSettingsTab === 'features' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>Value Highlights &amp; Trust Badges</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Shown in 2-column pills inside the popup to highlight benefits.
                    </p>
                  </div>
                </div>

                {/* Add new tag */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeatureTag(); } }}
                    placeholder="e.g. Free WhatsApp Statements, 100% Tax Ready"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeatureTag}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Badge</span>
                  </button>
                </div>

                {/* List of tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {featureTags.map((tag, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate font-semibold">{tag}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeatureTag(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                        title="Delete badge"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIONS, BEHAVIOR & TIMING */}
          {activeSettingsTab === 'behavior' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Primary CTA */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-white block">
                  Primary Action Button (Main CTA)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Button Label</label>
                    <input
                      type="text"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Claim 10-Day Free Trial"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Target Destination URL</label>
                    <input
                      type="text"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="/register or /checkout"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary CTA */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-white block">
                  Secondary Action Button
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Button Type</label>
                    <select
                      value={secondaryCtaType}
                      onChange={(e) => setSecondaryCtaType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      <option value="dismiss">Dismiss ("Maybe Later")</option>
                      <option value="whatsapp">Direct WhatsApp Chat</option>
                      <option value="link">Custom URL Link</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Button Label</label>
                    <input
                      type="text"
                      value={secondaryCtaLabel}
                      onChange={(e) => setSecondaryCtaLabel(e.target.value)}
                      placeholder="Contact Support"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Link / WhatsApp Number</label>
                    <input
                      type="text"
                      value={secondaryCtaUrl}
                      onChange={(e) => setSecondaryCtaUrl(e.target.value)}
                      placeholder={secondaryCtaType === 'whatsapp' ? '03364585863' : 'https://...'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Auto-Show Delay & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Auto-Popup Delay</span>
                    <span className="text-blue-400 font-bold">{(autoShowDelayMs / 1000).toFixed(1)}s</span>
                  </label>
                  <input
                    type="range"
                    min={500}
                    max={6000}
                    step={500}
                    value={autoShowDelayMs}
                    onChange={(e) => setAutoShowDelayMs(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Display Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-semibold"
                  >
                    <option value="every_visit">Every Visit (Recommended for testing)</option>
                    <option value="once_per_session">Once Per Browser Session</option>
                    <option value="once_per_day">Once Per 24 Hours</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              {lastUpdated ? `Last published: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Ready to publish'}
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Publish Live</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Live Interactive Home Page Preview</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewDark(false)}
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg ${!previewDark ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'} transition-all cursor-pointer`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDark(true)}
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg ${previewDark ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'} transition-all cursor-pointer`}
                >
                  Dark
                </button>
              </div>
            </div>

            {/* Preview Modal Card */}
            <div className={`rounded-3xl border ${previewDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl overflow-hidden transition-all duration-300`}>
              
              {/* Header with Dynamic Custom Gradient */}
              <div 
                className="p-5 sm:p-6 text-white relative transition-all duration-300"
                style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
              >
                {/* Ambient glow */}
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/25">
                    <Sparkles className="w-3 h-3 animate-pulse" style={{ color: badgeColor }} />
                    <span>{badgeText || 'SPECIAL ANNOUNCEMENT'}</span>
                  </span>
                </div>

                <h4 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                  {title || 'Your Popup Title Here'}
                </h4>

                {subtitle && (
                  <p className="text-xs text-white/90 font-medium mt-1 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Banner Image Preview */}
                {imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40 bg-slate-100 dark:bg-slate-950 shadow-xs">
                    <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Live Countdown Timer Widget */}
                {showCountdown && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-center space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider block text-amber-600 dark:text-amber-400">
                      {countdownLabel || '⚡ SPECIAL OFFER EXPIRES IN:'}
                    </span>
                    <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white font-mono font-black">
                      <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs">
                        <span className="text-sm font-black">{String(timeRemaining.days).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-500 font-sans font-normal">Days</span>
                      </div>
                      <span>:</span>
                      <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs">
                        <span className="text-sm font-black">{String(timeRemaining.hours).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-500 font-sans font-normal">Hours</span>
                      </div>
                      <span>:</span>
                      <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs">
                        <span className="text-sm font-black">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-500 font-sans font-normal">Mins</span>
                      </div>
                      <span>:</span>
                      <div className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs text-rose-500">
                        <span className="text-sm font-black">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-500 font-sans font-normal">Secs</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description Body */}
                <p className={`text-xs ${previewDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
                  {body || 'Your message body will appear here for visitors.'}
                </p>

                {/* Value Highlight Badges */}
                {featureTags.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {featureTags.map((tag, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded-xl ${previewDark ? 'bg-slate-800/70 border-slate-700/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} border flex items-center gap-2 text-[11px] font-bold`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{tag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Primary & Secondary Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <div 
                    className="w-full sm:flex-1 py-3 px-4 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                  >
                    <span>{ctaLabel || 'Claim 10-Day Free Trial'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>

                  {secondaryCtaLabel && (
                    <div className="w-full sm:w-auto py-2.5 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 text-center cursor-pointer">
                      {secondaryCtaType === 'whatsapp' ? `💬 ${secondaryCtaLabel}` : secondaryCtaLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Isolation Info Card */}
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-blue-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Strict Vault &amp; Workspace Isolation Guarantee</span>
            </div>
            <p className="text-[11px] text-blue-300/80 leading-relaxed">
              • <strong>Home Page Visitors:</strong> Only receive this public marketing popup.<br />
              • <strong>Client / Staff Workspaces:</strong> 100% isolated. Staff only receive company notifications dispatched from the Universal Broadcast Center.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
