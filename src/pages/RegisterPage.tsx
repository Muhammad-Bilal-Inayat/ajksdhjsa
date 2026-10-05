import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, User, Phone, MapPin, Mail, Lock, Eye, EyeOff, 
  Sparkles, ShieldCheck, AlertCircle, Loader2, Sun, Moon, ArrowRight, ArrowLeft, X,
  Package, ShoppingCart, Users, BarChart2, Cloud
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { emitToast } from '../contexts/ToastContext';
import { getSystemHWIDSync } from '../lib/hardwareFingerprint';
import { TermsConditionsModal } from '../components/modals/TermsConditionsModal';
import { planService } from '../services/planService';
import { licenseService } from '../services/licenseService';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerTenant, currentUser } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError('Please enter your Pharmacy Name.');
      return;
    }
    if (!ownerName.trim()) {
      setError('Please enter Owner Name.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a unique Username.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your WhatsApp/Mobile number.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid Email address.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please accept the Terms & Conditions.');
      return;
    }

    setIsLoading(true);

    try {
      const clientHwid = getSystemHWIDSync();
      localStorage.setItem('mbi_bound_hwid', clientHwid);

      const payload = {
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim() || 'Lahore',
        email: email.trim() || undefined,
        password: password,
        plan: 'Basic',
        hwid: clientHwid
      };

      const result = await authService.registerPharmacy(payload);
      if (result && !result.success) {
        throw new Error(result.error || 'Registration failed. Please check your credentials.');
      }
      const effectiveTenantId = result?.user?.tenantId || `tenant_${Date.now()}`;

      // Initialize Basic Plan trial features & licensing
      planService.initializeBasicTrialFeatures(effectiveTenantId);

      emitToast('🎉 10-Day Free Trial Activated!', 'success');
      navigate('/user', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-5 bg-slate-50 dark:bg-slate-950 transition-colors">
      <TermsConditionsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />

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
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
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
        <div className="flex-1 p-5 sm:p-6 bg-white dark:bg-slate-900 flex flex-col justify-between text-slate-900 dark:text-slate-100 overflow-y-auto max-h-[85vh]">
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

            {/* Header */}
            <div className="mb-3">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                <span>10-Day Free Trial</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Create Pharmacy Account
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quick 1-minute registration with full POS access
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
              {/* Row 1: Pharmacy Name & Owner Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    Pharmacy Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Shaheen Chemist"
                      className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    Owner / Pharmacist <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Dr. Muhammad Bilal"
                      className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Username & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-xs flex items-center justify-center">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="e.g. bilalpharma"
                      className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    WhatsApp / Mobile <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0328-1302636"
                      className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: City & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    City / Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Lahore / Sargodha"
                      className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="store@domain.com"
                      className="w-full py-2 px-3 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-2 px-3 pl-9 pr-8 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
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

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5 block">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-2 px-3 pl-9 pr-8 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="font-bold text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700 cursor-pointer inline"
                    >
                      Terms &amp; Conditions
                    </button>
                  </span>
                </label>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating 10-Day Trial...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Activate 10-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Sign In Switch Button */}
              <div className="text-center mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Sign In Here</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
