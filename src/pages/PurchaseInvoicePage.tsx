import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Building2, User, Phone, Calendar, Hash, CreditCard, Sparkles, 
  Plus, Trash2, Settings, Printer, Share2, ArrowLeft, CheckCircle2, 
  AlertTriangle, Scan, Keyboard, FileText, Image as ImageIcon, 
  Upload, X, RefreshCw, ShieldCheck, Zap, HelpCircle, ArrowRight
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbPurchaseOrders, dbAuditLogs, dbPartyPayments } from '../lib/db';
import { Medicine, Supplier, PurchaseOrder } from '../types';
import { InvoiceColumnConfig, DEFAULT_INVOICE_COLUMN_CONFIG } from '../types/invoice';
import { InvoiceItemsGrid, GridRowItem } from '../components/invoice/InvoiceItemsGrid';
import { InvoiceColumnSettingsModal } from '../components/invoice/InvoiceColumnSettingsModal';
import { AddPartyModal } from '../components/parties/AddPartyModal';
import { KeyboardShortcutsCheatSheetModal } from '../components/common/KeyboardShortcutsCheatSheetModal';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { addPurchaseStockToMedicine } from '../lib/stockRotationEngine';
import { v4 as uuidv4 } from 'uuid';
import { emitToast } from '../contexts/ToastContext';

// In-memory shared catalog cache for 0ms instant loading
let cachedPurchaseSuppliers: Supplier[] = [];
let cachedPurchaseMedicines: Medicine[] = [];

