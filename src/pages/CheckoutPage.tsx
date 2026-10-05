import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, User, Phone, Mail, MapPin, Lock, Eye, EyeOff,
  CreditCard, ShieldCheck, CheckCircle2, AlertCircle, ShoppingCart,
  Upload, Copy, Check, MessageSquare, ArrowRight, ArrowLeft,
  Sparkles, RefreshCw, Layers, CheckCheck, HelpCircle, Sun, Moon,
  FileImage, Trash2, Globe
} from 'lucide-react';
import { EXACT_PRICING_PLANS, PricingInterval } from '../components/landing/PricingSection';
import { PaymentAccountsCard, OFFICIAL_PAYMENT_CHANNELS } from '../components/checkout/PaymentAccountsCard';
import { emitToast } from '../contexts/ToastContext';
import { saveCheckoutOrder, CheckoutOrder } from '../lib/checkoutOrderService';
import { saveRegistrationLeadLocal } from '../lib/registrationLeadsService';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL Query Params Defaults (support both plan=basic/business/enterprise/silver/gold/platinum and interval/duration)
  const rawPlan = searchParams.get('plan') as string | null;
  const rawInterval = (searchParams.get('duration') || searchParams.get('interval')) as PricingInterval | null;

  const normalizePlanId = (p: string | null): 'basic' | 'business' | 'enterprise' => {
    if (!p) return 'business';
    const lower = p.toLowerCase();
    if (lower === 'silver' || lower === 'basic') return 'basic';
    if (lower === 'gold' || lower === 'business') return 'business';
    if (lower === 'platinum' || lower === 'enterprise') return 'enterprise';
    return 'business';
  };

  // Step 1: Selected Plan & Duration
  const [selectedPlanId, setSelectedPlanId] = useState<'basic' | 'business' | 'enterprise'>(
    normalizePlanId(rawPlan)
  );
  const [interval, setInterval] = useState<PricingInterval>(
    rawInterval && ['monthly', '1year', '3years', '5years'].includes(rawInterval) ? rawInterval : '1year'
  );

  // Keep plan and interval in sync whenever query params change
  useEffect(() => {
    const p = searchParams.get('plan');
    const int = (searchParams.get('duration') || searchParams.get('interval')) as PricingInterval | null;
    if (p) {
      setSelectedPlanId(normalizePlanId(p));
    }
    if (int && ['monthly', '1year', '3years', '5years'].includes(int)) {
      setInterval(int);
    }
  }, [searchParams]);

  // Step 2: Pharmacy Details Form
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3: Payment Channel
  const [paymentChannel, setPaymentChannel] = useState<'meezan' | 'ubl' | 'wallets' | 'binance'>('meezan');

  // Step 4: Proof & Trx ID
  const [trxId, setTrxId] = useState('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Submission & Modal States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Theme support
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('mbi_landing_theme') === 'dark';
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mbi_landing_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mbi_landing_theme', 'light');
    }
  };

  // Find Plan Details
  const currentPlan = EXACT_PRICING_PLANS.find(p => p.id === selectedPlanId) || EXACT_PRICING_PLANS[1];
  const payableAmount = currentPlan.prices[interval];

  // Duration label
  const getIntervalFormatted = (int: PricingInterval) => {
    switch (int) {
      case 'monthly': return 'Monthly Billing';
      case '1year': return '1-Year License (Save 30%)';
      case '3years': return '3-Years License';
      case '5years': return '5-Years License';
    }
  };

  // Image File Uploader Handler
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      emitToast('Please upload an image file (PNG, JPG, JPEG, WEBP)', 'warning');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      emitToast('Image size must be less than 8MB', 'warning');
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setScreenshotData(result);
      emitToast('Payment receipt screenshot attached!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Form Submit Handler
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!storeName.trim()) {
      setErrorMessage('Please enter your Pharmacy or Medical Store Name.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMessage('Please enter the Owner or Pharmacist Name.');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Please enter a unique Username for login.');
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMessage('Please enter your WhatsApp / Mobile Number.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your valid Email Address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter a login password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }
    if (!trxId.trim() && !screenshotData) {
      setErrorMessage('Please provide either a Transaction Reference ID or upload a payment screenshot.');
      return;
    }

    setIsSubmitting(true);

    const channelObj = OFFICIAL_PAYMENT_CHANNELS.find(c => c.id === paymentChannel);
    const channelName = channelObj ? channelObj.name : 'Meezan Bank';

    const orderPayload = {
      businessName: storeName.trim(),
      ownerName: ownerName.trim(),
      username: username.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      email: email.trim() || `${whatsapp.trim()}@inventra.local`,
      city: city.trim(),
      password: password.trim(),
      planId: selectedPlanId,
      planName: currentPlan.name,
      billingInterval: interval,
      amountRupees: payableAmount,
      paymentMethod: channelName,
      trxId: trxId.trim() || 'TRX-UPLOADED',
      paymentScreenshot: screenshotData,
      notes: notes.trim()
    };

    try {
      // 1. Submit to backend API
      const res = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();

      const finalOrder = data.order || {
        ...orderPayload,
        id: data.orderId || `ORD-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      // 2. Save to client-side localStorage store
      saveCheckoutOrder({
        businessName: finalOrder.businessName,
        ownerName: finalOrder.ownerName,
        whatsapp: finalOrder.whatsapp,
        email: finalOrder.email,
        city: finalOrder.city,
        username: finalOrder.username,
        planId: finalOrder.planId,
        planName: finalOrder.planName,
        billingInterval: finalOrder.billingInterval,
        amountRupees: finalOrder.amountRupees,
        paymentMethod: finalOrder.paymentMethod,
        paymentScreenshot: finalOrder.paymentScreenshot,
        trxId: finalOrder.trxId,
        notes: finalOrder.notes
      });

      // 3. Save to Registration Leads store so WhatsApp Leads Panel on /server displays it immediately
      saveRegistrationLeadLocal({
        id: finalOrder.id,
        storeName: finalOrder.businessName,
        ownerName: finalOrder.ownerName,
        username: finalOrder.username,
        password: orderPayload.password,
        phone: finalOrder.whatsapp,
        email: finalOrder.email,
        city: finalOrder.city,
        address: `${finalOrder.city} (${finalOrder.paymentMethod || 'Online'})`,
        requestedPlan: `${finalOrder.planName} (${finalOrder.billingInterval})`,
        status: 'pending_activation',
        isApproved: false,
        submittedAt: finalOrder.createdAt || new Date().toISOString(),
        notes: `Checkout Order: ${finalOrder.id} | Amount: PKR ${finalOrder.amountRupees} | Trx: ${finalOrder.trxId}`
      });

      // 4. Dispatch live update events for all /server dashboards
      window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated'));
      window.dispatchEvent(new CustomEvent('mbi-checkout-orders-updated'));
      window.dispatchEvent(new CustomEvent('mbi-fleet-updated'));
      window.dispatchEvent(new Event('storage'));

      setSubmittedOrder(finalOrder);
      setShowSuccessModal(true);
      emitToast('✨ Order Submitted! Temporary 10-day trial activated.', 'success');
    } catch (err: any) {
      console.warn('Backend checkout submission warning, saving locally:', err);
      // Fallback local save
      const fallbackOrder = {
        ...orderPayload,
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        status: 'pending' as const
      };
      saveCheckoutOrder(fallbackOrder as any);
      saveRegistrationLeadLocal({
        id: fallbackOrder.id,
        storeName: fallbackOrder.businessName,
        ownerName: fallbackOrder.ownerName,
        username: fallbackOrder.username,
        password: orderPayload.password,
        phone: fallbackOrder.whatsapp,
        email: fallbackOrder.email,
        city: fallbackOrder.city,
        address: `${fallbackOrder.city} (${fallbackOrder.paymentMethod || 'Online'})`,
        requestedPlan: `${fallbackOrder.planName} (${fallbackOrder.billingInterval})`,
        status: 'pending_activation',
        isApproved: false,
        submittedAt: fallbackOrder.createdAt,
        notes: `Checkout Order: ${fallbackOrder.id} | Amount: PKR ${fallbackOrder.amountRupees} | Trx: ${fallbackOrder.trxId}`
      });
      window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated'));
      window.dispatchEvent(new CustomEvent('mbi-checkout-orders-updated'));
      window.dispatchEvent(new CustomEvent('mbi-fleet-updated'));
      window.dispatchEvent(new Event('storage'));

      setSubmittedOrder(fallbackOrder);
      setShowSuccessModal(true);
      emitToast('✨ Order Submitted locally! Please confirm on WhatsApp.', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppSendProof = () => {
    if (!submittedOrder) return;
    const msg = encodeURIComponent(
      `*MBI INVENTRA - PLAN ORDER & PAYMENT PROOF*\n\n` +
      `*Order ID:* ${submittedOrder.id}\n` +
      `*Pharmacy Name:* ${submittedOrder.businessName}\n` +
      `*Owner Name:* ${submittedOrder.ownerName}\n` +
      `*WhatsApp:* ${submittedOrder.whatsapp}\n` +
      `*Username:* ${submittedOrder.username}\n` +
      `*Selected Plan:* ${submittedOrder.planName} (${getIntervalFormatted(submittedOrder.billingInterval)})\n` +
      `*Amount Paid:* PKR ${submittedOrder.amountRupees.toLocaleString()}\n` +
      `*Payment Channel:* ${submittedOrder.paymentMethod}\n` +
      `*Transaction ID:* ${submittedOrder.trxId}\n\n` +
      `_I have attached my payment screenshot above. Please verify and issue my official license key._`
    );
    window.open(`https://wa.me/923281302636?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors pb-20">
      
      {/* Top Floating Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/mbi-logo.png" 
              alt="MBI INVENTRA" 
              className="h-10 w-10 rounded-full object-contain shadow-xs bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shrink-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div className="flex flex-col">
              <span className="font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                MBI INVENTRA <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-mono">CHECKOUT</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Secure Official License Portal</span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            </button>

            <Link
              to="/#pricing"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Pricing</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Checkout Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        
        {/* Top Header Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>256-BIT ENCRYPTED OFFICIAL CHECKOUT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            COMPLETE YOUR SUBSCRIPTION &amp; ACTIVATE
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Select your duration, enter your store credentials, and transfer to verified official accounts.
          </p>
        </div>

        {errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-bold flex-1">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ================================================================= */}
          {/* LEFT COLUMN: Steps 1, 2, 4                                       */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* STEP 1: PLAN & DURATION SELECTION */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  1
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Select Plan &amp; Billing Cycle</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose the tier that matches your pharmacy scale</p>
                </div>
              </div>

              {/* 3 Tier Selector Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                {EXACT_PRICING_PLANS.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between space-y-1 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{plan.tierIcon}</span>
                      <h4 className={`text-xs font-black ${isSelected ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-200'}`}>
                        {plan.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{plan.limits.users}</span>
                    </button>
                  );
                })}
              </div>

              {/* Duration Pills */}
              <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setInterval('monthly')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    interval === 'monthly'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly (PKR {currentPlan.prices.monthly.toLocaleString()})
                </button>

                <button
                  type="button"
                  onClick={() => setInterval('1year')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    interval === '1year'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>1 Year</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-black">Save 30%</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInterval('3years')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    interval === '3years'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>3 Years</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500 text-white font-black">Save 40%</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInterval('5years')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    interval === '5years'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>5 Years</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-black">Save 50%</span>
                </button>
              </div>
            </div>

            {/* STEP 2: PHARMACY CREDENTIALS FORM */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  2
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Pharmacy Registration Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">These credentials will be used to log in to your store workspace</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Pharmacy Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pharmacy / Medical Store Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Shaheen Chemist, Bilal Pharmacy"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Owner Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Owner / Pharmacist Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Dr. Muhammad Bilal"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Login Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. bilal_pharma"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* WhatsApp & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      WhatsApp / Mobile No <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="0328-1302636"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      City / Location
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Lahore, Sargodha, Karachi"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="store@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Login Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4: PAYMENT PROOF SCREENSHOT & TRX ID */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  4
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Payment Proof &amp; Transaction ID</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload transfer receipt screenshot and enter transaction ID</p>
                </div>
              </div>

              {/* Trx ID Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transaction Reference ID (Trx ID / TID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. MZ-984012948, JC-1029384, or Bank Ref #"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Drag-and-Drop Screenshot Uploader */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transfer Receipt Screenshot (Optional but Recommended)
                </label>
                
                {screenshotData ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={screenshotData} 
                        alt="Proof" 
                        className="w-14 h-14 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs" 
                      />
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate max-w-[200px]">{screenshotName || 'receipt_screenshot.png'}</p>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Attached Ready
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotData('');
                        setScreenshotName('');
                      }}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                      title="Remove Screenshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-400'
                    }`}
                    onClick={() => {
                      const input = document.getElementById('screenshot-file-input');
                      input?.click();
                    }}
                  >
                    <input
                      id="screenshot-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag &amp; drop transfer screenshot here or <span className="text-blue-600 dark:text-blue-400 underline">browse files</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Supports PNG, JPG, JPEG up to 8MB</p>
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Additional Notes / Sender Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid from JazzCash account of Muhammad Ali"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

          </div>

          {/* ================================================================= */}
          {/* RIGHT COLUMN: Step 3 (Payment Channels) & Order Summary           */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* STEP 3: OFFICIAL PAYMENT CHANNELS CARD */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  3
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Official Payment Channels</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transfer total amount to any verified account</p>
                </div>
              </div>

              <PaymentAccountsCard
                selectedMethod={paymentChannel}
                onSelectMethod={setPaymentChannel}
                payableAmount={payableAmount}
              />
            </div>

            {/* ORDER SUMMARY RECEIPT BOX */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-600/30 dark:border-blue-500/30 shadow-xl space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>Order Summary</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex justify-between">
                  <span>Selected Tier:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing Interval:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{getIntervalFormatted(interval)}</span>
                </div>
                <div className="flex justify-between">
                  <span>User Limit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentPlan.limits.users}</span>
                </div>
                <div className="flex justify-between">
                  <span>Branch Limit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentPlan.limits.branches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Terminal Quota:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentPlan.limits.terminals}</span>
                </div>
                <div className="flex justify-between">
                  <span>10-Day Free Trial:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Included (Instant Boot)</span>
                </div>
              </div>

              {/* Total Payable Display */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 space-y-1">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase">Total Amount Payable</span>
                <div className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-white font-mono flex items-baseline gap-1">
                  <span className="text-sm text-blue-600">PKR</span>
                  <span>{payableAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing &amp; Activating Trial...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Submit Order &amp; Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ⚡ Upon submission, you can immediately log in while our billing team confirms your receipt on WhatsApp within 5 minutes.
                </p>
              </div>
            </div>

          </div>

        </form>

      </main>

      {/* ===================================================================== */}
      {/* SUCCESS CONFIRMATION MODAL                                            */}
      {/* ===================================================================== */}
      {showSuccessModal && submittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-center">
            
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ✨ ORDER RECEIVED &amp; 10-DAY TRIAL ACTIVE
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Thank You, {submittedOrder.ownerName}!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Your order for <strong className="text-slate-900 dark:text-white">{submittedOrder.businessName}</strong> has been registered.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Ref:</span>
                <span className="font-bold text-slate-900 dark:text-white">{submittedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Plan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{submittedOrder.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">PKR {submittedOrder.amountRupees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Login Username:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{submittedOrder.username}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Button 1: WhatsApp Verification */}
              <button
                type="button"
                onClick={handleWhatsAppSendProof}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>💬 Send Payment Proof on WhatsApp for Instant Approval</span>
              </button>

              {/* Button 2: Proceed to Workspace */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>➡️ Proceed to Workspace Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CheckoutPage;
