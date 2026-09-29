import React, { useState, useMemo } from 'react';
import { SalePurchaseKpiCards } from './SalePurchaseKpiCards';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Search, Download, FileSpreadsheet, Filter, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface TransactionReportRecord {
  id: string;
  invoiceNumber?: string;
  billNumber?: string;
  orderNumber?: string;
  date: string;
  partyName?: string;
  customerName?: string;
  supplierName?: string;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  status?: string;
  paymentMethod?: string;
}

export interface TransactionReportViewProps {
  title: string;
  reportType?: 'Sale' | 'Purchase' | 'All';
  records: TransactionReportRecord[];
  currencyPrefix?: string;
}

export const TransactionReportView: React.FC<TransactionReportViewProps> = ({
  title,
  reportType = 'Sale',
  records = [],
  currencyPrefix = 'Rs.'
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r => 
      (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q)) ||
      (r.billNumber && r.billNumber.toLowerCase().includes(q)) ||
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
      (r.partyName && r.partyName.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  // Aggregate Totals
  const { totalPaid, totalUnpaid, grandTotal } = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let grand = 0;

    for (const r of filteredRecords) {
      const tot = Number(r.totalAmount) || 0;
      const pd = Number(r.paidAmount) || 0;
      const due = Number(r.balanceDue) || Math.max(0, tot - pd);

      grand += tot;
      paid += pd;
      unpaid += due;
    }

    return { totalPaid: paid, totalUnpaid: unpaid, grandTotal: grand };
  }, [filteredRecords]);

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, idx) => ({
      '#': idx + 1,
      'Bill/Invoice #': r.invoiceNumber || r.billNumber || r.orderNumber || 'N/A',
      'Date': r.date,
      'Party / Customer': r.customerName || r.supplierName || r.partyName || 'Walk-in',
      'Grand Total': r.totalAmount,
      'Paid': r.paidAmount || 0,
      'Balance Due': r.balanceDue || 0,
      'Status': r.status || 'Completed'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30));
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* 3-CARD EQUAL GRID METRIC SUMMARY */}
      <SalePurchaseKpiCards
        paidAmount={totalPaid}
        unpaidAmount={totalUnpaid}
        totalAmount={grandTotal}
        currencyPrefix={currencyPrefix}
        reportType={reportType}
      />

      {/* FILTER & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, party, date..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3">Transaction #</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Party / Customer</th>
              <th className="py-2.5 px-3 text-right">Grand Total</th>
              <th className="py-2.5 px-3 text-right">Paid</th>
              <th className="py-2.5 px-3 text-right">Balance Due</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No transaction records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => (
                <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {r.invoiceNumber || r.billNumber || r.orderNumber || 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{r.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {r.customerName || r.supplierName || r.partyName || 'Walk-in Customer'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    {currencyPrefix} {Number(r.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {currencyPrefix} {Number(r.paidAmount || 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {currencyPrefix} {Number(r.balanceDue || 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      (r.balanceDue || 0) === 0
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : (r.paidAmount || 0) > 0
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                      {(r.balanceDue || 0) === 0 ? 'Paid' : (r.paidAmount || 0) > 0 ? 'Partial' : 'Unpaid'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionReportView;
