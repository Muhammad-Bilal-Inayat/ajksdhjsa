import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Check, Zap, Settings, 
  CheckCircle2, Printer, ArrowRight
} from 'lucide-react';
import { dbMedicines, dbInvoices, dbAuditLogs, dbPartyPayments } from '../../lib/db';
import { deductStockFromMedicine } from '../../lib/stockRotationEngine';
import { Medicine, Invoice } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { emitToast } from '../../contexts/ToastContext';
import { PosInvoiceRowItem } from './PosItemRow';
import { PosItemsTable } from './PosItemsTable';
import { PosTotalsBar } from './PosTotalsBar';
import { dispatchWhatsAppInvoice } from '../../lib/whatsappAutomationService';

export interface PosBillingScreenProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSaved?: (invoice?: Invoice) => void;
  initialInvoice?: Invoice | null;
}

export const PosBillingScreen: React.FC<PosBillingScreenProps> = ({
  isOpen = true,
  onClose,
  onSaved,
  initialInvoice
}) => {
  const { business } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  
  // Customer & Bill Details
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => `INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Financial State
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Online' | 'Credit'>('Cash');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initial 3 Clean Empty Rows
  const [items, setItems] = useState<PosInvoiceRowItem[]>(() => [
    { id: uuidv4(), name: '', quantity: 0, unit: 'BOX', unitPrice: 0, discount: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 0, unit: 'BOX', unitPrice: 0, discount: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 0, unit: 'BOX', unitPrice: 0, discount: 0, total: 0 }
  ]);

  useEffect(() => {
    const loadMeds = async () => {
      try {
        const loaded = await dbMedicines.getAll();
        setMedicines(loaded || []);
      } catch (e) {
        console.warn('Failed to load medicines in POS screen:', e);
      }
    };
    loadMeds();
  }, []);

  const totalItems = useMemo(() => {
    return items.filter(it => it.name && it.name.trim().length > 0).length;
  }, [items]);

  const totalQty = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.name ? (Number(it.quantity) || 0) : 0), 0);
  }, [items]);

  const subTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal - discountAmount + taxAmount);
  }, [subTotal, discountAmount, taxAmount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  // Append new row dynamically with sequential number
  const handleAddNewRow = () => {
    const newId = uuidv4();
    setItems(prev => [
      ...prev,
      { id: newId, name: '', quantity: 1, unit: 'BOX', unitPrice: 0, discount: 0, total: 0 }
    ]);
  };

  const handleUpdateItem = (index: number, updatedItem: Partial<PosInvoiceRowItem>) => {
    setItems(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], ...updatedItem };
      return clone;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => {
      if (prev.length <= 1) {
        return [{ id: uuidv4(), name: '', quantity: 1, unit: 'BOX', unitPrice: 0, discount: 0, total: 0 }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSaveInvoice = async (shouldPrint: boolean = false) => {
    const validItems = items.filter(it => it.name && it.name.trim() !== '' && it.quantity > 0);
    if (validItems.length === 0) {
      emitToast('Please select at least 1 medicine to complete billing.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const invoiceRecord: Invoice = {
        id: uuidv4(),
        invoiceNumber,
        date: invoiceDate,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        transactionType: 'Sale',
        paymentType: paymentMethod === 'Credit' ? 'Credit' : paymentMethod === 'Online' ? 'Bank Transfer' : paymentMethod === 'Card' ? 'Bank Transfer' : 'Cash',
        paymentMethod: paymentMethod as any,
        items: validItems.map((it, idx) => ({
          id: it.id || `item_${idx}`,
          medicineId: it.medicineId || `med_${idx}`,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          price: it.unitPrice,
          sellingPrice: it.unitPrice,
          mrp: it.mrp || it.unitPrice,
          total: it.total,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          discountAmount: it.discount ? (it.unitPrice * it.quantity * it.discount / 100) : 0,
          discountPercentage: it.discount || 0
        })),
        subTotal,
        discountAmount: discountAmount,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        receivedAmount: paidAmount > 0 ? paidAmount : grandTotal,
        paidAmount: paidAmount > 0 ? paidAmount : grandTotal,
        balanceDue: paymentMethod === 'Credit' ? grandTotal : 0,
        status: paymentMethod === 'Credit' ? 'Pending' : 'Completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbInvoices.save(invoiceRecord);

      // Deduct inventory stock & sync batch / expiry dates
      for (const item of invoiceRecord.items) {
        if (item.medicineId) {
          try {
            const med = medicines.find(m => m.id === item.medicineId) || (await dbMedicines.getById(item.medicineId));
            if (med) {
              let updatedMed = deductStockFromMedicine(med, item.quantity, {
                specificBatchNumber: item.batchNumber,
                method: 'FIFO',
                allowExpired: true
              });

              if (item.expiryDate && item.expiryDate.trim()) {
                updatedMed.expiryDate = item.expiryDate.trim();
              }
              if (item.batchNumber && item.batchNumber.trim()) {
                updatedMed.batchNumber = item.batchNumber.trim();
              }

              await dbMedicines.save(updatedMed);
            }
          } catch (e) {
            console.warn('Could not deduct stock for pos item', item.name, e);
          }
        }
      }

      // Universal Payment-In Auto Log (for Cash, Bank & Shift Drawer sync)
      const effectivePaid = paidAmount > 0 ? paidAmount : (paymentMethod === 'Credit' ? 0 : grandTotal);
      if (effectivePaid > 0) {
        try {
          await dbPartyPayments.save({
            id: uuidv4(),
            partyId: 'walkin_customer',
            partyName: customerName || 'Walk-in Customer',
            type: 'PAYMENT_IN',
            amount: effectivePaid,
            date: invoiceDate,
            paymentMode: paymentMethod === 'Card' || paymentMethod === 'Online' ? 'Bank Transfer' : 'Cash',
            referenceNumber: invoiceNumber,
            receiptNumber: `REC-${invoiceNumber}`,
            notes: `Auto Payment-In for POS Sale #${invoiceNumber}`,
            recordedBy: 'Cashier',
            isAuto: true,
            createdAt: new Date().toISOString()
          });
        } catch (payErr) {
          console.warn('POS Payment-In voucher save warning:', payErr);
        }
      }

      // Dispatch global sync events for 0ms reactivity
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-medicines-updated'));
        window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { storeName: 'invoices' } }));
        window.dispatchEvent(new CustomEvent('mbi-local-db-change', { detail: { store: 'invoices' } }));
      }

      // Automated / 1-Click WhatsApp Invoice Dispatch
      if (customerPhone && customerPhone.trim()) {
        try {
          const tenantId = localStorage.getItem('mbi_tenant_id') || 'default';
          dispatchWhatsAppInvoice({
            invoiceNumber,
            customerName: customerName || 'Valued Customer',
            customerPhone: customerPhone,
            date: invoiceDate,
            items: validItems.map(it => ({ name: it.name, quantity: it.quantity, price: it.unitPrice || 0, total: it.total })),
            subtotal: subTotal,
            subTotal: subTotal,
            discount: discountAmount,
            discountAmount: discountAmount,
            tax: taxAmount,
            taxAmount: taxAmount,
            grandTotal,
            paidAmount: paidAmount > 0 ? paidAmount : grandTotal,
            balanceDue: paymentMethod === 'Credit' ? grandTotal : 0,
            storeName: business?.name || 'Inventra Pharmacy',
            businessName: business?.name || 'Inventra Pharmacy'
          }, tenantId).then(waRes => {
            if (waRes.success && waRes.mode === 'auto_background') {
              emitToast(waRes.message, 'success');
            }
          }).catch(() => {});
        } catch {}
      }

      // Audit Log
      await dbAuditLogs.save({
        id: uuidv4(),
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        action: 'SALE',
        details: `0.2s POS Sale #${invoiceNumber} for ${customerName} (${formatCurrency(grandTotal)})`,
        userId: 'admin'
      });

      emitToast(`✅ Invoice #${invoiceNumber} completed!`, 'success');

      if (shouldPrint) {
        window.print();
      }

      if (onSaved) onSaved(invoiceRecord);
      if (onClose) onClose();
    } catch (err: any) {
      emitToast(`Failed to save invoice: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col h-auto max-h-[92vh] overflow-y-auto custom-scrollbar p-4 space-y-3">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                0.2s POS Rapid Billing
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Live Terminal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-Speed Barcode Billing &amp; Continuous Auto-Row Engine
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* TOP METADATA ROW */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shrink-0">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in Customer"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Customer Phone / WhatsApp
          </label>
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0328-1302636"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Invoice #
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>
      </div>

      {/* COMPACT DYNAMIC TABLE */}
      <PosItemsTable
        items={items}
        medicines={medicines}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onAddNewRow={handleAddNewRow}
      />

      {/* DOCKED PAYMENT & REAL-TIME TOTALS CALCULATION STRIP */}
      <PosTotalsBar
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        customerPhone={customerPhone}
        onCustomerPhoneChange={setCustomerPhone}
        totalItems={totalItems}
        totalQty={totalQty}
        subtotal={subTotal}
        discountAmount={discountAmount}
        onDiscountChange={setDiscountAmount}
        grandTotal={grandTotal}
        paidAmount={paidAmount}
        onPaidAmountChange={setPaidAmount}
      />

      {/* BOTTOM ACTION BUTTONS DOCKED TIGHTLY WITH MT-3 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 mt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold">F2: Search</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold">Enter: Next Row</kbd>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-98 transition-all disabled:opacity-60"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Save &amp; Print</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(false)}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosBillingScreen;
