import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Printer, Share2, Edit3, Trash2, ShoppingBag, ArrowRight, Truck
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

export const SaleOrdersView: React.FC = () => {
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
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
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
      console.error('Failed loading sale orders:', err);
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

  const filteredOrders = useMemo(() => {
    return invoices.filter(inv => {
      const invType = inv.transactionType || 'Sale';
      if (invType !== 'Sale Order') return false;

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

  const totalOrderValue = useMemo(() => {
    return filteredOrders.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [filteredOrders]);

  const handleConvertToChallan = async (order: Invoice) => {
    try {
      const challans = invoices.filter(i => i.transactionType === 'Delivery Challan');
      const maxNum = challans.reduce((max, i) => {
        const num = parseInt(i.invoiceNumber.replace(/\D/g, '') || '0');
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextChallanNum = `DC-${maxNum + 1}`;

      const challanInvoice: Invoice = {
        ...order,
        id: uuidv4(),
        invoiceNumber: nextChallanNum,
        date: new Date().toISOString(),
        transactionType: 'Delivery Challan',
        status: 'Dispatched',
        description: `Dispatched against Order #${order.invoiceNumber}. ${order.description || ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbInvoices.save(challanInvoice);
      await loadAllData();
      showToast(`🚚 Created Delivery Challan #${nextChallanNum} from Order #${order.invoiceNumber}!`);
    } catch (err) {
      console.error('Failed to create challan:', err);
    }
  };

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
      const exportData = filteredOrders.map((inv, idx) => ({
        'Sr #': idx + 1,
        'Date': inv.date.slice(0, 10),
        'Order #': inv.invoiceNumber,
        'Customer Name': inv.customerName,
        'Items Count': inv.items.length,
        'Order Total (PKR)': inv.grandTotal,
        'Status': inv.status || 'Pending',
        'Remarks': inv.description || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sale Orders');
      XLSX.writeFile(wb, `Sale_Orders_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteTargetInvoice) return;
    setIsDeleting(true);
    try {
      await dbInvoices.delete(deleteTargetInvoice.id);
      await loadAllData();
      showToast(`Order #${deleteTargetInvoice.invoiceNumber} deleted.`);
      setDeleteTargetInvoice(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
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
        searchPlaceholder="Search sale orders by order #, customer..."
        showGraph={showGraph}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onExportExcel={handleExportExcel}
        onPrint={() => window.print()}
        onResetAllFilters={handleResetFilters}
      />

      {/* KPI SUMMARY */}
      <SalePurchaseKpiCards
        paidAmount={0}
        unpaidAmount={totalOrderValue}
        totalAmount={totalOrderValue}
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
              <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>SALE ORDERS</span>
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
              {filteredOrders.length} Records
            </span>
          </div>

          {/* Right: Only Primary Action Button */}
          <button
            onClick={() => {
              setEditingInvoice(null);
              setIsAddOrderOpen(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Sale Order</span>
          </button>
        </div>

        {/* SALE ORDERS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-right">Order Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No sale orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono">{inv.date.slice(0, 10)}</td>
                    <td className="p-3 font-bold text-purple-600 dark:text-purple-400">#{inv.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.customerName}</td>
                    <td className="p-3">{inv.items.length} items</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rs {inv.grandTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'Dispatched'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {inv.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleConvertToChallan(inv)}
                          className="px-2 py-1 text-[11px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg flex items-center gap-1 transition"
                          title="Generate Delivery Challan"
                        >
                          <Truck className="w-3 h-3" /> Challan
                        </button>
                        <button
                          onClick={() => setSelectedPrintInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Print Order"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedShareInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Share Order"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingInvoice(inv);
                            setIsAddOrderOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit Order"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetInvoice(inv)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete Order"
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
      {isAddOrderOpen && (
        <AddSaleModal
          isOpen={isAddOrderOpen}
          onClose={() => {
            setIsAddOrderOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={loadAllData}
          editInvoice={editingInvoice}
          transactionType="Sale Order"
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
          onConfirm={handleDeleteOrder}
          title={`Delete Order #${deleteTargetInvoice.invoiceNumber}`}
          message="Are you sure you want to delete this sale order?"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
