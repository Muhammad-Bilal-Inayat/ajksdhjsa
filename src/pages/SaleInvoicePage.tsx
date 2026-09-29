import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, User, Phone, Calendar, Hash, CreditCard, Sparkles, 
  Plus, Trash2, Settings, Printer, Share2, ArrowLeft, CheckCircle2, 
  AlertTriangle, Scan, Keyboard, FileText, Image as ImageIcon, 
  Upload, X, RefreshCw, ShieldCheck, Zap, HelpCircle, ArrowRight
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbInvoices, dbAuditLogs } from '../lib/db';
import { Medicine, Party, Invoice } from '../types';
import { InvoiceColumnConfig, DEFAULT_INVOICE_COLUMN_CONFIG } from '../types/invoice';
import { InvoiceItemsGrid, GridRowItem } from '../components/invoice/InvoiceItemsGrid';
import { InvoiceColumnSettingsModal } from '../components/invoice/InvoiceColumnSettingsModal';
import { AddPartyModal } from '../components/parties/AddPartyModal';
import { KeyboardShortcutsCheatSheetModal } from '../components/common/KeyboardShortcutsCheatSheetModal';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { deductStockFromMedicine } from '../lib/stockRotationEngine';
import { v4 as uuidv4 } from 'uuid';
import { emitToast } from '../contexts/ToastContext';

