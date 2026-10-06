import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, CheckCircle2, Zap,
  TrendingUp, Monitor, Package, Users, BarChart3,
  ShieldCheck, Clock, Lock, Receipt, Sparkles, Activity,
  Laptop, Smartphone, RefreshCw, ShoppingCart, Database, Shield
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  // 3D Parallax Tilt (GPU-Accelerated & 60FPS Smooth)
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const currentTarget = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      const rect = currentTarget.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Number((x * 10).toFixed(1)),
        y: Number((-y * 10).toFixed(1))
      });
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="relative pt-6 sm:pt-10 lg:pt-14 pb-12 sm:pb-20 overflow-hidden w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          FLOATING KEYFRAMES & CUSTOM MICRO-ANIMATIONS STYLE
      ───────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes floatFast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(-1deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: floatFast 4.5s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: floatReverse 5.5s ease-in-out infinite;
        }
        .animate-glow-pulse {
          animation: glowPulse 5s ease-in-out infinite;
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          SPARKLING BRUSH GLOW BACKGROUND
      ───────────────────────────────────────────────────────────── */}
      {/* Glowing Brush Orbs */}
      <div className="absolute top-8 left-1/4 -translate-x-1/2 w-[340px] sm:w-[560px] h-[340px] sm:h-[520px] bg-gradient-to-br from-blue-500/15 via-sky-400/10 to-transparent dark:from-white/10 dark:via-cyan-400/15 dark:to-transparent rounded-full blur-3xl pointer-events-none transition-colors duration-500 animate-glow-pulse" />
      <div className="absolute top-16 right-1/5 w-[280px] sm:w-[480px] h-[280px] sm:h-[440px] bg-gradient-to-bl from-cyan-500/15 via-blue-400/10 to-transparent dark:from-cyan-300/15 dark:via-white/10 dark:to-transparent rounded-full blur-3xl pointer-events-none transition-colors duration-500 animate-glow-pulse" style={{ animationDelay: '2.5s' }} />
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[420px] sm:w-[720px] h-[160px] bg-indigo-500/10 dark:bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Sparkles & Glowing Stars */}
      <div className="absolute top-12 left-10 pointer-events-none animate-pulse text-blue-500/60 dark:text-white/80 transition-opacity duration-300">
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" style={{ animationDuration: '12s' }} />
      </div>
      <div className="absolute top-1/3 left-6 sm:left-12 pointer-events-none animate-bounce text-cyan-500/70 dark:text-cyan-200/90 text-sm font-bold" style={{ animationDuration: '4s' }}>
        ✦
      </div>
      <div className="absolute top-20 right-14 pointer-events-none animate-pulse text-blue-400/60 dark:text-white/90">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ animationDuration: '8s' }} />
      </div>
      <div className="absolute bottom-24 right-8 sm:right-20 pointer-events-none animate-bounce text-sky-400/70 dark:text-cyan-300/80 text-base" style={{ animationDuration: '5s' }}>
        ✦
      </div>
      <div className="absolute top-2/3 left-1/3 pointer-events-none animate-pulse text-blue-400/40 dark:text-white/60 text-xs">
        ✦
      </div>

      <div className="w-full relative z-10 space-y-10 sm:space-y-14">

        {/* ================= HERO MAIN GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

          {/* ================= LEFT COLUMN: HEADLINE & ACTIONS ================= */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-4 sm:space-y-6">

            {/* Top Eyebrow Tag with Glowing Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border text-[11px] sm:text-xs font-black tracking-wide uppercase shadow-sm bg-blue-50/90 dark:bg-slate-900/90 border-blue-200 dark:border-cyan-500/40 text-blue-700 dark:text-cyan-300 mx-auto lg:mx-0 backdrop-blur-md transition-all hover:scale-105 duration-200 shadow-cyan-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Next-Gen Pharmacy POS &amp; Cloud ERP</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-300" />
            </div>

            {/* Main Headline */}
            <h1 className="text-[2.1rem] sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.12] sm:leading-[1.08] break-words">
              Smart Pharmacy.<br />
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 dark:from-cyan-300 dark:via-sky-200 dark:to-teal-200 bg-clip-text text-transparent drop-shadow-sm dark:drop-shadow-[0_2px_14px_rgba(6,182,212,0.4)]">
                Smarter Business.
              </span>
            </h1>

            {/* Subtitle Description */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-200 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 px-2 sm:px-0">
              Master retail &amp; wholesale billing in 0.2s, eliminate near-expiry losses with FEFO radar, and manage multi-branch stock 100% offline.
            </p>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3 pt-1 w-full max-w-md mx-auto lg:mx-0 px-1 sm:px-0">
              <Link
                to="/register"
                className="w-full sm:w-auto text-sm font-black px-6 py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/60 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 dark:from-blue-500 dark:via-cyan-500 dark:to-indigo-600 dark:border dark:border-cyan-400/40 text-white cursor-pointer group dark:shadow-cyan-500/30"
              >
                <span>Start Free 10-Day Trial</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <a
                href="https://wa.me/923281302636?text=Salam!%20I%20would%20like%20a%20live%20demo%20of%20MBI%20INVENTRA."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-sm font-extrabold px-6 py-3.5 rounded-xl transition-all duration-300 shadow-xs border border-slate-300 dark:border-cyan-500/40 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-cyan-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer group dark:shadow-sm dark:shadow-cyan-500/10"
              >
                <Play className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 fill-cyan-500 dark:fill-cyan-400 transition-transform group-hover:scale-110" />
                <span>Watch Video Demo</span>
              </a>
            </div>

            {/* Mobile-Optimized Trust Badges */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap items-center justify-center lg:justify-start pt-1.5 max-w-md mx-auto lg:mx-0">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-100 shadow-xs transition-transform hover:scale-105">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">256-Bit Vault</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-100 shadow-xs transition-transform hover:scale-105">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="truncate">0ms Offline</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-100 shadow-xs transition-transform hover:scale-105">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
                <span className="truncate">Free Trial</span>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: 3D LAPTOP + MOBILE MOCKUP WITH FLOATING BADGES ================= */}
          <div 
            className="lg:col-span-6 relative flex items-center justify-center pt-4 pb-2"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
          >

            {/* FLOATING BADGE 1: Top-Right (0ms Speed • SQLite Cloud Sync) */}
            <div className="hidden sm:flex absolute -top-2 right-2 lg:-right-4 z-20 items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-cyan-500/40 dark:border-cyan-400/50 shadow-xl shadow-cyan-500/15 text-slate-900 dark:text-white backdrop-blur-md animate-float-slow">
              <div className="p-1.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">
                <Zap className="w-3.5 h-3.5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 block leading-tight">0ms Cloud Sync</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400">Zero Cloud Bills</span>
              </div>
            </div>

            {/* FLOATING BADGE 2: Top-Left (0.2s Fast POS Billing) */}
            <div className="hidden sm:flex absolute -top-3 left-2 lg:-left-4 z-20 items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-blue-500/40 dark:border-blue-400/50 shadow-xl shadow-blue-500/15 text-slate-900 dark:text-white backdrop-blur-md animate-float-fast">
              <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 block leading-tight">0.2s Fast POS</span>
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400">Barcode &amp; Thermal</span>
              </div>
            </div>

            {/* FLOATING BADGE 3: Bottom-Left (FEFO Expiry Radar Protected) */}
            <div className="hidden sm:flex absolute -bottom-3 left-0 lg:-left-3 z-20 items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 dark:border-emerald-400/50 shadow-xl shadow-emerald-500/15 text-slate-900 dark:text-white backdrop-blur-md animate-float-reverse">
              <div className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block leading-tight">FEFO Radar Active</span>
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400">0% Expiry Losses</span>
              </div>
            </div>

            {/* FLOATING BADGE 4: Bottom-Right (Multi-Device Auto Sync) */}
            <div className="hidden sm:flex absolute -bottom-2 right-2 lg:-right-2 z-20 items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-purple-500/40 dark:border-purple-400/50 shadow-xl shadow-purple-500/15 text-slate-900 dark:text-white backdrop-blur-md animate-float-slow" style={{ animationDelay: '1.5s' }}>
              <div className="p-1.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              <div>
                <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 block leading-tight">PC + Mobile Sync</span>
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400">100% Offline Vault</span>
              </div>
            </div>

            {/* 3D Mockup Container with Parallax Perspective */}
            <div 
              className="relative w-full max-w-[580px] lg:max-w-none transition-transform duration-300 ease-out will-change-transform group"
              style={{
                perspective: '1200px',
                transform: isHovered
                  ? `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
                  : 'rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)'
              }}
            >
              {/* Dynamic Backlight Aura Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/30 via-cyan-500/25 to-purple-600/30 rounded-3xl blur-3xl -z-10 transition-opacity duration-500 group-hover:opacity-100 opacity-70" />
              
              {/* High-Resolution 3D Devices Mockup Image */}
              <div className="relative rounded-2xl overflow-hidden p-1 sm:p-2">
                <img
                  src="/landing/hero-devices-mockup.png"
                  alt="MBI INVENTRA Laptop & Mobile POS Dashboard Mockup"
                  className="w-full h-auto object-contain drop-shadow-[0_20px_45px_rgba(8,112,184,0.35)] dark:drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)] transition-all duration-500 group-hover:scale-[1.01]"
                  loading="eager"
                />
              </div>

              {/* Glowing Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl pointer-events-none opacity-80" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br-xl pointer-events-none opacity-80" />
            </div>

          </div>

        </div>

        {/* ================= 4 BOTTOM CORE VALUE PROPOSITION CARDS (Desktop & Tablet) ================= */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">

          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1.5 transition-all duration-300 group cursor-default backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white duration-300">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-between">
              <span>0.2s Counter POS</span>
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">Fast</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
              High-speed barcode checkout, thermal 80mm &amp; 58mm receipts with instant WhatsApp bill sharing.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/40 hover:-translate-y-1.5 transition-all duration-300 group cursor-default backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white duration-300">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-between">
              <span>FEFO Expiry Radar</span>
              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">Radar</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
              Automated near-expiry alerts (30/60/90 days) to return stock to distributors before financial loss.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-500/40 hover:-translate-y-1.5 transition-all duration-300 group cursor-default backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white duration-300">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-between">
              <span>Multi-Store Sync</span>
              <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">0ms</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
              Real-time stock transfers, centralized inventory visibility, and tenant-isolated SQLite vaults.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-500/40 hover:-translate-y-1.5 transition-all duration-300 group cursor-default backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 transition-transform group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white duration-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-between">
              <span>Daily Profit &amp; Loss</span>
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">Audit</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
              Item-wise margins, daily cashier shift closing, customer khata balances, and immutable audit trails.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default HeroSection;
