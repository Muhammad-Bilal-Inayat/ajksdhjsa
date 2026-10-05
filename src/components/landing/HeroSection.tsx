import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, Play, CheckCircle2, Zap, 
  TrendingUp, Activity, Monitor, Package, Users, BarChart3,
  ShieldCheck, Smartphone, Search, Plus, Bell, User, Check
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  // Live dynamic ticker for sales badge (simulating real-time engine)
  const [liveSales, setLiveSales] = useState(1694);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setLiveSales(prev => prev + Math.floor(Math.random() * 85) + 15);
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-14 sm:pb-20 overflow-hidden w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 select-none">
      {/* ─────────────────────────────────────────────────────────────
          AMBIENT GLOW BACKGROUND ORBS (GPU-Accelerated Subtle Light)
      ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[450px] bg-blue-600/15 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/3 right-1/4 w-[280px] sm:w-[420px] h-[260px] sm:h-[380px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[450px] sm:w-[700px] h-[180px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full relative z-10 space-y-12 sm:space-y-16">
        
        {/* ─────────────────────────────────────────────────────────────
            HERO MAIN GRID: LEFT COPY + RIGHT DUAL-DEVICE SHOWCASE
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* ================= LEFT COLUMN: HERO HEADLINE & CTAS ================= */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-5 sm:space-y-6">
            
            {/* Top Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-extrabold tracking-wide uppercase shadow-xs bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Next-Gen Pharmacy POS &amp; Cloud ERP</span>
            </div>

            {/* Main Headline from Selected Mockup */}
            <h1 className="text-3.5xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.6rem] font-black tracking-tight text-slate-950 dark:text-white leading-[1.08] break-words">
              Smart Pharmacy.<br />
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-sky-300 dark:via-cyan-300 dark:to-blue-400 bg-clip-text text-transparent">
                Smarter Business.
              </span>
            </h1>

            {/* Subtitle Description */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
              Complete Pharmacy POS &amp; ERP for modern businesses. Master retail &amp; wholesale billing in 0.2 seconds, eliminate near-expiry losses with FEFO radar, and operate 100% offline.
            </p>

            {/* High-Converting CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1 w-full max-w-md mx-auto lg:mx-0">
              <Link
                to="/register"
                className="w-full sm:w-auto text-sm font-extrabold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="https://wa.me/923281302636?text=Salam!%20I%20would%20like%20a%20live%20video%20demo%20of%20MBI%20INVENTRA."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-sm font-extrabold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-xs border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/90 hover:border-blue-400 dark:hover:border-blue-500 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500" />
                <span>Watch Demo</span>
              </a>
            </div>

            {/* Trust Markers Below Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>256-Bit SQLite Vault</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>0ms Offline Ready</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>10-Day Free Trial</span>
              </span>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: DUAL-DEVICE REAL LAPTOP & MOBILE SHOWCASE ================= */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end mt-6 lg:mt-0">
            
            {/* 3D Container with GPU-accelerated Perspective & Ambient Backlight */}
            <div className="relative w-full max-w-[580px] xl:max-w-[640px] perspective-[1200px]">
              
              {/* Backlight Ambient Glow behind devices */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-cyan-500/20 to-indigo-600/20 rounded-3xl blur-2xl -z-10 transform scale-95" />

              {/* ─────────────────────────────────────────────────────────────
                  FLOATING 3D BADGE 1: 0ms Speed • SQLite Cloud Sync (Top Left)
              ───────────────────────────────────────────────────────────── */}
              <div className="absolute -top-5 sm:-top-7 -left-2 sm:left-4 z-40 flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-cyan-500/40 dark:border-cyan-400/40 shadow-2xl shadow-cyan-500/15 text-slate-900 dark:text-white animate-float-slow transform hover:scale-105 transition-transform select-none">
                <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-400">0ms Speed</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">SQLite Cloud Sync</p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  FLOATING 3D BADGE 2: Live Today Sales (Top Right)
              ───────────────────────────────────────────────────────────── */}
              <div className="absolute -top-4 sm:-top-6 right-2 sm:right-20 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-500/40 dark:border-blue-400/40 shadow-2xl shadow-blue-500/15 text-slate-900 dark:text-white animate-float-gentle transform hover:scale-105 transition-transform select-none">
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block leading-tight">Live Today Sales</span>
                  <span className={`text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400 transition-colors ${pulse ? 'text-emerald-500' : ''}`}>
                    Rs {liveSales.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  FLOATING 3D BADGE 3: Inventory Turnover (Bottom Left)
              ───────────────────────────────────────────────────────────── */}
              <div className="hidden sm:flex absolute -bottom-4 left-4 z-40 items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-emerald-500/40 dark:border-emerald-400/40 shadow-2xl shadow-emerald-500/15 text-slate-900 dark:text-white animate-float-slow transform hover:scale-105 transition-transform select-none">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 block">Inventory Turnover</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">+98.4% Optimal</span>
                </div>
                <svg className="w-16 sm:w-20 h-6 text-emerald-500" viewBox="0 0 100 30" fill="none">
                  <path d="M0 24 C 20 24, 30 6, 50 16 C 70 26, 80 6, 100 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  REALISTIC MACBOOK LAPTOP CONTAINER WITH REAL DASHBOARD
              ───────────────────────────────────────────────────────────── */}
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 p-2 sm:p-2.5 shadow-2xl border border-slate-700/80 dark:border-slate-800 shadow-blue-600/10">
                
                {/* Laptop Top Bezel with Camera & Glossy Chrome Edge */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 rounded-t-xl border-b border-slate-800 text-slate-400 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block shadow-xs"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block shadow-xs"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block shadow-xs"></span>
                  </div>
                  
                  {/* Browser URL bar */}
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300 bg-slate-900/90 px-3.5 py-0.5 rounded-md border border-slate-700/80 shadow-inner">
                    <span className="text-emerald-400 text-xs">🔒</span>
                    <span className="font-semibold">app.mbiinventra.com/dashboard</span>
                  </div>

                  <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700"></div>
                </div>

                {/* Laptop Screen Inner Canvas with Actual Screenshots */}
                <div className="relative bg-slate-950 rounded-b-xl overflow-hidden shadow-inner border-t border-slate-800">
                  
                  {/* Light Mode Dashboard Screenshot (Visible only in Light Mode) */}
                  <img 
                    src="/assets/landing/dashboard-light.png" 
                    alt="MBI INVENTRA Web Dashboard Light Mode" 
                    className="w-full h-auto object-cover block dark:hidden rounded-b-xl transition-opacity duration-300"
                    loading="eager"
                  />

                  {/* Dark Mode Dashboard Screenshot (Visible only in Dark Mode) */}
                  <img 
                    src="/assets/landing/dashboard-dark.png" 
                    alt="MBI INVENTRA Web Dashboard Dark Mode" 
                    className="w-full h-auto object-cover hidden dark:block rounded-b-xl transition-opacity duration-300"
                    loading="eager"
                  />

                  {/* Glass Sheen Gradient Overlay on Screen */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-b-xl" />
                </div>

                {/* Laptop Bottom Aluminum Base & Hinge Deck */}
                <div className="relative mt-1">
                  <div className="h-3 sm:h-3.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-b-xl mx-4 sm:mx-8 shadow-md border-t border-slate-600/50 flex items-center justify-center">
                    <div className="w-14 sm:w-20 h-1 bg-slate-950/70 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SYNCHRONIZED SMARTPHONE FRAME (Overlapped on Right Corner)
              ───────────────────────────────────────────────────────────── */}
              <div className="absolute -right-3 sm:-right-8 -bottom-3 sm:bottom-0 z-30 w-36 sm:w-48 rounded-[2rem] bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 p-2 sm:p-2.5 border-2 border-slate-600/80 dark:border-slate-700 shadow-2xl shadow-black/60 transform rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-3 bg-slate-950 rounded-full z-20 flex items-center justify-center border border-slate-800">
                  <div className="w-2 h-2 rounded-full bg-blue-950 border border-blue-600/40 mr-1"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                </div>

                {/* Phone Screen Canvas with Actual Mobile App Screenshots */}
                <div className="relative bg-slate-950 rounded-[1.6rem] overflow-hidden border border-slate-800 shadow-inner">
                  
                  {/* Light Mode Mobile Screenshot (Visible in Light Mode) */}
                  <img 
                    src="/assets/landing/mobile-light.png" 
                    alt="MBI INVENTRA Mobile App Light Mode" 
                    className="w-full h-auto object-cover block dark:hidden rounded-[1.6rem] transition-opacity duration-300"
                    loading="eager"
                  />

                  {/* Dark Mode Mobile Screenshot (Visible in Dark Mode) */}
                  <img 
                    src="/assets/landing/mobile-dark.png" 
                    alt="MBI INVENTRA Mobile App Dark Mode" 
                    className="w-full h-auto object-cover hidden dark:block rounded-[1.6rem] transition-opacity duration-300"
                    loading="eager"
                  />

                  {/* Phone Screen Glass Reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-[1.6rem]" />
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            4 BOTTOM HIGH-CONTRAST GLASSMORPHIC FEATURE CARDS
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-4">
          
          {/* Card 1: POS & Billing */}
          <div className="group p-5 rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              POS &amp; Billing
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
              Complete high-speed 0.2s counter checkout, barcode scanner, thermal prints &amp; WhatsApp invoices.
            </p>
          </div>

          {/* Card 2: Inventory Management */}
          <div className="group p-5 rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Inventory Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
              FEFO batch expiry radar, automated low-stock warnings &amp; computerized supplier purchase orders.
            </p>
          </div>

          {/* Card 3: Multi-Branch Management */}
          <div className="group p-5 rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Multi-Branch Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
              Centralized inventory visibility across all pharmacy branches with inter-store transfer tracking.
            </p>
          </div>

          {/* Card 4: Reports & Analytics */}
          <div className="group p-5 rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Reports &amp; Analytics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
              Live profit &amp; loss charts, daily cashier shift closing sheets, customer khata &amp; audit trails.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default HeroSection;
