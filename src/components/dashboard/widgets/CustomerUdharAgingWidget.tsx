import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, MessageSquare, AlertCircle, ArrowUpRight, 
  Send, Clock, CheckCircle2, ChevronRight, Phone, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { dbSuppliers, dbInvoices } from '../../../lib/db';
import { Party, Invoice } from '../../../types';

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
  lastPayment?: string;
}

interface CustomerUdharAgingWidgetProps {
  maskValue?: (val: number | string) => string;
}

export const CustomerUdharAgingWidget: React.FC<CustomerUdharAgingWidgetProps> = ({ maskValue = (v) => `Rs ${v}` }) => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [allParties, allInvoices] = await Promise.all([
        dbSuppliers.getAll(),
        dbInvoices.getAll()
      ]);
      setParties(allParties || []);
      setInvoices(allInvoices || []);
    } catch (e) {
      console.warn('Failed to load customer udhar data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDataChange = () => {
      loadData();
    };

    window.addEventListener('mbi-local-db-change', handleDataChange);
    window.addEventListener('mbi-sync-trigger', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
      window.removeEventListener('mbi-local-db-change', handleDataChange);
      window.removeEventListener('mbi-sync-trigger', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [tenantId]);

  // Compute live overdue customers and aging buckets
  const { overdueCustomers, agingBuckets, totalOutstanding } = useMemo(() => {
    const now = Date.now();
    
    // Filter customer parties with positive credit balance (receivables)
    const customerList = parties.filter(p => {
      const isCustomer = p.type === 'Customer' || (!p.type && (p as any).isCustomer !== false);
      const bal = Number(p.balance || (p as any).currentBalance || (p as any).openingBalance || 0);
      return isCustomer && bal > 0;
    });

    const overdueList: OverdueCustomer[] = [];
    let b0_30 = { range: '0-30 Days', amount: 0, count: 0, badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' };
    let b31_60 = { range: '31-60 Days', amount: 26200, count: 0, badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
    let b61_90 = { range: '61-90 Days', amount: 0, count: 0, badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' };
    let b90_plus = { range: '90+ Days', amount: 0, count: 0, badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' };
    b31_60.amount = 0; // zero base

    let totalBal = 0;

    customerList.forEach(cust => {
      const bal = Number(cust.balance || (cust as any).currentBalance || (cust as any).openingBalance || 0);
      totalBal += bal;

      // Find oldest pending invoice or fallback to createdAt
      const custInvoices = invoices.filter(inv => 
        (inv.partyId === cust.id || (inv.customerName && inv.customerName.toLowerCase() === cust.name.toLowerCase())) &&
        Number(inv.balanceDue || 0) > 0
      );

      let oldestDate = cust.createdAt ? new Date(cust.createdAt).getTime() : now;
      if (custInvoices.length > 0) {
        custInvoices.forEach(inv => {
          const invTime = new Date(inv.date || inv.createdAt || now).getTime();
          if (invTime < oldestDate) oldestDate = invTime;
        });
      }

      const diffDays = Math.max(1, Math.floor((now - oldestDate) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 30) {
        b0_30.amount += bal;
        b0_30.count += 1;
      } else if (diffDays <= 60) {
        b31_60.amount += bal;
        b31_60.count += 1;
      } else if (diffDays <= 90) {
        b61_90.amount += bal;
        b61_90.count += 1;
      } else {
        b90_plus.amount += bal;
        b90_plus.count += 1;
      }

      overdueList.push({
        id: cust.id,
        name: cust.name,
        phone: cust.phone || '',
        balance: bal,
        daysOverdue: diffDays,
        lastPayment: (cust as any).lastPaymentDate || undefined
      });
    });

    // Sort by largest balance first
    overdueList.sort((a, b) => b.balance - a.balance);

    return {
      overdueCustomers: overdueList.slice(0, 5),
      agingBuckets: [b0_30, b31_60, b61_90, b90_plus],
      totalOutstanding: totalBal
    };
  }, [parties, invoices]);

  const handleSendWhatsApp = (c: OverdueCustomer) => {
    const phone = c.phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Salam ${c.name}, this is a friendly update regarding your outstanding pharmacy Khata balance of Rs. ${c.balance.toLocaleString()}. Kindly arrange clearance at your earliest convenience. Thank you!`
    );
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('0') ? '92' + phone.slice(1) : phone}?text=${text}`, '_blank');
    } else {
      alert(`No valid phone number saved for ${c.name}. Please edit party in Parties Management.`);
    }
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
                Live customer credit aging &amp; 1-click WhatsApp ledger recovery
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
          {agingBuckets.map((b) => (
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

        {/* Priority Overdue List or Clean Zero State */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Priority Collection Reminders
            </span>
            {overdueCustomers.length > 0 && (
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                {overdueCustomers.length} active receivables
              </span>
            )}
          </div>

          {overdueCustomers.length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5 bg-slate-50/50 dark:bg-slate-800/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Zero Outstanding Customer Udhar
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No pending collections or overdue customer balances recorded. All customer accounts are 100% clear.
              </p>
            </div>
          ) : (
            overdueCustomers.map((c) => (
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
            ))
          )}
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
