import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, MessageSquare, Mail, Sparkles, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onScrollToSection?: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollToSection }) => {
  const handleNav = (sectionId: string) => {
    if (onScrollToSection) {
      onScrollToSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer id="contact" className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 pt-16 pb-12 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand & Professional Tagline (Official Image Only, No Plain Text) */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img 
                src="/mbi-logo.png" 
                alt="MBI INVENTRA" 
                className="h-9 w-auto object-contain dark:brightness-200" 
              />
            </Link>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enterprise Pharmacy POS &amp; ERP Software engineered for medical stores and pharmacy chains across Pakistan.
            </p>
            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start 10-Day Free Trial</span>
              </Link>
            </div>
          </div>

          {/* Col 2: Clean Quick Navigation Column (No stray logos) */}
          <div className="space-y-3 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              QUICK NAVIGATION
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('features')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('calculator')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  FEFO Calculator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('pricing')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  Pricing Plans
                </button>
              </li>
              <li>
                <Link to="/blog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold text-blue-600 dark:text-blue-400">
                  Pharmacy Blogs &amp; Guides
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('faq')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Pharmacy Solutions */}
          <div className="space-y-3 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              SOFTWARE SOLUTIONS
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <button 
                  type="button"
                  onClick={() => handleNav('features')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🛒</span>
                  <span>Retail Medical Store 0.2s POS</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleNav('features')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🏥</span>
                  <span>Hospital Pharmacy &amp; Clinical Wards</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleNav('features')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🏢</span>
                  <span>Multi-Branch Chain Central ERP</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleNav('features')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📦</span>
                  <span>Pharma Wholesale &amp; Distribution</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleNav('calculator')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⏳</span>
                  <span>FEFO Expiry Radar &amp; Return Notes</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => {
                    handleNav('features');
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('mbi-prompt-pwa-install'));
                    }
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-1 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💻</span>
                  <span>100% Offline Desktop Mode</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Helpline */}
          <div className="space-y-3 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              HELPLINE &amp; WHATSAPP
            </p>
            <ul className="space-y-2.5 text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <a href="tel:+923281302636" className="text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors">
                  +92 328 1302636
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0" />
                <a href="tel:+923364585863" className="text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors">
                  +92 336 4585863
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <a
                  href="https://wa.me/923281302636?text=Salam!%20I%20would%20like%20information%20about%20MBI%20INVENTRA."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold"
                >
                  WhatsApp: 0328-1302636
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <a 
                  href="mailto:mbiinventra@gmail.com"
                  className="text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-300 font-semibold transition-colors"
                >
                  mbiinventra@gmail.com
                </a>
              </li>
              <li className="pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  Available 24/7 for Onboarding &amp; Training
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Clean Security & Copyright */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} MBI INVENTRA. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              256-Bit SSL Encryption
            </span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400">High-Availability Cloud Sync</span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400">100% Offline Local Engine</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
