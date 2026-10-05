import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, Sun, Moon, ArrowRight, ArrowLeft, X,
  Package, ShoppingCart, Users, BarChart2, Cloud, User as UserIcon, Sparkles,
  Mail, KeyRound, CheckCircle2, MessageSquare, Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentClientIp, isIpBlocked, recordLoginAttempt } from '../lib/securityAuditService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { authenticateAndSync, currentUser } = useAuth();

  const [identifier, setIdentifier] = useState(() => localStorage.getItem('mbi_remember_identifier') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password By Email State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotRecoveryMethod, setForgotRecoveryMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'REQUEST_OTP' | 'VERIFY_OTP' | 'SUCCESS'>('REQUEST_OTP');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');

  // Theme support
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
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

  useEffect(() => {
    if (currentUser && !currentUser.isGuest && currentUser.uid !== 'usr_guest') {
      const savedRoute = localStorage.getItem('mbi_last_active_route');
      const target = savedRoute && savedRoute !== '/' && savedRoute !== '/login' && savedRoute !== '/register' ? savedRoute : '/user';
      navigate(target, { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clientIp = getCurrentClientIp();
    if (isIpBlocked(clientIp)) {
      const msg = `Access Denied: IP address (${clientIp}) is blocked.`;
      setError(msg);
      recordLoginAttempt({
        username: identifier.trim() || 'Blocked-IP',
        targetSystem: 'Client Web Portal',
        status: 'BLOCKED',
        ipAddress: clientIp,
        failureReason: 'IP is blacklisted'
      });
      return;
    }

    if (!identifier.trim()) {
      setError('Please enter your Username, Email, or Mobile.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('mbi_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('mbi_remember_identifier');
      }

      const result = await authenticateAndSync(identifier.trim(), password);

      if (result.success) {
        navigate('/user', { replace: true });
      } else {
        setError('Invalid username or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotModal = () => {
    setForgotIdentifier(identifier.trim());
    setForgotStep('REQUEST_OTP');
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotMsg(null);
    setShowForgotModal(true);
  };

  const handleWhatsAppDirect = () => {
    const phone = '923281302636';
    const msg = encodeURIComponent(`Salam! I forgot my password for MBI INVENTRA. Identifier: ${forgotIdentifier || identifier || 'not specified'}.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotMsg({ type: 'error', text: 'Please enter your registered Email, Username, or Mobile.' });
      return;
    }
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMaskedEmail(data.maskedEmail || 'your email');
        setForgotStep('VERIFY_OTP');
        setForgotMsg({ type: 'success', text: data.message || `A 6-digit recovery code has been sent to ${data.maskedEmail}` });
      } else {
        setForgotMsg({ type: 'error', text: data.error || 'Account not found or no email linked. You can also use WhatsApp Support.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err?.message || 'Network error while connecting to server.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length < 6) {
      setForgotMsg({ type: 'error', text: 'Please enter the valid 6-digit code received on your email.' });
      return;
    }
    if (!forgotNewPass.trim() || forgotNewPass.trim().length < 4) {
      setForgotMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotMsg({ type: 'error', text: 'Passwords do not match. Please re-enter carefully.' });
      return;
    }
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPass.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep('SUCCESS');
        setPassword(forgotNewPass.trim());
        setIdentifier(forgotIdentifier.trim());
        setForgotMsg({ type: 'success', text: data.message || 'Password reset successfully!' });
      } else {
        setForgotMsg({ type: 'error', text: data.error || 'Invalid or expired verification code. Please try again.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err?.message || 'Network error during password reset.' });
    } finally {
      setForgotLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-5 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top Header Controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Ultra-Compact Viewport-Fit Container */}
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* ─────────────────────────────────────────────────────────────
            LEFT DECORATIVE SIDEBAR (Light 3D Gradient Theme)
        ───────────────────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col justify-between w-72 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-6 border-r border-slate-200/80 shadow-inner shrink-0 relative overflow-hidden">
          
          {/* Subtle 3D Ambient Glow Background Shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-100/40 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

          {/* Brand Logo & Subtitle */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <img 
                src="/mbi-logo.png" 
                alt="MBI INVENTRA" 
                className="w-10 h-10 rounded-full object-contain shadow-xs bg-white p-0.5 border border-slate-200/80 shrink-0" 
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-blue-600 tracking-wider">MBI</span>
                  <span className="text-slate-300 font-light">|</span>
                  <span className="text-base font-bold text-slate-800 tracking-tight">INVENTRA</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500">Pharmacy &amp; Inventory Suite</p>
              </div>
            </div>
          </div>

          {/* Feature Pills (3D Soft Shadow Cards) */}
          <div className="relative z-10 space-y-2.5 my-6">
            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Inventory &amp; FEFO Batches</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">0.2s POS Billing &amp; Invoices</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Multi-User Shifts &amp; Roles</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <BarChart2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">Real-Time Reports &amp; Khata</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Cloud className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">100% Offline-First Sync</span>
            </div>
          </div>

          {/* Bottom Shield Guarantee */}
          <div className="relative z-10 flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/60">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Instant 10-Day Free Trial • No Card</span>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT FORM CONTAINER (Ultra-Compact Viewport-Fit)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-5 sm:p-6 bg-white dark:bg-slate-900 flex flex-col justify-center text-slate-900 dark:text-slate-100 overflow-y-auto max-h-[85vh]">
          <div>
            {/* Top Navigation & Close Header Bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 cursor-pointer"
                title="Go to Home Page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Header Brand */}
            <div className="md:hidden flex items-center justify-center gap-2 mb-2">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="/mbi-logo.png" 
                  alt="MBI INVENTRA" 
                  className="w-8 h-8 rounded-full object-contain shadow-xs bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700" 
                />
                <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  MBI <span className="text-blue-600 dark:text-blue-400">INVENTRA</span>
                </span>
              </Link>
            </div>

            {/* Header: Title text-lg font-bold + Subtext text-xs */}
            <div className="mb-3">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Pharmacy POS &amp; ERP</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sign In to Workspace
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your username, email, or mobile number
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Login Form: Compact inputs with py-2 px-3 text-sm and space-y-3 */}
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Username / Email / Mobile <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin or 03281302636"
                    className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={openForgotModal}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2 px-3 pl-9 pr-8 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember Me</span>
                </label>

                <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Hardware Guard</span>
                </div>
              </div>

              {/* Submit CTA Button: High-visibility primary button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>➡️ Login to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>New to MBI INVENTRA? </span>
              <Link
                to="/register"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Start 10-Day Free Trial</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADVANCED FORGOT PASSWORD & EMAIL OTP RECOVERY
      ───────────────────────────────────────────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Password Recovery</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Reset your MBI INVENTRA credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recovery Channel Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setForgotRecoveryMethod('EMAIL')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  forgotRecoveryMethod === 'EMAIL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Recovery</span>
              </button>

              <button
                type="button"
                onClick={() => setForgotRecoveryMethod('WHATSAPP')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  forgotRecoveryMethod === 'WHATSAPP'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Support</span>
              </button>
            </div>

            {/* Notification Messages */}
            {forgotMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                forgotMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
              }`}>
                {forgotMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium">{forgotMsg.text}</div>
              </div>
            )}

            {/* TAB 1: OFFICIAL EMAIL RECOVERY FLOW */}
            {forgotRecoveryMethod === 'EMAIL' && (
              <div className="space-y-4">
                
                {/* STEP 1: REQUEST OTP */}
                {forgotStep === 'REQUEST_OTP' && (
                  <form onSubmit={handleRequestOtp} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Registered Email / Username / Mobile
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={forgotIdentifier}
                          onChange={(e) => setForgotIdentifier(e.target.value)}
                          placeholder="e.g. admin or owner@pharmacy.com"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        We will send a 6-digit verification code to the email address linked with this account.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Recovery Code...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Recovery Code to Email</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP 2: VERIFY OTP & ENTER NEW PASSWORD */}
                {forgotStep === 'VERIFY_OTP' && (
                  <form onSubmit={handleVerifyOtpAndReset} className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          6-Digit Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotStep('REQUEST_OTP');
                            setForgotMsg(null);
                          }}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Change Email
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full px-3.5 py-2.5 text-center tracking-[8px] font-mono text-lg font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 text-center">
                        Code sent to: <span className="font-semibold text-slate-700 dark:text-slate-300">{maskedEmail}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        New Password / Passcode
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showForgotPass ? 'text' : 'password'}
                          required
                          value={forgotNewPass}
                          onChange={(e) => setForgotNewPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPass(!showForgotPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          {showForgotPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showForgotPass ? 'text' : 'password'}
                          required
                          value={forgotConfirmPass}
                          onChange={(e) => setForgotConfirmPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Update Password &amp; Ready to Sign In</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP 3: SUCCESS */}
                {forgotStep === 'SUCCESS' && (
                  <div className="text-center py-3 space-y-3">
                    <div className="w-12 h-12 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Password Reset Complete!</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Your credentials have been updated securely. You can now login immediately with your new password.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: WHATSAPP DIRECT SUPPORT */}
            {forgotRecoveryMethod === 'WHATSAPP' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-center">
                <div className="w-11 h-11 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">24/7 WhatsApp Helpdesk</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect directly with MBI Technical Support to verify your pharmacy ownership and instantly reset your access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open WhatsApp Support (+92 328 1302636)</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;

