import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, QrCode, CheckCircle2, AlertTriangle, 
  Smartphone, ShieldCheck, Zap, RefreshCw, Save, 
  Send, FileText, ToggleLeft, ToggleRight, Sparkles, Crown
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
  const [activeTab, setActiveTab] = useState<'status' | 'triggers' | 'templates'>('status');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getTenantWhatsAppConfig();
    setConfig(loaded);
    setIsAutoAllowed(isAutoWhatsAppAllowed(loaded.tenantId));
  }, []);

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
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-6 h-6 text-emerald-200" />
            <h2 className="text-xl font-black tracking-tight">Company WhatsApp Automation Hub</h2>
            {isAutoAllowed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 text-white backdrop-blur-xs border border-white/30">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Enterprise Auto Gateway Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/20 text-amber-200 backdrop-blur-xs border border-amber-400/30">
                <span>1-Click Direct Mode</span>
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-100 max-w-xl">
            Attach your pharmacy's own WhatsApp number for automatic digital billing, sale returns, and customer khata payment receipts. 100% free with zero monthly API fees.
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
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>WhatsApp settings updated successfully across your company counters!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'status'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          1. WhatsApp Connection & Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('triggers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'triggers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          2. Auto-Send Rules & Toggles
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          3. Custom Message Templates
        </button>
      </div>

      {/* TAB 1: Status & Linking */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Pharmacy WhatsApp Phone Number</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Connected WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03001234567 or 923001234567"
                    value={config.connectedNumber}
                    onChange={e => setConfig({ ...config, connectedNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">This number will appear as the sender in customer receipts.</p>
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

              {/* Test WhatsApp Message Box */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Send Test WhatsApp Message</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter recipient phone (e.g. 03001234567)"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
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

          {/* Mode Explainer Card */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Active Delivery Mode</h3>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Gateway Status:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>READY & ACTIVE</span>
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current Plan:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{currentPlan}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Auto Background:</span>
                  <span className={`font-bold ${isAutoAllowed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isAutoAllowed ? 'ENABLED (Enterprise)' : '1-Click Direct (Upgrade for Auto)'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isAutoAllowed 
                  ? '⚡ When cashier saves a POS sale, customer receives the WhatsApp bill automatically in background.'
                  : '💡 On Silver & Gold plans, cashier sees a 1-click WhatsApp button after bill creation to open WhatsApp Web.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Triggers & Rules */}
      {activeTab === 'triggers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Company WhatsApp Notification Triggers</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select which events trigger automated WhatsApp messages.</p>
          </div>

          <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
            {/* 1. POS Sale */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1. POS Sale Invoices</span>
                <p className="text-[11px] text-slate-400">Send instant digital bill to customer's phone number on invoice completion.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnSale: !config.autoSendOnSale })}
                className="text-emerald-600 cursor-pointer"
              >
                {config.autoSendOnSale ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>

            {/* 2. Sale Return */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Sale Returns & Refunds</span>
                <p className="text-[11px] text-slate-400">Send return receipt and adjusted balance notice when customer returns a medicine.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnReturn: !config.autoSendOnReturn })}
                className="text-emerald-600 cursor-pointer"
              >
                {config.autoSendOnReturn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>

            {/* 3. Khata Payment */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Customer Khata Payments & Receipts</span>
                <p className="text-[11px] text-slate-400">Send digital acknowledgment whenever a debtor pays balance on their ledger.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnKhataPayment: !config.autoSendOnKhataPayment })}
                className="text-emerald-600 cursor-pointer"
              >
                {config.autoSendOnKhataPayment ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>

            {/* 4. Cashier Shift Closing */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">4. Daily Shift Closing to Store Owner</span>
                <p className="text-[11px] text-slate-400">Send cashier shift summary, total sales, and cash in drawer to owner's WhatsApp.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendShiftClosing: !config.autoSendShiftClosing })}
                className="text-emerald-600 cursor-pointer"
              >
                {config.autoSendShiftClosing ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>

            {/* 5. Purchase Inward */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">5. Purchase Inward Bills (To Supplier)</span>
                <p className="text-[11px] text-slate-400">Optional: Send inward stock received confirmation to distributor.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, autoSendOnPurchase: !config.autoSendOnPurchase })}
                className="text-emerald-600 cursor-pointer"
              >
                {config.autoSendOnPurchase ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Custom Templates */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Custom Message Templates</h3>
            <p className="text-xs text-slate-500 mt-0.5">Use placeholders like <code className="text-emerald-600">{'{CustomerName}'}</code>, <code className="text-emerald-600">{'{PharmacyName}'}</code>, <code className="text-emerald-600">{'{TotalAmount}'}</code>, <code className="text-emerald-600">{'{DueBalance}'}</code>.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">POS Sale Message Template</label>
              <textarea
                rows={4}
                value={config.customSaleTemplate}
                onChange={e => setConfig({ ...config, customSaleTemplate: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Khata Payment Receipt Template</label>
              <textarea
                rows={3}
                value={config.customKhataTemplate}
                onChange={e => setConfig({ ...config, customKhataTemplate: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
