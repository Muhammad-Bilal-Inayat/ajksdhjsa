import React from 'react';
import { 
  Users, MessageSquare, AlertCircle, ArrowUpRight, 
  Send, Clock, CheckCircle2, ChevronRight, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AgingBucket {
  range: string;
  amount: number;
  count: number;
  badgeColor: string;
}

interface OverdueCustomer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  daysOverdue: number;
  lastPayment: string;
}

const SAMPLE_BUCKETS: AgingBucket[] = [
  { range: '0-30 Days', amount: 48500, count: 18, badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  { range: '31-60 Days', amount: 26200, count: 8, badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  { range: '61-90 Days', amount: 14800, count: 4, badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' },
  { range: '90+ Days', amount: 8900, count: 3, badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
];

const TOP_OVERDUE_CUSTOMERS: OverdueCustomer[] = [
  {
    id: 'c-1',
    name: 'Malik Zafar Iqbal (Civil Lines)',
    phone: '+923001234567',
    balance: 14500,
    daysOverdue: 68,
    lastPayment: '12 Aug 2026'
  },
  {
    id: 'c-2',
    name: 'Dr. Tariq Hospital Ward Staff',
    phone: '+923219876543',
    balance: 9800,
    daysOverdue: 42,
    lastPayment: '28 Aug 2026'
  },
  {
    id: 'c-3',
    name: 'Haji Aslam Clinic Khata',
    phone: '+923334567890',
    balance: 7200,
    daysOverdue: 94,
    lastPayment: '02 Jul 2026'
  }
];

interface CustomerUdharAgingWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const CustomerUdharAgingWidget: React.FC<CustomerUdharAgingWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();

  const totalOutstanding = SAMPLE_BUCKETS.reduce((sum, b) => sum + b.amount, 0);

  const handleSendWhatsApp = (c: OverdueCustomer) => {
    const text = encodeURIComponent(
      `Salam ${c.name}, this is a gentle reminder regarding your pending balance of Rs. ${c.balance.toLocaleString()} at MBI Inventra Pharmacy. Kindly clear at your earliest convenience. Thank you!`
    );
    window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Customer Udhar Aging</span>
                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Khata Radar
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Credit recovery buckets & automated WhatsApp ledger reminders
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/parties')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>All Khatas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aging Buckets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
          {SAMPLE_BUCKETS.map((b) => (
            <div 
              key={b.range}
              className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{b.range}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${b.badgeColor}`}>
                  {b.count}
                </span>
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                {maskValue(b.amount.toLocaleString())}
              </span>
            </div>
          ))}
        </div>

        {/* Priority Overdue List */}
        <div className="space-y-2 mt-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Priority Collection Reminders
          </span>
          {TOP_OVERDUE_CUSTOMERS.map((c) => (
            <div 
              key={c.id}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 hover:border-purple-200 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {c.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{maskValue(c.balance.toLocaleString())}</span>
                  <span>•</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{c.daysOverdue} days overdue</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(c)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                title="Send WhatsApp Khata Reminder"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-medium">Total Credit Outstanding:</span>
        <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
          {maskValue(totalOutstanding.toLocaleString())}
        </span>
      </div>
    </div>
  );
};

export default CustomerUdharAgingWidget;
