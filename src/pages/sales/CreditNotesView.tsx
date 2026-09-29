import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Printer, Share2, Edit3, Trash2, RotateCcw
} from 'lucide-react';
import { dbInvoices, dbMedicines, dbSuppliers } from '../../lib/db';
import { Invoice, Medicine, Party } from '../../types';
import { SalesFilterHeader, DateRangeState } from '../../components/sales/SalesFilterHeader';
import { AddSaleModal } from '../../components/sales/AddSaleModal';
import { InvoicePrintModal } from '../../components/sales/InvoicePrintModal';
import { InvoiceShareModal } from '../../components/sales/InvoiceShareModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { SalePurchaseKpiCards } from '../../components/reports/SalePurchaseKpiCards';
import * as XLSX from 'xlsx';

export const CreditNotesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [dateRange, setDateRange] = useState<DateRangeState>({
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    preset: 'This Month'
  });
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [showGraph, setShowGraph] = useState(false);

  // Modals
  const [isAddReturnOpen, setIsAddReturnOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedPrintInvoice, setSelectedPrintInvoice] = useState<Invoice | null>(null);
  const [selectedShareInvoice, setSelectedShareInvoice] = useState<Invoice | null>(null);
  const [deleteTargetInvoice, setDeleteTargetInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [invData, partyData, medData] = await Promise.all([
        dbInvoices.getAll(),
        dbSuppliers.getAll(),
        dbMedicines.getAll()
      ]);
      setInvoices(invData || []);
      setParties(partyData || []);
      setMedicines(medData || []);
    } catch (err) {
      console.error('Failed loading credit notes:', err);
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

  const filteredReturns = useMemo(() => {
    return invoices.filter(inv => {
      const invType = inv.transactionType || 'Sale';
      if (invType !== 'Sale Return') return false;

      const invDate = inv.date.slice(0, 10);
      if (dateRange.startDate && invDate < dateRange.startDate) return false;
      if (dateRange.endDate && invDate > dateRange.endDate) return false;

      if (selectedParty !== 'ALL') {
        const pMatch = inv.customerName === selectedParty || inv.partyId === selectedParty;
        if (!pMatch) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
        const matchName = inv.customerName.toLowerCase().includes(q);
        const matchAmt = inv.grandTotal.toString().includes(q);
        if (!matchNo && !matchName && !matchAmt) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, dateRange, selectedParty, searchQuery]);

  const totalRefundAmount = useMemo(() => {
    return filteredReturns.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredReturns]);

  const handleResetFilters = () => {
    setDateRange({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      preset: 'This Month'
    });
    setSelectedParty('ALL');
    setSearchQuery('');
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredReturns.map((inv, idx) => ({
        'Sr #': idx + 1,
        'Date': inv.date.slice(0, 10),
        'Credit Note #': inv.invoiceNumber,
        'Customer Name': inv.customerName,
        'Items Returned': inv.items.length,
        'Refund Total (PKR)': inv.grandTotal,
        'Remarks': inv.description || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sale Returns');
      XLSX.writeFile(wb, `Credit_Notes_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  const handleDeleteReturn = async () => {
    if (!deleteTargetInvoice) return;
    setIsDeleting(true);
    try {
      await dbInvoices.delete(deleteTargetInvoice.id);
      await loadAllData();
      showToast(`Credit Note #${deleteTargetInvoice.invoiceNumber} deleted.`);
      setDeleteTargetInvoice(null);
    } catch (err) {
      console.error('Failed to delete return:', err);
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
        searchPlaceholder="Search sale returns by credit note #, customer..."
        showGraph={showGraph}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onExportExcel={handleExportExcel}
        onPrint={() => window.print()}
        onResetAllFilters={handleResetFilters}
      />

      {/* KPI SUMMARY */}
      <SalePurchaseKpiCards
        paidAmount={totalRefundAmount}
        unpaidAmount={0}
        totalAmount={totalRefundAmount}
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
              <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>SALE RETURN / CR. NOTE</span>
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
              {filteredReturns.length} Records
            </span>
          </div>

          {/* Right: Only Primary Action Button */}
          <button
            onClick={() => {
              setEditingInvoice(null);
              setIsAddReturnOpen(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Sale Return</span>
          </button>
        </div>

        {/* CREDIT NOTES TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Cr. Note #</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Items Returned</th>
                <th className="p-3 text-right">Refund Total</th>
                <th className="p-3">Reason / Remarks</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No sale return records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono">{inv.date.slice(0, 10)}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">#{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.customerName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {inv.items.length} items
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      Rs {inv.grandTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{inv.description || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPrintInvoice(inv);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Print Return Note"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedShareInvoice(inv);
                          }}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Share Return Note"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingInvoice(inv);
                            setIsAddReturnOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit Return"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Return"
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
      {isAddReturnOpen && (
        <AddSaleModal
          isOpen={isAddReturnOpen}
          onClose={() => {
            setIsAddReturnOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={loadAllData}
          editInvoice={editingInvoice}
          transactionType="Sale Return"
        />
      )}

      {selectedPrintInvoice && (
        <InvoicePrintModal
          isOpen={Boolean(selectedPrintInvoice)}
          onClose={() => setSelectedPrintInvoice(null)}
          invoice={selectedPrintInvoice}
        />
      )}

      {selectedShareInvoice && (
        <InvoiceShareModal
          isOpen={Boolean(selectedShareInvoice)}
          onClose={() => setSelectedShareInvoice(null)}
          invoice={selectedShareInvoice}
        />
      )}

      {deleteTargetInvoice && (
        <ConfirmDeleteModal
          isOpen={Boolean(deleteTargetInvoice)}
          onClose={() => setDeleteTargetInvoice(null)}
          onConfirm={handleDeleteReturn}
          title={`Delete Credit Note #${deleteTargetInvoice.invoiceNumber}`}
          message="Are you sure you want to delete this sale return / credit note?"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
