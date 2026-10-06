import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Printer, Trash2, DollarSign, Calendar, Users
} from 'lucide-react';
import { dbPartyPayments, dbSuppliers } from '../../lib/db';
import { PartyPayment, Party } from '../../types';
import { SalesFilterHeader, DateRangeState } from '../../components/sales/SalesFilterHeader';
import { AddPaymentInModal } from '../../components/sales/AddPaymentInModal';
import { PaymentVoucherPrintModal } from '../../components/common/PaymentVoucherPrintModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { SalePurchaseKpiCards } from '../../components/reports/SalePurchaseKpiCards';
import * as XLSX from 'xlsx';

export const PaymentInView: React.FC = () => {
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return {
      startDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
      endDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(lastDay)}`,
      preset: 'This Month'
    };
  });
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [showGraph, setShowGraph] = useState(false);

  // Modals
  const [isAddPaymentInOpen, setIsAddPaymentInOpen] = useState(false);
  const [selectedVoucherPayment, setSelectedVoucherPayment] = useState<PartyPayment | null>(null);
  const [deleteTargetPayment, setDeleteTargetPayment] = useState<PartyPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [payData, partyData] = await Promise.all([
        dbPartyPayments.getAll(),
        dbSuppliers.getAll()
      ]);
      setPayments(payData || []);
      setParties(partyData || []);
    } catch (err) {
      console.error('Failed loading payment in:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const partyOptions = useMemo(() => {
    return parties.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      type: p.type
    }));
  }, [parties]);

  const isManualPayment = (p: PartyPayment) => {
    if (p.isAuto) return false;
    const notes = (p.notes || '').toLowerCase();
    if (notes.includes('auto payment-in') || notes.includes('auto payment in') || notes.includes('auto payment')) {
      return false;
    }
    const receipt = p.receiptNumber || '';
    if (receipt.startsWith('REC-INV-')) return false;
    const ref = (p.referenceNumber || '').toUpperCase();
    if (ref.startsWith('INV-') && (notes.includes('invoice') || notes.includes('sale') || notes.includes('pos') || !notes)) {
      return false;
    }
    return true;
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.type && p.type !== 'PAYMENT_IN') return false;
      if (!isManualPayment(p)) return false;

      const pDate = p.date.slice(0, 10);
      if (dateRange.startDate && pDate < dateRange.startDate) return false;
      if (dateRange.endDate && pDate > dateRange.endDate) return false;

      if (selectedParty !== 'ALL') {
        if (p.partyName !== selectedParty && p.partyId !== selectedParty) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.partyName.toLowerCase().includes(q);
        const matchRef = p.referenceNumber?.toLowerCase().includes(q) || false;
        const matchMode = p.paymentMode?.toLowerCase().includes(q) || false;
        const matchAmt = p.amount.toString().includes(q);
        if (!matchName && !matchRef && !matchMode && !matchAmt) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, dateRange, selectedParty, searchQuery]);

  const totalReceived = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPayments]);

  const handleResetFilters = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    setDateRange({
      startDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
      endDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(lastDay)}`,
      preset: 'This Month'
    });
    setSelectedParty('ALL');
    setSearchQuery('');
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredPayments.map((p, idx) => ({
        'Sr #': idx + 1,
        'Date': p.date.slice(0, 10),
        'Party Name': p.partyName,
        'Payment Mode': p.paymentMode || 'Cash',
        'Amount Received (PKR)': p.amount,
        'Reference #': p.referenceNumber || '',
        'Remarks / Notes': p.notes || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payment In Records');
      XLSX.writeFile(wb, `Payment_In_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteTargetPayment) return;
    setIsDeleting(true);
    try {
      if (deleteTargetPayment.partyId) {
        const party = parties.find(p => p.id === deleteTargetPayment.partyId);
        if (party) {
          const currentBal = party.balance ?? party.openingBalance ?? 0;
          await dbSuppliers.save({
            ...party,
            balance: currentBal + deleteTargetPayment.amount,
            updatedAt: new Date().toISOString()
          } as any);
        }
      }
      await dbPartyPayments.delete(deleteTargetPayment.id);
      await loadAllData();
      showToast('Payment In record deleted successfully.');
      setDeleteTargetPayment(null);
    } catch (err) {
      console.error('Failed to delete payment:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* FILTER BAR HEADER (Non-overlapping Flex Layout) */}
      <SalesFilterHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedParty={selectedParty}
        partyOptions={partyOptions}
        onPartyChange={setSelectedParty}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search payment by receipt #, party name..."
        showGraph={showGraph}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onExportExcel={handleExportExcel}
        onPrint={() => window.print()}
        onResetAllFilters={handleResetFilters}
      />

      {/* KPI SUMMARY */}
      <SalePurchaseKpiCards
        paidAmount={totalReceived}
        unpaidAmount={0}
        totalAmount={totalReceived}
        currencyPrefix="Rs."
        reportType="All"
      />

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {/* CLEAN TABLE HEADER: NO DUPLICATE SEARCH BAR */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {/* Left: Title & Record Counter Badge */}
          <div className="flex items-center gap-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>PAYMENT IN (وصولی)</span>
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
              {filteredPayments.length} Records
            </span>
          </div>

          {/* Right: Only Primary Action Button */}
          <button
            onClick={() => setIsAddPaymentInOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Payment In</span>
          </button>
        </div>

        {/* PAYMENTS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Receipt / Ref #</th>
                <th className="p-3">Party Name</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Amount Received</th>
                <th className="p-3">Notes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No payment in records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono">{p.date.slice(0, 10)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {p.referenceNumber || 'RCT-' + p.id.slice(0, 6).toUpperCase()}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.partyName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {p.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rs {p.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{p.notes || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedVoucherPayment(p)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetPayment(p)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {isAddPaymentInOpen && (
        <AddPaymentInModal
          isOpen={isAddPaymentInOpen}
          onClose={() => setIsAddPaymentInOpen(false)}
          onSuccess={loadAllData}
        />
      )}

      {selectedVoucherPayment && (
        <PaymentVoucherPrintModal
          isOpen={Boolean(selectedVoucherPayment)}
          onClose={() => setSelectedVoucherPayment(null)}
          payment={selectedVoucherPayment}
        />
      )}

      {deleteTargetPayment && (
        <ConfirmDeleteModal
          isOpen={Boolean(deleteTargetPayment)}
          onClose={() => setDeleteTargetPayment(null)}
          onConfirm={handleDeletePayment}
          title="Delete Payment In Record"
          message={`Are you sure you want to delete payment of Rs ${deleteTargetPayment.amount.toLocaleString()} for ${deleteTargetPayment.partyName}?`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