export const PurchaseInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { business, currentUser, activeUser, activeRole, canPerform, canAccess } = useAuth();
  const { settings } = useSettings();

  // Suppliers & Catalog (Instant 0ms from in-memory cache)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => cachedPurchaseSuppliers);
  const [medicines, setMedicines] = useState<Medicine[]>(() => cachedPurchaseMedicines);
  const [isLoading, setIsLoading] = useState(() => cachedPurchaseMedicines.length === 0);

  // Modals
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Column Configuration with localStorage persistence
  const [columnConfig, setColumnConfig] = useState<InvoiceColumnConfig>(() => {
    try {
      const stored = localStorage.getItem('mbi_purchase_columns_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_INVOICE_COLUMN_CONFIG;
  });

  // Header State
  const [isCredit, setIsCredit] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [billingName, setBillingName] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  const [billNumber, setBillNumber] = useState(() => `PUR-${Date.now().toString().slice(-6)}`);
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Quick Bar & Scan State
  const [scanQuery, setScanQuery] = useState('');
  const [rapidAddMode, setRapidAddMode] = useState(true);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Grid Items State (Init with 4 clean rows)
  const [items, setItems] = useState<GridRowItem[]>(() => [
    { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 },
    { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 },
    { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 },
    { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 }
  ]);

  // Additional Inward Attachments & Notes
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [documentAttachment, setDocumentAttachment] = useState<string | null>(null);

  // Financial Bottom Totals
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [isRoundOff, setIsRoundOff] = useState<boolean>(true);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Load Data with Live Real-Time Catalog Sync
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        const [loadedSuppliers, loadedMeds] = await Promise.all([
          dbSuppliers.getAll(),
          dbMedicines.getAll()
        ]);
        if (!isMounted) return;
        cachedPurchaseSuppliers = loadedSuppliers || [];
        cachedPurchaseMedicines = loadedMeds || [];
        setSuppliers(cachedPurchaseSuppliers);
        setMedicines(cachedPurchaseMedicines);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadAll();

    // Real-Time 0ms Event Listeners: Sync catalog when new items or suppliers are saved
    const handleStorage = (e: StorageEvent) => {
      if (e.key && (e.key.includes('item') || e.key.includes('med') || e.key.includes('supp') || e.key.includes('part') || e.key.includes('sync'))) {
        loadAll();
      }
    };

    window.addEventListener('mbi-medicines-updated', loadAll);
    window.addEventListener('mbi-items-updated', loadAll);
    window.addEventListener('mbi-parties-updated', loadAll);
    window.addEventListener('mbi-suppliers-updated', loadAll);
    window.addEventListener('mbi-data-synced', loadAll);
    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener('mbi-medicines-updated', loadAll);
      window.removeEventListener('mbi-items-updated', loadAll);
      window.removeEventListener('mbi-parties-updated', loadAll);
      window.removeEventListener('mbi-suppliers-updated', loadAll);
      window.removeEventListener('mbi-data-synced', loadAll);
      window.removeEventListener('storage', handleStorage);
    };
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

  // Filtered Suppliers for Autocomplete
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return suppliers.slice(0, 8);
    const q = supplierSearchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.company?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    ).slice(0, 10);
  }, [suppliers, supplierSearchQuery]);

  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplierId(s.id);
    setSupplierName(s.name);
    setSupplierPhone(s.phone || '');
    setBillingName(s.company || s.name);
    setIsSupplierDropdownOpen(false);
    setSupplierSearchQuery(s.name);
    if (s.paymentTerms) setPaymentTerms(s.paymentTerms);
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
      { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 }
    ]);
  };

  // Quick Bar Scan or Enter Add
  const handleQuickAddMedicine = (med: Medicine) => {
    const newRow: GridRowItem = {
      tempId: uuidv4(),
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName,
      strength: med.strength,
      manufacturer: med.manufacturer,
      barcode: med.barcode,
      batchNumber: med.batchNumber || `B-${Date.now().toString().slice(-4)}`,
      expiryDate: med.expiryDate || '',
      mrp: med.mrp || med.salePrice || 0,
      quantity: 1,
      unit: med.unit || 'Box',
      pricePerUnit: med.purchasePrice || med.salePrice || 0,
      total: med.purchasePrice || med.salePrice || 0
    };

    setItems(prev => {
      // If the first row is empty, replace it
      if (prev.length === 1 && !prev[0].name) {
        return [newRow];
      }
      return [...prev, newRow];
    });

    setScanQuery('');
    emitToast(`Added ${med.name} to purchase inward bill`, 'success');
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

  // Auto set paid amount if cash mode
  useEffect(() => {
    if (!isCredit) {
      setPaidAmount(finalGrandTotal);
    }
  }, [finalGrandTotal, isCredit]);

  // Save Inward Purchase
  const handleSavePurchase = async (shouldPrint: boolean = false, resetAfter: boolean = false) => {
    const isAllowed = 
      activeRole === 'Primary Admin' ||
      activeRole === 'Secondary Admin' ||
      activeRole === 'Admin' ||
      activeRole === 'Store Manager' ||
      activeRole === 'Pharmacist' ||
      canPerform('canCreatePurchase') ||
      canAccess('purchase');

    if (!isAllowed) {
      alert(`🔒 Access Denied: Your role (${activeRole}) cannot save purchase bills.`);
      return;
    }

    const validItems = items.filter(it => it.name && it.name.trim().length > 0);
    if (validItems.length === 0) {
      alert('Please add at least 1 medicine / item to the purchase bill.');
      return;
    }

    if (!supplierName.trim()) {
      alert('Please specify the Supplier / Distributor name.');
      return;
    }

    setIsSaving(true);
    try {
      const purchaseRecord: PurchaseOrder = {
        id: uuidv4(),
        poNumber: poNumber || billNumber,
        orderNumber: billNumber,
        billNumber: billNumber,
        supplierId: selectedSupplierId || undefined,
        supplierName: supplierName.trim(),
        partyId: selectedSupplierId || undefined,
        date: new Date(billDate).toISOString(),
        status: 'Completed',
        totalAmount: finalGrandTotal,
        paidAmount: Number(paidAmount) || 0,
        balanceDue: balanceDue,
        items: validItems.map(it => ({
          id: it.id || uuidv4(),
          medicineId: it.medicineId || uuidv4(),
          name: it.name,
          batchNumber: it.batchNumber || 'BATCH-01',
          expiryDate: it.expiryDate || '12/2028',
          quantity: it.quantity,
          freeQuantity: it.freeQuantity || 0,
          purchasePrice: it.pricePerUnit,
          mrp: it.mrp || it.pricePerUnit,
          unitPrice: it.pricePerUnit,
          sellingPrice: it.mrp || (it.pricePerUnit * 1.15),
          unit: it.unit || 'Box',
          total: it.total,
          discountPercentage: it.discountPercentage || 0,
          taxPercentage: it.taxPercentage || 0
        })),
        description: description || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to IndexedDB
      await dbPurchaseOrders.save(purchaseRecord);

      // Inward stock into inventory catalog & batches with expiry
      for (const item of purchaseRecord.items) {
        if (!item.name || !item.name.trim()) continue;
        try {
          const existingMed = (item.medicineId ? medicines.find(m => m.id === item.medicineId) : null) ||
            medicines.find(m => m.name.toLowerCase().trim() === item.name.toLowerCase().trim()) || null;

          const updatedMed = addPurchaseStockToMedicine(
            existingMed,
            {
              name: item.name,
              batchNumber: item.batchNumber || 'BATCH-01',
              expiryDate: item.expiryDate || '12/2028',
              quantity: Number(item.quantity) || 1,
              freeQuantity: Number(item.freeQuantity) || 0,
              purchasePrice: Number(item.purchasePrice || (item as any).unitPrice) || 0,
              sellingPrice: Number(item.sellingPrice) || (Number(item.purchasePrice || (item as any).unitPrice) * 1.15) || 0,
              mrp: Number(item.mrp) || Number(item.sellingPrice) || 0,
              unit: item.unit || 'Box',
              purchaseBillId: billNumber
            },
            supplierName.trim(),
            new Date(billDate).toISOString()
          );

          await dbMedicines.save(updatedMed);
        } catch (e) {
          console.warn('Could not inward stock for medicine', item.name, e);
        }
      }

      // Sync Supplier Khata / Balance
      if (selectedSupplierId) {
        try {
          const supplier = suppliers.find(p => p.id === selectedSupplierId);
          if (supplier) {
            const currentBal = supplier.balance || 0;
            const updatedBal = currentBal + balanceDue;
            await dbSuppliers.save({
              ...supplier,
              balance: updatedBal,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (supErr) {
          console.warn('Supplier balance sync warning:', supErr);
        }
      }

      // Universal Payment-Out Auto Log (for Cash & Bank sync)
      const numericPaid = Number(paidAmount) || 0;
      if (numericPaid > 0) {
        try {
          await dbPartyPayments.save({
            id: uuidv4(),
            partyId: selectedSupplierId || 'distributor_general',
            partyName: supplierName.trim(),
            type: 'PAYMENT_OUT',
            amount: numericPaid,
            date: new Date(billDate).toISOString(),
            paymentMode: isCredit ? 'Cash' : 'Cash',
            referenceNumber: billNumber,
            receiptNumber: `VOUCHER-${billNumber}`,
            notes: `Auto Payment-Out for Purchase Bill #${billNumber}`,
            recordedBy: activeUser?.name || 'Admin',
            isAuto: true,
            createdAt: new Date().toISOString()
          });
        } catch (payErr) {
          console.warn('Auto Payment-Out voucher save warning:', payErr);
        }
      }

      // Dispatch global sync events for 0ms reactivity
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-stock-updated'));
        window.dispatchEvent(new CustomEvent('mbi-medicines-updated'));
        window.dispatchEvent(new CustomEvent('mbi-purchases-updated'));
        window.dispatchEvent(new CustomEvent('dashboard-metrics-updated'));
        window.dispatchEvent(new CustomEvent('mbi-dashboard-updated'));
        window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { storeName: 'purchaseOrders' } }));
        window.dispatchEvent(new CustomEvent('mbi-local-db-change', { detail: { store: 'purchaseOrders' } }));
      }

      // Record audit log
      try {
        await dbAuditLogs.save({
          id: uuidv4(),
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          action: 'PO_RECEIVE',
          userId: activeUser?.id || currentUser?.uid || 'admin',
          details: `Inward Purchase Bill ${billNumber} for ${supplierName} of Rs ${finalGrandTotal.toLocaleString()}`
        });
      } catch {}

      emitToast(`Purchase bill ${billNumber} saved & stock updated successfully!`, 'success');

      if (shouldPrint) {
        window.print();
      }

      if (resetAfter) {
        setBillNumber(`PUR-${Date.now().toString().slice(-6)}`);
        setItems([
          { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 },
          { tempId: uuidv4(), name: '', quantity: 0, unit: 'Box', pricePerUnit: 0, total: 0 }
        ]);
        setDescription('');
      } else {
        navigate('/purchases');
      }
    } catch (err: any) {
      console.error('Error saving purchase bill:', err);
      alert(`Error saving purchase bill: ${err.message || 'Unknown error'}`);
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
            onClick={() => navigate('/purchases')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Back to Purchases"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Inward Purchase Bill Entry
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                12-Column Grid
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record distributor purchases, bonus schemes, batches, and auto-restock inventory
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
        
        {/* SECTION 1: HEADER SECTION */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Supplier Selector */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Supplier / Distributor *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(true)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={supplierName}
                  placeholder="Search supplier..."
                  onChange={(e) => {
                    setSupplierName(e.target.value);
                    setSupplierSearchQuery(e.target.value);
                    setIsSupplierDropdownOpen(true);
                  }}
                  onFocus={() => setIsSupplierDropdownOpen(true)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Autocomplete Flyout */}
              {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto p-1 text-xs">
                  {filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSupplier(s)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-[10.5px] text-slate-400">{s.company || s.phone || 'Supplier'}</p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 font-bold">
                        Bal: Rs {(s.balance || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Supplier Phone & Bill Ref */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Supplier Bill Ref / Invoice #
              </label>
              <input
                type="text"
                value={supplierInvoiceRef}
                placeholder="e.g. INV-98231"
                onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* 3. Inward Bill No & Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Internal Bill # & Date
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={billNumber}
                  readOnly
                  className="w-1/2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 text-center"
                />
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 4. Payment Mode & Terms */}
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

          {/* Optional PO Number Row */}
          {columnConfig.showPoNumber && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Purchase Order (P.O.) #
                </label>
                <input
                  type="text"
                  value={poNumber}
                  placeholder="PO-2026-001"
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  P.O. Date
                </label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}

        </div>

        {/* SECTION 2: TOP ACTION & QUICK SCAN BAR */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          
          {/* Quick Search & Scan Input */}
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
                className="w-full bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-700 rounded-xl pl-9 pr-24 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
              />
              <Scan className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
              <div className="absolute right-2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold rounded border border-slate-200 dark:border-slate-600">
                  F2
                </kbd>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <Zap className="w-3 h-3" /> Auto
                </span>
              </div>
            </div>
          </div>

          {/* Rapid Add Mode & Row Controls */}
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={rapidAddMode}
                onChange={(e) => setRapidAddMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Rapid Add Mode</span>
            </label>
          </div>
        </div>

        {/* SECTION 3: 12-COLUMN INWARD PURCHASE GRID */}
        <div className="p-3 sm:p-4">
          <InvoiceItemsGrid
            mode="Purchase"
            items={items}
            columnConfig={columnConfig}
            catalogMedicines={medicines}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddRow={handleAddRow}
          />
        </div>

        {/* SECTION 4: ATTACHMENTS & EXTRA NOTES BUTTONS */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setShowDescription(prev => !prev)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>{showDescription ? 'Hide Notes' : '+ Add Description'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImageUpload(prev => !prev)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showImageUpload ? 'Hide Image' : '+ Add Paper Bill Photo'}</span>
          </button>
        </div>

        {/* Notes & Upload Expandable Sections */}
        {showDescription && (
          <div className="px-4 pb-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add supplier invoice remarks, payment instructions or delivery notes..."
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {showImageUpload && (
          <div className="px-4 pb-3">
            <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
              <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Upload paper invoice scan</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageAttachment(file.name);
                    emitToast(`Attached file: ${file.name}`, 'info');
                  }
                }}
                className="mt-2 text-xs text-slate-500"
              />
              {imageAttachment && (
                <p className="text-xs text-emerald-600 font-bold mt-1">Attached: {imageAttachment}</p>
              )}
            </div>
          </div>
        )}

        {/* SECTION 5: FOOTER TOTALS & SUMMARY CALCULATION */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
            
            {/* Left Note & Payment Status Indicator */}
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>Distributor Khata Status:</span>
                  <span className={balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                    {balanceDue > 0 ? `Unsettled Due: Rs ${balanceDue.toLocaleString()}` : 'Fully Paid'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Stocks will be placed under active batches with FEFO sorting rule immediately upon saving.
                </p>
              </div>
            </div>

            {/* Right Financial Breakdown */}
            <div className="space-y-2 text-xs">
              
              {/* Subtotal */}
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-bold">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  Rs {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Trade Discount */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Trade Discount:</span>
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

              {/* Tax / GST */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Tax / GST:</span>
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

              {/* Round Off */}
              <div className="flex items-center justify-between text-slate-500">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRoundOff}
                    onChange={(e) => setIsRoundOff(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span>Round Off:</span>
                </label>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {roundOffDiff > 0 ? `+${roundOffDiff}` : roundOffDiff}
                </span>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 dark:text-white">Grand Total:</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  Rs {finalGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Paid vs Balance Due Cards */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                {/* Received / Paid Amount Input Box */}
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 rounded-xl p-2.5">
                  <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
                    Paid / Received (Rs.)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 rounded-lg px-2.5 py-1.5 text-base font-black text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right shadow-xs font-mono"
                  />
                </div>

                {/* Balance Due Display Box */}
                <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 rounded-xl p-2.5 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Balance Due
                  </span>
                  <span className="text-base font-black text-amber-950 dark:text-amber-100 text-right font-mono">
                    Rs. {Math.max(0, finalGrandTotal - paidAmount).toFixed(2)}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 6: BOTTOM ACTION BUTTONS */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSavePurchase(true, false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Save & Print</span>
            </button>

            <button
              type="button"
              onClick={() => handleSavePurchase(false, true)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Save & New</span>
            </button>

            <button
              type="button"
              onClick={() => handleSavePurchase(false, false)}
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Purchase</span>
            </button>
          </div>

        </div>

      </div>

      {/* Modals */}
      <InvoiceColumnSettingsModal
        isOpen={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        storageKey="mbi_purchase_columns_config"
        config={columnConfig}
        onChange={(updated) => setColumnConfig(updated)}
        title="Purchase Bill Column Settings Switchboard"
      />

      <AddPartyModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        initialType="Supplier"
        onSaveSuccess={(newSupplier) => {
          setSuppliers(prev => [newSupplier as Supplier, ...prev]);
          handleSelectSupplier(newSupplier as Supplier);
        }}
      />

      <KeyboardShortcutsCheatSheetModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

    </div>
  );
};

export default PurchaseInvoicePage;
