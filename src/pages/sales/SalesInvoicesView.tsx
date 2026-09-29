import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Printer, Share2, MoreVertical, Edit3, Trash2, Eye,
  Sparkles, RotateCcw, Copy, DollarSign, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileText
} from 'lucide-react';
import { dbInvoices, dbMedicines, dbSuppliers } from '../../lib/db';
import { Invoice, Medicine, Party } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { SalesFilterHeader, DatePreset, DateRangeState } from '../../components/sales/SalesFilterHeader';
import { AddSaleModal } from '../../components/sales/AddSaleModal';
import { InvoicePrintModal } from '../../components/sales/InvoicePrintModal';
import { InvoiceShareModal } from '../../components/sales/InvoiceShareModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { SpecialControlledSaleModal } from '../../components/sales/SpecialControlledSaleModal';
import { ColumnHeader } from '../../components/common/ColumnHeader';
import { SalePurchaseKpiCards } from '../../components/reports/SalePurchaseKpiCards';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export const SalesInvoicesView: React.FC = () => {
  const { canEditBills, canDeleteBills, canReprintBills } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [dateRange, setDateRange] = useState<DateRangeState>({
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    preset: 'This Month'
  });
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showGraph, setShowGraph] = useState(false);

  // Column Filters & Sorting
  const [colFilters, setColFilters] = useState<Record<string, string>>({
    party: 'ALL',
    status: 'ALL',
    paymentType: 'ALL'
  });
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'All'>(25);

  // Modals
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintInvoice, setSelectedPrintInvoice] = useState<Invoice | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareInvoice, setSelectedShareInvoice] = useState<Invoice | null>(null);
  const [deleteTargetInvoice, setDeleteTargetInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isControlledSaleOpen, setIsControlledSaleOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
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
      console.error('Failed loading sales invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const medicineCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of medicines) {
      if (m.category) {
        if (m.id) map.set(m.id, m.category);
        if (m.name) map.set(m.name.toLowerCase().trim(), m.category);
      }
    }
    return map;
  }, [medicines]);

  const partyOptions = useMemo(() => {
    return parties.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      type: p.type
    }));
  }, [parties]);

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach(m => {
      if (m.category && m.category.trim()) cats.add(m.category.trim());
    });
    return Array.from(cats).sort();
  }, [medicines]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invType = inv.transactionType || 'Sale';
      if (invType !== 'Sale') return false;

      const invDate = inv.date.slice(0, 10);
      if (dateRange.startDate && invDate < dateRange.startDate) return false;
      if (dateRange.endDate && invDate > dateRange.endDate) return false;

      const effectiveParty = colFilters.party !== 'ALL' ? colFilters.party : selectedParty;
      if (effectiveParty !== 'ALL') {
        const pMatch = inv.customerName === effectiveParty || inv.partyId === effectiveParty;
        if (!pMatch) return false;
      }

      if (selectedCategory !== 'ALL') {
        const hasCategory = inv.items?.some(it => {
          const cat = (it.medicineId && medicineCategoryMap.get(it.medicineId)) || 
                      (it.name && medicineCategoryMap.get(it.name.toLowerCase().trim()));
          return cat === selectedCategory;
        });
        if (!hasCategory) return false;
      }

      const effectiveStatus = colFilters.status !== 'ALL' ? colFilters.status : statusFilter;
      if (effectiveStatus !== 'ALL') {
        if (effectiveStatus === 'Unpaid' && (inv.balanceDue || 0) <= 0) return false;
        if (effectiveStatus === 'Paid' && (inv.balanceDue || 0) > 0) return false;
        if (effectiveStatus === 'Pending' && inv.status !== 'Pending') return false;
      }

      if (colFilters.paymentType !== 'ALL') {
        const pType = (inv.paymentType || 'Cash').toLowerCase();
        if (!pType.includes(colFilters.paymentType.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
        const matchName = inv.customerName.toLowerCase().includes(q);
        const matchPhone = inv.customerPhone?.toLowerCase().includes(q) || false;
        const matchAmt = inv.grandTotal.toString().includes(q);
        if (!matchNo && !matchName && !matchPhone && !matchAmt) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
        return sortOrder === 'asc' ? -diff : diff;
      }
      if (sortField === 'grandTotal') {
        return sortOrder === 'asc' ? a.grandTotal - b.grandTotal : b.grandTotal - a.grandTotal;
      }
      if (sortField === 'balanceDue') {
        return sortOrder === 'asc' ? a.balanceDue - b.balanceDue : b.balanceDue - a.balanceDue;
      }
      return 0;
    });
  }, [invoices, dateRange, selectedParty, selectedCategory, statusFilter, colFilters, searchQuery, sortField, sortOrder, medicineCategoryMap]);

  const kpiData = useMemo(() => {
    let totalAmt = 0;
    let paidAmt = 0;
    let unpaidAmt = 0;
    filteredInvoices.forEach(inv => {
      totalAmt += inv.grandTotal || 0;
      paidAmt += inv.receivedAmount || 0;
      unpaidAmt += inv.balanceDue || 0;
    });
    return { totalAmt, paidAmt, unpaidAmt };
  }, [filteredInvoices]);

  const handleResetFilters = () => {
    setDateRange({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      preset: 'This Month'
    });
    setSelectedParty('ALL');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setColFilters({ party: 'ALL', status: 'ALL', paymentType: 'ALL' });
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredInvoices.map((inv, idx) => ({
        'Sr #': idx + 1,
        'Date': inv.date.slice(0, 10),
        'Invoice #': inv.invoiceNumber,
        'Customer Name': inv.customerName,
        'Payment Type': inv.paymentType || 'Cash',
        'Items Count': inv.items.length,
        'Total Amount (PKR)': inv.grandTotal,
        'Paid Amount (PKR)': inv.receivedAmount || 0,
        'Balance Due (PKR)': inv.balanceDue,
        'Remarks': inv.description || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoices');
      XLSX.writeFile(wb, `Sales_Invoices_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTargetInvoice) return;
    setIsDeleting(true);
    try {
      await dbInvoices.delete(deleteTargetInvoice.id);
      await loadAllData();
      showToast(`Invoice #${deleteTargetInvoice.invoiceNumber} deleted.`);
      setDeleteTargetInvoice(null);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
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
        selectedCategory={selectedCategory}
        categoryOptions={categoryOptions}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by invoice, party, doc #..."
        showGraph={showGraph}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onExportExcel={handleExportExcel}
        onPrint={() => window.print()}
        onResetAllFilters={handleResetFilters}
      />

      {/* 3-CARD EQUAL KPI SUMMARY */}
      <SalePurchaseKpiCards
        paidAmount={kpiData.paidAmt}
        unpaidAmount={kpiData.unpaidAmt}
        totalAmount={kpiData.totalAmt}
        currencyPrefix="Rs."
        reportType="Sale"
      />

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {/* CLEAN TABLE HEADER: NO DUPLICATE SEARCH BAR */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {/* Left: Title & Record Counter Badge */}
          <div className="flex items-center gap-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>SALE INVOICES</span>
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
              {filteredInvoices.length} Records
            </span>
          </div>

          {/* Right: Only Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsControlledSaleOpen(true)}
              className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Controlled</span>
            </button>

            <button
              onClick={() => {
                setEditingInvoice(null);
                setIsAddSaleOpen(true);
              }}
              className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Sale</span>
            </button>
          </div>
        </div>

        {/* INVOICES TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Payment Type</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Balance Due</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No sale invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono">{inv.date.slice(0, 10)}</td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">#{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.customerName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {inv.paymentType || 'Cash'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rs {inv.grandTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      Rs {inv.balanceDue.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.balanceDue <= 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {inv.balanceDue <= 0 ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPrintInvoice(inv);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedShareInvoice(inv);
                            setIsShareModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Share Invoice"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingInvoice(inv);
                            setIsAddSaleOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit Invoice"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Invoice"
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
      {isAddSaleOpen && (
        <AddSaleModal
          isOpen={isAddSaleOpen}
          onClose={() => {
            setIsAddSaleOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={loadAllData}
          editInvoice={editingInvoice}
          transactionType="Sale"
        />
      )}

      {isPrintModalOpen && selectedPrintInvoice && (
        <InvoicePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedPrintInvoice(null);
          }}
          invoice={selectedPrintInvoice}
        />
      )}

      {isShareModalOpen && selectedShareInvoice && (
        <InvoiceShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedShareInvoice(null);
          }}
          invoice={selectedShareInvoice}
        />
      )}

      {deleteTargetInvoice && (
        <ConfirmDeleteModal
          isOpen={Boolean(deleteTargetInvoice)}
          onClose={() => setDeleteTargetInvoice(null)}
          onConfirm={handleDeleteInvoice}
          title={`Delete Invoice #${deleteTargetInvoice.invoiceNumber}`}
          message="Are you sure you want to delete this sales invoice? This action will restore product quantities to stock."
          isDeleting={isDeleting}
        />
      )}

      {isControlledSaleOpen && (
        <SpecialControlledSaleModal
          isOpen={isControlledSaleOpen}
          onClose={() => setIsControlledSaleOpen(false)}
          onSuccess={loadAllData}
        />
      )}
    </div>
  );
};
