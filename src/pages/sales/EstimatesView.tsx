import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Printer, Share2, Edit3, Trash2, FileSpreadsheet, ArrowRight
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
import { v4 as uuidv4 } from 'uuid';

export const EstimatesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
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
  const [isAddEstimateOpen, setIsAddEstimateOpen] = useState(false);
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
      console.error('Failed loading estimates:', err);
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

  const filteredEstimates = useMemo(() => {
    return invoices.filter(inv => {
      const invType = inv.transactionType || 'Sale';
      if (invType !== 'Estimate') return false;

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

  const totalEstimateValue = useMemo(() => {
    return filteredEstimates.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredEstimates]);

  const handleConvertToSale = async (est: Invoice) => {
    try {
      const sales = invoices.filter(i => (i.transactionType || 'Sale') === 'Sale');
      const maxNum = sales.reduce((max, i) => {
        const num = parseInt(i.invoiceNumber.replace(/\D/g, '') || '0');
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextSaleNum = (maxNum + 1).toString();

      const convertedInvoice: Invoice = {
        ...est,
        id: uuidv4(),
        invoiceNumber: nextSaleNum,
        date: new Date().toISOString(),
        transactionType: 'Sale',
        status: est.balanceDue <= 0 ? 'Paid' : 'Unpaid',
        description: `Converted from Estimate #${est.invoiceNumber}. ${est.description || ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbInvoices.save(convertedInvoice);
      await dbInvoices.save({
        ...est,
        status: 'Converted',
        updatedAt: new Date().toISOString()
      });

      await loadAllData();
      showToast(`⚡ Successfully converted Estimate #${est.invoiceNumber} to Sale Invoice #${nextSaleNum}!`);
    } catch (err) {
      console.error('Failed to convert estimate:', err);
    }
  };

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
      const exportData = filteredEstimates.map((inv, idx) => ({
        'Sr #': idx + 1,
        'Date': inv.date.slice(0, 10),
        'Estimate #': inv.invoiceNumber,
        'Customer Name': inv.customerName,
        'Status': inv.status || 'Active',
        'Total Quotation (PKR)': inv.grandTotal,
        'Remarks': inv.description || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estimates Quotations');
      XLSX.writeFile(wb, `Estimates_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  const handleDeleteEstimate = async () => {
    if (!deleteTargetInvoice) return;
    setIsDeleting(true);
    try {
      await dbInvoices.delete(deleteTargetInvoice.id);
      await loadAllData();
      showToast(`Estimate #${deleteTargetInvoice.invoiceNumber} deleted.`);
      setDeleteTargetInvoice(null);
    } catch (err) {
      console.error('Failed to delete estimate:', err);
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
        searchPlaceholder="Search quotation by estimate #, customer..."
        showGraph={showGraph}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onExportExcel={handleExportExcel}
        onPrint={() => window.print()}
        onResetAllFilters={handleResetFilters}
      />

      {/* KPI SUMMARY */}
      <SalePurchaseKpiCards
        paidAmount={0}
        unpaidAmount={totalEstimateValue}
        totalAmount={totalEstimateValue}
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
              <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>ESTIMATE / QUOTATION</span>
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
              {filteredEstimates.length} Records
            </span>
          </div>

          {/* Right: Only Primary Action Button */}
          <button
            onClick={() => {
              setEditingInvoice(null);
              setIsAddEstimateOpen(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Estimate</span>
          </button>
        </div>

        {/* ESTIMATES TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Estimate #</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Quoted Value</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No estimate quotations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEstimates.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono">{inv.date.slice(0, 10)}</td>
                    <td className="p-3 font-bold text-amber-600 dark:text-amber-400">#{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.customerName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'Converted'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {inv.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rs {inv.grandTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{inv.description || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'Converted' && (
                          <button
                            onClick={() => handleConvertToSale(inv)}
                            className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                            title="Convert to Sale Invoice"
                          >
                            <ArrowRight className="w-3 h-3" /> Convert
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPrintInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Print Estimate"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedShareInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Share Estimate"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingInvoice(inv);
                            setIsAddEstimateOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit Estimate"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Estimate"
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
      {isAddEstimateOpen && (
        <AddSaleModal
          isOpen={isAddEstimateOpen}
          onClose={() => {
            setIsAddEstimateOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={loadAllData}
          editInvoice={editingInvoice}
          transactionType="Estimate"
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
          onConfirm={handleDeleteEstimate}
          title={`Delete Estimate #${deleteTargetInvoice.invoiceNumber}`}
          message="Are you sure you want to delete this estimate quotation?"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
