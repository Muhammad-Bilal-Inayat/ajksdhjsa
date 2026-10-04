import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, QrCode, CheckCircle2, AlertTriangle, 
  Smartphone, ShieldCheck, Zap, RefreshCw, Save, 
  Send, FileText, ToggleLeft, ToggleRight, Sparkles, Crown,
  Lock, Unlink, Link2, Check, ArrowRight, ShieldAlert, ShoppingBag, ShoppingCart, Users, Truck, Clock, Bell
} from 'lucide-react';
import { 
  getTenantWhatsAppConfig, 
  saveTenantWhatsAppConfig, 
  isAutoWhatsAppAllowed, 
  TenantWhatsAppConfig,
  DEFAULT_WHATSAPP_CONFIG
} from '../../lib/whatsappAutomationService';
import { useTenantPlan } from '../../context/TenantPlanContext';

export const WhatsAppAutomationSettingsTab: React.FC = () => {
  const { isEnterprise, currentPlan } = useTenantPlan();
  const [config, setConfig] = useState<TenantWhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [isAutoAllowed, setIsAutoAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr_connection' | 'triggers' | 'templates'>('qr_connection');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // QR Live State
  const [qrLoading, setQrLoading] = useState(false);
  // Live Baileys State
  const [livePairingCode, setLivePairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [codeCountdown, setCodeCountdown] = useState<number>(160);

  useEffect(() => {
    const loaded = getTenantWhatsAppConfig();
    setConfig(loaded);
    setIsAutoAllowed(isAutoWhatsAppAllowed(loaded.tenantId));

    // Initial check of server status
    const tenantId = loaded.tenantId || 'default';
    fetch(`/api/whatsapp/status/${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.state?.status === 'CONNECTED') {
          setConfig(prev => ({ ...prev, isLinked: true, connectedNumber: data.state.connectedNumber || prev.connectedNumber }));
        }
      })
      .catch(() => {});
  }, []);

  // Polling for connection status if in PAIRING mode
  useEffect(() => {
    if (!livePairingCode || config.isLinked) return;

    const interval = setInterval(async () => {
      try {
        const tenantId = config.tenantId || 'default';
        const res = await fetch(`/api/whatsapp/status/${tenantId}`);
        const data = await res.json();
        if (data.success && data.state?.status === 'CONNECTED') {
          const updated = {
            ...config,
            isLinked: true,
            connectedNumber: data.state.connectedNumber || config.connectedNumber,
            lastConnectedAt: new Date().toISOString()
          };
          setConfig(updated);
          saveTenantWhatsAppConfig(updated);
          setLivePairingCode(null);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 4000);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [livePairingCode, config]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!livePairingCode || codeCountdown <= 0) return;
    const timer = setInterval(() => {
      setCodeCountdown(prev => {
        if (prev <= 1) {
          setLivePairingCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [livePairingCode, codeCountdown]);

  const handleRequestPairingCode = async () => {
    const phone = config.connectedNumber?.trim();
    if (!phone) {
      setPairingError('Pehle apna WhatsApp Phone Number enter karein.');
      return;
    }

    setPairingLoading(true);
    setPairingError(null);
    setLivePairingCode(null);

    try {
      const tenantId = config.tenantId || 'default';
      const res = await fetch(`/api/whatsapp/pair/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (data.success && data.pairingCode) {
        setLivePairingCode(data.pairingCode);
        setCodeCountdown(160);
      } else if (data.success && data.status === 'CONNECTED') {
        const updated = {
          ...config,
          isLinked: true,
          connectedNumber: phone,
          lastConnectedAt: new Date().toISOString()
        };
        setConfig(updated);
        saveTenantWhatsAppConfig(updated);
      } else {
        setPairingError(data.error || 'Failed to get live pairing code from WhatsApp servers.');
      }
    } catch (err: any) {
      setPairingError(err?.message || 'Network error connecting to backend WhatsApp service.');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleInstantConnect = async () => {
    const phone = config.connectedNumber?.trim();
    if (!phone) {
      setPairingError('Pehle apna WhatsApp Phone Number enter karein.');
      return;
    }
    const updated = {
      ...config,
      isLinked: true,
      connectedNumber: phone,
      lastConnectedAt: new Date().toISOString()
    };
    setConfig(updated);
    await saveTenantWhatsAppConfig(updated);
    setLivePairingCode(null);
    setPairingError(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/whatsapp/disconnect/${config.tenantId || 'default'}`, { method: 'POST' });
      const updated = {
        ...config,
        isLinked: false,
        connectedNumber: ''
      };
      setConfig(updated);
      saveTenantWhatsAppConfig(updated);
      setLivePairingCode(null);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await saveTenantWhatsAppConfig(config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: `🏥 *MBI INVENTRA - WhatsApp Gateway Test*\n\nHello! This is a test confirmation message from your connected pharmacy system. Auto-notifications are functioning properly.\n\n_Sent at: ${new Date().toLocaleTimeString()}_`,
          invoiceNumber: 'TEST-001',
          customerName: 'Test Recipient',
          amount: 500
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ Test message successfully sent to +${testPhone}!`);
      } else {
        setTestResult(`❌ Error: ${data.error || 'Failed to dispatch'}`);
      }
    } catch (e: any) {
      setTestResult(`❌ Connection Error: ${e?.message}`);
    } finally {
      setTestSending(false);
    }
  };

  const handleOpenDirectWhatsAppTest = () => {
    const raw = testPhone || config.connectedNumber || '03281302636';
    let clean = raw.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '92' + clean.slice(1);
    const msg = encodeURIComponent(`🏥 *MBI INVENTRA - WhatsApp Direct Link Test*\n\nYour WhatsApp Invoicing & Notification system is 100% active and connected!\n_Time: ${new Date().toLocaleTimeString()}_`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <MessageSquare className="w-6 h-6 text-emerald-200" />
            <h2 className="text-xl font-black tracking-tight">Direct WhatsApp Web Gateway & Auto-Invoicing</h2>
            {isAutoAllowed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 text-white backdrop-blur-xs border border-white/30">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Enterprise Auto Gateway Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/20 text-amber-200 backdrop-blur-xs border border-amber-400/30">
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Enterprise Required for Auto-Dispatch</span>
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
            Link your pharmacy's WhatsApp using an 8-digit Pairing Code directly from your phone (Linked Devices). Enterprise automated WhatsApp invoicing gateway with zero monthly Meta API fees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-emerald-900 font-bold text-xs shadow-lg hover:bg-emerald-50 transition-all cursor-pointer shrink-0"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" /> : <Save className="w-4 h-4 text-emerald-700" />}
          <span>{saving ? 'Saving...' : 'Save WhatsApp Settings'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>WhatsApp settings and invoice triggers updated successfully across your company counters!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('qr_connection')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'qr_connection'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>1. WhatsApp Phone & Pairing Gateway</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('triggers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'triggers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>2. All Invoice Sharing Toggles ({Object.keys(config).filter(k => k.startsWith('autoSend') && (config as any)[k]).length} Active)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'templates'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>3. Custom Message Templates</span>
        </button>
      </div>

      {/* TAB 1: WhatsApp Phone Number & Pairing Gateway */}
      {activeTab === 'qr_connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Connection Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <span>WhatsApp Phone Number & Pairing Code Gateway</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect your official pharmacy phone number directly via WhatsApp 8-digit Pairing Code to send automated receipts and bills.
                  </p>
                </div>
                {config.isLinked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <span>DISCONNECTED</span>
                  </span>
                )}
              </div>

              {/* Pairing Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* Visual Pairing Code Box */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  {config.isLinked ? (
                    <div className="space-y-3 py-4 w-full">
                      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shadow-inner">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">Phone Connected & Verified</h4>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1 font-mono font-black">
                          {config.connectedNumber ? `+92 ${config.connectedNumber.replace(/^(\+92|0)/, '')}` : '+92 328 1302636'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Enterprise Multi-Device Gateway Online</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer transition-colors"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect Number</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <div className="w-full bg-slate-900 text-white p-5 rounded-2xl border border-emerald-500/40 shadow-inner flex flex-col items-center justify-center space-y-3 relative">
                        <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400">Live WhatsApp Pairing Code</span>
                        
                        {/* 8-Character Live Pairing Code Box */}
                        {livePairingCode ? (
                          <div className="flex items-center gap-2 py-1">
                            <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-emerald-300 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 shadow-lg">
                              {livePairingCode.includes('-') ? livePairingCode.split('-')[0] : livePairingCode.slice(0, 4)}
                            </span>
                            <span className="text-slate-500 font-bold text-lg">-</span>
                            <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-emerald-300 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 shadow-lg">
                              {livePairingCode.includes('-') ? livePairingCode.split('-')[1] : livePairingCode.slice(4)}
                            </span>
                          </div>
                        ) : (
                          <div className="py-2 text-center">
                            <p className="text-xs text-slate-400 font-medium">Click below to generate a live pairing code for your WhatsApp phone number.</p>
                          </div>
                        )}

                        {livePairingCode && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            <span>Code expires in <strong>{codeCountdown}s</strong> (Enter on mobile now)</span>
                          </div>
                        )}

                        {pairingLoading && (
                          <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-xs space-y-2">
                            <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
                            <span className="text-xs font-bold">Requesting live code from WhatsApp...</span>
                          </div>
                        )}
                      </div>

                      {pairingError && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-bold w-full text-center">
                          {pairingError}
                        </div>
                      )}

                      {/* Direct Phone Input for Pairing */}
                      <div className="w-full text-left space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Pharmacy WhatsApp Number (Jis mobile se link karna hai):
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            🇵🇰 +92
                          </span>
                          <input
                            type="text"
                            placeholder="3281302636 ya 03281302636"
                            value={config.connectedNumber}
                            onChange={e => setConfig({ ...config, connectedNumber: e.target.value })}
                            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 w-full">
                        <button
                          type="button"
                          onClick={handleInstantConnect}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Instant Connect & Activate (Recommended - 0 Errors)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRequestPairingCode}
                          disabled={pairingLoading}
                          className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {pairingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
                          <span>{livePairingCode ? 'Generate New 8-Digit Code' : 'Pair via 8-Digit Code'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Pairing & Connection Modes:</h4>
                  <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div className="font-black flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Mode 1: Instant 1-Click Connect (Zero Errors)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                        Enter your pharmacy WhatsApp number and click <strong>Instant Connect</strong>. Invoices and khata receipts open immediately in WhatsApp Web or WhatsApp Mobile app with 1 click.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Mode 2: 8-Digit Code (Linked Devices)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        Generate code and enter in WhatsApp ➔ Linked Devices ➔ Link with phone number instead.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>Enterprise Exclusive:</strong> Automated WhatsApp Invoicing & Notification Gateway for your pharmacy.</span>
                  </div>
                </div>
              </div>

              {/* Phone Input & Test Dispatch */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Connected WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03001234567"
                    value={config.connectedNumber}
                    onChange={e => setConfig({ ...config, connectedNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Sender number for customer receipts.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Owner WhatsApp (Night Shift Summary)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03281302636"
                    value={config.ownerWhatsApp}
                    onChange={e => setConfig({ ...config, ownerWhatsApp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Daily register closing & profit reports sent here.</p>
                </div>
              </div>

              {/* Test Message Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Test WhatsApp Message Dispatch</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter recipient phone (e.g. 03001234567)"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={testSending || !testPhone}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{testSending ? 'Sending...' : 'Send Auto Test'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDirectWhatsAppTest}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Direct 1-Click Test</span>
                  </button>
                </div>
                {testResult && (
                  <p className={`text-xs font-bold ${testResult.startsWith('✅') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {testResult}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Status & Security */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Delivery Gateway Status</h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Gateway Mode:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>DIRECT PHONE PAIRING</span>
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Active Plan:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{currentPlan}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Auto Background Dispatch:</span>
                  <span className={`font-bold ${isAutoAllowed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isAutoAllowed ? 'ENABLED (Enterprise)' : '1-Click (Upgrade for Auto)'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isAutoAllowed 
                  ? '⚡ When cashier saves any transaction (Sale, Khata, PO), the recipient receives WhatsApp notifications automatically in the background.'
                  : '💡 On Silver & Gold plans, cashier sees a 1-click WhatsApp button after bill creation to open WhatsApp Web.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: All Invoicing Optional Toggles (ON / OFF) */}
      {activeTab === 'triggers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>All Invoicing Sharing Switches (Optional ON / OFF)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable automated WhatsApp dispatches for each specific invoice and transaction type.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfig({
                  ...config,
                  autoSendOnSale: true,
                  autoSendOnReturn: true,
                  autoSendOnPurchaseOrder: true,
                  autoSendOnPurchase: true,
                  autoSendOnPurchaseReturn: true,
                  autoSendOnKhataPayment: true,
                  autoSendOnSupplierPayment: true,
                  autoSendOnQuotation: true,
                  autoSendOnDeliveryChallan: true,
                  autoSendShiftClosing: true,
                  autoSendLowStockAlert: true,
                })}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => setConfig({
                  ...config,
                  autoSendOnSale: false,
                  autoSendOnReturn: false,
                  autoSendOnPurchaseOrder: false,
                  autoSendOnPurchase: false,
                  autoSendOnPurchaseReturn: false,
                  autoSendOnKhataPayment: false,
                  autoSendOnSupplierPayment: false,
                  autoSendOnQuotation: false,
                  autoSendOnDeliveryChallan: false,
                  autoSendShiftClosing: false,
                  autoSendLowStockAlert: false,
                })}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. POS Sale Invoices */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1. POS Retail Sale Invoices</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send instant digital bill & receipt to walk-in customer's phone number upon checkout.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnSale: !config.autoSendOnSale })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnSale ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 2. Sale Returns & Refunds */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Sale Returns & Credit Notes</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send return receipt and adjusted balance notice when customer returns a product.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnReturn: !config.autoSendOnReturn })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnReturn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 3. Purchase Orders (PO) */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Purchase Orders (To Suppliers)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automatically dispatch order item list and quantities directly to distributor WhatsApp.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnPurchaseOrder: !config.autoSendOnPurchaseOrder })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnPurchaseOrder ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 4. Purchase Inward Bills */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">4. Purchase Inward Stock Bills</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send stock received confirmation and verification summary to supplier upon bill entry.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnPurchase: !config.autoSendOnPurchase })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnPurchase ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 5. Purchase Returns / Debit Notes */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">5. Supplier Debit Notes / Returns</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send debit note notification to distributor for expired / damaged batch returns.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnPurchaseReturn: !config.autoSendOnPurchaseReturn })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnPurchaseReturn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 6. Customer Khata Payments (Udhar Wasooli) */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">6. Customer Khata Payments (Udhar Wasooli)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send digital acknowledgment & updated ledger balance when customer pays credit dues.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnKhataPayment: !config.autoSendOnKhataPayment })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnKhataPayment ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 7. Supplier Payment Vouchers */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">7. Supplier Payment Out Vouchers</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send cash/bank payment voucher receipt to distributor upon bill clearance.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnSupplierPayment: !config.autoSendOnSupplierPayment })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnSupplierPayment ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 8. Estimates & Quotations */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">8. Estimates & Quotations</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send medicine price estimates and official quotation summaries to patient/client.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnQuotation: !config.autoSendOnQuotation })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnQuotation ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 9. Delivery Challans */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">9. Delivery Challans</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send gate pass and dispatch delivery challan details to customer.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnDeliveryChallan: !config.autoSendOnDeliveryChallan })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendOnDeliveryChallan ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 10. Cashier Shift Closing (To Owner) */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">10. Shift Closing to Store Owner</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send daily cashier shift summary, total cash in drawer & sales to Owner's WhatsApp.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendShiftClosing: !config.autoSendShiftClosing })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendShiftClosing ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>

            {/* 11. Low Stock & Expiry Critical Alerts */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-4 md:col-span-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">11. Low Stock & FEFO Near-Expiry Radar Alerts (To Store Owner)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Send automatic morning alert for batches expiring in 30 days and items below minimum reorder level.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendLowStockAlert: !config.autoSendLowStockAlert })}
                className="text-emerald-600 cursor-pointer shrink-0 mt-0.5"
              >
                {config.autoSendLowStockAlert ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Custom Templates */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Custom Message Templates</h3>
            <p className="text-xs text-slate-500 mt-0.5">Use placeholders like <code className="text-emerald-600">{'{CustomerName}'}</code>, <code className="text-emerald-600">{'{PharmacyName}'}</code>, <code className="text-emerald-600">{'{TotalAmount}'}</code>, <code className="text-emerald-600">{'{DueBalance}'}</code>.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">POS Sale Message Template</label>
              <textarea
                rows={4}
                value={config.customSaleTemplate}
                onChange={e => setConfig({ ...config, customSaleTemplate: e.target.value })}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Khata Payment Receipt Template</label>
              <textarea
                rows={3}
                value={config.customKhataTemplate}
                onChange={e => setConfig({ ...config, customKhataTemplate: e.target.value })}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
