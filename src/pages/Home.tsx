import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HeroSection } from '../components/landing/HeroSection';
import { AnimatedFeatureCards } from '../components/landing/AnimatedFeatureCards';
import { FefoRadarGraphic } from '../components/landing/FefoRadarGraphic';
import { PosSpeedVisualWidget } from '../components/landing/PosSpeedVisualWidget';
import { CloudSynapseVisualWidget } from '../components/landing/CloudSynapseVisualWidget';
import { ExpiryCalculator } from '../components/landing/ExpiryCalculator';
import { FloatingWhatsApp } from '../components/landing/FloatingWhatsApp';
import { PricingSection } from '../components/landing/PricingSection';
import { ClientTestimonialsSection } from '../components/landing/ClientTestimonialsSection';
import { PWAInstallBanner } from '../components/pwa/PWAInstallBanner';
import { getSiteCmsConfig, SiteCmsConfig, fetchSiteCmsFromServer } from '../lib/siteCmsService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [cmsConfig, setCmsConfig] = useState<SiteCmsConfig>(() => getSiteCmsConfig());

  // FAQ open item
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  useEffect(() => {
    fetchSiteCmsFromServer().then(cfg => {
      if (cfg) setCmsConfig(cfg);
    }).catch(() => {});

    const handleCmsUpdate = (e: any) => {
      if (e.detail) setCmsConfig(e.detail);
      else setCmsConfig(getSiteCmsConfig());
    };

    window.addEventListener('mbi-site-cms-updated', handleCmsUpdate);
    return () => window.removeEventListener('mbi-site-cms-updated', handleCmsUpdate);
  }, []);

  const scrollToSection = (sectionId: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        const headerOffset = 70;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  };

  // Scroll reveal observer for 60FPS butter-smooth scroll animations
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    hero: true
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisibleSections({
        features: true,
        'pos-speed': true,
        'fefo-radar': true,
        'cloud-synapse': true,
        testimonials: true,
        pricing: true,
        faq: true
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id') || entry.target.getAttribute('data-section-id');
            if (id) {
              setVisibleSections((prev) => ({ ...prev, [id]: true }));
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    const sectionElements = document.querySelectorAll('.mbi-scroll-reveal');
    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-theme-root min-h-screen font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 w-full max-w-full overflow-x-hidden relative">
      <PWAInstallBanner />

      {/* ─────────────────────────────────────────────────────────────
          SMOOTH FLOATING NEBULA ORBS (GPU-Accelerated Ambient Glow Background)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
        {/* Top-Left Electric Nebula Orb */}
        <div 
          className="absolute -top-32 -left-32 w-[420px] sm:w-[680px] h-[420px] sm:h-[680px] rounded-full bg-gradient-to-br from-blue-600/15 via-sky-500/10 to-transparent dark:from-cyan-500/15 dark:via-blue-600/10 dark:to-transparent blur-[90px] sm:blur-[140px] animate-pulse will-change-transform" 
          style={{ animationDuration: '8s' }} 
        />

        {/* Top-Right Cyan Nebula Orb */}
        <div 
          className="absolute top-1/4 -right-32 w-[380px] sm:w-[620px] h-[380px] sm:h-[620px] rounded-full bg-gradient-to-bl from-cyan-500/15 via-teal-400/10 to-transparent dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-transparent blur-[90px] sm:blur-[140px] animate-pulse will-change-transform" 
          style={{ animationDuration: '10s' }} 
        />

        {/* Middle Soft Indigo Glow */}
        <div 
          className="absolute top-1/2 left-1/4 -translate-x-1/2 w-[400px] sm:w-[700px] h-[300px] sm:h-[450px] rounded-full bg-indigo-500/10 dark:bg-purple-600/10 blur-[100px] sm:blur-[160px] will-change-transform" 
        />

        {/* Bottom Ambient Glow */}
        <div 
          className="absolute bottom-10 right-1/4 w-[350px] sm:w-[550px] h-[250px] sm:h-[400px] rounded-full bg-sky-400/10 dark:bg-cyan-400/10 blur-[90px] sm:blur-[130px] will-change-transform" 
        />
      </div>

      {/* Floating WhatsApp Chat Button */}
      <FloatingWhatsApp />

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & NAVBAR (100% Mobile Responsive with Drawer)
      ───────────────────────────────────────────────────────────── */}
      <Navbar />

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION & LIVE TELEMETRY PREVIEWS
      ───────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ─────────────────────────────────────────────────────────────
          3. CORE FEATURES GRID (Animated Interactive Feature Cards)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="features"
        data-section-id="features"
        className={`mbi-scroll-reveal py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out will-change-transform ${
          visibleSections['features']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            BUILT FOR PHARMACIES THAT CAN NEVER STOP
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Every module engineered to prevent theft, eliminate expired medicine losses, and bill customers with zero delay.
          </p>
        </div>

        <AnimatedFeatureCards />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE 0.2s POS SPEED SIMULATION WIDGET
      ───────────────────────────────────────────────────────────── */}
      <section
        id="pos-speed"
        data-section-id="pos-speed"
        className={`mbi-scroll-reveal py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out will-change-transform ${
          visibleSections['pos-speed']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <PosSpeedVisualWidget />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. INTERACTIVE 6-HORIZON FEFO EXPIRY RADAR & CALCULATOR
      ───────────────────────────────────────────────────────────── */}
      <section
        id="fefo-radar"
        data-section-id="fefo-radar"
        className={`mbi-scroll-reveal py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 transition-all duration-700 ease-out will-change-transform ${
          visibleSections['fefo-radar']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <FefoRadarGraphic />
        <div id="calculator">
          <ExpiryCalculator onOpenTrial={() => navigate('/register')} />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. REAL-TIME MULTI-BRANCH CLOUD SYNAPSE MESH WIDGET
      ───────────────────────────────────────────────────────────── */}
      <section
        id="cloud-synapse"
        data-section-id="cloud-synapse"
        className={`mbi-scroll-reveal py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out will-change-transform ${
          visibleSections['cloud-synapse']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <CloudSynapseVisualWidget />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. 3D CLIENT TESTIMONIALS (Auto-Slides every 3s & Server-Synced)
      ───────────────────────────────────────────────────────────── */}
      <div
        id="testimonials"
        data-section-id="testimonials"
        className={`mbi-scroll-reveal transition-all duration-700 ease-out will-change-transform ${
          visibleSections['testimonials']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <ClientTestimonialsSection id="testimonials" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. STANDARDIZED PRICING SECTION
      ───────────────────────────────────────────────────────────── */}
      <div
        id="pricing"
        data-section-id="pricing"
        className={`mbi-scroll-reveal transition-all duration-700 ease-out will-change-transform ${
          visibleSections['pricing']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <PricingSection id="pricing" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          9. FAQ SECTION
      ───────────────────────────────────────────────────────────── */}
      <section
        id="faq"
        data-section-id="faq"
        className={`mbi-scroll-reveal py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 transition-all duration-700 ease-out will-change-transform ${
          visibleSections['faq']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Everything you need to know about MBI Inventra  licensing and features</p>
        </div>

        <div className="space-y-3">
          {(cmsConfig.faqs && cmsConfig.faqs.length > 0 ? cmsConfig.faqs : [
            {
              id: 'faq-1',
              question: 'Will MBI Inventra work if our pharmacy internet is completely disconnected?',
              answer: 'Yes, 100%! MBI Inventra is a standalone offline-first PWA system. It installs directly onto your Windows PC or tablet, caching all medicines, customers, batches, and invoices in local IndexedDB. You can bill customers, print thermal receipts, and inward purchases offline with zero interruption.'
            },
            {
              id: 'faq-2',
              question: 'How does FEFO (First-Expiry-First-Out) save money on medicine wastage?',
              answer: 'When billing any medicine, the system automatically checks batch expiry dates and prompts the cashier to dispense the closest-expiring batch first. Furthermore, automated 30, 60, and 90-day alert radars warn you to return expiring stock to the distributor for full credit.'
            },
            {
              id: 'faq-3',
              question: 'What happens after the 10-day free trial expires?',
              answer: 'All your added medicines, invoices, and customer khata records remain 100% safe and intact on your computer. You can activate a Basic, Business, or Enterprise license key to continue without losing a single record.'
            },
            {
              id: 'faq-4',
              question: 'Can I print receipts on 80mm / 58mm thermal printers or regular A4 printers?',
              answer: 'Yes, MBI Inventra supports all standard USB/Network ESC-POS thermal printers (80mm & 58mm) as well as LaserJet A4 bills with customizable pharmacy headers, logos, and Urdu invoice footers.'
            }
          ]).map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left font-bold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer"
                >
                  <span>{faq.question || (faq as any).q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {isOpen && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
                    {faq.answer || (faq as any).a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. CLEAN SITEMAP & FOOTER (Zero Technical Jargon)
      ───────────────────────────────────────────────────────────── */}
      <Footer onScrollToSection={scrollToSection} />

    </div>
  );
};

export const LandingPage = Home;
export default Home;
