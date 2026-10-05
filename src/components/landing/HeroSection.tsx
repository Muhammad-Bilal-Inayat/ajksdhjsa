import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, CheckCircle2, Zap,
  TrendingUp, Monitor, Package, Users, BarChart3,
  ShieldCheck, Search, Clock, Lock, Receipt, Sparkles, Activity
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'fefo' | 'reports'>('pos');
  
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
        x: Number((x * 8).toFixed(1)),
        y: Number((-y * 8).toFixed(1))
      });
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="relative pt-6 sm:pt-10 lg:pt-14 pb-12 sm:pb-18 overflow-hidden w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          SPARKLING BRUSH GLOW BACKGROUND (Light Mode: Blue / Dark Mode: White & Cyan)
      ───────────────────────────────────────────────────────────── */}
      {/* Glowing Brush Orbs */}
      <div className="absolute top-8 left-1/4 -translate-x-1/2 w-[340px] sm:w-[560px] h-[340px] sm:h-[520px] bg-gradient-to-br from-blue-500/15 via-sky-400/10 to-transparent dark:from-white/10 dark:via-cyan-400/15 dark:to-transparent rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
      <div className="absolute top-16 right-1/5 w-[280px] sm:w-[480px] h-[280px] sm:h-[440px] bg-gradient-to-bl from-cyan-500/15 via-blue-400/10 to-transparent dark:from-cyan-300/15 dark:via-white/10 dark:to-transparent rounded-full blur-3xl pointer-events-none transition-colors duration-500" />
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
            <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-black tracking-wide uppercase shadow-xs bg-blue-50/90 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-cyan-300 mx-auto lg:mx-0 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Next-Gen Pharmacy POS &amp; Cloud ERP</span>
              <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-300" />
            </div>

            {/* Main Headline */}
            <h1 className="text-[2.1rem] sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.12] sm:leading-[1.08] break-words">
              Smart Pharmacy.<br />
              <span className="text-cyan-500 dark:text-cyan-300">
                Smarter Business.
              </span>
            </h1>

            {/* Subtitle Description */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 px-2 sm:px-0">
              Master retail &amp; wholesale billing in 0.2s, eliminate near-expiry losses with FEFO radar, and manage multi-branch stock 100% offline.
            </p>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3 pt-1 w-full max-w-md mx-auto lg:mx-0 px-1 sm:px-0">
              <Link
                to="/register"
                className="w-full sm:w-auto text-sm font-black px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white cursor-pointer"
              >
                <span>Start Free 10-Day Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="https://wa.me/923281302636?text=Salam!%20I%20would%20like%20a%20live%20demo%20of%20MBI%20INVENTRA."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-sm font-extrabold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-xs border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500" />
                <span>Watch Video Demo</span>
              </a>
            </div>

            {/* Mobile-Optimized Trust Badges */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap items-center justify-center lg:justify-start pt-1.5 max-w-md mx-auto lg:mx-0">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">256-Bit Vault</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">0ms Offline</span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-500 shrink-0" />
                <span className="truncate">Free Trial</span>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: INTERACTIVE LIVE PREVIEW WITH FLOATING BADGES ================= */}
          <div 
            className="lg:col-span-6 relative"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
          >

            {/* FLOATING BADGE 1: Top-Right (0ms Speed • SQLite Cloud Sync) */}
            <div className="hidden sm:flex absolute -top-4 -right-2 z-20 items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-cyan-500/40 dark:border-cyan-400/50 shadow-lg shadow-cyan-500/10 text-slate-900 dark:text-white backdrop-blur-md animate-bounce" style={{ animationDuration: '6s' }}>
              <div className="p-1 rounded-lg bg-cyan-500 text-white shadow-xs">
                <Zap className="w-3 h-3 fill-white" />
              </div>
              <div>
                <span className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 block leading-tight">0ms Cloud Sync</span>
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400">Zero Cloud Bills</span>
              </div>
            </div>

            {/* FLOATING BADGE 2: Bottom-Left (FEFO Expiry Radar Protected) */}
            <div className="hidden sm:flex absolute -bottom-3 -left-3 z-20 items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 dark:border-emerald-400/50 shadow-lg shadow-emerald-500/10 text-slate-900 dark:text-white backdrop-blur-md animate-pulse" style={{ animationDuration: '4s' }}>
              <div className="p-1 rounded-lg bg-emerald-500 text-white shadow-xs">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block leading-tight">FEFO Radar Active</span>
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400">0% Expiry Losses</span>
              </div>
            </div>

            {/* 3D Container with Parallax Perspective */}
            <div 
              className="relative transition-transform duration-200 ease-out will-change-transform"
              style={{
                perspective: '1000px',
                transform: isHovered
                  ? `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`
                  : 'rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)'
              }}
            >
              {/* Ambient Backlight Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-cyan-500/20 to-indigo-600/20 rounded-3xl blur-2xl -z-10" />

              {/* Main Terminal Box */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200">

                {/* Header Bar */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 ml-2">
                      <Lock className="w-2.5 h-2.5 text-emerald-500" />
                      <span>mbiinventra.com</span>
                    </div>
                  </div>

                  {/* Status Telemetry */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>0ms Offline Ready</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                      <Zap className="w-3 h-3" />
                      <span>Secure</span>
                    </span>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-3 pt-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pos')}
                    className={`px-3 py-1.5 rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'pos'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 border-t-2 border-t-blue-500 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>0.2s POS Billing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('fefo')}
                    className={`px-3 py-1.5 rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'fefo'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-t-2 border-t-emerald-500 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>FEFO Expiry Radar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className={`px-3 py-1.5 rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'reports'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-t-2 border-t-purple-500 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Live Telemetry</span>
                  </button>
                </div>

                {/* Dynamic Tab Body */}
                <div className="p-4 sm:p-5 min-h-[260px]">

                  {/* TAB 1: POS BILLING LIVE SIMULATOR */}
                  {activeTab === 'pos' && (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex-1">
                          <Search className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">Augmentin 625mg Tab</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                          Alt+S / F2
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-semibold">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold">Augmentin 625mg (Co-Amoxiclav)</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Batch: AUG-8820 • Exp: 04/2027 • Qty: 2</p>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-900 dark:text-white font-bold">Rs 840</span>
                            <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">FEFO #1</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold">Panadol Extra 500mg</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Batch: PAN-1099 • Exp: 11/2026 • Qty: 4</p>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-900 dark:text-white font-bold">Rs 380</span>
                            <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">FEFO #1</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Total Bill</span>
                          <span className="text-lg font-black text-blue-600 dark:text-cyan-400">Rs 1,220.00</span>
                        </div>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Print Bill (0.2s)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: FEFO EXPIRY RADAR */}
                  {activeTab === 'fefo' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">FEFO Expiry Protection</span>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Zero Wastage Active
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center font-semibold text-xs">
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">0-30 Days</span>
                          <span className="text-base font-black text-rose-700 dark:text-rose-300">2 Batches</span>
                          <span className="text-[9px] text-rose-500 block mt-0.5">Return to Vendor</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">31-60 Days</span>
                          <span className="text-base font-black text-amber-700 dark:text-amber-300">5 Batches</span>
                          <span className="text-[9px] text-amber-500 block mt-0.5">Priority Counter</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Safe Stock</span>
                          <span className="text-base font-black text-emerald-700 dark:text-emerald-300">4,820 Items</span>
                          <span className="text-[9px] text-emerald-500 block mt-0.5">100% Protected</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>FEFO automatically rotates nearest expiring medicine to cashier counter during fast search.</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: LIVE TELEMETRY & MULTI-STORE */}
                  {activeTab === 'reports' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                          <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">Today Net Sales</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white">Rs 48,920</span>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                            <TrendingUp className="w-3 h-3" /> +18.4% vs Yesterday
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">Today Gross Profit</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white">Rs 11,480</span>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" /> 23.4% Profit Margin
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                          <span className="text-slate-800 dark:text-slate-200">Terminal #1 &amp; Mobile POS Synced</span>
                        </div>
                        <span className="text-blue-600 dark:text-cyan-400 font-mono text-[11px] font-bold">WAL Delta 0ms</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ================= 4 BOTTOM CORE VALUE PROPOSITION CARDS (Desktop & Tablet Only) ================= */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">

          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              0.2s Counter POS
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
              High-speed barcode checkout, thermal 80mm &amp; 58mm receipts with WhatsApp bill sharing.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              FEFO Expiry Radar
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
              Automated near-expiry alerts (30/60/90 days) to return stock before financial loss.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Multi-Store Sync
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
              Real-time stock transfers, centralized inventory visibility, and role-based staff permissions.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Daily Profit &amp; Loss
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
              Item-wise margins, daily cashier shift closing, customer khata balances, and audit trails.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default HeroSection;
