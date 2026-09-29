import React, { useState, useEffect } from 'react';
import { 
  X, Eye, EyeOff, Lock, User as UserIcon, ArrowRight, ArrowLeft,
  Package, ShoppingCart, Users, BarChart2, Cloud, ShieldCheck,
  AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister
}) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('mbi_remember_identifier');
      if (saved) {
        setIdentifier(saved);
      }
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Username, Email, or Mobile.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (rememberMe) {
        localStorage.setItem('mbi_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('mbi_remember_identifier');
      }

      // 1. Local context login
      try {
        await login(identifier.trim(), password.trim());
        emitToast('Login successful! Welcome to MBI INVENTRA.', 'success');
        onClose();
        navigate('/user');
        return;
      } catch (authCtxErr: any) {
        console.warn('Direct AuthContext attempt:', authCtxErr?.message);
      }

      // 2. Fallback to authService
      const res = await authService.login({
        identifier: identifier.trim(),
        password: password.trim(),
        rememberMe
      });

      if (res.success) {
        emitToast(`Welcome back, ${res.user?.name || 'User'}!`, 'success');
        onClose();
        navigate('/user');
      } else {
        setError(res.error || 'Invalid credentials or inactive user account.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const phone = '923281302636';
    const msg = encodeURIComponent(`Salam! I forgot my password for MBI INVENTRA. Identifier: ${identifier || 'not specified'}.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Viewport-Fit Ultra-Compact Login Container */}
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────────────────────────────────────────────────────────────
            LEFT DECORATIVE SIDEBAR (Light 3D Gradient Theme)
        ───────────────────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col justify-between w-72 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-6 border-r border-slate-200/80 shadow-inner shrink-0 relative overflow-hidden">
          
          {/* Subtle 3D Ambient Glow Background Shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-100/40 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

          {/* Brand Logo & Subtitle */}
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-blue-600 tracking-wider font-mono">MBI</span>
              <span className="text-slate-300 font-light">|</span>
              <span className="text-base font-bold text-slate-800 tracking-tight">INVENTRA</span>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Smart Inventory for a Healthier Tomorrow
            </p>
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
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 cursor-pointer"
                title="Go to Home Page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Mobile Header Brand */}
            <div className="md:hidden flex justify-center mb-2">
              <img 
                src="/mbi-logo.png" 
                alt="MBI INVENTRA" 
                className="h-7 w-auto object-contain dark:brightness-200" 
              />
            </div>

            {/* Header */}
            <div className="mb-3">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Pharmacy POS &amp; ERP</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sign In to Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your username, email, or mobile number
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form with compact inputs and space-y-3 */}
            <form onSubmit={handleSubmit} className="space-y-3">
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
                    placeholder="e.g. mbipharma, 03281302636"
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
                    onClick={handleForgotPassword}
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
                    placeholder="Enter your login password"
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

              {/* High-visibility primary submit button */}
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
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchToRegister) {
                    onSwitchToRegister();
                  } else {
                    navigate('/register');
                  }
                }}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
