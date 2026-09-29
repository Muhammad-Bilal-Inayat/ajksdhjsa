import React from 'react';
import { 
  ShoppingBag, 
  Layers, 
  FileText, 
  Zap, 
  Users, 
  Printer, 
  HelpCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export interface TopicCategory {
  title: string;
  icon: any;
  description: string;
  badge?: string;
  questions: string[];
}

interface PopularTopicsCardProps {
  onSelectQuestion: (question: string) => void;
  className?: string;
}

export const POPULAR_TOPICS: TopicCategory[] = [
  {
    title: 'POS Billing & Thermal Prints',
    icon: ShoppingBag,
    badge: 'Core POS',
    description: 'Barcode scanning, F2 quick bill, discounts, and 80mm/58mm thermal receipts.',
    questions: [
      'POS Billing me F2 shortcut kaise kaam karta hai?',
      'Thermal printer 80mm format kaise configure karein?',
      'Bill par customer ko discount limit kaise set karein?'
    ]
  },
  {
    title: 'Inventory & Batch Expiry (FEFO)',
    icon: Layers,
    badge: 'FEFO Radar',
    description: 'Batch numbers, FEFO auto-deduction, expiry alerts (30/60/90 days).',
    questions: [
      'Batch Expiry alert (Yellow/Red badge) ka kya matlab hai?',
      'Stock in karte waqt purchase vs retail price kaise dalein?',
      'Surgical items and disposables inventory me kaise add karein?'
    ]
  },
  {
    title: 'Udhaar & Customer Ledgers',
    icon: FileText,
    badge: 'Khata',
    description: 'Credit sales, payment vouchers, WhatsApp ledger statements.',
    questions: [
      'Customer ka udhaar (ledger balance) kaise update karein?',
      'WhatsApp par customer ko account summary kaise bhejein?',
      'Supplier ko payment voucher issue karne ka tareeqa'
    ]
  },
  {
    title: 'Offline Engine & Silent Sync',
    icon: Zap,
    badge: '0-Lag Offline',
    description: 'Continuous billing without internet, automatic silent background sync.',
    questions: [
      'Internet slow ya band hone par billing stop kyun nahi hoti?',
      'Local outbox data internet aane par kaise sync hota hai?',
      'Data loss se bachne ke liye encrypted backup kaise lein?'
    ]
  },
  {
    title: 'Staff PINs & Shift Closing',
    icon: Users,
    badge: 'Shifts',
    description: '4-digit staff PINs, cashier shift closing, cash drawer reconciliation.',
    questions: [
      'Staff members ke liye 4-digit PIN kaise set karein?',
      'Shift closing par daily cash reconciliation kaise check karein?',
      'Cashier ko discount ya delete bill se kaise block karein?'
    ]
  },
  {
    title: 'Shortage Registry & Returns',
    icon: RotateCcw,
    badge: 'Procurement',
    description: 'Demand book registry, supplier returns, fast order booking.',
    questions: [
      'Shortage Registry se direct supplier demand bill kaise banayein?',
      'Supplier return invoice generate karne ka tareeqa kya hai?'
    ]
  }
];

export const PopularTopicsCard: React.FC<PopularTopicsCardProps> = ({
  onSelectQuestion,
  className = ''
}) => {
  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Popular Topics & Guided Solutions</span>
        </h3>
        <span className="text-[11px] font-semibold text-slate-400">Click any prompt to ask</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {POPULAR_TOPICS.map((topic, i) => {
          const IconComp = topic.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm space-y-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700/60 shadow-xs group-hover:scale-105 transition-transform">
                    <IconComp className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {topic.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {topic.description}
                    </p>
                  </div>
                </div>

                {topic.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {topic.badge}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {topic.questions.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => onSelectQuestion(q)}
                    className="w-full text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1.5 px-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group/btn cursor-pointer"
                  >
                    <span className="truncate pr-2">• {q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