export const SaleInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { business, currentUser, activeUser } = useAuth();
  const { settings } = useSettings();

  // Parties & Catalog
  const [parties, setParties] = useState<Party[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Column Configuration with localStorage persistence
  const [columnConfig, setColumnConfig] = useState<InvoiceColumnConfig>(() => {
    try {
      const stored = localStorage.getItem('mbi_sale_columns_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_INVOICE_COLUMN_CONFIG;
  });

  // Header State
  const [isCredit, setIsCredit] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingName, setBillingName] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [customerPoDate, setCustomerPoDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Quick Bar & Scan State
  const [scanQuery, setScanQuery] = useState('');
  const [rapidAddMode, setRapidAddMode] = useState(true);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Grid Items State
  const [items, setItems] = useState<GridRowItem[]>(() => [
    { tempId: uuidv4(), name: '', quantity: 1, unit: 'Box', pricePerUnit: 0, total: 0 },
    { tempId: uuidv4(), name: '', quantity: 1, unit: 'Box', pricePerUnit: 0, total: 0 },
    { tempId: uuidv4(), name: '', quantity: 1, unit: 'Box', pricePerUnit: 0, total: 0 }
  ]);

  // Financial Bottom Totals
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [isRoundOff, setIsRoundOff] = useState<boolean>(true);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [loadedParties, loadedMeds] = await Promise.all([
          dbSuppliers.getAll(),
          dbMedicines.getAll()
        ]);
        setParties(loadedParties || []);
        setMedicines(loadedMeds || []);
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
  }, []);

  // Keyboard Shortcuts (F2: focus search, F12: shortcuts, Ctrl+P: print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        scanInputRef.current?.focus();
      } else if (e.key === 'F12') {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Customers for Autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return parties.slice(0, 8);
    const q = customerSearchQuery.toLowerCase();
    return parties.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.phone?.includes(q)
    ).slice(0, 10);
  }, [parties, customerSearchQuery]);

  const handleSelectCustomer = (p: Party) => {
    setSelectedPartyId(p.id);
    setCustomerName(p.name);
    setCustomerPhone(p.phone || '');
    setBillingName(p.company || p.name);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchQuery(p.name);
    if (p.paymentTerms) setPaymentTerms(p.paymentTerms);
  };

  // Grid Actions
  const handleUpdateItem = (tempId: string, updates: Partial<GridRowItem>) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
  };

  const handleDeleteItem = (tempId: string) => {
    setItems(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(item => item.tempId !== tempId);
    });
  };

  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      { tempId: uuidv4(), name: '', quantity: 1, unit: 'Box', pricePerUnit: 0, total: 0 }
    ]);
  };

  const handleQuickAddMedicine = (med: Medicine) => {
    const newRow: GridRowItem = {
      tempId: uuidv4(),
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName,
      strength: med.strength,
      manufacturer: med.manufacturer,
      barcode: med.barcode,
      batchNumber: med.batchNumber || 'BATCH-01',
      expiryDate: med.expiryDate || '',
      mrp: med.mrp || med.salePrice || 0,
      quantity: 1,
      unit: med.unit || 'Box',
      pricePerUnit: med.salePrice || med.mrp || 0,
      total: med.salePrice || med.mrp || 0
    };

    setItems(prev => {
      if (prev.length === 1 && !prev[0].name) {
        return [newRow];
      }
      return [...prev, newRow];
    });

    setScanQuery('');
    emitToast(`Added ${med.name} to invoice`, 'success');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * (discountPercent / 100)) * 100) / 100;
  }, [subtotal, discountPercent]);

  const taxableAmount = subtotal - discountAmount;

  const taxAmount = useMemo(() => {
    return Math.round((taxableAmount * (taxPercent / 100)) * 100) / 100;
  }, [taxableAmount, taxPercent]);

  const rawGrandTotal = taxableAmount + taxAmount;

  const { roundOffDiff, finalGrandTotal } = useMemo(() => {
    if (!isRoundOff) {
      return { roundOffDiff: 0, finalGrandTotal: rawGrandTotal };
    }
    const rounded = Math.round(rawGrandTotal);
    return {
      roundOffDiff: Math.round((rounded - rawGrandTotal) * 100) / 100,
      finalGrandTotal: rounded
    };
  }, [rawGrandTotal, isRoundOff]);

  const balanceDue = Math.max(0, finalGrandTotal - (Number(paidAmount) || 0));

  useEffect(() => {
    if (!isCredit) {
      setPaidAmount(finalGrandTotal);
    }
  }, [finalGrandTotal, isCredit]);

  const handleSaveInvoice = async (shouldPrint: boolean = false, resetAfter: boolean = false) => {
    const validItems = items.filter(it => it.name && it.name.trim().length > 0);
    if (validItems.length === 0) {
      alert('Please add at least 1 medicine to the invoice.');
      return;
    }

    setIsSaving(true);
    try {
      const invoiceRecord: Invoice = {
        id: uuidv4(),
        invoiceNumber: invoiceNumber,
        partyId: selectedPartyId || undefined,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || undefined,
        billingName: billingName || undefined,
        date: new Date(invoiceDate).toISOString(),
        transactionType: 'Sale',
        subTotal: subtotal,
        totalAmount: finalGrandTotal,
        grandTotal: finalGrandTotal,
        receivedAmount: Number(paidAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        balanceDue: balanceDue,
        balanceAmount: balanceDue,
        status: 'Completed',
        paymentType: isCredit ? 'Credit' : 'Cash',
        description: customerPoNumber ? `PO: ${customerPoNumber}` : undefined,
        items: validItems.map(it => ({
          id: it.id || uuidv4(),
          medicineId: it.medicineId || uuidv4(),
          name: it.name,
          batchNumber: it.batchNumber || 'BATCH-01',
          expiryDate: it.expiryDate || '12/2028',
          quantity: it.quantity,
          freeQuantity: it.freeQuantity || 0,
          sellingPrice: it.pricePerUnit,
          mrp: it.mrp || it.pricePerUnit,
          pricePerUnit: it.pricePerUnit,
          unit: it.unit || 'Box',
          total: it.total,
          discountPercentage: it.discountPercentage || 0,
          taxPercentage: it.taxPercentage || 0
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbInvoices.save(invoiceRecord);

      // Deduct inventory stock
      for (const item of invoiceRecord.items) {
        if (item.medicineId) {
          try {
            const med = medicines.find(m => m.id === item.medicineId);
            if (med) {
              const deductQty = item.quantity + (item.freeQuantity || 0);
              const updatedMed: Medicine = {
                ...med,
                quantity: Math.max(0, (med.quantity || 0) - deductQty),
                updatedAt: new Date().toISOString()
              };
              await dbMedicines.save(updatedMed);
            }
          } catch (e) {
            console.warn('Could not deduct stock for medicine', item.name, e);
          }
        }
      }

      // Record audit log
      try {
        await dbAuditLogs.save({
          id: uuidv4(),
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          action: 'SALE',
          userId: activeUser?.id || currentUser?.uid || 'Cashier',
          details: `Sale Invoice ${invoiceNumber} for ${customerName} of Rs ${finalGrandTotal.toLocaleString()}`
        });
      } catch {}

      emitToast(`Invoice ${invoiceNumber} saved successfully!`, 'success');

      if (shouldPrint) {
        window.print();
      }

      if (resetAfter) {
        setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
        setItems([
          { tempId: uuidv4(), name: '', quantity: 1, unit: 'Box', pricePerUnit: 0, total: 0 },
          { tempId: uuidv4(), name: '', quantity: 1, unit: 'Box', pricePerUnit: 0, total: 0 }
        ]);
      } else {
        navigate('/sale/invoices');
      }
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      alert(`Error saving invoice: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 sm:p-4 lg:p-6 select-none font-sans">
      
      {/* Top Banner Navigation */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sale/invoices')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Back to Sales"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Sale Invoice Entry (POS Billing)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                12-Column Grid
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create customer sale bills, FEFO batch selection, and dynamic column toggles
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Shortcuts (F12)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsColumnSettingsOpen(true)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Configure Table Columns"
          >
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Columns</span>
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Customer Selector */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Customer Name *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddPartyModalOpen(true)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  placeholder="Search or enter customer..."
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerSearchQuery(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto p-1 text-xs">
                  {filteredCustomers.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectCustomer(p)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[10.5px] text-slate-400">{p.phone || p.company || 'Customer'}</p>
                      </div>
                      <span className="text-[11px] font-mono text-blue-600 font-bold">
                        Bal: Rs {(p.balance || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                placeholder="0300-1234567"
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Invoice # & Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Invoice # & Date
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={invoiceNumber}
                  readOnly
                  className="w-1/2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 text-center"
                />
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Mode
                </label>
                <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 text-[10.5px]">
                  <button
                    type="button"
                    onClick={() => setIsCredit(false)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      !isCredit ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCredit(true)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      isCredit ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Credit (Udhar)
                  </button>
                </div>
              </div>

              {columnConfig.showPaymentTerms && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 7 Days">Net 7 Days</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                  </select>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                    title="Due Date"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Quick Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-[240px] max-w-xl relative">
            <div className="relative flex items-center">
              <input
                ref={scanInputRef}
                type="text"
                value={scanQuery}
                placeholder="Scan barcode gun or search medicine catalog (F2)..."
                onChange={(e) => setScanQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scanQuery.trim()) {
                    const match = medicines.find(m => 
                      m.barcode === scanQuery.trim() || 
                      m.name.toLowerCase().includes(scanQuery.trim().toLowerCase())
                    );
                    if (match) {
                      handleQuickAddMedicine(match);
                    }
                  }
                }}
                className="w-full bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl pl-9 pr-24 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
              />
              <Scan className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
              <div className="absolute right-2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold rounded border border-slate-200 dark:border-slate-600">
                  F2
                </kbd>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <Zap className="w-3 h-3" /> POS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={rapidAddMode}
                onChange={(e) => setRapidAddMode(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Rapid Add Mode</span>
            </label>
          </div>
        </div>

        {/* 12-Column Grid */}
        <div className="p-3 sm:p-4">
          <InvoiceItemsGrid
            mode="Sale"
            items={items}
            columnConfig={columnConfig}
            catalogMedicines={medicines}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddRow={handleAddRow}
          />
        </div>

        {/* Financial Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>Customer Udhar Khata:</span>
                <span className={balanceDue > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {balanceDue > 0 ? `Unpaid Balance: Rs ${balanceDue.toLocaleString()}` : 'Cleared'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Sale deduction will update item inventory balances and cashier daily register.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-bold">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  Rs {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Discount:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-xs text-right font-mono"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 font-bold min-w-[80px] text-right">
                    -Rs {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Tax:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-xs text-right font-mono"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold min-w-[80px] text-right">
                    +Rs {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 dark:text-white">Grand Total:</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  Rs {finalGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Received (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-32 bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl px-2.5 py-1 text-xs font-mono font-black text-right text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-slate-600 dark:text-slate-400">
                <span>Balance Due:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  Rs {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/sale/invoices')}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveInvoice(true, false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Save & Print</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveInvoice(false, true)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Save & New</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveInvoice(false, false)}
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Sale</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modals */}
      <InvoiceColumnSettingsModal
        isOpen={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        storageKey="mbi_sale_columns_config"
        config={columnConfig}
        onChange={(updated) => setColumnConfig(updated)}
        title="Sale Invoice Column Settings Switchboard"
      />

      <AddPartyModal
        isOpen={isAddPartyModalOpen}
        onClose={() => setIsAddPartyModalOpen(false)}
        initialType="Customer"
        onSaveSuccess={(newParty) => {
          setParties(prev => [newParty, ...prev]);
          handleSelectCustomer(newParty);
        }}
      />

      <KeyboardShortcutsCheatSheetModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

    </div>
  );
};

export default SaleInvoicePage;
