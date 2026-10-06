import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Search, Download, Printer, Filter, Calendar, 
  ArrowDownLeft, ArrowUpRight, DollarSign, Users, Building2, 
  RefreshCw, CheckCircle2, ChevronDown 
} from 'lucide-react';
import { dbSuppliers, dbPartyPayments, dbInvoices } from '../lib/db';
import { Supplier, PartyPayment, Invoice } from '../types';

interface LedgerRow {
  id: string;
  date: string;
  partyName: string;
  partyType: 'Customer' | 'Supplier';
  type: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance?: number;
  notes?: string;
}

export const LedgersStatementsPage: React.FC = () => {
  const [parties, setParties] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [selectedPartyType, setSelectedPartyType] = useState<'all' | 'Customer' | 'Supplier'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allParties = await dbSuppliers.getAll();
      setParties(allParties);

      const allPayments = await dbPartyPayments.getAll();
      setPayments(allPayments);

      const allInvoices = await dbInvoices.getAll();
      setInvoices(allInvoices);
    } catch (e) {
      console.error('Error loading ledger data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute all unified ledger entries
  const allLedgerRows = useMemo(() => {
    const rows: LedgerRow[] = [];

    // 1. Invoices (Debit from Customer sales)
    invoices.forEach(inv => {
      const party = parties.find(p => p.id === inv.partyId || p.name.toLowerCase() === inv.customerName?.toLowerCase());
      const pName = inv.customerName || party?.name || 'Walk-in Customer';
      const pType = (party?.partyType === 'Supplier' || party?.type === 'Supplier') ? 'Supplier' : 'Customer';

      rows.push({
        id: `inv_${inv.id}`,
        date: inv.date || inv.createdAt?.split('T')[0] || 'N/A',
        partyName: pName,
        partyType: pType,
        type: 'Sale Invoice',
        reference: inv.invoiceNumber || inv.id,
        debit: inv.grandTotal || (inv as any).totalAmount || (inv as any).total || 0,
        credit: 0,
        notes: `${inv.items?.length || 0} items`
      });
    });

    // 2. Party Payments (Strictly manual vouchers: Cash In = Credit, Payment Out = Debit)
    payments.forEach(pay => {
      const isAuto = pay.isAuto || 
        (pay.notes || '').toLowerCase().includes('auto payment') || 
        (pay.receiptNumber || '').startsWith('REC-INV-') ||
        ((pay.referenceNumber || '').toUpperCase().startsWith('INV-') && !(pay.notes && !pay.notes.toLowerCase().includes('sale')));
      if (isAuto) return;

      const party = parties.find(p => p.id === pay.partyId);
      const pName = pay.partyName || party?.name || 'Party';
      const pType = (party?.partyType === 'Supplier' || party?.type === 'Supplier') ? 'Supplier' : 'Customer';

      const isCashIn = pay.type === 'PAYMENT_IN';

      rows.push({
        id: `pay_${pay.id}`,
        date: pay.date || pay.createdAt?.split('T')[0] || 'N/A',
        partyName: pName,
        partyType: pType,
        type: isCashIn ? 'Cash In (Payment Received)' : 'Payment Out (Settled)',
        reference: pay.referenceNumber || pay.receiptNumber || pay.id,
        debit: isCashIn ? 0 : pay.amount,
        credit: isCashIn ? pay.amount : 0,
        notes: `${pay.paymentMode || 'Cash'}${pay.notes ? ` - ${pay.notes}` : ''}`
      });
    });

    // Sort chronologically ascending to compute running balances
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    rows.forEach(r => {
      running += (r.debit - r.credit);
      r.runningBalance = running;
    });

    // Sort descending for display
    return rows.reverse();
  }, [invoices, payments, parties]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return allLedgerRows.filter(row => {
      // Party filter
      if (selectedPartyId !== 'all') {
        const party = parties.find(p => p.id === selectedPartyId);
        if (party && row.partyName.toLowerCase() !== party.name.toLowerCase()) {
          return false;
        }
      }

      // Party Type filter
      if (selectedPartyType !== 'all' && row.partyType !== selectedPartyType) {
        return false;
      }

      // Date range filter
      if (dateRange === 'today') {
        if (!row.date.startsWith(todayStr)) return false;
      } else if (dateRange === 'week') {
        if (new Date(row.date) < sevenDaysAgo) return false;
      } else if (dateRange === 'month') {
        if (new Date(row.date) < thirtyDaysAgo) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return row.partyName.toLowerCase().includes(term) ||
               row.reference.toLowerCase().includes(term) ||
               (row.notes || '').toLowerCase().includes(term);
      }

      return true;
    });
  }, [allLedgerRows, selectedPartyId, selectedPartyType, dateRange, searchTerm, parties]);

  // Aggregate stats
  const totalDebit = useMemo(() => filteredRows.reduce((sum, r) => sum + r.debit, 0), [filteredRows]);
  const totalCredit = useMemo(() => filteredRows.reduce((sum, r) => sum + r.credit, 0), [filteredRows]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                All Ledgers &amp; Double-Entry Statements
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consolidated debit/credit registers with chronological running balances
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Debits</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
            PKR {totalDebit.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Invoices &amp; supplier settlements</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Credits</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            PKR {totalCredit.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Customer cash recoveries</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Outstanding Balance</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
            PKR {(totalDebit - totalCredit).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Cumulative running delta</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Party Selector */}
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all">All Parties &amp; Customers</option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.partyType || p.type || 'Party'})</option>
            ))}
          </select>

          {/* Party Type Filter */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedPartyType('all')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedPartyType === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setSelectedPartyType('Customer')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedPartyType === 'Customer' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Customers
            </button>
            <button
              type="button"
              onClick={() => setSelectedPartyType('Supplier')}
              className={`px-2.5 py-1 rounded-lg transition ${selectedPartyType === 'Supplier' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Suppliers
            </button>
          </div>

          {/* Date Range Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDateRange('today')}
              className={`px-2.5 py-1 rounded-lg transition ${dateRange === 'today' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateRange('week')}
              className={`px-2.5 py-1 rounded-lg transition ${dateRange === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange('month')}
              className={`px-2.5 py-1 rounded-lg transition ${dateRange === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className={`px-2.5 py-1 rounded-lg transition ${dateRange === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reference or party..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3">Date</th>
                <th className="p-3">Party Name</th>
                <th className="p-3">Type / Reference</th>
                <th className="p-3 text-right text-blue-600 dark:text-blue-400">Debit (+)</th>
                <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Credit (-)</th>
                <th className="p-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading double-entry ledger records...</span>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No ledger transactions found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Transactions and payments will automatically appear in this ledger.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-mono">
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{row.date}</td>
                    
                    <td className="p-3 font-bold text-slate-900 dark:text-white font-sans">
                      <span className="flex items-center gap-1.5">
                        {row.partyType === 'Customer' ? (
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        )}
                        <span>{row.partyName}</span>
                      </span>
                    </td>

                    <td className="p-3 text-slate-600 dark:text-slate-300 font-sans">
                      <span className="font-semibold block">{row.type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Ref: {row.reference}</span>
                    </td>

                    <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {row.debit > 0 ? `PKR ${row.debit.toLocaleString()}` : '-'}
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {row.credit > 0 ? `PKR ${row.credit.toLocaleString()}` : '-'}
                    </td>

                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      PKR {(row.runningBalance || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default LedgersStatementsPage;
