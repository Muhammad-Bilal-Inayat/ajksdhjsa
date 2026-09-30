import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Sparkles, User, Sun, Moon, ArrowRight, ShieldCheck, 
  HelpCircle, MessageSquare, Phone, Laptop, Layers, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterModal } from '../auth/RegisterModal';
import { LoginModal } from '../auth/LoginModal';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Theme support
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('mbi_landing_theme') === 'dark';
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('mbi_landing_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('mbi_landing_theme', 'light');
    }
  };

  const handleScrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      if (element) {
        const headerOffset = 70;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  };

  return (
    <>
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onSwitchToRegister={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />
      <RegisterModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        onSwitchToLogin={() => {
          setIsRegisterModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      <header className="sticky top-0 z-50 backdrop-blur-xl border-b bg-white/95 dark:bg-[#131d33]/95 border-slate-200 dark:border-slate-800/90 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Brand Logo */}
          <Link 
            to="/" 
            onClick={() => { setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <img 
              src="/mbi-logo.png" 
              alt="MBI INVENTRA" 
              className="h-8 sm:h-9 w-auto object-contain dark:brightness-200" 
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-slate-600 dark:text-slate-300">
            <Link 
              to="/" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-sm font-medium px-3 py-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              Home
            </Link>
            <button 
              type="button" 
              onClick={() => handleScrollTo('features')} 
              className="text-sm font-medium px-3 py-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button 
              type="button" 
              onClick={() => handleScrollTo('calculator')} 
              className="text-sm font-medium px-3 py-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              FEFO Radar
            </button>
            <button 
              type="button" 
              onClick={() => handleScrollTo('testimonials')} 
              className="text-sm font-medium px-3 py-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Reviews
            </button>
            <button 
              type="button" 
              onClick={() => handleScrollTo('pricing')} 
              className="text-sm font-medium px-3 py-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <Link 
              to="/blog" 
              className="text-sm font-medium px-3 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:underline"
            >
              Blog
            </Link>
            <button 
              type="button" 
              onClick={() => handleScrollTo('faq')} 
              className="text-sm font-medium px-3 py-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Desktop Only 10-Day Free Trial Button */}
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free 10-Day Trial</span>
            </button>

            {/* Desktop Only Sign In / Workspace */}
            {currentUser ? (
              <Link
                to="/user"
                className="hidden lg:inline-flex text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <span>Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="hidden lg:inline-flex text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 items-center gap-1.5 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Sign In</span>
              </button>
            )}

            {/* Compact Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden w-full border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl p-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Link
                to="/"
                onClick={() => { setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-center"
              >
                🏠 Home
              </Link>
              <button
                type="button"
                onClick={() => handleScrollTo('features')}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-center cursor-pointer"
              >
                ⚡ Features
              </button>
              <button
                type="button"
                onClick={() => handleScrollTo('calculator')}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-center cursor-pointer"
              >
                🎯 FEFO Radar
              </button>
              <button
                type="button"
                onClick={() => handleScrollTo('testimonials')}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-center cursor-pointer"
              >
                ⭐ Reviews
              </button>
              <button
                type="button"
                onClick={() => handleScrollTo('pricing')}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-center cursor-pointer"
              >
                💳 Pricing
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsRegisterModalOpen(true);
                }}
                className="w-full text-sm font-semibold px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Free 10-Day Trial</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLoginModalOpen(true);
                }}
                className="w-full text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Sign In to Pharmacy</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
