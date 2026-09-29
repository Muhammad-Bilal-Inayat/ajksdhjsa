import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Key, X, Check, Save, Printer, Search, Plus, 
  Trash2, Edit2, ShieldAlert, Sparkles, AlertCircle, 
  RotateCcw, Sliders, DollarSign, Calendar, Clock, User, 
  Building, Zap, Eye, EyeOff, Hash, Layers, CheckCircle2
} from 'lucide-react';
import { 
  privateTransactionService, 
  PrivateTxnType, 
  PrivateTxnStatus, 
  PrivateLineItem, 
  PrivateTransactionRecord 
} from '../../services/privateTransactionService';
import { dbMedicines } from '../../lib/db';
import { Medicine } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';
import { isPrimaryOwner } from '../../services/rbacService';

interface QuickPrivateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: PrivateTxnType;
}

export const QuickPrivateTransactionModal: React.FC<QuickPrivateTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'Sale'
}) => {
  const { tenantId, activeRole, currentUser, activeUser, business, canPerform } = useAuth();
  const currentTenantId = tenantId || 'default';

  // PIN Unlock Security Gate State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Private Aggregates Toggle (Owner Only)
  const isOwner = isPrimaryOwner(activeUser || currentUser) || 
    (activeRole as string) === 'Owner' || 
    (activeRole as string) === 'Primary Admin' || 
    (activeRole as string) === 'Admin' || 
    (activeRole as string) === 'Super Admin';
  const [showAggregates, setShowAggregates] = useState(false);
  const [aggregates, setAggregates] = useState<{
    totalTurnover: number;
    totalSales: number;
    totalPurchases: number;
    totalReturns: number;
    totalProfit: number;
    totalCount: number;
  } | null>(null);

  // Transaction Header State
  const [txnType, setTxnType] = useState<PrivateTxnType>(initialType);
  const [txnDate, setTxnDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txnTime, setTxnTime] = useState<string>(() => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [partyName, setPartyName] = useState('Walk-in Customer / Cash');
  const [partyPhone, setPartyPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank / Raast' | 'JazzCash / EasyPaisa' | 'Credit / Due' | 'Mixed'>('Cash');
  const [status, setStatus] = useState<PrivateTxnStatus>('Posted');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Line Items State
  const [items, setItems] = useState<PrivateLineItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Item Form State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const [inputItemName, setInputItemName] = useState('');
  const [inputGeneric, setInputGeneric] = useState('');
  const [inputBarcode, setInputBarcode] = useState('');
  const [inputBatch, setInputBatch] = useState('B-001');
  const [inputExpiry, setInputExpiry] = useState('');
  const [inputPackSize, setInputPackSize] = useState('1x10');
  const [inputUnit, setInputUnit] = useState('Tab');
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputPurchaseRate, setInputPurchaseRate] = useState<number>(0);
  const [inputSaleRate, setInputSaleRate] = useState<number>(0);
  const [inputDiscountPercent, setInputDiscountPercent] = useState<number>(0);
  const [inputTaxPercent, setInputTaxPercent] = useState<number>(0);
  const [inputAdjustmentReason, setInputAdjustmentReason] = useState<PrivateLineItem['adjustmentReason']>('Physical Audit');

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTxn, setLastSavedTxn] = useState<PrivateTransactionRecord | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load medicines catalog for auto-suggestions on open
  useEffect(() => {
    if (isOpen) {
      dbMedicines.getAll().then(setMedicines).catch(() => {});
      if (!isUnlocked) {
        setTimeout(() => pinInputRef.current?.focus(), 100);
      }
    } else {
      // Reset PIN on close for strict security
      setIsUnlocked(false);
      setPinInput('');
      setPinError(null);
      setLastSavedTxn(null);
    }
  }, [isOpen]);

  // Load aggregates when unlocked
  const refreshAggregates = async () => {
    const agg = await privateTransactionService.getPrivateAggregates(currentTenantId);
    setAggregates(agg);
  };

  useEffect(() => {
    if (isOpen && isUnlocked && isOwner) {
      refreshAggregates();
    }
  }, [isOpen, isUnlocked, isOwner, currentTenantId]);

  // Handle PIN verification
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }

    const isValid = privateTransactionService.verifyPin(pinInput, currentTenantId);
    if (isValid) {
      setIsUnlocked(true);
      setPinError(null);
      setTimeout(() => searchInputRef.current?.focus(), 150);
    } else {
      setPinError('Incorrect PIN. Access Denied.');
    }
  };

  // Autocomplete search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchTerm.toLowerCase();
    const matches = medicines.filter(m => 
      m.name.toLowerCase().includes(q) ||
      (m.genericName && m.genericName.toLowerCase().includes(q)) ||
      (m.barcode && m.barcode.toLowerCase().includes(q)) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(q))
    ).slice(0, 6);
    setSearchResults(matches);
  }, [searchTerm, medicines]);

  const handleSelectProduct = (med: Medicine) => {
    setSelectedMedicine(med);
    setInputItemName(med.name);
    setInputGeneric(med.genericName || '');
    setInputBarcode(med.barcode || '');
    setInputBatch(med.batchNumber || 'B-' + Math.floor(100 + Math.random() * 900));
    setInputExpiry(med.expiryDate || '');
    setInputPackSize((med as any).packaging || med.unit || '1x10');
    setInputUnit(med.unit || 'Strip');
    setInputPurchaseRate(med.purchasePrice || 0);
    setInputSaleRate(med.sellingPrice || med.mrp || 0);
    setInputQty(1);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Add / Edit Line Item
  const handleAddOrUpdateItem = () => {
    if (!inputItemName.trim()) {
      emitToast('Please enter a medicine or item name', 'warning');
      return;
    }
    if (inputQty <= 0) {
      emitToast('Quantity must be greater than 0', 'warning');
      return;
    }

    const baseRate = (txnType === 'Purchase' || txnType === 'Purchase Return') ? inputPurchaseRate : inputSaleRate;
    const baseAmount = inputQty * baseRate;
    const discountAmt = (baseAmount * (inputDiscountPercent || 0)) / 100;
    const taxableBase = baseAmount - discountAmt;
    const taxAmt = (taxableBase * (inputTaxPercent || 0)) / 100;
    const lineTotal = taxableBase + taxAmt;

    const costTotal = inputQty * inputPurchaseRate;
    const lineProfit = txnType === 'Sale' ? Math.max(0, lineTotal - costTotal) : 0;

    const newItem: PrivateLineItem = {
      id: editingItemId || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      medicineId: selectedMedicine?.id,
      name: inputItemName.trim(),
      genericName: inputGeneric.trim() || undefined,
      barcode: inputBarcode.trim() || undefined,
      batchNumber: inputBatch.trim() || undefined,
      expiryDate: inputExpiry || undefined,
      packSize: inputPackSize || undefined,
      unit: inputUnit || undefined,
      quantity: Number(inputQty),
      purchaseRate: Number(inputPurchaseRate),
      saleRate: Number(inputSaleRate),
      discountPercent: Number(inputDiscountPercent) || 0,
      discountAmount: Math.round(discountAmt * 100) / 100,
      taxPercent: Number(inputTaxPercent) || 0,
      taxAmount: Math.round(taxAmt * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
      lineProfit: Math.round(lineProfit * 100) / 100,
      adjustmentReason: txnType === 'Stock Adjustment' ? inputAdjustmentReason : undefined
    };

    if (editingItemId) {
      setItems(prev => prev.map(it => it.id === editingItemId ? newItem : it));
      setEditingItemId(null);
      emitToast(`Updated: ${newItem.name}`, 'info');
    } else {
      setItems(prev => [...prev, newItem]);
      emitToast(`Added: ${newItem.name}`, 'success');
    }

    // Reset item input
    setSelectedMedicine(null);
    setInputItemName('');
    setInputGeneric('');
    setInputBarcode('');
    setInputBatch('B-' + Math.floor(100 + Math.random() * 900));
    setInputExpiry('');
    setInputQty(1);
    setInputPurchaseRate(0);
    setInputSaleRate(0);
    setInputDiscountPercent(0);
    setInputTaxPercent(0);
  };

  const handleEditItem = (it: PrivateLineItem) => {
    setEditingItemId(it.id);
    setInputItemName(it.name);
    setInputGeneric(it.genericName || '');
    setInputBarcode(it.barcode || '');
    setInputBatch(it.batchNumber || '');
    setInputExpiry(it.expiryDate || '');
    setInputPackSize(it.packSize || '1x10');
    setInputUnit(it.unit || 'Strip');
    setInputQty(it.quantity);
    setInputPurchaseRate(it.purchaseRate);
    setInputSaleRate(it.saleRate);
    setInputDiscountPercent(it.discountPercent || 0);
    setInputTaxPercent(it.taxPercent || 0);
    if (it.adjustmentReason) setInputAdjustmentReason(it.adjustmentReason);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.quantity * (txnType === 'Purchase' || txnType === 'Purchase Return' ? it.purchaseRate : it.saleRate)), 0);
  const totalDiscount = items.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
  const totalTax = items.reduce((sum, it) => sum + (it.taxAmount || 0), 0);
  const grandTotal = Math.max(0, items.reduce((sum, it) => sum + it.lineTotal, 0));
  const totalCost = items.reduce((sum, it) => sum + (it.quantity * it.purchaseRate), 0);
  const grossProfit = txnType === 'Sale' ? Math.max(0, grandTotal - totalCost) : 0;

  // Auto set paid amount
  useEffect(() => {
    if (paymentMethod === 'Cash' || paymentMethod === 'Bank / Raast' || paymentMethod === 'JazzCash / EasyPaisa') {
      setPaidAmount(grandTotal);
    } else if (paymentMethod === 'Credit / Due') {
      setPaidAmount(0);
    }
  }, [grandTotal, paymentMethod]);

  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const changeDue = Math.max(0, paidAmount - grandTotal);

  // Save Private Transaction
  const handleSaveTransaction = async () => {
    if (items.length === 0) {
      emitToast('Please add at least one line item to save', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await privateTransactionService.saveTransaction({
        type: txnType,
        date: txnDate,
        time: txnTime,
        referenceNumber,
        partyName,
        partyPhone,
        paymentMethod,
        status,
        notes,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        paidAmount: Number(paidAmount) || 0,
        balanceDue: Math.round(balanceDue * 100) / 100,
        changeDue: Math.round(changeDue * 100) / 100,
        createdByUserId: currentUser?.id || activeUser?.id,
        createdByUserName: currentUser?.name || activeUser?.name || 'Owner',
      }, currentTenantId);

      setLastSavedTxn(saved);
      emitToast(`✅ Private ${txnType} [${saved.transactionNumber}] saved to Isolated Ledger!`, 'success');
      refreshAggregates();

      // Reset form
      setItems([]);
      setReferenceNumber('');
      setNotes('');
      setPartyName('Walk-in Customer / Cash');
      setPartyPhone('');
    } catch (err: any) {
      emitToast('Failed to save private transaction: ' + (err?.message || 'Error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard Shortcuts (Ctrl+S to save, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (isUnlocked && items.length > 0) {
          handleSaveTransaction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUnlocked, items, subtotal, grandTotal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* 1. DISCREET PIN UNLOCK GATE MODAL */}
      {!isUnlocked ? (
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-scaleUp">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white tracking-wide">
              🔒 Enter Private Access PIN
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Encrypted &amp; Isolated Ledger Security Gate
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="relative">
              <input
                ref={pinInputRef}
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[0.6em] font-mono py-3.5 px-4 bg-slate-950 border-2 border-slate-700 focus:border-amber-500 rounded-2xl text-amber-400 placeholder:text-slate-600 outline-none transition-all"
                autoFocus
              />
              <Key className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {pinError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-950/40 py-2 rounded-xl border border-rose-800/50">
                <AlertCircle className="w-4 h-4" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer transition-colors"
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm cursor-pointer shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock (Enter)</span>
              </button>
            </div>
          </form>

          <p className="text-[10px] text-slate-500">
            Records stored in <span className="font-mono text-amber-400">mbi_private_transactions</span> (Isolated from standard POS)
          </p>
        </div>
      ) : (
        /* 2. COMPLETE 5-IN-1 QUICK PRIVATE TRANSACTION MODAL */
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp text-slate-200">
          
          {/* HEADER */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                    <span>Quick Private Transaction Panel</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                      ISOLATED LEDGER
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400">
                  Direct ledger entry without affecting public POS invoices or cashier shifts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Owner Aggregate Toggle */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowAggregates(!showAggregates)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showAggregates 
                      ? 'bg-amber-500 text-slate-950 border-amber-400' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Toggle Private Turnover Aggregates"
                >
                  {showAggregates ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>👁️ Private Aggregates</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* OWNER AGGREGATES RADAR (When toggled) */}
          {showAggregates && aggregates && (
            <div className="bg-amber-950/30 border-b border-amber-500/30 px-5 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">Total Private Turnover</span>
                <strong className="text-amber-400 font-mono text-sm">Rs. {aggregates.totalTurnover.toLocaleString('en-PK')}</strong>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">Private Sales</span>
                <strong className="text-emerald-400 font-mono text-sm">Rs. {aggregates.totalSales.toLocaleString('en-PK')}</strong>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">Private Purchases</span>
                <strong className="text-blue-400 font-mono text-sm">Rs. {aggregates.totalPurchases.toLocaleString('en-PK')}</strong>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">Private Profit</span>
                <strong className="text-teal-300 font-mono text-sm">Rs. {aggregates.totalProfit.toLocaleString('en-PK')}</strong>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">Total Private Records</span>
                <strong className="text-purple-300 font-mono text-sm">{aggregates.totalCount} txns</strong>
              </div>
            </div>
          )}

          {/* BODY SCROLL AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">

            {/* 1. 5-IN-1 TRANSACTION TYPE TABS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
              {(['Sale', 'Purchase', 'Sale Return', 'Purchase Return', 'Stock Adjustment'] as PrivateTxnType[]).map((type) => {
                const isActive = txnType === type;
                const icons: Record<PrivateTxnType, string> = {
                  'Sale': '🛒',
                  'Purchase': '📦',
                  'Sale Return': '🔄',
                  'Purchase Return': '↩️',
                  'Stock Adjustment': '⚖️',
                };

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxnType(type)}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <span>{icons[type]}</span>
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>

            {/* 2. TRANSACTION HEADER FIELDS */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Date &amp; Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none focus:border-amber-500"
                  />
                  <input
                    type="time"
                    value={txnTime}
                    onChange={(e) => setTxnTime(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Reference / Bill No
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-9042 / REF-001"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Party Name (Customer / Supplier)
                </label>
                <input
                  type="text"
                  placeholder="Walk-in Customer / Cash"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank / Raast">Bank / Raast</option>
                  <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                  <option value="Credit / Due">Credit / Due (Khata)</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
            </div>

            {/* 3. ITEM FAST ENTRY ROW */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item (Full Keyboard Entry)</span>
                </span>
                {selectedMedicine && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    Linked to Catalog: {selectedMedicine.name}
                  </span>
                )}
              </div>

              {/* Medicine Autocomplete Search */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search medicine catalog by name, generic salt, barcode..."
                    className="w-full bg-slate-900 border border-slate-700 pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-800 max-h-56 overflow-y-auto">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectProduct(m)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <strong className="text-white">{m.name}</strong>
                          <span className="text-[10px] text-slate-400 ml-2">({m.genericName || 'Formula'})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-mono font-bold">Rs. {m.sellingPrice || m.mrp}</span>
                          <span className="text-[10px] text-slate-400 block">Cost: Rs. {m.purchasePrice || 0}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Item Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Item Name *</label>
                  <input
                    type="text"
                    value={inputItemName}
                    onChange={(e) => setInputItemName(e.target.value)}
                    placeholder="Product name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="col-span-2 lg:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Generic Salt</label>
                  <input
                    type="text"
                    value={inputGeneric}
                    onChange={(e) => setInputGeneric(e.target.value)}
                    placeholder="Generic salt"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500 text-[11px]"
                  />
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Batch</label>
                  <input
                    type="text"
                    value={inputBatch}
                    onChange={(e) => setInputBatch(e.target.value)}
                    placeholder="B-001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Expiry</label>
                  <input
                    type="text"
                    value={inputExpiry}
                    onChange={(e) => setInputExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500 text-[11px]"
                  />
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Pack &amp; Unit</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={inputPackSize}
                      onChange={(e) => setInputPackSize(e.target.value)}
                      placeholder="1x10"
                      className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1.5 text-white outline-none focus:border-amber-500 text-[10px]"
                    />
                    <select
                      value={inputUnit}
                      onChange={(e) => setInputUnit(e.target.value)}
                      className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-0.5 py-1.5 text-white outline-none focus:border-amber-500 text-[10px]"
                    >
                      <option value="Tab">Tab</option>
                      <option value="Strip">Strip</option>
                      <option value="Bottle">Bot</option>
                      <option value="Pack">Pack</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="text-[10px] font-bold text-amber-400 block mb-0.5">Qty *</label>
                  <input
                    type="number"
                    min="1"
                    value={inputQty}
                    onChange={(e) => setInputQty(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Cost Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={inputPurchaseRate}
                    onChange={(e) => setInputPurchaseRate(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">Sale Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={inputSaleRate}
                    onChange={(e) => setInputSaleRate(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div className="col-span-2 lg:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateItem}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1 shadow-md"
                  >
                    {editingItemId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingItemId ? 'Update' : 'Add'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. LINE ITEMS TABLE */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item &amp; Generic</th>
                      <th className="py-2.5 px-3">Batch &amp; Exp</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Cost</th>
                      <th className="py-2.5 px-3 text-right">Sale Rate</th>
                      <th className="py-2.5 px-3 text-right">Disc%</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      {isOwner && <th className="py-2.5 px-3 text-right text-teal-400">Profit</th>}
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={isOwner ? 11 : 10} className="py-8 text-center text-slate-500 text-xs">
                          No items added yet. Search products or type manually above.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <strong className="text-white block">{it.name}</strong>
                            {it.genericName && <span className="text-[10px] text-slate-400">{it.genericName}</span>}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                            {it.batchNumber || '-'} | {it.expiryDate || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{it.packSize || ''} {it.unit || ''}</td>
                          <td className="py-2 px-3 text-center font-bold text-white">{it.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">Rs. {it.purchaseRate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-white font-semibold">Rs. {it.saleRate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{it.discountPercent ? `${it.discountPercent}%` : '-'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">Rs. {it.lineTotal.toFixed(2)}</td>
                          {isOwner && (
                            <td className="py-2 px-3 text-right font-mono text-teal-300 font-bold">
                              Rs. {(it.lineProfit || 0).toFixed(2)}
                            </td>
                          )}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(it)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 cursor-pointer"
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

            {/* 5. SUMMARY & TOTALS CARD */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Private Notes &amp; Remarks</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Confidential remarks or details for internal ledger..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">Rs. {subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount:</span>
                    <span className="font-mono">- Rs. {totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {totalTax > 0 && (
                  <div className="flex justify-between text-blue-400">
                    <span>Tax:</span>
                    <span className="font-mono">+ Rs. {totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-slate-800 pt-1.5 text-white">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-amber-400">Rs. {grandTotal.toFixed(2)}</span>
                </div>
                {isOwner && txnType === 'Sale' && (
                  <div className="flex justify-between text-xs text-teal-300 font-bold border-t border-slate-800 pt-1">
                    <span>Estimated Gross Profit:</span>
                    <span className="font-mono">Rs. {grossProfit.toFixed(2)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Paid Amount</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Balance Due</label>
                    <div className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-rose-400 font-mono text-xs font-bold">
                      Rs. {balanceDue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* FOOTER ACTIONS */}
          <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Isolated Storage Active</span>
            </div>

            <div className="flex items-center gap-2">
              {lastSavedTxn && (
                <button
                  type="button"
                  onClick={() => privateTransactionService.printPrivateReceipt(lastSavedTxn, business?.name || 'MBI INVENTRA')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span>🖨️ Private Print</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕ Close (Esc)
              </button>

              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={isSaving || items.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>💾 Save Private Transaction (Ctrl+S)</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
