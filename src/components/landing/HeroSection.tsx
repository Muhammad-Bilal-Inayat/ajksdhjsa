import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { AnimatedHeroGraphs } from './AnimatedHeroGraphs';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-6 sm:pt-10 lg:pt-14 pb-10 sm:pb-16 overflow-hidden w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
      {/* Ambient Glow Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[600px] h-[220px] sm:h-[320px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/3 right-1/4 w-[240px] sm:w-[350px] h-[180px] sm:h-[240px] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none animate-float-slow" />

      <div className="w-full max-w-7xl mx-auto overflow-hidden relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-3.5 sm:space-y-5 px-1">
          
          {/* Pill Badge with High Contrast */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-bold tracking-wide uppercase shadow-xs bg-blue-500/10 dark:bg-blue-500/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 max-w-full truncate">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">Smart Pharmacy • Zero Data Loss • 0.2s POS Speed</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white break-words leading-tight">
            MBI INVENTRA
          </h1>

          {/* Secondary Heading */}
          <h2 className="mt-2 text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 dark:from-sky-300 dark:via-blue-300 dark:to-teal-200 bg-clip-text text-transparent break-words leading-snug">
            Enterprise Pharmacy POS & ERP Software
          </h2>

          {/* Hero Paragraph Description */}
          <p className="mt-3 max-w-2xl mx-auto text-xs sm:text-base lg:text-lg text-slate-600 dark:text-slate-200 font-medium leading-relaxed px-1 sm:px-2">
            Master retail & wholesale billing in 0.2 seconds, eliminate near-expiry losses with FEFO radar, print custom thermal receipts, and operate 100% offline without internet.
          </p>

          {/* Standardized Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-2 w-full max-w-md sm:max-w-none mx-auto">
            <Link
              to="/register"
              className="w-full sm:w-auto text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <span>Start Free 10-Day Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="https://wa.me/923281302636?text=Salam!%20I%20would%20like%20a%20live%20video%20demo%20of%20MBI%20INVENTRA."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
              <span>Watch WhatsApp Demo</span>
            </a>
          </div>

          {/* Micro-Badges Below CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>No Credit Card Needed</span>
            </span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>100% Offline Desktop Ready</span>
            </span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>Instant 0.2s POS Access</span>
            </span>
          </div>

        </div>

        {/* Animated Hero Live Graphs */}
        <div className="mt-6 sm:mt-10 max-w-5xl mx-auto w-full min-w-0 overflow-hidden">
          <AnimatedHeroGraphs />
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
