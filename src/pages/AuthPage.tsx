import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Building2, User, Phone, MapPin, Mail, Lock, Eye, EyeOff, 
  ArrowRight, Sparkles, CheckCircle2, AlertCircle, ShieldCheck, 
  Package, ShoppingCart, Users, BarChart3, Cloud, Sun, Moon, 
  ArrowLeft, RefreshCw, Check, Zap, MessageSquare, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { licenseService } from '../services/licenseService';
import { emitToast } from '../contexts/ToastContext';
import { getSystemHWIDSync } from '../lib/hardwareFingerprint';
import { recordLoginAttempt, getCurrentClientIp, isIpBlocked } from '../lib/securityAuditService';
import { TermsConditionsModal } from '../components/modals/TermsConditionsModal';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticateAndSync, currentUser, registerTenant } = useAuth();

  // Determine mode from prop or query param (?mode=register or /register)
  const [mode, setMode] = useState<'login' | 'register'>(() => {
    if (initialMode) return initialMode;
    if (location.pathname.includes('register')) return 'register';
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'register' || params.get('tab') === 'register') return 'register';
    return 'login';
  });

  // Sync mode if location changes
  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
    } else if (location.pathname === '/login' || location.pathname === '/auth' || location.pathname === '/workspace') {
      const params = new URLSearchParams(location.search);
      if (params.get('mode') === 'register') {
        setMode('register');
      } else {
        setMode('login');
      }
    }
  }, [location.pathname, location.search]);

  // Dark/Light Theme Support
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('mbi_landing_theme', 'dark');
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('mbi_landing_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // If already authenticated, redirect straight to user workspace
  useEffect(() => {
    if (currentUser && !currentUser.isGuest && currentUser.uid !== 'usr_guest') {
      const savedRoute = localStorage.getItem('mbi_last_active_route');
      const target = savedRoute && savedRoute !== '/' && savedRoute !== '/login' && savedRoute !== '/register' ? savedRoute : '/user';
      navigate(target, { replace: true });
    }
  }, [currentUser, navigate]);

  // --- LOGIN FORM STATE ---
  const [loginIdentifier, setLoginIdentifier] = useState(() => localStorage.getItem('mbi_remember_identifier') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginProgress, setLoginProgress] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // --- REGISTER FORM STATE ---
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Switch between Login and Register views
  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setLoginError(null);
    setRegisterError(null);
    window.history.replaceState(null, '', newMode === 'register' ? '/register' : '/login');
  };

  // --- HANDLE LOGIN SUBMIT ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const clientIp = getCurrentClientIp();
    if (isIpBlocked(clientIp)) {
      const blockedMsg = `Access Denied: Your IP address (${clientIp}) is blocked by the Master Server Firewall.`;
      setLoginError(blockedMsg);
      recordLoginAttempt({
        username: loginIdentifier.trim() || 'Blocked-IP-Attempt',
        targetSystem: 'Client Web Portal',
        status: 'BLOCKED',
        ipAddress: clientIp,
        failureReason: 'IP Address is blacklisted in Master Firewall'
      });
      return;
    }

    if (!loginIdentifier.trim()) {
      setLoginError('Please enter your Username, Email, or Mobile Number.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginLoading(true);
    setLoginProgress('Connecting to Cloud Server...');

    try {
      if (rememberMe) {
        localStorage.setItem('mbi_remember_identifier', loginIdentifier.trim());
      } else {
        localStorage.removeItem('mbi_remember_identifier');
      }

      await authenticateAndSync(loginIdentifier.trim(), loginPassword, (msg) => {
        setLoginProgress(msg);
      });

      recordLoginAttempt({
        username: loginIdentifier.trim(),
        targetSystem: 'Client Web Portal',
        status: 'SUCCESS',
        ipAddress: clientIp
      });

      emitToast('Login successful! Welcome to MBI INVENTRA.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.warn('Primary login attempt failed:', err?.message);
      
      // Secondary fallback via universal authService
      try {
        const res = await authService.login({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
          rememberMe
        });

        if (res.success) {
          emitToast(`Welcome back, ${res.user?.name || 'User'}!`, 'success');
          navigate('/dashboard', { replace: true });
          return;
        } else {
          setLoginError(res.error || err.message || 'Invalid credentials or inactive account.');
        }
      } catch (fallbackErr: any) {
        setLoginError(err.message || fallbackErr.message || 'Login failed. Please check your credentials.');
      }

      recordLoginAttempt({
        username: loginIdentifier.trim(),
        targetSystem: 'Client Web Portal',
        status: 'FAILED',
        ipAddress: clientIp,
        failureReason: err?.message || 'Invalid Credentials'
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // --- HANDLE REGISTER SUBMIT ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!storeName.trim()) {
      setRegisterError('Please enter your Pharmacy or Medical Store Name.');
      return;
    }
    if (!ownerName.trim()) {
      setRegisterError('Please enter the Owner or Pharmacist Name.');
      return;
    }
    if (!username.trim()) {
      setRegisterError('Please choose a unique username for login.');
      return;
    }
    if (!phone.trim()) {
      setRegisterError('Please enter your WhatsApp or Mobile Number.');
      return;
    }
    if (!email.trim()) {
      setRegisterError('Please enter a valid Email address.');
      return;
    }
    if (!registerPassword.trim()) {
      setRegisterError('Please enter a login password.');
      return;
    }
    if (registerPassword.length < 4) {
      setRegisterError('Password must be at least 4 characters long.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match. Please verify.');
      return;
    }
    if (!agreedToTerms) {
      setRegisterError('Please agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setRegisterLoading(true);

    try {
      const clientHwid = getSystemHWIDSync();

      // 1. Post to backend auth service to create tenant in MariaDB & initialize admin
      const res = await authService.registerPharmacy({
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        email: email.trim() || undefined,
        password: registerPassword.trim(),
        plan: 'Basic'
      });

      // 2. Initialize 10-Day Free Trial Engine via licenseService
      await licenseService.startTrial({
        tenantId: res?.user?.tenantId,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim()
      });

      // 3. Fallback registerTenant sync for AuthContext session
      try {
        await registerTenant({
          storeName: storeName.trim(),
          ownerName: ownerName.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim() || `${phone.trim()}@inventra.local`,
          password: registerPassword.trim()
        });
      } catch (authCtxErr) {
        console.warn('AuthContext registerTenant sync warning:', authCtxErr);
      }

      emitToast('✨ 10-Day Free Trial Activated! Welcome to MBI INVENTRA.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Registration failed:', err);
      setRegisterError(err.message || 'Registration failed. Please try again or contact support.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const supportPhone = '923281302636';
    const msg = encodeURIComponent(`Salam! I need password recovery assistance for MBI INVENTRA. My registered username/mobile is: ${loginIdentifier || 'not specified'}.`);
    window.open(`https://wa.me/${supportPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="auth-theme-root min-h-screen w-full flex bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Floating Utility Bar (Theme Toggle & Return to Site) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
        </button>

        <Link
          to="/"
          className="px-3.5 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Home</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* LEFT BRANDING PANEL (Desktop & Tablet)                                    */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 xl:p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800 text-white">
        {/* Ambient Radial Glows */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding Section */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <img 
              src="/mbi-logo.png" 
              alt="MBI INVENTRA" 
              className="h-11 w-auto object-contain brightness-200 contrast-125 filter drop-shadow-[0_4px_16px_rgba(59,130,246,0.4)]" 
            />
          </div>
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            Smart Inventory for a Healthier Tomorrow
          </p>
        </div>

        {/* 5 Frosted Glass Feature Cards */}
        <div className="relative z-10 my-6 space-y-3">
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.12] hover:translate-x-1">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg text-white shadow-md shadow-blue-500/20 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-200">Inventory &amp; Batch Management (FEFO)</span>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.12] hover:translate-x-1">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg text-white shadow-md shadow-emerald-500/20 shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-200">High-Speed 0.2s POS Billing</span>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.12] hover:translate-x-1">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg text-white shadow-md shadow-purple-500/20 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-200">Multi-User Role Access &amp; Shifts</span>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.12] hover:translate-x-1">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg text-white shadow-md shadow-amber-500/20 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-200">Real-Time Financial Reports &amp; Ledgers</span>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.12] hover:translate-x-1">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2 rounded-lg text-white shadow-md shadow-teal-500/20 shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-200">100% Offline-First Cloud Sync</span>
            <span className="ml-auto flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        {/* Bottom Trust Footer */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit Encrypted SQLite Vault Storage</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">Instant 10-Day Free Trial</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT AUTH FORM SUITE (Login & Register Switchboard)                      */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-y-auto bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-md my-auto py-8">
          
          {/* Top Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6 space-y-2">
            <img 
              src="/mbi-logo.png" 
              alt="MBI INVENTRA" 
              className="h-10 w-auto object-contain dark:brightness-200"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">MBI INVENTRA</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Smart Pharmacy Management Suite</p>
          </div>

          {/* Centered Logo for Desktop */}
          <div className="hidden lg:flex justify-center mb-6">
            <img 
              src="/mbi-logo.png" 
              alt="MBI INVENTRA" 
              className="h-11 w-auto object-contain dark:brightness-200"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>

          {/* ===================================================================== */}
          {/* VIEW 1: LOGIN FORM                                                    */}
          {/* ===================================================================== */}
          {mode === 'login' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Login to your account to continue
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div className="flex-1 font-medium">{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* 3-in-1 Universal Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Username, Email or Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. admin, store@mail.com, 03001234567"
                      className="w-full px-4 py-3 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pl-11 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Remember Me</span>
                  </label>

                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Hardware Bound</span>
                  </div>
                </div>

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loginProgress || 'Authenticating...'}</span>
                    </>
                  ) : (
                    <>
                      <span>➡️ Login to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to Register */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                  >
                    <span>Register Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 2: REGISTER FORM (10-Day Free Trial Activation)                   */}
          {/* ===================================================================== */}
          {mode === 'register' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>✨ 10-DAY FREE TRIAL ACTIVATION</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Create Your Account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in the details to get started with MBI INVENTRA 4
                </p>
              </div>

              {registerError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div className="flex-1 font-medium">{registerError}</div>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* 1. Pharmacy Store Name */}
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
                      placeholder="e.g. Shaheen Chemist, City Medicos"
                      className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                {/* 2. Owner / Pharmacist Name & 3. Username */}
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
                        className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Zap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. bilal_pharma"
                        className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. WhatsApp / Mobile & 5. City */}
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0328-1302636"
                        className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
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
                        className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Email Address */}
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
                      className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                {/* 7. Password & 8. Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Login Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pl-11 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                        className="w-full px-4 py-2.5 pl-11 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 9. Terms & Conditions Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowTermsModal(true);
                        }}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Terms & Conditions
                      </button>{' '}
                      and Privacy Policy.
                    </span>
                  </label>
                </div>

                {/* Action Register Button */}
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {registerLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Activating Free Trial...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀 Register & Start Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to Login */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                  >
                    Sign In Here
                  </button>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <TermsConditionsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </div>
  );
};

export default AuthPage;
