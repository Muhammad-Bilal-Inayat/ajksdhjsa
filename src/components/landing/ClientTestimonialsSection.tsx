import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, Quote, ChevronLeft, ChevronRight, CheckCircle2, 
  Building2, MapPin, Sparkles, User, Pause, Play, Plus,
  ShieldCheck, ArrowRight, MessageSquare
} from 'lucide-react';
import { 
  SiteTestimonial, 
  getSiteCmsConfig, 
  fetchServerTestimonials 
} from '../../lib/siteCmsService';
import { isMasterAdminAuthenticated } from '../../lib/masterServerService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ClientTestimonialsSection: React.FC<{ id?: string }> = ({ id = 'testimonials' }) => {
  const [testimonials, setTestimonials] = useState<SiteTestimonial[]>(() => getSiteCmsConfig().testimonials || []);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const auth = useAuth();
  const isMasterAdmin = auth?.isMasterAdmin ?? isMasterAdminAuthenticated();
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_DURATION_MS = 3000; // 3 seconds per user request
  const PROGRESS_INTERVAL_MS = 50;

  // Load live testimonials from server & listen for CMS updates
  useEffect(() => {
    let isMounted = true;
    fetchServerTestimonials().then(list => {
      if (isMounted && list && list.length > 0) {
        setTestimonials(list);
      }
    });

    const handleCmsUpdate = (e: any) => {
      if (e.detail?.testimonials) {
        setTestimonials(e.detail.testimonials);
      } else {
        setTestimonials(getSiteCmsConfig().testimonials || []);
      }
    };

    window.addEventListener('mbi-site-cms-updated', handleCmsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('mbi-site-cms-updated', handleCmsUpdate);
    };
  }, []);

  const totalCount = testimonials.length;

  // Auto-slide every 3 seconds + smooth linear progress
  useEffect(() => {
    if (totalCount === 0 || isPaused) {
      return;
    }

    setProgress(0);
    const startTime = Date.now();

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION_MS) * 100);
      setProgress(pct);
    }, PROGRESS_INTERVAL_MS);

    timerRef.current = setTimeout(() => {
      setActiveIndex(prev => (prev + 1) % totalCount);
    }, SLIDE_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [activeIndex, isPaused, totalCount]);

  const handlePrev = () => {
    if (totalCount === 0) return;
    setActiveIndex(prev => (prev - 1 + totalCount) % totalCount);
    setProgress(0);
  };

  const handleNext = () => {
    if (totalCount === 0) return;
    setActiveIndex(prev => (prev + 1) % totalCount);
    setProgress(0);
  };

  const handleSelectDot = (idx: number) => {
    setActiveIndex(idx);
    setProgress(0);
  };

  if (totalCount === 0) return null;

  const current = testimonials[activeIndex] || testimonials[0];
  const prevItem = testimonials[(activeIndex - 1 + totalCount) % totalCount];
  const nextItem = testimonials[(activeIndex + 1) % totalCount];

  // Helper avatar initials with deterministic gradient background
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-600 to-indigo-600',
      'from-emerald-600 to-teal-600',
      'from-purple-600 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-cyan-600 to-blue-700',
      'from-rose-600 to-red-700'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  const getInitials = (name: string) => {
    return name
      .replace(/^Dr\.\s*/i, '')
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <section 
      id="testimonials" 
      className="py-20 sm:py-28 relative overflow-hidden bg-slate-50/80 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300 selection:bg-blue-600 selection:text-white border-y border-slate-200/60 dark:border-slate-800/80"
    >
      {/* Dynamic Background Glow & 3D Grid Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[450px] bg-gradient-to-tr from-blue-500/15 via-indigo-500/15 to-purple-500/15 dark:from-blue-600/30 dark:via-indigo-600/20 dark:to-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 right-10 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]" 
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 shadow-xs backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="tracking-wide uppercase text-[11px] font-black">5,200+ Pharmacists Across Pakistan</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Trusted by Pakistan’s Leading <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-indigo-600 dark:from-blue-400 dark:via-teal-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Pharmacies & Chemist Chains
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Real feedback from community pharmacists, medical store proprietors, and retail distributors saving hours on daily billing and eliminating expiry losses.
          </p>

          {/* Master Admin Server Management Shortcut */}
          {isMasterAdmin && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/server')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/40 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Remove Testimonials from Server Panel</span>
              </button>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3D PERSPECTIVE CAROUSEL STAGE
        ───────────────────────────────────────────────────────────── */}
        <div 
          className="relative max-w-5xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Desktop 3D Viewport with Left/Right Ambient Cards */}
          <div className="relative min-h-[360px] sm:min-h-[340px] flex items-center justify-center [perspective:1400px]">
            
            {/* 1. Left Ambient Card (Desktop Only) */}
            {totalCount > 1 && (
              <div 
                onClick={handlePrev}
                className="hidden lg:block absolute left-4 w-[380px] p-6 rounded-3xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 backdrop-blur-md opacity-50 dark:opacity-40 hover:opacity-85 dark:hover:opacity-75 transition-all duration-500 transform -rotate-y-12 scale-90 translate-x-[-15%] pointer-events-auto cursor-pointer select-none shadow-xl dark:shadow-2xl"
                style={{ filter: 'blur(0.5px)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(prevItem.name)} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                    {getInitials(prevItem.name)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{prevItem.name}</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[200px]">{prevItem.pharmacyName}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 italic">"{prevItem.content}"</p>
              </div>
            )}

            {/* 2. Center Active 3D Glowing Master Card */}
            <div 
              key={current.id}
              className="relative z-20 w-full max-w-2xl mx-auto p-6 sm:p-9 rounded-3xl bg-white/95 dark:bg-gradient-to-b dark:from-slate-800/90 dark:via-slate-850/90 dark:to-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 backdrop-blur-2xl shadow-xl dark:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-blue-500/20"
            >
              {/* Floating Quote Icon Watermark */}
              <div className="absolute top-6 right-6 sm:top-8 sm:right-8 opacity-10 dark:opacity-10 pointer-events-none">
                <Quote className="w-20 h-20 sm:w-28 sm:h-28 text-blue-500 dark:text-blue-400 rotate-180" />
              </div>

              {/* Card Header: Client Details + Star Rating + Verified Badge */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(current.name)} flex items-center justify-center text-white font-black text-base shadow-lg ring-4 ring-slate-100 dark:ring-slate-800/80 shrink-0`}>
                    {getInitials(current.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {current.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{current.pharmacyName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{current.role}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <MapPin className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0" />
                        {current.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50/80 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700/80 shadow-xs">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < (current.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                    />
                  ))}
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 ml-1 font-mono">5.0</span>
                </div>
              </div>

              {/* Review Content */}
              <div className="relative z-10 mb-6">
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  "{current.content}"
                </p>
              </div>

              {/* 3-Second Auto-Slide Timer Progress Bar */}
              <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">#{activeIndex + 1} of {totalCount}</span>
                  <span>•</span>
                  <span>{isPaused ? 'Paused on hover' : 'Auto sliding (3s)'}</span>
                </div>

                {/* Progress Bar Line */}
                <div className="flex-1 max-w-[180px] sm:max-w-xs h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-500 dark:to-teal-400 rounded-full transition-all duration-75 ease-linear"
                    style={{ width: `${isPaused ? 100 : progress}%` }}
                  />
                </div>

                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsPaused(prev => !prev)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
                  title={isPaused ? "Resume Auto Slide" : "Pause Auto Slide"}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                </button>
              </div>
            </div>

            {/* 3. Right Ambient Card (Desktop Only) */}
            {totalCount > 1 && (
              <div 
                onClick={handleNext}
                className="hidden lg:block absolute right-4 w-[380px] p-6 rounded-3xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 backdrop-blur-md opacity-50 dark:opacity-40 hover:opacity-85 dark:hover:opacity-75 transition-all duration-500 transform rotate-y-12 scale-90 translate-x-[15%] pointer-events-auto cursor-pointer select-none shadow-xl dark:shadow-2xl"
                style={{ filter: 'blur(0.5px)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(nextItem.name)} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                    {getInitials(nextItem.name)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{nextItem.name}</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[200px]">{nextItem.pharmacyName}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 italic">"{nextItem.content}"</p>
              </div>
            )}

          </div>

          {/* Navigation Controls & Indicator Dots */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={handlePrev}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800/90 hover:bg-blue-600 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white flex items-center justify-center shadow-md dark:shadow-lg transition-all active:scale-90 cursor-pointer"
              title="Previous Testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Indicator Dots */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs">
              {testimonials.map((_, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDot(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'w-7 bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-500 dark:to-teal-400 shadow-xs shadow-blue-500/50' 
                        : 'w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                    }`}
                    title={`Go to testimonial ${idx + 1}`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800/90 hover:bg-blue-600 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white flex items-center justify-center shadow-md dark:shadow-lg transition-all active:scale-90 cursor-pointer"
              title="Next Testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
