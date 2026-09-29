import React, { useState, useEffect } from 'react';
import { 
  X, Phone, MessageSquare, Mail, Globe, ShieldCheck, 
  Clock, MapPin, Copy, Check, Headphones, Laptop, 
  HelpCircle, ChevronRight, FileText, Video, ExternalLink,
  Zap, Calendar, BookOpen, Layers, Award, Sparkles, Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBrandContact } from '../../lib/siteCmsService';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'guides' | 'contact' | 'faqs' | 'plans';
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ 
  isOpen, 
  onClose,
  defaultTab = 'guides'
}) => {
  const { business, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'guides' | 'contact' | 'faqs' | 'plans'>(defaultTab);
  const [copiedNum, setCopiedNum] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contact, setContact] = useState(getBrandContact);

  // Normalize active tenant plan
  const rawPlan = (tenant?.plan || (business as any)?.plan || 'gold').toLowerCase();
  const activePlan: 'silver' | 'gold' | 'platinum' = 
    rawPlan.includes('plat') || rawPlan.includes('enterp') 
      ? 'platinum' 
      : rawPlan.includes('silv') || rawPlan.includes('basic') 
      ? 'silver' 
      : 'gold';

  useEffect(() => {
    const handleUpdate = () => {
      setContact(getBrandContact());
    };
    window.addEventListener('mbi-site-cms-updated', handleUpdate);
    return () => {
      window.removeEventListener('mbi-site-cms-updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNum(key);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  // Plan-Specific Guides Definition
  const planGuides = [
    // SILVER & ABOVE: BASIC POS & INVOICING
    {
      id: 'fast-pos',
      title: 'Fast POS Retail Billing & Barcode Checkout',
      category: 'POS & Billing',
      tier: 'silver' as const,
      desc: 'Use Alt+S or F2 to quickly add items via barcode scanner or fast search. Instant thermal receipt printing in 2" and 3" sizes.',
      icon: Zap,
      steps: [
        'Press Alt+S anywhere in the app to open the Sale Register.',
        'Scan product barcode or type product name/formula (F2 focuses search).',
        'Press Enter to add to cart, adjust quantity with +/- keys, and hit Ctrl+Enter to finalize bill.'
      ]
    },
    {
      id: 'local-invoices',
      title: 'Local Invoicing & Custom Cash Receipts',
      category: 'Sales & Invoices',
      tier: 'silver' as const,
      desc: 'Create thermal slips and full A4 tax receipts with custom header logos, footer disclaimers, and payment methods.',
      icon: FileText,
      steps: [
        'Navigate to Sales > Invoices to view all transaction histories.',
        'Click on any invoice row to re-print or view detailed margin breakdowns.',
        'Customize terms in Company Profile > Invoice Branding tab.'
      ]
    },
    {
      id: 'party-ledger',
      title: 'Customer & Supplier Party Ledgers (Khata)',
      category: 'Accounts & Khata',
      tier: 'silver' as const,
      desc: 'Track debit/credit balance, record partial cash payments, and generate WhatsApp payment summary slips.',
      icon: BookOpen,
      steps: [
        'Go to Parties > Customers or Suppliers.',
        'Click "View Ledger" to inspect debit/credit entries with running balance.',
        'Click "Receive Payment" or "Send WhatsApp Khata" for 1-click reminders.'
      ]
    },
    {
      id: 'basic-stock',
      title: 'Medicine Inventory & Basic Stock Entry',
      category: 'Stock & Items',
      tier: 'silver' as const,
      desc: 'Add medicines with generic formulas, pack sizes, MRP, purchase rates, and minimum reorder alert levels.',
      icon: Layers,
      steps: [
        'Open Items > Medicine Catalog.',
        'Click "+ Add Medicine" or import wholesale CSV/Excel price lists.',
        'Set minimum stock thresholds to receive auto-reorder warnings.'
      ]
    },

    // GOLD & ABOVE: ADVANCED PHARMA MANAGEMENT
    {
      id: 'fefo-expiry',
      title: 'FEFO Expiry Management & 30/60/90 Day Radar',
      category: 'Pharma Compliance',
      tier: 'gold' as const,
      desc: 'First-Expiry-First-Out auto-selection on billing prevents expired stock dispatch and flags returnable distributor batches.',
      icon: Calendar,
      steps: [
        'The POS register automatically picks batches with the nearest expiry date.',
        'Visit Items > Expiry Radar to view color-coded 30, 60, and 90-day expiry radar buckets.',
        'Generate Supplier Return Debit Notes directly from the Expiry Radar.'
      ]
    },
    {
      id: 'batch-tracking',
      title: 'Multi-Batch Tracking & Rack Location Locator',
      category: 'Inventory & Batch',
      tier: 'gold' as const,
      desc: 'Assign rack/shelf bin locations (e.g. Shelf A-3) and track unique manufacturer batch numbers per purchase bill.',
      icon: ShieldCheck,
      steps: [
        'During purchase entry, input Batch Number and Expiry Date.',
        'Assign Rack / Shelf coordinates to help cashiers locate medicines instantly.',
        'View batch-wise audit logs under Items > Batch Analysis.'
      ]
    },
    {
      id: 'pl-reports',
      title: 'Gross Margin & Profit/Loss Financial Analytics',
      category: 'Reports & P&L',
      tier: 'gold' as const,
      desc: 'Real-time calculation of cost-of-goods-sold (COGS), gross pharmacy profit margins, and net cashier shift audits.',
      icon: Award,
      steps: [
        'Open Reports > Profit & Loss or Daily Summary.',
        'Filter by date range, counter register, or medicine category.',
        'Export detailed Excel and PDF financial statements.'
      ]
    },
    {
      id: 'whatsapp-invoicing',
      title: '1-Click WhatsApp Invoice Dispatch',
      category: 'Digital Communication',
      tier: 'gold' as const,
      desc: 'Send paperless PDF invoices and payment receipt links directly to customer WhatsApp numbers without saving contacts.',
      icon: MessageSquare,
      steps: [
        'On POS checkout, ensure the customer mobile number is entered.',
        'Click the "WhatsApp Invoice" icon to open WhatsApp Web / App with a pre-formatted message.',
        'Customers receive itemized billing details and digital receipt links.'
      ]
    },

    // PLATINUM & ENTERPRISE: MULTI-STORE & FLEET ANALYTICS
    {
      id: 'branch-transfers',
      title: 'Multi-Branch Godown Stock Transfers (STN)',
      category: 'Multi-Store ERP',
      tier: 'platinum' as const,
      desc: 'Transfer inventory securely between warehouse godowns and retail counters with barcode verification and transit tracking.',
      icon: Building2,
      steps: [
        'Go to Stock > Stock Transfer Notes (STN).',
        'Select Source Godown and Destination Pharmacy Branch.',
        'Scan items, click Dispatch, and have receiving cashier verify & accept incoming stock.'
      ]
    },
    {
      id: 'doctor-commissions',
      title: 'Doctor & Consultant Referral Commission Engine',
      category: 'Clinical Referral',
      tier: 'platinum' as const,
      desc: 'Track doctor prescription references, configure percentage or fixed referral cuts, and generate monthly doctor payouts.',
      icon: Headphones,
      steps: [
        'Tag prescribing doctor on POS bill via Alt+D or Doctor dropdown.',
        'Set referral commission slabs in Settings > Doctor Profiles.',
        'Review monthly payout ledger in Reports > Referral Commissions.'
      ]
    },
    {
      id: 'fleet-analytics',
      title: 'Cloud Fleet Centralized Analytics & Head Office HQ',
      category: 'Enterprise HQ',
      tier: 'platinum' as const,
      desc: 'Consolidated multi-store executive dashboard with real-time revenue rollups, inter-branch ledger consolidation, and HWID management.',
      icon: Sparkles,
      steps: [
        'Log in to Central Server / Master HQ at /server.',
        'View live aggregate sales from all registered branches in real-time.',
        'Manage tenant licenses, user PINs, and automated midnight cloud backups.'
      ]
    }
  ];

  // Filter guides by plan level & search query
  const tierRank = { silver: 1, gold: 2, platinum: 3 };
  const currentRank = tierRank[activePlan];

  const visibleGuides = planGuides.filter(g => {
    const isPlanUnlocked = tierRank[g.tier] <= currentRank;
    if (!searchQuery) return true;
    return (
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const faqs = [
    {
      q: 'How to setup thermal or A4 printer for sales invoices?',
      a: 'Go to Company Profile > Invoice Branding. Choose between Thermal (2"/3" 80mm) or Standard A4 formats, customize header titles, company logo, and return policy disclaimers.'
    },
    {
      q: 'How does offline mode work if the internet disconnects?',
      a: 'MBI INVENTRA is 100% offline-first. All invoices and ledger entries continue smoothly in local IndexedDB and automatically sync to the cloud server once internet reconnects.'
    },
    {
      q: 'How do I take encrypted local backups of my pharmacy?',
      a: 'Navigate to Backup & Restore in the sidebar. Click "Download Backup (.json)" to export an encrypted snapshot of all sales, medicines, batches, and party khata ledgers.'
    },
    {
      q: 'How do I upgrade from Silver to Gold or Platinum?',
      a: 'Contact the Sargodha Master Admin Helpline at 0336-4585863 or click the "Upgrade Plan" button under the Plans & Subscriptions tab.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#131d33] to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">MBI INVENTRA Documentation & Help Desk</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  activePlan === 'platinum' 
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400/40' 
                    : activePlan === 'gold' 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' 
                    : 'bg-slate-500/20 text-slate-300 border-slate-400/40'
                }`}>
                  {activePlan} Tier
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">Step-by-Step Feature Guides, Helplines & Video Tutorials</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 sm:px-6 pt-2 gap-2 text-xs font-bold overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'guides' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Plan Guides & Docs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'contact' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-500" />
            <span>Direct Helplines</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'faqs' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Frequently Asked Questions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'plans' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Plan Features</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* TAB 1: PLAN GUIDES */}
          {activeTab === 'guides' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search POS billing, FEFO expiry, WhatsApp invoicing, or Godown transfers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <BookOpen className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              </div>

              {/* Guides List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {visibleGuides.map((guide) => {
                  const Icon = guide.icon;
                  const isUnlocked = tierRank[guide.tier] <= currentRank;

                  return (
                    <div 
                      key={guide.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700'
                          : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                            guide.tier === 'platinum' ? 'bg-purple-600' : guide.tier === 'gold' ? 'bg-amber-600' : 'bg-blue-600'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {guide.category}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                              {guide.title}
                            </h4>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${
                          guide.tier === 'platinum'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : guide.tier === 'gold'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}>
                          {guide.tier}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        {guide.desc}
                      </p>

                      <div className="space-y-1 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Quick Steps:
                        </span>
                        {guide.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[10.5px] text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-blue-500 shrink-0">{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT HELPLINES */}
          {activeTab === 'contact' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Helpline 1 */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Helpline</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono tracking-wider mb-2">
                    {contact.phone1 || '0336-4585863'}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${contact.phone1 || '03364585863'}`}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Now</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(contact.phone1 || '03364585863', 'p1')}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedNum === 'p1' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Helpline 2 / WhatsApp */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp Live Desk</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono tracking-wider mb-2">
                    {contact.phone2 || '0328-1302636'}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/92${(contact.phone2 || '03281302636').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(contact.phone2 || '03281302636', 'p2')}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedNum === 'p2' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Physical Master Desk Address */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <MapPin className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Master HQ Engineering Desk</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {contact.address || 'Sargodha IT City & Software Technology Park, Punjab, Pakistan'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FAQS */}
          {activeTab === 'faqs' && (
            <div className="space-y-3 animate-in fade-in">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{faq.q}</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-5.5 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: PLAN COMPARISON */}
          {activeTab === 'plans' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Silver */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Silver Tier</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">Basic Retail POS</h4>
                  <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>✓ Fast POS Retail Billing</li>
                    <li>✓ Thermal & A4 Invoicing</li>
                    <li>✓ Customer / Supplier Khata</li>
                    <li>✓ Basic Stock Catalog</li>
                  </ul>
                </div>

                {/* Gold */}
                <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xs relative">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Gold Tier (Most Popular)</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">Business Pharma ERP</h4>
                  <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>✓ All Silver Features</li>
                    <li>✓ FEFO Expiry Radar (30/60/90)</li>
                    <li>✓ Batch & Rack Shelf Locations</li>
                    <li>✓ Gross Margin & P&L Reports</li>
                    <li>✓ 1-Click WhatsApp Invoices</li>
                  </ul>
                </div>

                {/* Platinum */}
                <div className="bg-white dark:bg-slate-900 border border-purple-500/40 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Platinum Tier</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">Enterprise Multi-Store</h4>
                  <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>✓ All Gold Features</li>
                    <li>✓ Godown Stock Transfers (STN)</li>
                    <li>✓ Doctor Referral Commissions</li>
                    <li>✓ Central Server HQ Analytics</li>
                    <li>✓ Priority 24/7 Dedicated Support</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

// Export HelpDeskModal alias
export const HelpDeskModal = HelpSupportModal;
