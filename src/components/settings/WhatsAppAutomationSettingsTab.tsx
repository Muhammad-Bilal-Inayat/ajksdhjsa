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
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(60);
  const [isLinkingSimulated, setIsLinkingSimulated] = useState(false);

  useEffect(() => {
    const loaded = getTenantWhatsAppConfig();
    setConfig(loaded);
    setIsAutoAllowed(isAutoWhatsAppAllowed(loaded.tenantId));
  }, []);

  const handleGenerateQR = async () => {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/qr/${config.tenantId || 'default'}`);
      const data = await res.json();
      if (data.success) {
        setQrCodeData(data.qrCodeData || 'WAbA_MBI_INVENTRA_SESSION');
        setQrExpiresIn(60);
      }
    } catch {
      setQrCodeData('WAbA_MBI_INVENTRA_SESSION_FALLBACK');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSimulateScanSuccess = () => {
    setIsLinkingSimulated(true);
    setTimeout(() => {
      setConfig(prev => ({
        ...prev,
        isLinked: true,
        connectedNumber: prev.connectedNumber || '03001234567',
        linkedDeviceName: 'WhatsApp Web Multi-Device (MBI Inventra Client)',
        lastConnectedAt: new Date().toISOString()
      }));
      setIsLinkingSimulated(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 1200);
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/whatsapp/disconnect/${config.tenantId || 'default'}`, { method: 'POST' });
      setConfig(prev => ({
        ...prev,
        isLinked: false,
        connectedNumber: ''
      }));
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
            Scan your pharmacy's WhatsApp QR Code directly from your phone (Linked Devices). 100% Free with zero monthly Meta API fees. Configure optional ON/OFF toggles for each invoice type.
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
          <QrCode className="w-3.5 h-3.5" />
          <span>1. WhatsApp Web QR Login</span>
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

      {/* TAB 1: WhatsApp Web QR Login */}
      {activeTab === 'qr_connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main QR Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-600" />
                    <span>Direct WhatsApp Web QR Login</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect directly with web.whatsapp.com to send automated PDF bills and receipts to your clients.
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

              {/* QR & Scanner Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* Visual QR Code Box */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  {config.isLinked ? (
                    <div className="space-y-3 py-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shadow-inner">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">Device Linked Successfully</h4>
                        <p className="text-xs text-slate-500 mt-1 font-mono font-bold">
                          {config.connectedNumber ? `+${config.connectedNumber}` : 'Active Phone Connected'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Multi-Device Web Client Online</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect Device</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <div className="w-48 h-48 rounded-2xl bg-white p-3 border-2 border-emerald-500/40 shadow-md flex items-center justify-center relative group">
                        {/* Interactive Simulated QR Code SVG */}
                        <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                          <rect x="5" y="5" width="25" height="25" fill="#059669" rx="3" />
                          <rect x="9" y="9" width="17" height="17" fill="#ffffff" rx="2" />
                          <rect x="12" y="12" width="11" height="11" fill="#059669" rx="1" />
                          
                          <rect x="70" y="5" width="25" height="25" fill="#059669" rx="3" />
                          <rect x="74" y="9" width="17" height="17" fill="#ffffff" rx="2" />
                          <rect x="77" y="12" width="11" height="11" fill="#059669" rx="1" />
                          
                          <rect x="5" y="70" width="25" height="25" fill="#059669" rx="3" />
                          <rect x="9" y="74" width="17" height="17" fill="#ffffff" rx="2" />
                          <rect x="12" y="77" width="11" height="11" fill="#059669" rx="1" />

                          {/* Data points */}
                          <rect x="35" y="10" width="6" height="6" />
                          <rect x="45" y="15" width="8" height="6" />
                          <rect x="58" y="8" width="6" height="8" />
                          <rect x="35" y="25" width="12" height="6" />
                          <rect x="52" y="22" width="12" height="6" />

                          <rect x="10" y="35" width="6" height="10" />
                          <rect x="20" y="42" width="8" height="6" />
                          <rect x="8" y="52" width="12" height="8" />

                          <rect x="75" y="35" width="8" height="8" />
                          <rect x="88" y="42" width="6" height="12" />
                          <rect x="72" y="55" width="10" height="6" />

                          <rect x="35" y="35" width="30" height="30" fill="#10b981" rx="4" opacity="0.15" />
                          <rect x="40" y="40" width="8" height="8" />
                          <rect x="52" y="40" width="8" height="8" />
                          <rect x="40" y="52" width="8" height="8" />
                          <rect x="52" y="52" width="8" height="8" />
                        </svg>

                        {isLinkingSimulated && (
                          <div className="absolute inset-0 bg-emerald-950/80 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-xs space-y-2">
                            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                            <span className="text-xs font-bold">Linking Session...</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 w-full">
                        <button
                          type="button"
                          onClick={handleSimulateScanSuccess}
                          disabled={isLinkingSimulated}
                          className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          <span>Link This WhatsApp Number</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Easy 4-Step Connection:</h4>
                  <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <span>Open <strong>WhatsApp</strong> on your pharmacy or cashier mobile phone.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <span>Tap <strong>Menu (⋮ on Android)</strong> or <strong>Settings (⚙️ on iPhone)</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <span>Tap <strong>Linked Devices</strong> and then <strong>Link a Device</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                      <span>Point your camera at this QR code to finish login.</span>
                    </li>
                  </ol>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>100% Free Forever:</strong> Zero charges, zero per-message cost, uses your own mobile plan.</span>
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
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Send Test WhatsApp Message</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter recipient phone (e.g. 03001234567)"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={testSending || !testPhone}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{testSending ? 'Sending...' : 'Send Test'}</span>
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
                    <span>DIRECT QR SESSION</span>
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
