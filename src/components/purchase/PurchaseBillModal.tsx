import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Plus, Trash2, Check, Zap, Calculator, Settings, 
  Search, Calendar, Camera, Upload, Image as ImageIcon,
  ChevronDown, FileText, CheckCircle2, AlertCircle, AlertTriangle, ShoppingBag, 
  ArrowRight, Sparkles, Building2, User, Minus, Maximize2, Minimize2,
  Clock, Keyboard, Scan, Receipt, Phone
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { Medicine, Supplier, PurchaseOrder, PurchaseBillItem } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { emitToast } from '../../contexts/ToastContext';
import { addPurchaseStockToMedicine } from '../../lib/stockRotationEngine';
import { PurchaseItemRow } from './PurchaseItemRow';
import { PurchasePaymentSummary } from './PurchasePaymentSummary';

export interface PurchaseBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedOrder?: PurchaseOrder) => void;
  initialOrder?: PurchaseOrder | null;
  transactionType?: 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return';
  dockDraftId?: string;
  isDockMinimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
  onSummaryChange?: (summary: { partyName: string; amount: number; itemCount: number; title?: string }) => void;
}

export const PurchaseBillModal: React.FC<PurchaseBillModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialOrder,
  transactionType = 'Purchase'
}) => {
  const { business } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  
  // Bill Details
  const [billNumber, setBillNumber] = useState<string>(() => `PB-${Date.now().toString().slice(-6)}`);
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Single Consolidated Rapid Mode (F2) Toggle
  const [rapidMode, setRapidMode] = useState<boolean>(true);

  // Financial State
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Supplier Khata Credit'>('Cash');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Items State (Start with 3 clean rows or initial order items)
  const [items, setItems] = useState<PurchaseBillItem[]>(() => [
    { id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, salePrice: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, salePrice: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, salePrice: 0, total: 0 }
  ]);

  // Load suppliers and catalog
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [loadedSuppliers, loadedMeds] = await Promise.all([
          dbSuppliers.getAll(),
          dbMedicines.getAll()
        ]);
        setSuppliers(loadedSuppliers || []);
        setMedicines(loadedMeds || []);

        if (initialOrder) {
          setBillNumber(initialOrder.orderNumber || initialOrder.billNumber || initialOrder.poNumber || `PB-${Date.now().toString().slice(-6)}`);
          setBillDate(initialOrder.date ? initialOrder.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
          setSelectedSupplierId(initialOrder.supplierId || initialOrder.partyId || '');
          setPaidAmount(initialOrder.paidAmount || 0);
          if (Array.isArray(initialOrder.items) && initialOrder.items.length > 0) {
            setItems(initialOrder.items.map((it: any) => ({
              id: it.id || uuidv4(),
              medicineId: it.medicineId,
              name: it.name || it.medicineName || '',
              quantity: it.quantity || 1,
              unit: it.unit || 'BOX',
              purchasePrice: it.purchasePrice || it.unitPrice || 0,
              mrp: it.mrp || it.sellingPrice || it.salePrice || 0,
              sellingPrice: it.sellingPrice || it.mrp || 0,
              batchNumber: it.batchNumber,
              expiryDate: it.expiryDate,
              discountPercentage: it.discountPercentage || it.discount || 0,
              total: it.total || (it.quantity * (it.purchasePrice || it.unitPrice || 0))
            })));
          }
        }
      } catch (err) {
        console.warn('Failed to load purchase modal dependencies:', err);
      }
    };

    loadData();
  }, [isOpen, initialOrder]);

  // Active Selected Supplier Object
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Filtered Suppliers for quick search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliers;
    const q = supplierSearchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.phone && s.phone.includes(q)) || 
      (s.city && s.city.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearchQuery]);

  // Financial Totals Calculation
  const subTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const total = subTotal - discountAmount + taxAmount + freightAmount;
    return Math.max(0, total);
  }, [subTotal, discountAmount, taxAmount, freightAmount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  // Row update handlers
  const handleUpdateItem = (index: number, updatedItem: Partial<PurchaseBillItem>) => {
    setItems(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], ...updatedItem };
      return clone;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => {
      if (prev.length <= 1) {
        return [{ id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, salePrice: 0, total: 0 }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleAddNewRow = (focusNewRow: boolean = true) => {
    const newId = uuidv4();
    setItems(prev => [
      ...prev,
      { id: newId, name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, salePrice: 0, total: 0 }
    ]);

    if (focusNewRow) {
      requestAnimationFrame(() => {
        const nextIndex = items.length;
        const nextEl = document.querySelector(`[data-pcell="name-${nextIndex}"]`) as HTMLInputElement | null;
        if (nextEl) {
          nextEl.focus();
        }
      });
    }
  };

  const handleCommitRow = (index: number) => {
    // If it's the last row, automatically append and focus a new one
    if (index === items.length - 1) {
      handleAddNewRow(true);
    } else {
      // Focus next row's name
      requestAnimationFrame(() => {
        const nextEl = document.querySelector(`[data-pcell="name-${index + 1}"]`) as HTMLInputElement | null;
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      });
    }
  };

  // Keyboard Shortcuts (F2 = Toggle Rapid Mode, F9 = Save, Esc = Close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setRapidMode(prev => !prev);
        emitToast(`Rapid Mode ${!rapidMode ? 'Activated (⚡ Faster Entry)' : 'Deactivated'}`, 'info');
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleSavePurchase();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rapidMode, items, grandTotal, paidAmount, selectedSupplierId]);

  // Save Purchase Bill Handler
  const handleSavePurchase = async () => {
    // Filter valid items with names and positive quantity
    const validItems = items.filter(it => it.name && it.name.trim() !== '' && it.quantity > 0);

    if (validItems.length === 0) {
      emitToast('Please add at least 1 medicine item to save purchase bill.', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      const orderId = initialOrder?.id || uuidv4();
      const supplierName = selectedSupplier?.name || 'Walk-in Vendor';

      // 1. Create Purchase Order Object
      const purchaseOrderRecord: PurchaseOrder = {
        id: orderId,
        poNumber: billNumber,
        billNumber: billNumber,
        orderNumber: billNumber,
        date: billDate,
        supplierId: selectedSupplierId || 'sup_general',
        supplierName: supplierName,
        partyId: selectedSupplierId || 'sup_general',
        partyName: supplierName,
        status: balanceDue === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid',
        items: validItems.map((it, idx) => ({
          id: it.id || `poi_${idx}_${Date.now()}`,
          medicineId: it.medicineId || `med_${idx}_${Date.now()}`,
          name: it.name,
          quantity: it.quantity,
          purchasePrice: it.purchasePrice || 0,
          mrp: it.mrp || it.sellingPrice || 0,
          sellingPrice: it.sellingPrice || it.mrp || 0,
          batchNumber: it.batchNumber || `B-${Date.now().toString().slice(-4)}`,
          expiryDate: it.expiryDate || '12/28',
          discountPercentage: it.discountPercentage || 0,
          total: it.total || (it.quantity * (it.purchasePrice || 0))
        })),
        totalAmount: grandTotal,
        subTotal: subTotal,
        paidAmount: paidAmount,
        balanceDue: balanceDue,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. Save Purchase Order in DB
      await dbPurchaseOrders.save(purchaseOrderRecord);

      // 3. Inward Stock into Medicine Batches
      for (const item of validItems) {
        if (item.medicineId) {
          const med = await dbMedicines.getById(item.medicineId);
          if (med) {
            const updatedMed = addPurchaseStockToMedicine(
              med,
              {
                name: item.name,
                batchNumber: item.batchNumber || 'MAIN',
                expiryDate: item.expiryDate || '12/28',
                quantity: item.quantity,
                purchasePrice: item.purchasePrice || 0,
                sellingPrice: item.sellingPrice || item.mrp || med.sellingPrice || 0,
                mrp: item.mrp || item.sellingPrice || med.mrp || 0,
                purchaseBillId: billNumber
              },
              supplierName,
              selectedSupplierId
            );
            await dbMedicines.save(updatedMed);
          }
        }
      }

      // 4. Update Supplier Ledger if Supplier Selected & Balance Unpaid
      if (selectedSupplier) {
        const updatedBalance = (selectedSupplier.balance || 0) + balanceDue;
        await dbSuppliers.save({
          ...selectedSupplier,
          balance: updatedBalance,
          updatedAt: new Date().toISOString()
        });
      }

      // 5. Audit Log
      await dbAuditLogs.save({
        id: uuidv4(),
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        action: 'CREATE_PURCHASE',
        details: `Inward Purchase Bill #${billNumber} for ${supplierName} (Total: ${formatCurrency(grandTotal)})`,
        userId: 'admin'
      });

      emitToast(`✅ Purchase Bill #${billNumber} saved successfully!`, 'success');
      onSaved(purchaseOrderRecord);
      onClose();
    } catch (err: any) {
      console.error('Error saving purchase bill:', err);
      emitToast(`Failed to save purchase: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-7xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Add Purchase Bill
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Inward Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                0.2s High-Speed Medicine Inward &amp; Supplier Ledger Settlement
              </p>
            </div>
          </div>

          {/* SINGLE RAPID MODE (F2) TOGGLE & CONTROLS */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setRapidMode(prev => !prev);
                emitToast(`Rapid Mode ${!rapidMode ? 'Activated (⚡)' : 'Deactivated'}`, 'info');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                rapidMode 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/25' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title="Toggle Rapid Mode (Press F2)"
            >
              <Zap className={`w-3.5 h-3.5 ${rapidMode ? 'fill-white animate-pulse' : ''}`} />
              <span>⚡ Rapid Mode (F2)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP BILL & SUPPLIER SELECTION BAR */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Supplier Selector */}
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Supplier (ڈسٹری بیوٹر)
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedSupplier ? selectedSupplier.name : supplierSearchQuery}
                onChange={(e) => {
                  setSelectedSupplierId('');
                  setSupplierSearchQuery(e.target.value);
                  setIsSupplierDropdownOpen(true);
                }}
                onFocus={() => setIsSupplierDropdownOpen(true)}
                placeholder="Search or select supplier..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Supplier Dropdown */}
            {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
              <div 
                className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 max-h-52 overflow-y-auto custom-scrollbar"
                onMouseDown={(e) => e.preventDefault()}
              >
                {filteredSuppliers.map((sup) => (
                  <div
                    key={sup.id}
                    onClick={() => {
                      setSelectedSupplierId(sup.id);
                      setSupplierSearchQuery(sup.name);
                      setIsSupplierDropdownOpen(false);
                    }}
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{sup.name}</div>
                      <div className="text-[10px] text-slate-400">{sup.phone || sup.city || 'Vendor'}</div>
                    </div>
                    {sup.balance ? (
                      <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                        {formatCurrency(sup.balance)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Number */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Bill / Invoice No
            </label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="PB-001"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Bill Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Live Subtotal Pill */}
          <div className="hidden lg:flex items-center justify-end">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-right">
              <span className="text-[10px] font-bold text-slate-500 block">Total Inward Value</span>
              <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE VIEWPORT (COMPACT DYNAMIC LAYOUT, ZERO DEAD GAP, MAX-H 380PX) */}
        <div className="p-3 space-y-2 h-auto">
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Medicine / Item Name</th>
                  <th className="py-2.5 px-2 w-28">Batch No</th>
                  <th className="py-2.5 px-2 w-24 text-center">Expiry</th>
                  <th className="py-2.5 px-2 w-28 text-right">MRP (Sale)</th>
                  <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-32 text-right">Purchase Price</th>
                  <th className="py-2.5 px-2 w-20 text-center">Disc %</th>
                  <th className="py-2.5 px-3 text-right w-28">Line Total</th>
                  <th className="py-2.5 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <PurchaseItemRow
                    key={item.id}
                    index={idx}
                    item={item}
                    medicines={medicines}
                    rapidMode={rapidMode}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                    onCommitRow={handleCommitRow}
                    isLastRow={idx === items.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button & Tip */}
          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <button
              type="button"
              onClick={() => handleAddNewRow(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row (Auto on Enter)</span>
            </button>

            <span className="text-[11px] text-slate-400">
              💡 Tip: Press <strong className="text-slate-600 dark:text-slate-300">F2</strong> to toggle Rapid Mode • <strong className="text-slate-600 dark:text-slate-300">F9</strong> to Save Bill
            </span>
          </div>
        </div>

        {/* BOTTOM FINANCIAL SETTLEMENT & SUPPLIER LEDGER */}
        <PurchasePaymentSummary
          supplier={selectedSupplier}
          subTotal={subTotal}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          freightAmount={freightAmount}
          grandTotal={grandTotal}
          paidAmount={paidAmount}
          paymentMode={paymentMode}
          balanceDue={balanceDue}
          onDiscountChange={setDiscountAmount}
          onTaxChange={setTaxAmount}
          onFreightChange={setFreightAmount}
          onPaidAmountChange={setPaidAmount}
          onPaymentModeChange={setPaymentMode}
          onSave={handleSavePurchase}
          onCancel={onClose}
          isSaving={isSaving}
          itemCount={items.filter(it => it.name && it.name.trim() !== '').length}
        />

      </div>
    </div>
  );
};

export const AddPurchaseModal = PurchaseBillModal;
export default PurchaseBillModal;
