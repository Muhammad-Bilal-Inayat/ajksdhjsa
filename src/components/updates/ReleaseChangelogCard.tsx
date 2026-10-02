import React from 'react';
import { 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Lock, 
  ArrowUpRight,
  Layers,
  ChevronRight,
  Crown
} from 'lucide-react';
import { useTenantPlan } from '../../context/TenantPlanContext';
import { PlanTier } from '../../utils/planPermissions';

export interface PlanUpdateFeature {
  text: string;
  type: 'feature' | 'performance' | 'security';
  minPlan: 'all' | 'silver' | 'gold' | 'platinum';
}

export interface ReleaseEntry {
  version: string;
  releaseDate: string;
  tag: string;
  isLatest: boolean;
  channel: string;
  summary: string;
  features: PlanUpdateFeature[];
}

interface ReleaseChangelogCardProps {
  releases?: ReleaseEntry[];
  className?: string;
}

export const OFFICIAL_RELEASES: ReleaseEntry[] = [
  {
    version: 'v4.3.8-stable',
    releaseDate: 'October 2026',
    tag: 'Production Stable',
    isLatest: true,
    channel: 'Enterprise OTA Channel',
    summary: 'Hardware Device Lock (1 User = 1 Device Strict Policy), Single-Use 1-Time Token Burn, Butter-Smooth 60FPS Scroll Animations & Nano-Speed Navigation.',
    features: [
      {
        text: 'Strict 1 User = 1 Device Hardware Lock: Enforces physical machine binding; secondary unauthorized terminal logins require Master approval.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: '1-Key = 1-Time Usable Token Burn: Master-generated activation keys (MBI-DEV-XXXX-XXXX) permanently burn on single entry with zero multi-device leakage.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Butter-Smooth 60FPS Scroll Reveals: Native GPU-accelerated scroll animations with zero layout shift and instant sub-millisecond menu opening.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'Sync & Share Live Build Inspector: Direct OTA update status checker and 1-click delta refresh across all fleet workstations.',
        type: 'feature',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.7-stable',
    releaseDate: 'September 2026',
    tag: 'Previous Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'AI Daily Quotas (Enterprise: 200, Business: 50, Basic: 20, Trial/Guest: 20 msgs/day), Scroll Jump Fixes & Server Live Limit Overrides.',
    features: [
      {
        text: 'Tier-Specific Daily AI Message Quotas: Enterprise = 200 msgs/day, Business = 50 msgs/day, Basic = 20 msgs/day, Trial & Home Guest = 20 msgs/day.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Zero-Error Guest Quota Architecture: Unauthenticated home page users get 20 free daily questions per device with zero limit errors on first visit.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Zero Scroll Jumping UI/UX: Resolved page scroll down bug on mount; chat scroll strictly isolated to internal conversation container.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'Super Admin Live AI Quota Controls: Master Hub station (/server) can instantly reset usage to 0 or grant custom daily message overrides per store.',
        type: 'feature',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.6-stable',
    releaseDate: 'September 2026',
    tag: 'Previous Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Compare MBI INVENTRA Editions Feature Matrix & Integrated User Side Pricing Hub.',
    features: [
      {
        text: 'Compare Editions Modal: Integrated official 17-point feature comparison matrix directly into User Plans & Licensing page.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Updated Feature Matrix: Clear comparison of 0.2s POS, WhatsApp Auto-Gateway vs 1-Click Direct, FEFO Expiry Radar, and FBR POS compliance.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Seamless User Navigation: Added direct "Compare Editions" triggers in header action bar and beneath billing duration toggles.',
        type: 'feature',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.5-stable',
    releaseDate: 'September 2026',
    tag: 'Production Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: '100% Unified & Synchronized Subscription Plan Features Across Home Page, User Dashboard & Server Hub.',
    features: [
      {
        text: 'Single Source of Truth: Silver Basic, Gold Business, and Platinum Enterprise features are 100% identical and synchronized across Home, User Licensing, and Server Hub.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Accurate Tier Features: Clear distinction of WhatsApp Auto-Gateway & FBR in Platinum Enterprise vs 1-Click WhatsApp Direct in Silver/Gold.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Interactive Pricing Modal Synced: User upgrade modal now pulls live from unified master plan configuration.',
        type: 'feature',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.4-stable',
    releaseDate: 'September 2026',
    tag: 'Production Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Company WhatsApp Automation Hub (Enterprise Background Auto-Gateway & 1-Click Direct wa.me) + Live Super Admin Fleet Override.',
    features: [
      {
        text: 'Enterprise Auto-Gateway: Automatic background invoice & khata message delivery using attached company WhatsApp number.',
        type: 'feature',
        minPlan: 'platinum'
      },
      {
        text: '1-Click WhatsApp Direct: Free, instant click-to-chat billing dispatch formatted with order summary for Silver & Gold tiers.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Super Admin Live Gateway Override: 1-click feature enable/disable per company directly from /server Fleet Dashboard.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Zero-Cost Architecture: No monthly per-message fees or number bans; fully owned by client pharmacy.',
        type: 'performance',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.3-stable',
    releaseDate: 'September 2026',
    tag: 'Production Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Strict Master PIN Security Lockdown (Ami7788!@ & 03082003) and 100% Multi-Tenant Isolation Architecture.',
    features: [
      {
        text: 'Master PIN Hardening: Removed deprecated test PIN 884422, strictly locking Master Hub to Ami7788!@ and 03082003.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Full Multi-Tenant Schema Validation: Verified 20+ MariaDB tables with strict per-tenant cryptographic isolation.',
        type: 'feature',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.2-stable',
    releaseDate: 'September 2026',
    tag: 'Previous Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: '100% Real-Time Master Station & Unified Governance Sync, Auto-Repaired Tenant Isolation, and Multi-Key Query Alignment.',
    features: [
      {
        text: 'Real-Time /server & Unified Governance Sync: New registered tenants and users immediately appear across all 25 Master Hub tabs.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Automatic Database Repair: Auto-populates tenant_id & organization_id across mbi_tenants, mbi_users, and mbi_licenses.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'Unified Multi-Key Tenant Join: Connects user and license records across ID, Tenant ID, and Organization ID seamlessly.',
        type: 'security',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.1-stable',
    releaseDate: 'September 2026',
    tag: 'Previous Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Production 503 Crash Shield, MariaDB 30s Keep-Alive Ping, and Sanitized Health Metrics.',
    features: [
      {
        text: 'Sanitized Public Health Metrics: database schema name hidden to prevent information disclosure.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Zero-Downtime 503 Crash Shield: Process-level uncaught exception and unhandled rejection interceptors.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'MariaDB Background Keep-Alive Ping: Eliminates connection drops and idle wait_timeout disconnects.',
        type: 'performance',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.3.0-stable',
    releaseDate: 'September 2026',
    tag: 'Previous Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Silent Background Hardware Auto-Binding, Enterprise-Restricted FBR POS Digital Invoicing, and 5 Core Pillars Hardening.',
    features: [
      {
        text: 'Silent Background Hardware Auto-Binding: Eliminated flickering device bind popups on new user registration.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'FBR POS & Digital Invoicing Module restricted strictly to Enterprise Plan tier.',
        type: 'feature',
        minPlan: 'platinum'
      },
      {
        text: 'Enterprise-grade Multi-Tenant Hardware Whitelist and Auto-Configured 1-Device Integrity.',
        type: 'security',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.2.9-stable',
    releaseDate: 'September 2026',
    tag: 'Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Company-Wise 5-PC LAN Multi-Terminal Configuration, Strict Multi-Tenant Data Lock & Isolation, and Client-Side Server Updates Segregation.',
    features: [
      {
        text: 'Company-Wise LAN Multi-Terminal Management: Configure up to 5 dedicated counter PCs per company with custom roles and static IPs.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: '100% Multi-Tenant Cryptographic Isolation: Strict boundary preventing any cross-company data leakage or sync mixing.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Segregated Client Experience: Completely hid server updates and internal server tools from client/user navigation.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Targeted User Broadcasts: Dispatch instant high-priority popup announcements specifically to selected company counters.',
        type: 'feature',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.2.8-stable',
    releaseDate: 'September 2026',
    tag: 'Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Polished Trial Countdown Banner and Header dropdown layering, 100% Rock-Solid Zero Auto-Reload Stability, and LAN Multi-PC Counter Sync Hub.',
    features: [
      {
        text: 'Polished Top Trial Countdown Banner & Micro-Header dropdown layering without visual obstruction.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: '100% Zero-Reload POS Cashier Stability: completely removed disruptive auto-reload hooks.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'LAN Multi-PC Counter Sync Station (/lan) for offline ethernet LAN billing without cloud dependency.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Real-Time Universal User Broadcast announcements with interactive modal popups and audio chimes.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Persistent authenticated local sessions with zero unexpected logouts.',
        type: 'security',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.2.0-stable',
    releaseDate: 'September 2026',
    tag: 'Production Stable',
    isLatest: false,
    channel: 'Enterprise OTA Channel',
    summary: 'Polished dual-theme system, Full-screen Purchase & Billing Workspace, Multi-language AI assistant, and plan-governed live release feed.',
    features: [
      {
        text: 'Full-Screen Multi-Tab Purchase & Sale Workspaces with 12-Column Rapid Grid.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Polished Dual-Theme Workspace with automatic dark mode contrast calibration.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'FEFO Near-Expiry Radar with 30/60/90 days automatic alert badges.',
        type: 'feature',
        minPlan: 'gold'
      },
      {
        text: 'Real-time Multi-Branch Fleet Management & Cross-Store Inventory Transfer.',
        type: 'feature',
        minPlan: 'platinum'
      },
      {
        text: '0-Lag Local IndexedDB Outbox Engine for 100% offline continuous POS billing.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'Instant Thermal 80mm/58mm Direct Print Dispatch and WhatsApp Invoice sharing.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'Strict Hardware Binding HWID Integrity Guard and Anti-Tampering Shield.',
        type: 'security',
        minPlan: 'all'
      },
      {
        text: 'Encrypted Zero-Data-Loss Automated Backup Snapshot at midnight.',
        type: 'security',
        minPlan: 'gold'
      }
    ]
  },
  {
    version: 'v4.1.2',
    releaseDate: 'August 2026',
    tag: 'Stable',
    isLatest: false,
    channel: 'Production Stable',
    summary: 'Supplier Khata Ledgers, Payment Out Vouchers, and Barcode Generator Suite.',
    features: [
      {
        text: 'Supplier Khata Credit/Debit Ledger Statements with WhatsApp PDF dispatch.',
        type: 'feature',
        minPlan: 'gold'
      },
      {
        text: 'Multi-Item Shortage Demand Book with 1-click PO generator.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Custom 4-digit Cashier Shift PINs and cash drawer reconciliation.',
        type: 'feature',
        minPlan: 'gold'
      },
      {
        text: 'IndexedDB transaction batching for ultra-fast large catalog searching.',
        type: 'performance',
        minPlan: 'all'
      },
      {
        text: 'Enhanced RBAC module gate denying unauthorized cashier operations.',
        type: 'security',
        minPlan: 'all'
      }
    ]
  },
  {
    version: 'v4.0.0',
    releaseDate: 'July 2026',
    tag: 'Major Release',
    isLatest: false,
    channel: 'Production Stable',
    summary: 'Initial release of MBI Inventra Enterprise Pharmacy Management Core.',
    features: [
      {
        text: 'Centralized Medicine Catalog Seeder with 15,000+ pre-indexed generics.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Barcode Scanner integration with camera, USB, and serial scanners.',
        type: 'feature',
        minPlan: 'all'
      },
      {
        text: 'Single-page responsive ERP layout with instant shortcut hotkeys.',
        type: 'performance',
        minPlan: 'all'
      }
    ]
  }
];

export const ReleaseChangelogCard: React.FC<ReleaseChangelogCardProps> = ({
  releases = OFFICIAL_RELEASES,
  className = ''
}) => {
  const { plan, isSilver, isGold, isPlatinum, rawPlan } = useTenantPlan();

  const isFeatureAvailableInPlan = (minPlan: 'all' | 'silver' | 'gold' | 'platinum') => {
    if (minPlan === 'all') return true;
    if (minPlan === 'silver') return true;
    if (minPlan === 'gold') return isGold || isPlatinum;
    if (minPlan === 'platinum') return isPlatinum;
    return true;
  };

  const getPlanBadgeLabel = (minPlan: 'all' | 'silver' | 'gold' | 'platinum') => {
    if (minPlan === 'all') return { label: 'All Plans', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    if (minPlan === 'silver') return { label: 'Silver Basic', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
    if (minPlan === 'gold') return { label: 'Gold Business', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    if (minPlan === 'platinum') return { label: 'Platinum Enterprise', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    return { label: 'All Plans', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {releases.map((rel) => {
        const newFeatures = rel.features.filter(f => f.type === 'feature');
        const perfFeatures = rel.features.filter(f => f.type === 'performance');
        const secFeatures = rel.features.filter(f => f.type === 'security');

        return (
          <div
            key={rel.version}
            className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${
              rel.isLatest
                ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 shadow-md shadow-blue-500/5'
                : 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 shadow-xs'
            }`}
          >
            {/* Release Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {rel.version}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                    rel.isLatest
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {rel.tag}
                  </span>
                </div>

                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                  {rel.channel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{rel.releaseDate}</span>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {rel.summary}
            </p>

            {/* Features Breakdown */}
            <div className="mt-4 space-y-4">
              {/* 1. New Features */}
              {newFeatures.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>✨ New Features & Capabilities</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {newFeatures.map((item, idx) => {
                      const isUnlocked = isFeatureAvailableInPlan(item.minPlan);
                      const badge = getPlanBadgeLabel(item.minPlan);

                      return (
                        <li
                          key={idx}
                          className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-colors ${
                            isUnlocked
                              ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                              : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/40 dark:border-amber-900/30 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={isUnlocked ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                              {isUnlocked ? '✓' : '🔒'}
                            </span>
                            <span>{item.text}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${badge.color}`}>
                              {badge.label}
                            </span>
                            {!isUnlocked && (
                              <a
                                href="/pricing"
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>Unlock</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* 2. Speed & Performance */}
              {perfFeatures.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>⚡ Speed, Responsiveness & Offline Reliability</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {perfFeatures.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start justify-between gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">⚡</span>
                          <span>{item.text}</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {item.minPlan === 'all' ? 'All Plans' : item.minPlan}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Security & Bug Fixes */}
              {secFeatures.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>🛡️ Security Hardening & Bug Fixes</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {secFeatures.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start justify-between gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">🛡️</span>
                          <span>{item.text}</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {item.minPlan === 'all' ? 'All Plans' : item.minPlan}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
