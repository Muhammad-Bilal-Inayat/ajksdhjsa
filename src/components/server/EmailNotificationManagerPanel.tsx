import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, CheckCircle2, AlertCircle, Shield, Key, RefreshCw, 
  Sparkles, Server, Check, Lock, Users, Building2, Megaphone, 
  Clock, CheckCheck, FileText, AlertTriangle, ChevronDown, Eye, Layers
} from 'lucide-react';

interface TenantOption {
  id: string;
  tenant_id?: string;
  name: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  plan?: string;
  status?: string;
}

interface DispatchLog {
  id: string;
  timestamp: string;
  targetType: string;
  recipient: string;
  subject: string;
  priority: string;
  status: 'sent' | 'failed';
  dispatchedCount: number;
}

export const EmailNotificationManagerPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SMTP Settings
  const [settings, setSettings] = useState({
    enabled: true,
    adminEmail: 'mbiinventra@gmail.com',
    smtpUser: 'mbiinventra@gmail.com',
    smtpPass: '',
    senderName: 'MBI INVENTRA Cloud ERP',
    senderEmail: 'mbiinventra@gmail.com'
  });

  const [testEmailTarget, setTestEmailTarget] = useState('mbiinventra@gmail.com');
  const [showPass, setShowPass] = useState(false);

  // Tenants List for Targeting
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Custom Tenant Message Composer States
  const [targetType, setTargetType] = useState<'all' | 'tenant' | 'custom'>('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [customRecipientEmail, setCustomRecipientEmail] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [badgeText, setBadgeText] = useState<string>('📢 OFFICIAL ANNOUNCEMENT');
  const [subject, setSubject] = useState<string>('');
  const [customBody, setCustomBody] = useState<string>('');
  const [actionBtnText, setActionBtnText] = useState<string>('Launch Pharmacy Portal');
  const [actionBtnUrl, setActionBtnUrl] = useState<string>('https://mbiinventra.com');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Sent History Log
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>(() => {
    try {
      const saved = localStorage.getItem('mbi_email_dispatch_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getAuthToken = () => {
    return localStorage.getItem('mbi_master_token') || localStorage.getItem('mbi_jwt_token') || '';
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch('/api/master/email/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            smtpPass: data.settings.smtpPassMasked || ''
          }));
          if (data.settings.adminEmail) {
            setTestEmailTarget(data.settings.adminEmail);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load email settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const token = getAuthToken();
      // Try fleet tenants endpoint
      const res = await fetch('/api/fleet/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tenants)) {
          setTenants(data.tenants);
          if (data.tenants.length > 0 && !selectedTenantId) {
            setSelectedTenantId(data.tenants[0].tenant_id || data.tenants[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load tenants for email composer:', e);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTenants();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const token = getAuthToken();
      const res = await fetch('/api/master/email/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '✅ Email & Notification settings saved and active in background!' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error connecting to server' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setTesting(true);
      setMessage(null);
      const token = getAuthToken();
      const res = await fetch('/api/master/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetEmail: testEmailTarget.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `🚀 Test email successfully sent to ${testEmailTarget}! Check your inbox.` });
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error || 'Test email failed. Please verify credentials.'}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ ${err?.message || 'Failed to dispatch test email.'}` });
    } finally {
      setTesting(false);
    }
  };

  // Quick Template Injector
  const applyTemplate = (type: 'maintenance' | 'feature' | 'renewal' | 'greeting' | 'support') => {
    if (type === 'maintenance') {
      setSubject('⚠️ Scheduled Cloud Server Maintenance Notice — MBI INVENTRA');
      setPriority('high');
      setBadgeText('⚠️ SERVER MAINTENANCE');
      setCustomBody(
        `Dear Valued Partner,\n\nPlease be informed that our core cloud servers will undergo scheduled infrastructure maintenance on Sunday at 02:00 AM PKT.\n\nYour local POS counters will continue running with 100% 0ms offline capability. Once cloud sync resumes, all offline transactions will automatically synchronize to SQLite Vault.\n\nThank you for choosing MBI INVENTRA.`
      );
      setActionBtnText('Check System Status');
      setActionBtnUrl('https://mbiinventra.com/server');
    } else if (type === 'feature') {
      setSubject('🚀 New Feature Release: High-Speed Multi-Counter Sync & B-Tree Indexes');
      setPriority('normal');
      setBadgeText('🚀 NEW FEATURE RELEASE');
      setCustomBody(
        `Dear Valued Client,\n\nWe have deployed a major performance hotfix to your MBI INVENTRA Pharmacy ERP.\n\nKey Highlights:\n1. 0ms Fast Cashier PIN Switchboard\n2. SQLite Tenant-Vault B-Tree indexing for searching 100,000+ invoices in sub-milliseconds\n3. Automated Gmail alerts for registrations & staff invitations.\n\nEnjoy the supercharged speed!`
      );
      setActionBtnText('Open POS Dashboard');
      setActionBtnUrl('https://mbiinventra.com');
    } else if (type === 'renewal') {
      setSubject('🔔 Subscription Plan Renewal Reminder — MBI INVENTRA');
      setPriority('urgent');
      setBadgeText('🔔 SUBSCRIPTION RENEWAL');
      setCustomBody(
        `Dear Pharmacy Owner,\n\nYour monthly software subscription for MBI INVENTRA Cloud ERP is due for renewal.\n\nTo ensure continuous uninterrupted cloud backups, multi-counter sync, and 24/7 technical support, please contact our billing desk or renew your plan.\n\nBank / JazzCash details are available on your dashboard.`
      );
      setActionBtnText('Renew Subscription Now');
      setActionBtnUrl('https://mbiinventra.com/server');
    } else if (type === 'support') {
      setSubject('💬 24/7 WhatsApp Technical Support & Dedicated Helpline');
      setPriority('normal');
      setBadgeText('💬 DEDICATED SUPPORT');
      setCustomBody(
        `Assalam-o-Alaikum,\n\nThis is a friendly reminder that our engineering and support team is available 24/7 to assist your staff with printer setup, inventory imports, and staff training.\n\nDedicated WhatsApp Desks:\n• +92 336 4585863\n• +92 328 1302636\n\nFeel free to reach out anytime!`
      );
      setActionBtnText('Contact Support Desk');
      setActionBtnUrl('https://wa.me/923364585863');
    }
  };

  // Dispatch Custom Broadcast / Single Tenant Email
  const handleDispatchCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !customBody.trim()) {
      setMessage({ type: 'error', text: 'Subject and message body cannot be empty.' });
      return;
    }

    try {
      setBroadcasting(true);
      setMessage(null);
      const token = getAuthToken();
      const res = await fetch('/api/master/email/broadcast-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetType,
          tenantId: targetType === 'all' ? 'all' : selectedTenantId,
          customEmail: targetType === 'custom' ? customRecipientEmail.trim() : undefined,
          subject: subject.trim(),
          message: customBody.trim(),
          priority,
          badgeText: badgeText.trim(),
          actionButtonText: actionBtnText.trim() || undefined,
          actionButtonUrl: actionBtnUrl.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `🎉 ${data.message || `Custom email dispatched successfully to ${data.dispatchedCount} recipient(s)!`}`
        });

        // Record in dispatch logs
        const newLog: DispatchLog = {
          id: 'log_' + Date.now(),
          timestamp: new Date().toLocaleTimeString() + ' (' + new Date().toLocaleDateString() + ')',
          targetType: targetType === 'all' ? 'All Tenants' : targetType === 'tenant' ? `Tenant: ${selectedTenantId}` : 'Direct Custom',
          recipient: targetType === 'all' ? `All Active (${data.dispatchedCount})` : targetType === 'tenant' ? (data.recipients?.[0] || selectedTenantId) : customRecipientEmail,
          subject: subject.trim(),
          priority,
          status: 'sent',
          dispatchedCount: data.dispatchedCount || 1
        };

        const updatedLogs = [newLog, ...dispatchLogs].slice(0, 15);
        setDispatchLogs(updatedLogs);
        localStorage.setItem('mbi_email_dispatch_logs', JSON.stringify(updatedLogs));

        // Reset composer optionally
        setSubject('');
        setCustomBody('');
      } else {
        setMessage({
          type: 'error',
          text: `❌ ${data.error || 'Failed to dispatch custom email.'}`
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `❌ ${err?.message || 'Error executing email broadcast.'}`
      });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 dark:border-blue-500/20 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>100% Free Gmail SMTP Engine Active</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">Google App Password Authenticated</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            <span>Automated Email & Custom Tenant Broadcast Center</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Compose custom notices, updates, or maintenance alerts to specific pharmacy tenants or broadcast to all active clients simultaneously with branded responsive HTML templates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => { fetchSettings(); fetchTenants(); }}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            title="Refresh Settings & Tenants"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Row: SMTP Settings + 1-Click Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Email Configuration Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Gmail SMTP Relay & Admin Alerts Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Change the receiver admin email or update the 16-digit Google App Password anytime.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  🚨 Super-Admin Alert Email (Where You Receive Alerts) *
                </label>
                <input
                  type="email"
                  required
                  value={settings.adminEmail}
                  onChange={e => setSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="mbiinventra@gmail.com"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">New tenant registrations deliver here.</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.senderName}
                  onChange={e => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="MBI INVENTRA Cloud ERP"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Shown in customer inbox as sender name.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail Account (SMTP User) *
                </label>
                <input
                  type="email"
                  required
                  value={settings.smtpUser}
                  onChange={e => setSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="mbiinventra@gmail.com"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>16-Digit Google App Password *</span>
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showPass ? 'Hide' : 'Reveal'}
                  </button>
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={settings.smtpPass}
                  onChange={e => setSettings(prev => ({ ...prev, smtpPass: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-wider focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="pnbx zmnr wthd gocy"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableEmailEngine"
                  checked={settings.enabled}
                  onChange={e => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="enableEmailEngine" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Enable Automated 24/7 Email Worker
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Email Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: 1-Click Live Test & Triggers Overview */}
        <div className="space-y-6">
          {/* Live Test Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">1-Click Live Email Test</h3>
                <p className="text-[11px] text-slate-500">Send an instant test email right now</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Recipient Email</label>
              <input
                type="email"
                value={testEmailTarget}
                onChange={e => setTestEmailTarget(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="mbiinventra@gmail.com"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testing || !testEmailTarget.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{testing ? 'Sending Email...' : '⚡ Send Test Email Now'}</span>
            </button>
          </div>

          {/* Automated Triggers Status */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Active Automated Triggers</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">🚨 New Registration</p>
                  <p className="text-[10px] text-slate-500">Alert to Admin + Welcome to Client</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">AUTO</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">🏥 Staff PIN Invitation</p>
                  <p className="text-[10px] text-slate-500">Auto sends 4-digit PIN to staff</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">AUTO</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">🔒 Password / PIN Reset</p>
                  <p className="text-[10px] text-slate-500">1-click automated credentials email</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">AUTO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Custom Message Composer & Tenant Email Broadcast */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Compose Custom Email to Tenants / Clients</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Broadcast Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send custom announcements, maintenance warnings, or personalized emails directly to pharmacy owners' inboxes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              <span>{showPreview ? 'Hide HTML Preview' : 'Show Live Preview'}</span>
            </button>
          </div>
        </div>

        {/* Template Quick Chips */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Click Template Quick-Fill:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTemplate('feature')}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🚀 New Feature Release</span>
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('maintenance')}
              className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/80 dark:border-amber-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚠️ Scheduled Maintenance</span>
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('renewal')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200/80 dark:border-rose-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🔔 Plan Renewal Notice</span>
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('support')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>💬 24/7 WhatsApp Helpline</span>
            </button>
          </div>
        </div>

        {/* Composer Form */}
        <form onSubmit={handleDispatchCustomEmail} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Selector */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Recipient Audience *
              </label>
              <select
                value={targetType}
                onChange={e => setTargetType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
              >
                <option value="all">📢 Broadcast to ALL Pharmacy Tenants ({tenants.length} Companies)</option>
                <option value="tenant">🏢 Specific Single Tenant (Pick from List)</option>
                <option value="custom">✏️ Direct Custom Email Address</option>
              </select>
            </div>

            {/* If Single Tenant Selected */}
            {targetType === 'tenant' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Registered Tenant *
                </label>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                >
                  {tenants.map(t => (
                    <option key={t.id || t.tenant_id} value={t.tenant_id || t.id}>
                      {t.name} — {t.owner_email || t.owner_phone || 'No Email'} ({t.plan || 'Plan'})
                    </option>
                  ))}
                  {tenants.length === 0 && <option value="">No tenants registered yet</option>}
                </select>
              </div>
            )}

            {/* If Direct Custom Email Selected */}
            {targetType === 'custom' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customRecipientEmail}
                  onChange={e => setCustomRecipientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  placeholder="pharmacyowner@gmail.com"
                />
              </div>
            )}

            {/* Priority & Color Tag */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notification Priority & Theme
              </label>
              <select
                value={priority}
                onChange={e => {
                  const p = e.target.value as any;
                  setPriority(p);
                  if (p === 'urgent') setBadgeText('⚠️ URGENT NOTIFICATION');
                  else if (p === 'high') setBadgeText('⭐ IMPORTANT NOTICE');
                  else setBadgeText('📢 OFFICIAL ANNOUNCEMENT');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
              >
                <option value="normal">📢 Normal Announcement (Blue)</option>
                <option value="high">⭐ High Priority Notice (Amber)</option>
                <option value="urgent">⚠️ Urgent / Critical Alert (Red)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Top Badge Title / Tag
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={e => setBadgeText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                placeholder="📢 OFFICIAL ANNOUNCEMENT"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                placeholder="e.g. Important System Update: New Inventory & Offline Features"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Custom Message Body (Double Enter for new paragraph) *
            </label>
            <textarea
              required
              rows={6}
              value={customBody}
              onChange={e => setCustomBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed outline-none"
              placeholder="Write your custom message here. You can include instructions, announcements, renewal terms, or greetings..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Action Button Text (Optional)
              </label>
              <input
                type="text"
                value={actionBtnText}
                onChange={e => setActionBtnText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                placeholder="Launch Pharmacy Portal"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Action Button URL (Optional)
              </label>
              <input
                type="url"
                value={actionBtnUrl}
                onChange={e => setActionBtnUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                placeholder="https://mbiinventra.com"
              />
            </div>
          </div>

          {/* Live Preview Modal/Box */}
          {showPreview && (
            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 space-y-3">
              <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Responsive Email Preview (Delivered Look):</span>
              </div>
              <div className="bg-white text-slate-900 rounded-2xl shadow-lg border border-slate-200 max-w-xl mx-auto overflow-hidden">
                {/* Brand Header */}
                <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 text-white p-6 text-center border-b-2 border-blue-500/40 space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-base flex items-center justify-center shadow-md shadow-cyan-500/30">
                      M4
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-black tracking-wide leading-tight">
                        MBI <span className="text-cyan-400">INVENTRA</span>
                      </div>
                      <div className="text-[9px] font-bold text-blue-300 tracking-widest uppercase">
                        Cloud POS &amp; Pharmacy ERP
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className={`inline-block px-3.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm ${
                      priority === 'urgent' ? 'bg-red-600' : priority === 'high' ? 'bg-amber-600' : 'bg-blue-600'
                    }`}>
                      {badgeText || '📢 OFFICIAL ANNOUNCEMENT'}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white tracking-tight">{subject || 'Your Email Subject Here'}</h4>
                  {targetType === 'tenant' && selectedTenantId && (
                    <div className="text-[11px] text-slate-300">
                      Delivered To: <strong className="text-white">{tenants.find(t => (t.tenant_id || t.id) === selectedTenantId)?.name || selectedTenantId}</strong>
                    </div>
                  )}
                  {targetType === 'custom' && customRecipientEmail && (
                    <div className="text-[11px] text-slate-300">
                      Delivered To: <strong className="text-white">{customRecipientEmail}</strong>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 text-xs text-slate-700">
                  <div className={`border-l-4 pl-3.5 whitespace-pre-wrap leading-relaxed ${
                    priority === 'urgent' ? 'border-red-500' : priority === 'high' ? 'border-amber-500' : 'border-blue-500'
                  }`}>
                    {customBody || 'Your custom message content will render here with high-legibility paragraphs and clean styling.'}
                  </div>

                  {actionBtnText && actionBtnUrl && (
                    <div className="text-center pt-2">
                      <a
                        href={actionBtnUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20"
                      >
                        {actionBtnText}
                      </a>
                    </div>
                  )}

                  {/* WhatsApp Support Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                    <div>
                      <div className="font-bold text-slate-900">💬 24/7 Dedicated WhatsApp Support</div>
                      <div className="text-[10px] text-slate-500">Engineering &amp; billing assistance available anytime.</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-white font-bold text-[10px]">
                        WhatsApp 1
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-white font-bold text-[10px]">
                        WhatsApp 2
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-[10.5px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700">MBI INVENTRA Cloud ERP • Master Server Communication System</div>
                  <div>Sargodha, Punjab, Pakistan • Official Helpline: +92 336 4585863 / +92 328 1302636</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={broadcasting || !subject.trim() || !customBody.trim()}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {broadcasting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{broadcasting ? 'Dispatching Emails...' : '🚀 Dispatch Custom Email to Tenant(s)'}</span>
            </button>
          </div>
        </form>

        {/* Sent Dispatch History */}
        {dispatchLogs.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Recent Custom Email Dispatch Log</span>
              </h4>
              <button
                type="button"
                onClick={() => { setDispatchLogs([]); localStorage.removeItem('mbi_email_dispatch_logs'); }}
                className="text-[10px] text-slate-400 hover:text-rose-500"
              >
                Clear History
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
              {dispatchLogs.map(log => (
                <div key={log.id} className="py-2 flex items-center justify-between text-[11px] gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate">{log.subject}</span>
                    <span className="text-slate-400 shrink-0">→ {log.recipient}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-slate-500">
                    <span className="font-mono text-[10px]">{log.timestamp}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      SENT ({log.dispatchedCount})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
