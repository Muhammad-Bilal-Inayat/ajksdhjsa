import React from 'react';
import { 
  Zap, Clock, WifiOff, Users, PieChart, ShieldCheck, 
  ArrowUpRight, CheckCircle2 
} from 'lucide-react';

export interface FeatureCardItem {
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  metrics: string;
  iconBg: string;
  accentBorder: string;
}

export const FEATURE_ITEMS: FeatureCardItem[] = [
  {
    icon: <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
    badge: '0.2s POS Engine',
    title: 'Ultra-Fast POS Billing',
    description: 'Lightning speed F1-F12 keyboard shortcuts, instant barcode scanning, loose tablet conversion, and ESC/POS thermal printing.',
    metrics: '< 200ms Billing Cycle',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60',
    accentBorder: 'hover:border-blue-500/50'
  },
  {
    icon: <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    badge: 'Smart Batch Rotation',
    title: '30/60/90 Days FEFO Expiry Radar',
    description: 'First-Expiry-First-Out automated batch dispensing ensures aging medicine moves first. Auto-generate distributor credit debit notes.',
    metrics: 'Zero Medicine Expiry Losses',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60',
    accentBorder: 'hover:border-amber-500/50'
  },
  {
    icon: <WifiOff className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
    badge: '100% Offline Standalone',
    title: 'Offline-First Desktop PWA',
    description: 'Zero reliance on continuous internet. Local IndexedDB database caches all catalog records and auto-syncs when online.',
    metrics: '100% Uptime Guaranteed',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    accentBorder: 'hover:border-emerald-500/50'
  },
  {
    icon: <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
    badge: 'Khata & WhatsApp CRM',
    title: 'Customer & Supplier Ledgers',
    description: 'Complete balance ledgers with 1-click WhatsApp payment reminders. Inward purchase bills, bonus discounts, and payment receipts.',
    metrics: 'Instant PDF Invoicing',
    iconBg: 'bg-purple-50 dark:bg-purple-950/60',
    accentBorder: 'hover:border-purple-500/50'
  },
  {
    icon: <PieChart className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />,
    badge: 'Profit Intelligence',
    title: 'Real-Time Gross Margin & P&L',
    description: 'Live item-level profit margins and cashier below-cost sale lock guards. Dual confirmation safeguards your revenue.',
    metrics: 'Loss-Prevention Guard',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/60',
    accentBorder: 'hover:border-cyan-500/50'
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
    badge: 'Anti-Theft & RBAC',
    title: 'Audit Trail & 173 Permission Switches',
    description: 'Track every edited invoice, cancelled line item, and cashier drawer shift handover with military-grade immutable logs.',
    metrics: 'Granular Role Access',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60',
    accentBorder: 'hover:border-rose-500/50'
  }
];

export const AnimatedFeatureCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {FEATURE_ITEMS.map((feat, index) => (
        <div
          key={index}
          className={`p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${feat.accentBorder} group backdrop-blur-md flex flex-col justify-between`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl ${feat.iconBg} flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110 shadow-xs`}>
                {feat.icon}
              </div>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {feat.badge}
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {feat.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed mt-2">
                {feat.description}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {feat.metrics}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnimatedFeatureCards;
