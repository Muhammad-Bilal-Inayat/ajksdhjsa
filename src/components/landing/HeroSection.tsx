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

          {/* ================= RIGHT COLUMN: DUAL-DEVICE LAPTOP & MOBILE SHOWCASE ================= */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end mt-4 lg:mt-0">
            
            {/* 3D Container with GPU-accelerated Perspective */}
            <div className="relative w-full max-w-[560px] xl:max-w-[620px]">
              
              {/* ─────────────────────────────────────────────────────────────
                  FLOATING BADGE 1: 0ms SQLite Cloud Sync (Top Left)
              ───────────────────────────────────────────────────────────── */}
              <div className="absolute -top-4 sm:-top-6 left-0 sm:left-4 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 dark:border-cyan-400/30 shadow-xl shadow-cyan-500/10 text-slate-900 dark:text-white animate-float-slow">
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xs">
                  <Zap className="w-4 h-4 fill-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-400">0ms Speed</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SQLite Cloud Sync</p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  FLOATING BADGE 2: Real-Time Sales (Top Right)
              ───────────────────────────────────────────────────────────── */}
              <div className="absolute -top-3 sm:-top-5 right-2 sm:right-24 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 dark:border-blue-400/30 shadow-xl shadow-blue-500/10 text-slate-900 dark:text-white">
                <div className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Live Today Sales</span>
                  <span className={`text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400 transition-colors ${pulse ? 'text-emerald-500' : ''}`}>
                    Rs {liveSales.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  FLOATING BADGE 3: Inventory Turnover Wave (Bottom Left)
              ───────────────────────────────────────────────────────────── */}
              <div className="hidden sm:flex absolute -bottom-3 left-4 z-30 items-center gap-3 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-400/30 shadow-xl shadow-emerald-500/10 text-slate-900 dark:text-white">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 block">Inventory Turnover</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">+98.4% Optimal</span>
                </div>
                {/* Mini SVG Waveform */}
                <svg className="w-16 h-6 text-emerald-500" viewBox="0 0 100 30" fill="none">
                  <path d="M0 25 C 20 25, 30 5, 50 15 C 70 25, 80 5, 100 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  REALISTIC MACBOOK LAPTOP CONTAINER WITH REAL DASHBOARD
              ───────────────────────────────────────────────────────────── */}
              <div className="relative rounded-2xl bg-slate-900 p-2 sm:p-3 shadow-2xl border border-slate-700/80 dark:border-slate-800 shadow-blue-500/10">
                
                {/* Laptop Screen Top Header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 rounded-t-xl border-b border-slate-800 text-slate-400 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-900 px-3 py-0.5 rounded-md border border-slate-800">
                    <span>🔒 app.mbiinventra.com/dashboard</span>
                  </div>
                  <div className="w-8"></div>
                </div>

                {/* Dashboard Screen Inner Canvas */}
                <div className="bg-[#0b1329] dark:bg-[#070d1e] p-3 sm:p-4 rounded-b-xl text-slate-100 overflow-hidden font-sans">
                  
                  {/* Dashboard Header Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
                    <div className="flex items-center gap-2">
                      <img src="/mbi-logo.png" alt="MBI" className="w-6 h-6 rounded-full object-contain bg-white p-0.5 shrink-0" />
                      <span className="font-extrabold text-xs text-white">MBI <span className="text-blue-400">INVENTRA</span></span>
                    </div>

                    {/* Search Mock */}
                    <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 w-44">
                      <Search className="w-3 h-3 text-slate-500" />
                      <span>Search medicine...</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[9px]">+ Sale</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px] hidden sm:inline">+ Purchase</span>
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold">
                        M
                      </div>
                    </div>
                  </div>

                  {/* Welcome Greeting Row */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1">
                        Welcome Back, Muhammad 👋
                      </h4>
                      <p className="text-[9px] text-slate-400">Live pharmacy performance overview</p>
                    </div>
                    <span className="text-[9px] font-mono font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                      Today • Live Sync
                    </span>
                  </div>

                  {/* 4 Real KPI Cards from Banner Mockup */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Sales</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white mt-1">Rs 0</div>
                      <span className="text-[8px] text-emerald-400 font-bold">0% • 0 Bills</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Purchase</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white mt-1">Rs 0</div>
                      <span className="text-[8px] text-blue-400 font-bold">0% • 0 Bills</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Expenses</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white mt-1">Rs 0</div>
                      <span className="text-[8px] text-amber-400 font-bold">0 Today</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Stock Value</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white mt-1">Rs 0</div>
                      <span className="text-[8px] text-purple-400 font-bold">0 Items</span>
                    </div>

                  </div>

                  {/* Dashboard Lower Preview: Sales Trend Waveform */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-300 pb-1.5">
                      <span>Sales Overview &amp; Hourly Flow</span>
                      <span className="text-blue-400 font-mono">0.2s POS Engine</span>
                    </div>
                    {/* Live SVG Graph Curve */}
                    <div className="h-10 w-full relative">
                      <svg className="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d="M 0 50 Q 50 10, 100 35 T 200 20 T 300 15 L 300 60 L 0 60 Z" fill="url(#heroGradient)" />
                        <path d="M 0 50 Q 50 10, 100 35 T 200 20 T 300 15" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                      </svg>
                    </div>
                  </div>

                </div>

                {/* Laptop Base Stand */}
                <div className="h-2.5 bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-xl mx-8 shadow-md"></div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SYNCHRONIZED SMARTPHONE FRAME (Overlapped on Right Edge)
              ───────────────────────────────────────────────────────────── */}
              <div className="absolute -right-3 sm:-right-6 bottom-4 sm:bottom-6 z-20 w-32 sm:w-40 rounded-2xl bg-slate-950 p-1.5 border-2 border-slate-700 shadow-2xl shadow-blue-500/20 transform rotate-1 hover:rotate-0 transition-transform">
                {/* Dynamic Island / Notch */}
                <div className="w-10 h-2 bg-slate-900 rounded-full mx-auto mb-1"></div>
                
                {/* Phone Screen Canvas */}
                <div className="bg-[#080e1f] rounded-xl p-2 text-[8px] text-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[9px] text-white">MBI POS</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>

                  <div className="p-1 rounded-md bg-blue-600 text-white font-extrabold text-center text-[9px]">
                    + Fast Bill
                  </div>

                  {/* 4 Mini Mobile Buttons */}
                  <div className="grid grid-cols-2 gap-1">
                    <div className="p-1 rounded bg-slate-900 border border-slate-800 text-center font-bold text-emerald-400">
                      Sale
                    </div>
                    <div className="p-1 rounded bg-slate-900 border border-slate-800 text-center font-bold text-blue-400">
                      Stock
                    </div>
                    <div className="p-1 rounded bg-slate-900 border border-slate-800 text-center font-bold text-amber-400">
                      Khata
                    </div>
                    <div className="p-1 rounded bg-slate-900 border border-slate-800 text-center font-bold text-purple-400">
                      Reports
                    </div>
                  </div>

                  <div className="p-1 rounded bg-slate-900/90 text-[7px] text-slate-400 flex items-center justify-between">
                    <span>Muhammad</span>
                    <span className="text-emerald-400">Online</span>
                  </div>
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
