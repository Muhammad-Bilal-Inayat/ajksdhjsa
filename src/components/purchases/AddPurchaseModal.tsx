import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Plus, Trash2, Check, Zap, Calculator, Settings, 
  Search, Calendar, Camera, Upload, Image as ImageIcon,
  ChevronDown, FileText, CheckCircle2, AlertCircle, AlertTriangle, ShoppingBag, 
  ArrowRight, Sparkles, Building2, User, Minus, Maximize2, Minimize2,
  Clock, Keyboard, Scan, Receipt, Phone, Printer, ArrowLeftRight, UserPlus,
  HelpCircle, CheckSquare, Hash, Tag, Truck
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { Medicine, Supplier, PurchaseOrder, PurchaseBillItem, Party } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { v4 as uuidv4 } from 'uuid';
import { emitToast } from '../../contexts/ToastContext';
import { addPurchaseStockToMedicine } from '../../lib/stockRotationEngine';
import { playScannerBeep } from '../../lib/barcodeAudio';
import { CalculatorModal } from '../sales/CalculatorModal';
import { AddPartyModal } from '../parties/AddPartyModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { KeyboardShortcutsCheatSheetModal } from '../common/KeyboardShortcutsCheatSheetModal';
import { InvoiceSettingsModal } from '../sales/InvoiceSettingsModal';
import { PurchasePrintModal } from './PurchasePrintModal';
import { PurchaseColumnSettingsModal, PurchaseColumnSettings, DEFAULT_PURCHASE_COLUMNS } from './PurchaseColumnSettingsModal';

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

const UNIT_OPTIONS = ['Box', 'Pack', 'Strip', 'Piece', 'Pcs', 'Bottle', 'Vial', 'Ampoule', 'Kg', 'Gm', 'Tube', 'Sachet'];

export interface PurchaseItemRow {
  tempId: string;
  medicineId?: string;
  name: string;
  hsnCode?: string;
  batchNumber: string;
  expiryDate: string;
  mfgDate?: string;
  mrp: number;
  quantity: number;
  freeQuantity: number;
  discountPercentage: number;
  unit: string;
  pricePerUnit: number; // Purchase Cost / Buy Rate
  gstPercentage: number;
  total: number;
}

export interface PurchaseBillTab {
  id: string;
  tabName: string; // e.g. "Purchase PUR-1"
  transactionType: 'Purchase' | 'Purchase Order' | 'Purchase Return';
  isCredit: boolean;
  mode: 'cash' | 'credit';
  selectedSupplierId: string;
  supplier: Supplier | null;
  supplierName: string;
  billingName: string;
  supplierPhone: string;
  supplierBillNumber: string;
  billDate: string;
  poNumber: string;
  poDate: string;
  paymentTerms: string; // 'Due on Receipt' | 'Net 15' | 'Net 30'
  dueDate: string;
  items: PurchaseItemRow[];
  customFields: Record<string, string>; // Bilty #, Gate Pass, etc.
  description: string;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  freightAmount: number;
  isRoundOff: boolean;
  roundOffAmount: number;
  paidAmount: number;
  paymentMode: 'Cash' | 'Credit' | 'Bank Transfer' | 'Cheque';
  imageAttachment?: string;
  documentAttachment?: string;
}

const createEmptyPurchaseRow = (): PurchaseItemRow => ({
  tempId: uuidv4(),
  name: '',
  hsnCode: '',
  batchNumber: '',
  expiryDate: '',
  mfgDate: '',
  mrp: 0,
  quantity: 0,
  freeQuantity: 0,
  discountPercentage: 0,
  unit: 'Box',
  pricePerUnit: 0,
  gstPercentage: 0,
  total: 0
});

const createEmptyPurchaseRows = (count: number = 5): PurchaseItemRow[] => 
  Array.from({ length: count }).map(() => createEmptyPurchaseRow());

const createDefaultInitialTab = (transType: string = 'Purchase'): PurchaseBillTab => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return {
    id: uuidv4(),
    tabName: 'Purchase PUR-1',
    transactionType: (transType as any) || 'Purchase',
    isCredit: false,
    mode: 'cash',
    selectedSupplierId: '',
    supplier: null,
    supplierName: '',
    billingName: '',
    supplierPhone: '',
    supplierBillNumber: 'PUR-1',
    billDate: todayStr,
    poNumber: `PO-${Date.now().toString().slice(-5)}`,
    poDate: todayStr,
    paymentTerms: 'Due on Receipt',
    dueDate: todayStr,
    items: createEmptyPurchaseRows(5),
    customFields: {},
    description: '',
    discountPercentage: 0,
    discountAmount: 0,
    taxPercentage: 0,
    freightAmount: 0,
    isRoundOff: false,
    roundOffAmount: 0,
    paidAmount: 0,
    paymentMode: 'Cash'
  };
};

export const AddPurchaseModal: React.FC<PurchaseBillModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialOrder,
  transactionType = 'Purchase',
  dockDraftId,
  isDockMinimized,
  onMinimizeChange,
  onSummaryChange
}) => {
  const { business, activeUser, activeRole, canPerform, canAccess, tenant, tenantId } = useAuth();
  const { settings } = useSettings();
  let dockCtx: ReturnType<typeof useTransactionDock> | null = null;
  try {
    dockCtx = useTransactionDock();
  } catch {
    // context optional if rendered standalone
  }

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 1. Multi-Tab Purchase Workspace Logic: manage purchaseTabs state initialized with default tab
  const [purchaseTabs, setPurchaseTabs] = useState<PurchaseBillTab[]>(() => [createDefaultInitialTab(transactionType)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => purchaseTabs[0]?.id || '');

  // 2. Aux Modals & Controls
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOrderData, setPrintOrderData] = useState<PurchaseOrder | null>(null);

  // Column visibility settings synced with global settings live
  const columnSettings = useMemo<PurchaseColumnSettings>(() => {
    let savedCols: Partial<PurchaseColumnSettings> = {};
    try {
      const saved = localStorage.getItem('mbi_purchase_column_settings');
      if (saved) savedCols = JSON.parse(saved);
    } catch {}

    return {
      hsnSac: settings.print?.tableColumns?.hsnSac ?? savedCols.hsnSac ?? false,
      batchNo: settings.print?.tableColumns?.batchNo ?? savedCols.batchNo ?? true,
      expDate: settings.print?.tableColumns?.expDate ?? savedCols.expDate ?? true,
      mfgDate: settings.print?.tableColumns?.mfgDate ?? savedCols.mfgDate ?? false,
      mrp: settings.print?.tableColumns?.mrp ?? savedCols.mrp ?? true,
      freeQty: settings.transaction?.freeItemQuantity ?? savedCols.freeQty ?? false,
      discount: settings.print?.tableColumns?.discount ?? savedCols.discount ?? true,
      unit: settings.print?.tableColumns?.unit !== false,
      taxPercent: settings.print?.tableColumns?.taxPercent ?? savedCols.taxPercent ?? false,
      supplierPhone: settings.transaction?.customerPhone !== false,
      billingName: settings.transaction?.billingNameOfParties ?? savedCols.billingName ?? true,
      paymentTerms: settings.transaction?.dueDatesAndPaymentTerms ?? savedCols.paymentTerms ?? true,
      dueDate: settings.transaction?.dueDatesAndPaymentTerms ?? savedCols.dueDate ?? true,
      poNumber: settings.transaction?.customerPoDetails ?? savedCols.poNumber ?? true,
      poDate: settings.transaction?.customerPoDetails ?? savedCols.poDate ?? true,
      customFields: savedCols.customFields ?? true
    };
  }, [settings]);

  // Window Controls & Minimize State
  const [isMaximized, setIsMaximized] = useState(true);
  const [internalMinimized, setInternalMinimized] = useState(false);
  const isMinimized = isDockMinimized !== undefined ? isDockMinimized : internalMinimized;
  const isJustSavedRef = useRef<boolean>(false);

  // Sync active invoice editing state with task dock so dock never overlays billing action buttons
  useEffect(() => {
    if (isOpen && !isMinimized) {
      dockCtx?.setIsEditingInvoice(true);
      return () => {
        dockCtx?.setIsEditingInvoice(false);
      };
    } else {
      dockCtx?.setIsEditingInvoice(false);
    }
  }, [isOpen, isMinimized, dockCtx]);

  const clearActiveDraft = () => {
    try {
      const draftKey = `mbi_purchase_draft_${tenant?.id || business?.id || 'demo'}`;
      localStorage.removeItem(draftKey);
      isJustSavedRef.current = true;
    } catch (e) {}
  };

  // Auto-save active draft purchase bill tabs for session / power interrupt protection
  useEffect(() => {
    if (isJustSavedRef.current) {
      isJustSavedRef.current = false;
      return;
    }
    if (purchaseTabs.length > 0) {
      try {
        const draftKey = `mbi_purchase_draft_${tenant?.id || business?.id || 'demo'}`;
        const hasValidDraft = purchaseTabs.some(t => t.items && t.items.some(i => i.name && i.name.trim().length > 0));
        if (hasValidDraft) {
          localStorage.setItem(draftKey, JSON.stringify(purchaseTabs));
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch (e) {}
    }
  }, [purchaseTabs, tenant, business]);

  // 2. REPLICATE EXACT RAPID ADD ROW STATE (Screenshot 1 & 2)
  const [rapidMode, setRapidMode] = useState<boolean>(true);
  const [rapidQuery, setRapidQuery] = useState('');
  const [rapidSearchResults, setRapidSearchResults] = useState<Medicine[]>([]);
  const [rapidSelectedIndex, setRapidSelectedIndex] = useState(0);
  const [isRapidDropdownOpen, setIsRapidDropdownOpen] = useState(false);
  const [selectedRapidMed, setSelectedRapidMed] = useState<Medicine | null>(null);
  const rapidInputRef = useRef<HTMLInputElement>(null);

  const [rapidRow, setRapidRow] = useState({
    hsn: '',
    batch: '',
    exp: '',
    mrp: 0,
    qty: 0,
    free_qty: 0,
    disc: 0,
    unit: 'Box',
    price: 0,
    tax: 0
  });

  // Supplier Dropdown & Autocomplete
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Item Search Dropdown per row
  const [activeItemDropdownTempId, setActiveItemDropdownTempId] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Custom field creation input
  const [isAddingCustomField, setIsAddingCustomField] = useState(false);
  const [newCustomFieldName, setNewCustomFieldName] = useState('');

  // Attachments & Notes
  const [showDescription, setShowDescription] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Load suppliers and medicines catalog
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

        const todayStr = new Date().toISOString().slice(0, 10);
        const due30Str = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const defaultBillNo = `PUR-1`;

        if (initialOrder) {
          const sup = (loadedSuppliers || []).find(s => s.id === (initialOrder.supplierId || initialOrder.partyId)) || null;
          const isCred = initialOrder.status === 'Unpaid' || (initialOrder.paymentType as string) === 'Credit';
          const initialTab: PurchaseBillTab = {
            id: 'tab-edit-purchase',
            tabName: `Purchase ${initialOrder.billNumber || initialOrder.poNumber || defaultBillNo}`,
            transactionType: (initialOrder.transactionType as any) || transactionType || 'Purchase',
            isCredit: isCred,
            mode: isCred ? 'credit' : 'cash',
            selectedSupplierId: initialOrder.supplierId || initialOrder.partyId || '',
            supplier: sup,
            supplierName: initialOrder.supplierName || initialOrder.partyName || '',
            billingName: initialOrder.supplierName || initialOrder.partyName || '',
            supplierPhone: sup?.phone || '',
            supplierBillNumber: initialOrder.billNumber || initialOrder.poNumber || defaultBillNo,
            billDate: initialOrder.date ? initialOrder.date.slice(0, 10) : todayStr,
            poNumber: initialOrder.poNumber || defaultBillNo,
            poDate: todayStr,
            paymentTerms: 'Net 30',
            dueDate: due30Str,
            items: Array.isArray(initialOrder.items) && initialOrder.items.length > 0
              ? initialOrder.items.map((it: any) => ({
                  tempId: uuidv4(),
                  medicineId: it.medicineId,
                  name: it.name || it.medicineName || '',
                  hsnCode: it.hsnCode || '',
                  batchNumber: it.batchNumber || '',
                  expiryDate: it.expiryDate || '',
                  mfgDate: it.mfgDate || '',
                  mrp: it.mrp || it.sellingPrice || 0,
                  quantity: it.quantity || 1,
                  freeQuantity: it.freeQuantity || 0,
                  discountPercentage: it.discountPercentage || it.discount || 0,
                  unit: it.unit || 'Box',
                  pricePerUnit: it.purchasePrice || it.unitPrice || 0,
                  gstPercentage: it.gstPercentage || 0,
                  total: it.total || (it.quantity * (it.purchasePrice || it.unitPrice || 0))
                }))
              : createEmptyPurchaseRows(5),
            customFields: {},
            description: initialOrder.description || '',
            discountPercentage: 0,
            discountAmount: 0,
            taxPercentage: 0,
            freightAmount: 0,
            isRoundOff: false,
            roundOffAmount: 0,
            paidAmount: initialOrder.paidAmount || 0,
            paymentMode: (initialOrder.paymentType as any) || (isCred ? 'Credit' : 'Cash'),
            imageAttachment: initialOrder.imageAttachment,
            documentAttachment: initialOrder.documentAttachment
          };
          setPurchaseTabs([initialTab]);
          setActiveTabId(initialTab.id);
          if (initialOrder.description) setShowDescription(true);
        } else {
          // Check if there is an unsaved purchase draft from session / power interruption
          let restoredDraftTabs: PurchaseBillTab[] | null = null;
          try {
            const draftKey = `mbi_purchase_draft_${tenant?.id || business?.id || 'demo'}`;
            const rawDraft = localStorage.getItem(draftKey);
            if (rawDraft) {
              const parsed = JSON.parse(rawDraft);
              if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((t: any) => t.items && t.items.some((i: any) => i.name && i.name.trim().length > 0))) {
                restoredDraftTabs = parsed;
              }
            }
          } catch (e) {}

          if (restoredDraftTabs) {
            setPurchaseTabs(restoredDraftTabs);
            setActiveTabId(restoredDraftTabs[0].id);
            emitToast('⚡ Restored active purchase draft after session/power interruption!', 'info');
          } else {
            const defaultTab: PurchaseBillTab = {
              id: uuidv4(),
              tabName: 'Purchase PUR-1',
              transactionType: transactionType as any || 'Purchase',
              isCredit: false,
              mode: 'cash',
              selectedSupplierId: '',
              supplier: null,
              supplierName: '',
              billingName: '',
              supplierPhone: '',
              supplierBillNumber: `PUR-1`,
              billDate: todayStr,
              poNumber: `PO-${Date.now().toString().slice(-5)}`,
              poDate: todayStr,
              paymentTerms: 'Due on Receipt',
              dueDate: todayStr,
              items: createEmptyPurchaseRows(5),
              customFields: {},
              description: '',
              discountPercentage: 0,
              discountAmount: 0,
              taxPercentage: 0,
              freightAmount: 0,
              isRoundOff: false,
              roundOffAmount: 0,
              paidAmount: 0,
              paymentMode: 'Cash'
            };
            setPurchaseTabs([defaultTab]);
            setActiveTabId(defaultTab.id);
          }
        }
      } catch (err) {
        console.warn('Failed to load purchase modal dependencies:', err);
      }
    };

    loadData();
  }, [isOpen, initialOrder, transactionType]);

  // Current active tab
  const currentTab: PurchaseBillTab = useMemo(() => {
    return purchaseTabs.find(t => t.id === activeTabId) || purchaseTabs[0] || createDefaultInitialTab(transactionType);
  }, [purchaseTabs, activeTabId, transactionType]);

  const updateCurrentTab = (updates: Partial<PurchaseBillTab>) => {
    if (!currentTab) return;
    setPurchaseTabs(prev => prev.map(t => (t.id === currentTab.id ? { ...t, ...updates } : t)));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Keyboard Shortcuts (F2: Rapid Mode, F4: Supplier Focus, F8: Save & Print, F9/Ctrl+S: Save, F12: Shortcuts)
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setRapidMode(prev => !prev);
        if (!rapidMode && rapidInputRef.current) {
          rapidInputRef.current.focus();
        }
        emitToast(`Rapid Mode ${!rapidMode ? 'Activated (⚡ Scan & Type)' : 'Deactivated'}`, 'info');
      } else if (e.key === 'F4') {
        e.preventDefault();
        supplierInputRef.current?.focus();
        supplierInputRef.current?.select();
      } else if (e.key === 'F8' || ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P'))) {
        e.preventDefault();
        handleSavePurchase('save_and_print');
      } else if (e.key === 'F9' || ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        handleSavePurchase('save');
      } else if (e.key === 'F12') {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isCalculatorOpen) setIsCalculatorOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else if (isSupplierDropdownOpen) setIsSupplierDropdownOpen(false);
        else if (isRapidDropdownOpen) setIsRapidDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, rapidMode, currentTab, isCalculatorOpen, isSettingsOpen, showShortcutsModal, isSupplierDropdownOpen, isRapidDropdownOpen]);

  // Selected supplier object
  const selectedSupplier = useMemo(() => {
    if (!currentTab) return null;
    return suppliers.find(s => s.id === currentTab.selectedSupplierId) || currentTab.supplier || null;
  }, [suppliers, currentTab?.selectedSupplierId, currentTab?.supplier]);

  // Filtered suppliers for quick search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliers;
    const q = supplierSearchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.phone && s.phone.includes(q)) || 
      (s.city && s.city.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearchQuery]);

  // Real-time Math & Financial Totals Engine
  const totals = useMemo(() => {
    if (!currentTab) return { totalQty: 0, subTotal: 0, discAmt: 0, taxAmt: 0, freight: 0, roundOff: 0, grandTotal: 0, paid: 0, balanceDue: 0 };

    // Total Qty = Sum of regular Qty + Free Qty
    const totalQty = currentTab.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) + (Number(item.freeQuantity) || 0), 0);
    
    // Subtotal = Sum of all item amounts (Item Amount = (Qty * Price/Unit) - ((Qty * Price/Unit) * Disc% / 100) + Tax)
    const subTotal = currentTab.items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);

    // Global Trade discount
    const discAmt = currentTab.discountAmount > 0 
      ? currentTab.discountAmount 
      : (subTotal * (currentTab.discountPercentage || 0)) / 100;

    // Global Tax / GST
    const taxableSub = Math.max(0, subTotal - discAmt);
    const taxAmt = (taxableSub * (currentTab.taxPercentage || 0)) / 100;

    // Freight charges
    const freight = Number(currentTab.freightAmount) || 0;

    // Raw total before round off
    const rawTotal = Math.max(0, taxableSub + taxAmt + freight);

    // Auto Round Off (e.g. rounds 452.70 to 453.00 and displays diff +0.30)
    const roundOff = currentTab.isRoundOff ? (Math.round(rawTotal) - rawTotal) : 0;
    const grandTotal = Math.max(0, rawTotal + roundOff);

    // Cash / Credit mode calculations:
    let paid = Number(currentTab.paidAmount) || 0;
    if (currentTab.mode === 'cash' || !currentTab.isCredit) {
      paid = grandTotal;
    }
    const balanceDue = Math.max(0, grandTotal - paid);

    return {
      totalQty,
      subTotal,
      discAmt,
      taxAmt,
      freight,
      roundOff,
      grandTotal,
      paid,
      balanceDue
    };
  }, [currentTab]);

  // Sync summary up to host dock if docked
  useEffect(() => {
    if (onSummaryChange && currentTab) {
      onSummaryChange({
        partyName: currentTab.supplierName || 'PUR-1',
        amount: totals.grandTotal,
        itemCount: totals.totalQty,
        title: `Purchase - ${currentTab.supplier?.name || currentTab.supplierName || 'PUR-1'}`
      });
    }
  }, [totals, currentTab?.supplierName, onSummaryChange]);

  // Update line item calculation
  const recalculateRow = (row: Partial<PurchaseItemRow>): PurchaseItemRow => {
    const qty = Number(row.quantity) || 0;
    const freeQty = Number(row.freeQuantity) || 0;
    const price = Number(row.pricePerUnit) || 0;
    const disc = Number(row.discountPercentage) || 0;
    const tax = Number(row.gstPercentage) || 0;

    const base = qty * price;
    const discVal = (base * disc) / 100;
    const taxable = Math.max(0, base - discVal);
    const taxVal = (taxable * tax) / 100;
    const total = Math.max(0, taxable + taxVal);

    return {
      tempId: row.tempId || uuidv4(),
      medicineId: row.medicineId,
      name: row.name || '',
      hsnCode: row.hsnCode || '',
      batchNumber: row.batchNumber || '',
      expiryDate: row.expiryDate || '',
      mfgDate: row.mfgDate || '',
      mrp: Number(row.mrp) || 0,
      quantity: qty,
      freeQuantity: freeQty,
      discountPercentage: disc,
      unit: row.unit || 'Box',
      pricePerUnit: price,
      gstPercentage: tax,
      total
    };
  };

  const handleUpdateItem = (index: number, updates: Partial<PurchaseItemRow>) => {
    if (!currentTab) return;
    const newItems = [...currentTab.items];
    const updated = recalculateRow({ ...newItems[index], ...updates });
    newItems[index] = updated;
    updateCurrentTab({ items: newItems });
  };

  const handleDeleteItem = (index: number) => {
    if (!currentTab) return;
    const newItems = currentTab.items.filter((_, idx) => idx !== index);
    if (newItems.length === 0) {
      newItems.push(createEmptyPurchaseRow());
    }
    updateCurrentTab({ items: newItems });
  };

  const handleAddNewRow = (focusNewRow: boolean = true) => {
    if (!currentTab) return;
    const newRow = recalculateRow({ quantity: 0, unit: 'Box', pricePerUnit: 0, mrp: 0, total: 0 });
    const newItems = [...currentTab.items, newRow];
    updateCurrentTab({ items: newItems });

    if (focusNewRow) {
      requestAnimationFrame(() => {
        const nextIndex = newItems.length - 1;
        const el = document.querySelector<HTMLInputElement>(`[data-pcell="name-${nextIndex}"]`);
        if (el) {
          el.focus();
          el.select();
        }
      });
    }
  };

  // Select medicine object for row
  const handleSelectMedicineForRow = (index: number, med: Medicine) => {
    if (!currentTab) return;
    const latestPur = med.purchasePrice || (med as any).costPrice || (med as any).latestPurchasePrice || 0;
    handleUpdateItem(index, {
      medicineId: med.id,
      name: med.name,
      hsnCode: med.hsnCode || '3004.9090',
      batchNumber: med.batchNumber || `B-${Date.now().toString().slice(-4)}`,
      expiryDate: med.expiryDate || '12/2028',
      mfgDate: med.manufacturingDate || '',
      mrp: med.mrp || med.sellingPrice || 0,
      unit: med.unit || 'Box',
      pricePerUnit: latestPur,
      gstPercentage: med.gstPercentage || 0
    });
    setActiveItemDropdownTempId(null);

    // Focus Qty input on row
    requestAnimationFrame(() => {
      const qtyEl = document.querySelector<HTMLInputElement>(`[data-pcell="qty-${index}"]`);
      if (qtyEl) {
        qtyEl.focus();
        qtyEl.select();
      }
    });
  };

  // 1. Add new tab: Purchase PUR-${tabs.length + 1}
  const handleAddNewTab = () => {
    const nextTabNum = purchaseTabs.length + 1;
    const nextBillNo = `PUR-${nextTabNum}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const newTab: PurchaseBillTab = {
      id: uuidv4(),
      tabName: `Purchase PUR-${nextTabNum}`,
      transactionType: 'Purchase',
      isCredit: false,
      mode: 'cash',
      selectedSupplierId: '',
      supplier: null,
      supplierName: '',
      billingName: '',
      supplierPhone: '',
      supplierBillNumber: nextBillNo,
      billDate: todayStr,
      poNumber: `PO-${Date.now().toString().slice(-5)}`,
      poDate: todayStr,
      paymentTerms: 'Due on Receipt',
      dueDate: todayStr,
      items: createEmptyPurchaseRows(5),
      customFields: {},
      description: '',
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 0,
      freightAmount: 0,
      isRoundOff: false,
      roundOffAmount: 0,
      paidAmount: 0,
      paymentMode: 'Cash'
    };
    setPurchaseTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Close specific tab and fallback to previous tab
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (purchaseTabs.length === 1) {
      clearActiveDraft();
      onClose();
      return;
    }
    const idx = purchaseTabs.findIndex(t => t.id === tabId);
    const filtered = purchaseTabs.filter(t => t.id !== tabId);
    setPurchaseTabs(filtered);
    if (activeTabId === tabId) {
      const nextActiveIdx = Math.max(0, idx - 1);
      setActiveTabId(filtered[nextActiveIdx].id);
    }
  };

  // 2. RAPID SEARCH & COMMIT LOGIC (Screenshot 1 Match)
  const handleRapidSearch = (q: string) => {
    setRapidQuery(q);
    if (q.trim().length > 0) {
      const clean = q.toLowerCase();
      const matches = medicines.filter(m => 
        m.name.toLowerCase().includes(clean) ||
        (m.barcode && m.barcode.includes(clean)) ||
        ((m as any).genericSalt && (m as any).genericSalt.toLowerCase().includes(clean)) ||
        ((m as any).genericFormula && (m as any).genericFormula.toLowerCase().includes(clean)) ||
        ((m as any).genericName && (m as any).genericName.toLowerCase().includes(clean))
      ).slice(0, 10);
      setRapidSearchResults(matches);
      setIsRapidDropdownOpen(matches.length > 0);
      setRapidSelectedIndex(0);
    } else {
      setRapidSearchResults([]);
      setIsRapidDropdownOpen(false);
      setSelectedRapidMed(null);
    }
  };

  const handleSelectRapidMedicine = (med: Medicine) => {
    setSelectedRapidMed(med);
    setRapidQuery(med.name);
    const latestPur = med.purchasePrice || (med as any).costPrice || (med as any).latestPurchasePrice || 0;
    setRapidRow({
      hsn: med.hsnCode || '3004.9090',
      batch: med.batchNumber || `B-${Date.now().toString().slice(-4)}`,
      exp: med.expiryDate || '12/2028',
      mrp: med.mrp || med.sellingPrice || 0,
      qty: 0,
      free_qty: 0,
      disc: 0,
      unit: med.unit || 'Box',
      price: latestPur,
      tax: med.gstPercentage || 0
    });
    setIsRapidDropdownOpen(false);
  };

  const commitRapidRow = () => {
    if (!currentTab) return;
    const nameToUse = rapidQuery.trim() || selectedRapidMed?.name || '';
    if (!nameToUse) {
      emitToast('Please scan barcode or enter item name first', 'warning');
      rapidInputRef.current?.focus();
      return;
    }

    playScannerBeep();

    const newRowItem: PurchaseItemRow = recalculateRow({
      tempId: uuidv4(),
      medicineId: selectedRapidMed?.id,
      name: nameToUse,
      hsnCode: rapidRow.hsn || '3004.9090',
      batchNumber: rapidRow.batch || `B-${Date.now().toString().slice(-4)}`,
      expiryDate: rapidRow.exp || '12/2028',
      mrp: Number(rapidRow.mrp) || 0,
      quantity: Number(rapidRow.qty) || 0,
      freeQuantity: Number(rapidRow.free_qty) || 0,
      discountPercentage: Number(rapidRow.disc) || 0,
      unit: rapidRow.unit || 'Box',
      pricePerUnit: Number(rapidRow.price) || 0,
      gstPercentage: Number(rapidRow.tax) || 0
    });

    // Replace first blank row or append
    const blankIdx = currentTab.items.findIndex(it => !it.name || it.name.trim() === '');
    if (blankIdx >= 0) {
      const updated = [...currentTab.items];
      updated[blankIdx] = newRowItem;
      updateCurrentTab({ items: updated });
    } else {
      updateCurrentTab({ items: [...currentTab.items, newRowItem] });
    }

    emitToast(`Added "${nameToUse}" to purchase bill`, 'success');

    // Reset rapid row state & keep focus on rapid input for next item
    setRapidQuery('');
    setSelectedRapidMed(null);
    setRapidRow({
      hsn: '',
      batch: '',
      exp: '',
      mrp: 0,
      qty: 0,
      free_qty: 0,
      disc: 0,
      unit: 'Box',
      price: 0,
      tax: 0
    });
    setIsRapidDropdownOpen(false);
    requestAnimationFrame(() => {
      rapidInputRef.current?.focus();
    });
  };

  const handleRapidKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isRapidDropdownOpen && rapidSearchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRapidSelectedIndex(prev => (prev + 1) % rapidSearchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRapidSelectedIndex(prev => (prev - 1 + rapidSearchResults.length) % rapidSearchResults.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = rapidSearchResults[rapidSelectedIndex];
        if (selected) {
          handleSelectRapidMedicine(selected);
        } else {
          commitRapidRow();
        }
      } else if (e.key === 'Escape') {
        setIsRapidDropdownOpen(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitRapidRow();
    }
  };

  const computedRapidAmount = useMemo(() => {
    const qty = Number(rapidRow.qty) || 1;
    const price = Number(rapidRow.price) || 0;
    const disc = Number(rapidRow.disc) || 0;
    const tax = Number(rapidRow.tax) || 0;
    const base = qty * price;
    const discAmt = (base * disc) / 100;
    const taxable = Math.max(0, base - discAmt);
    const taxAmt = (taxable * tax) / 100;
    return taxable + taxAmt;
  }, [rapidRow]);

  // Keyboard navigation across table cells: Enter / Tab / Arrows
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    columnKey: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const columnOrder = ['hsn', 'name', 'batch', 'exp', 'mrp', 'qty', 'freeQty', 'disc', 'unit', 'price', 'tax'];
      const currentIdx = columnOrder.indexOf(columnKey);
      if (currentIdx < columnOrder.length - 1) {
        const nextCol = columnOrder[currentIdx + 1];
        const nextEl = document.querySelector<HTMLInputElement>(`[data-pcell="${nextCol}-${rowIndex}"]`);
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      } else {
        if (rowIndex < currentTab.items.length - 1) {
          const nextRowEl = document.querySelector<HTMLInputElement>(`[data-pcell="name-${rowIndex + 1}"]`);
          if (nextRowEl) {
            nextRowEl.focus();
            nextRowEl.select();
          }
        } else {
          handleAddNewRow(true);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < currentTab.items.length - 1) {
        e.preventDefault();
        const downEl = document.querySelector<HTMLInputElement>(`[data-pcell="${columnKey}-${rowIndex + 1}"]`);
        if (downEl) {
          downEl.focus();
          downEl.select();
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const upEl = document.querySelector<HTMLInputElement>(`[data-pcell="${columnKey}-${rowIndex - 1}"]`);
        if (upEl) {
          upEl.focus();
          upEl.select();
        }
      }
    }
  };

  // 7. Save Purchase Inward & Backend Engine
  const handleSavePurchase = async (mode: 'save' | 'save_and_new' | 'save_and_print' = 'save') => {
    if (!currentTab) return;

    const isAllowed = 
      activeRole === 'Primary Admin' ||
      activeRole === 'Secondary Admin' ||
      activeRole === 'Admin' ||
      activeRole === 'Store Manager' ||
      activeRole === 'Pharmacist' ||
      canPerform('canCreatePurchase') ||
      canAccess('purchase');

    if (!isAllowed) {
      emitToast(`🔒 Access Denied: Your role (${activeRole}) cannot save purchase bills.`, 'error');
      return;
    }

    const validItems = currentTab.items.filter(it => it.name && it.name.trim() !== '' && (Number(it.quantity) > 0 || Number(it.freeQuantity) > 0));

    if (validItems.length === 0) {
      emitToast('Please enter at least 1 medicine item to inward purchase.', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      const orderId = initialOrder?.id || uuidv4();
      const sName = currentTab.supplierName || selectedSupplier?.name || 'General Supplier';
      const sId = currentTab.selectedSupplierId || selectedSupplier?.id || 'sup_general';

      const purchaseOrderRecord: PurchaseOrder = {
        id: orderId,
        poNumber: currentTab.supplierBillNumber || currentTab.poNumber,
        billNumber: currentTab.supplierBillNumber,
        orderNumber: currentTab.supplierBillNumber,
        date: currentTab.billDate,
        supplierId: sId,
        supplierName: sName,
        partyId: sId,
        partyName: sName,
        status: totals.balanceDue === 0 ? 'Paid' : totals.paid > 0 ? 'Partial' : 'Unpaid',
        paymentType: currentTab.mode === 'credit' ? 'Credit' : currentTab.paymentMode,
        transactionType: currentTab.transactionType,
        items: validItems.map((it, idx) => ({
          id: `poi_${idx}_${Date.now()}`,
          medicineId: it.medicineId || `med_${idx}_${Date.now()}`,
          name: it.name,
          hsnCode: it.hsnCode,
          quantity: Number(it.quantity) || 1,
          freeQuantity: Number(it.freeQuantity) || 0,
          purchasePrice: Number(it.pricePerUnit) || 0,
          mrp: Number(it.mrp) || 0,
          sellingPrice: Number(it.mrp) || Number(it.pricePerUnit) || 0,
          batchNumber: it.batchNumber || `B-${Date.now().toString().slice(-4)}`,
          expiryDate: it.expiryDate || '12/2028',
          mfgDate: it.mfgDate,
          unit: it.unit,
          discountPercentage: Number(it.discountPercentage) || 0,
          gstPercentage: Number(it.gstPercentage) || 0,
          total: Number(it.total) || 0
        })),
        totalAmount: totals.grandTotal,
        subTotal: totals.subTotal,
        paidAmount: totals.paid,
        balanceDue: totals.balanceDue,
        description: currentTab.description,
        imageAttachment: currentTab.imageAttachment,
        documentAttachment: currentTab.documentAttachment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Save Purchase Order in Local DB
      await dbPurchaseOrders.save(purchaseOrderRecord);

      // 2. Inward Stock into Medicine Batches with purchase cost & expiry
      for (const item of validItems) {
        if (!item.name || !item.name.trim()) continue;
        const existingMed = (item.medicineId ? await dbMedicines.getById(item.medicineId) : null) || 
          medicines.find(m => m.name.toLowerCase() === item.name.trim().toLowerCase()) || null;

        const updatedMed = addPurchaseStockToMedicine(
          existingMed,
          {
            name: item.name,
            batchNumber: item.batchNumber || 'MAIN',
            expiryDate: item.expiryDate || '12/2028',
            mfgDate: item.mfgDate,
            quantity: Number(item.quantity) || 1,
            freeQuantity: Number(item.freeQuantity) || 0,
            purchasePrice: Number(item.pricePerUnit) || 0,
            sellingPrice: Number(item.mrp) || (existingMed?.sellingPrice) || 0,
            mrp: Number(item.mrp) || (existingMed?.mrp) || 0,
            hsnCode: item.hsnCode,
            purchaseBillId: currentTab.supplierBillNumber
          },
          sName,
          sId
        );
        await dbMedicines.save(updatedMed);
      }

      // 3. Update Supplier Balance & Khata Ledger
      if (selectedSupplier && sId !== 'sup_general') {
        const updatedBalance = (selectedSupplier.balance || 0) + totals.balanceDue;
        await dbSuppliers.save({
          ...selectedSupplier,
          balance: updatedBalance,
          updatedAt: new Date().toISOString()
        });
      }

      // 4. Audit Log Entry
      await dbAuditLogs.save({
        id: uuidv4(),
        date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        action: 'CREATE_PURCHASE',
        details: `Inward Purchase Bill #${currentTab.supplierBillNumber} from ${sName} (Total: ${formatCurrency(totals.grandTotal)}, ${validItems.length} items)`,
        userId: activeUser?.name || 'Admin'
      });

      // 5. Background sync with backend API /api/purchases
      try {
        fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...purchaseOrderRecord,
            cashierName: activeUser?.name || 'Admin',
            items: validItems
          })
        }).catch(() => {});
      } catch {
        // Silent catch for offline mode
      }

      // 6. Global Event Broadcasts for instant synchronization across Sales POS, Inventory, and Dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mbi-stock-updated'));
        window.dispatchEvent(new CustomEvent('mbi-purchases-updated'));
        window.dispatchEvent(new CustomEvent('mbi-dashboard-refresh'));
        window.dispatchEvent(new Event('mbi-local-db-change'));
      }

      clearActiveDraft();
      emitToast(`✅ Purchase Bill #${currentTab.supplierBillNumber} saved & stock inward complete!`, 'success');
      onSaved(purchaseOrderRecord);

      if (mode === 'save_and_print') {
        setPrintOrderData(purchaseOrderRecord);
        setIsPrintModalOpen(true);
      } else if (mode === 'save_and_new') {
        handleAddNewTab();
      } else {
        if (purchaseTabs.length > 1) {
          handleCloseTab(currentTab.id, { stopPropagation: () => {} } as any);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Error saving purchase bill:', err);
      emitToast(`Failed to save purchase: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // 1. MINIMIZED STATE: If managed by dock layer, dock layer renders unified active tasks dock
  if (isMinimized && onMinimizeChange) {
    return null;
  }

  // Minimized floating pill for standalone mode
  if (isMinimized) {
    const activeTasksCount = dockCtx ? dockCtx.drafts.filter(d => d.isMinimized).length || 1 : 1;
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 bg-slate-950/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-800 pointer-events-auto select-none animate-in slide-in-from-bottom-3 duration-200">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 pr-2 border-r border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Active Tasks {activeTasksCount}/5
        </span>
        
        <div 
          onClick={() => {
            if (onMinimizeChange) onMinimizeChange(false);
            setInternalMinimized(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Purchase - {currentTab?.supplier?.name || currentTab?.supplierName || 'PUR-1'}</span>
          <Maximize2 
            onClick={(e) => {
              e.stopPropagation();
              if (onMinimizeChange) onMinimizeChange(false);
              setInternalMinimized(false);
            }} 
            className="w-3.5 h-3.5 ml-1 hover:text-white" 
          />
          <X 
            onClick={(e) => {
              e.stopPropagation();
              clearActiveDraft();
              onClose();
            }} 
            className="w-3.5 h-3.5 hover:text-rose-400" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 select-none animate-in fade-in duration-150">
      <div className={`w-full h-full sm:h-[96vh] sm:max-h-[96vh] bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 ${isMaximized ? 'sm:h-full sm:max-h-full sm:rounded-none' : ''}`}>

        {/* 1. TOP DARK HEADER (Fixed Top) */}
        <div className="shrink-0 bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-4 py-2 flex items-center justify-between select-none">
          
          {/* Left: Multi-Tab Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[60vw]">
            {purchaseTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer group shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="truncate max-w-[130px]">{tab.tabName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${tab.mode === 'credit' ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'}`}>
                    {tab.mode}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded-md hover:bg-white/20 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Close tab"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* + Add New Blank Tab Button */}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0 flex items-center gap-1 text-xs font-bold px-2.5"
              title="Add new inward purchase tab"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Tab</span>
            </button>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Rapid Scan Mode Indicator */}
            <button
              type="button"
              onClick={() => {
                setRapidMode(prev => !prev);
                if (!rapidMode && rapidInputRef.current) rapidInputRef.current.focus();
                emitToast(`Rapid Scan Mode ${!rapidMode ? 'Activated (⚡ F2)' : 'Deactivated'}`, 'info');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                rapidMode 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Rapid Mode (F2)"
            >
              <Zap className={`w-3.5 h-3.5 ${rapidMode ? 'fill-amber-300 text-amber-300 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Rapid (F2)</span>
            </button>

            {/* Print Voucher (Ctrl+P / F8) */}
            <button
              type="button"
              onClick={() => handleSavePurchase('save_and_print')}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Print Voucher (Ctrl+P / F8)"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Print</span>
            </button>

            {/* Calculator Modal */}
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(prev => !prev)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Calculator (Alt+C)"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Calc</span>
            </button>

            {/* Keyboard Shortcuts (F12) */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(prev => !prev)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Keyboard Shortcuts (F12)"
            >
              <Keyboard className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">F12</span>
            </button>

            {/* Column & Grid Settings Modal */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Column & Grid Settings"
            >
              <Settings className="w-4 h-4 text-slate-400 hover:rotate-45 transition-transform" />
              <span className="hidden md:inline">Columns</span>
            </button>

            {/* Minimize to Dock Button */}
            <button
              type="button"
              onClick={() => {
                if (onMinimizeChange) onMinimizeChange(true);
                setInternalMinimized(true);
                emitToast('Minimized Purchase bill to floating dock', 'info');
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Minimize to Dock"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized(prev => !prev)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isMaximized ? "Restore Window" : "Maximize Fullscreen"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Workspace */}
            <button
              type="button"
              onClick={() => {
                clearActiveDraft();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
              title="Close Workspace (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. SCROLLABLE WORKSPACE BODY (Everything scrolls cleanly with zero overlap) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          
          {/* Supplier & Header Inputs Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex flex-wrap items-end gap-2.5 text-xs">
              
              {/* Mode Switch: Cash / Credit Toggle */}
              <div className="w-full sm:w-36 shrink-0">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Payment Mode
                </label>
                <div className="flex items-center p-0.5 bg-slate-200 dark:bg-slate-700/80 rounded-xl h-[34px]">
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ isCredit: false, mode: 'cash', paymentMode: 'Cash' })}
                    className={`flex-1 h-full rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1 ${
                      currentTab?.mode === 'cash'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Cash</span>
                    <span className="text-[9px] opacity-80">(Bal: 0)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ isCredit: true, mode: 'credit', paymentMode: 'Credit' })}
                    className={`flex-1 h-full rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1 ${
                      currentTab?.mode === 'credit'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Credit</span>
                    <span className="text-[9px] opacity-80">(Khata)</span>
                  </button>
                </div>
              </div>

              {/* Supplier Autocomplete Search */}
              <div className="flex-1 min-w-[220px] relative" ref={supplierDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-500" />
                    <span>Supplier / Vendor (F4)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Add Supplier</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    ref={supplierInputRef}
                    type="text"
                    value={supplierSearchQuery || currentTab?.supplierName || ''}
                    onChange={(e) => {
                      setSupplierSearchQuery(e.target.value);
                      updateCurrentTab({ supplierName: e.target.value });
                      setIsSupplierDropdownOpen(true);
                    }}
                    onFocus={() => setIsSupplierDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
                        setIsSupplierDropdownOpen(false);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsSupplierDropdownOpen(false), 200);
                    }}
                    placeholder="Search supplier by name or phone..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-medium h-[34px]"
                  />
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Autocomplete Dropdown with Payable Balance & Credit Terms */}
                {isSupplierDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto">
                    <div className="p-1.5 space-y-1">
                      {filteredSuppliers.map((sup) => (
                        <div
                          key={sup.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateCurrentTab({
                              selectedSupplierId: sup.id,
                              supplier: sup,
                              supplierName: sup.name,
                              billingName: sup.name,
                              supplierPhone: sup.phone || '',
                              paymentTerms: (sup as any).creditDays ? `Net ${(sup as any).creditDays}` : currentTab.paymentTerms
                            });
                            setSupplierSearchQuery('');
                            setIsSupplierDropdownOpen(false);
                          }}
                          className="px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{sup.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {sup.phone && <span>📞 {sup.phone}</span>}
                              {sup.city && <span>📍 {sup.city}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                              (sup.balance || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            }`}>
                              Payable: {formatCurrency(sup.balance || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-between">
                          <span>No suppliers found.</span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsSupplierDropdownOpen(false);
                              setIsAddSupplierOpen(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            + Add Supplier
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier Phone */}
              {columnSettings.supplierPhone && (
                <div className="w-full sm:w-32 shrink-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Supplier Phone
                  </label>
                  <input
                    type="text"
                    value={currentTab?.supplierPhone || ''}
                    onChange={(e) => updateCurrentTab({ supplierPhone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white h-[34px]"
                  />
                </div>
              )}

              {/* Inward Bill / Inv Number */}
              <div className="w-full sm:w-24 shrink-0">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Bill / Inv #
                </label>
                <input
                  type="text"
                  value={currentTab?.supplierBillNumber || ''}
                  onChange={(e) => updateCurrentTab({ supplierBillNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600 dark:text-blue-400 h-[34px]"
                />
              </div>

              {/* Bill Date */}
              <div className="w-full sm:w-36 shrink-0">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Bill Date
                </label>
                <input
                  type="date"
                  value={currentTab?.billDate || ''}
                  onChange={(e) => updateCurrentTab({ billDate: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white h-[34px]"
                />
              </div>

              {/* Payment Terms */}
              {columnSettings.paymentTerms && (
                <div className="w-full sm:w-32 shrink-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Terms
                  </label>
                  <select
                    value={currentTab?.paymentTerms || 'Due on Receipt'}
                    onChange={(e) => updateCurrentTab({ paymentTerms: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white h-[34px]"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              )}

              {/* Due Date */}
              {columnSettings.dueDate && (
                <div className="w-full sm:w-36 shrink-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={currentTab?.dueDate || ''}
                    onChange={(e) => updateCurrentTab({ dueDate: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white h-[34px]"
                  />
                </div>
              )}

              {/* PO Number */}
              {columnSettings.poNumber && (
                <div className="w-full sm:w-28 shrink-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    P.O. #
                  </label>
                  <input
                    type="text"
                    value={currentTab?.poNumber || ''}
                    onChange={(e) => updateCurrentTab({ poNumber: e.target.value })}
                    placeholder="PO-123"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white h-[34px]"
                  />
                </div>
              )}

            </div>

            {/* Custom Fields Row (Bilty #, Gate Pass, Vehicle #) */}
            {columnSettings.customFields && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-500" />
                  <span>Custom Fields:</span>
                </span>

                {/* Existing custom fields */}
                {Object.entries(currentTab?.customFields || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{key}:</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const updated = { ...currentTab.customFields, [key]: e.target.value };
                        updateCurrentTab({ customFields: updated });
                      }}
                      className="w-24 px-1 py-0.5 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...currentTab.customFields };
                        delete updated[key];
                        updateCurrentTab({ customFields: updated });
                      }}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add Custom Field Button / Input */}
                {isAddingCustomField ? (
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-blue-400 rounded-lg px-2 py-0.5 animate-in fade-in">
                    <input
                      type="text"
                      value={newCustomFieldName}
                      onChange={(e) => setNewCustomFieldName(e.target.value)}
                      placeholder="Field name (e.g. Bilty #, Gate Pass)"
                      className="w-40 px-1 py-0.5 text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCustomFieldName.trim()) {
                          updateCurrentTab({
                            customFields: {
                              ...currentTab.customFields,
                              [newCustomFieldName.trim()]: ''
                            }
                          });
                          setNewCustomFieldName('');
                          setIsAddingCustomField(false);
                        } else if (e.key === 'Escape') {
                          setIsAddingCustomField(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCustomFieldName.trim()) {
                          updateCurrentTab({
                            customFields: {
                              ...currentTab.customFields,
                              [newCustomFieldName.trim()]: ''
                            }
                          });
                        }
                        setNewCustomFieldName('');
                        setIsAddingCustomField(false);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomField(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomField(true)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900/40"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Custom Field</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Exact Items Header Row Above Grid matching Screenshot 1 */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">ITEMS PURCHASED</span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {(currentTab?.items || []).filter(it => it.name && it.name.trim() !== '').length} items
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Barcode Gun / USB Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-xl select-none">
                <Scan className="w-3.5 h-3.5" />
                <span>Scan Barcode</span>
                <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500 text-white rounded font-bold">Gun/USB</span>
              </div>

              {/* Rapid Add Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setRapidMode(!rapidMode)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer select-none"
              >
                <Zap className="w-3.5 h-3.5 text-blue-600 animate-pulse fill-blue-600" />
                <span>Rapid Add Mode (F2)</span>
              </button>
            </div>
          </div>

          {/* Mobile-Optimized Billed Items View for Purchases */}
          <div className="md:hidden bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">Purchased Items</span>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {(currentTab?.items || []).filter(i => i.name?.trim()).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all items from this purchase bill?')) {
                      updateCurrentTab({ items: [createEmptyPurchaseRow()] });
                    }
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Items
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewRow(false)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* 4-Column Mobile Items Table (Item Name | Qty | Rate | Amount) */}
            <div className="w-full">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-1 w-[40%]">Item Name</th>
                    <th className="py-2 px-1 text-center w-[18%]">Qty</th>
                    <th className="py-2 px-1 text-right w-[20%]">Rate</th>
                    <th className="py-2 px-1 text-right w-[22%]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentTab?.items || []).map((item, index) => {
                    const itemRate = Number(item.pricePerUnit) || 0;
                    const itemQty = Number(item.quantity) || 0;
                    const itemAmt = Number(item.total) || (itemQty * itemRate);

                    return (
                      <tr key={item.tempId || index} className="border-b border-dashed border-slate-300 dark:border-slate-700">
                        {/* Item Name & Dynamic Configured Field Pills */}
                        <td className="py-2.5 px-1 align-top">
                          <div className="flex items-start gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(index)}
                              className="text-slate-300 hover:text-rose-600 p-0.5 mt-0.5 shrink-0"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="min-w-0 flex-1 relative">
                              <input
                                type="text"
                                placeholder="Medicine name..."
                                value={item.name || ''}
                                onClick={() => setActiveItemDropdownTempId(item.tempId)}
                                onFocus={() => setActiveItemDropdownTempId(item.tempId)}
                                onChange={(e) => {
                                  handleUpdateItem(index, { name: e.target.value });
                                  setActiveItemDropdownTempId(item.tempId);
                                }}
                                className="w-full font-bold text-slate-900 dark:text-white bg-transparent text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-400 rounded px-1 truncate cursor-pointer"
                              />

                              {/* Mobile Row Medicine Selection Dropdown */}
                              {activeItemDropdownTempId === item.tempId && (
                                <div 
                                  className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto ring-4 ring-blue-500/10"
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex justify-between items-center sticky top-0 z-10">
                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                      <Plus className="w-3 h-3" /> Select Medicine
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { e.stopPropagation(); setActiveItemDropdownTempId(null); }}
                                      className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {/* On-the-spot Add Item row */}
                                  <div
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const queryName = (item.name || '').trim();
                                      setActiveItemDropdownTempId(null);
                                      handleUpdateItem(index, { name: queryName || 'Custom Medicine' });
                                    }}
                                    className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 hover:from-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold border-b border-blue-200 dark:border-blue-800 flex items-center justify-between cursor-pointer text-xs transition-all"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">+</span>
                                      <span>+ Use Item "<strong>{(item.name || '').trim() || 'New Item'}</strong>"</span>
                                    </div>
                                  </div>
                                  {(() => {
                                    const query = (item.name || '').toLowerCase().trim();
                                    const matches = query
                                      ? medicines.filter(m => (m.name && m.name.toLowerCase().includes(query)) || (m.barcode && m.barcode.toLowerCase().includes(query)) || (m.genericName && m.genericName.toLowerCase().includes(query))).slice(0, 15)
                                      : medicines.slice(0, 15);
                                      
                                    if (matches.length === 0) {
                                      return (
                                        <div className="p-3 text-center text-slate-400 text-xs">
                                          No matching medicines found.
                                        </div>
                                      );
                                    }
                                    
                                    return matches.map(rowMed => {
                                      const rowCost = rowMed.purchasePrice || (rowMed as any).costPrice || (rowMed as any).latestPurchasePrice || 0;
                                      return (
                                        <button
                                          key={rowMed.id}
                                          type="button"
                                          onClick={() => handleSelectMedicineForRow(index, rowMed)}
                                          className="w-full px-2.5 py-2 text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{rowMed.name}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                              <span>Stock: <strong className="text-slate-700 dark:text-slate-300">{rowMed.quantity || 0}</strong></span>
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">Cost: Rs {rowCost}</div>
                                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">+ Pick</span>
                                          </div>
                                        </button>
                                      );
                                    });
                                  })()}
                                </div>
                              )}

                              {/* Mobile Dynamic Configured Column Fields & Details */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {columnSettings.batchNo && (
                                  <input
                                    type="text"
                                    placeholder="Batch"
                                    value={item.batchNumber || ''}
                                    onChange={(e) => handleUpdateItem(index, { batchNumber: e.target.value })}
                                    className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded max-w-[80px] text-slate-700 dark:text-slate-300"
                                  />
                                )}
                                {columnSettings.expDate && (
                                  <input
                                    type="text"
                                    placeholder="Exp (MM/YY)"
                                    value={item.expiryDate || ''}
                                    onChange={(e) => handleUpdateItem(index, { expiryDate: e.target.value })}
                                    className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded max-w-[80px] text-slate-700 dark:text-slate-300"
                                  />
                                )}
                                {columnSettings.hsnSac && (
                                  <input
                                    type="text"
                                    placeholder="HSN"
                                    value={item.hsnCode || ''}
                                    onChange={(e) => handleUpdateItem(index, { hsnCode: e.target.value })}
                                    className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded max-w-[65px] text-slate-700 dark:text-slate-300"
                                  />
                                )}
                                {columnSettings.mrp && (
                                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 text-[10px]">
                                    <span className="text-amber-700 dark:text-amber-400 font-bold">MRP:</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.mrp || ''}
                                      onChange={(e) => handleUpdateItem(index, { mrp: parseFloat(e.target.value) || 0 })}
                                      className="w-12 bg-transparent text-right font-mono font-bold text-amber-800 dark:text-amber-300 outline-none"
                                    />
                                  </div>
                                )}
                                {columnSettings.unit && (
                                  <select
                                    value={item.unit || 'Box'}
                                    onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                                    className="text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                                  >
                                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                )}
                                {columnSettings.discount && (
                                  <div className="flex items-center gap-0.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5 text-[10px]">
                                    <span className="text-blue-700 dark:text-blue-400 font-bold">Disc:</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.discountPercentage || ''}
                                      onChange={(e) => handleUpdateItem(index, { discountPercentage: parseFloat(e.target.value) || 0 })}
                                      className="w-8 bg-transparent text-center font-bold text-blue-800 dark:text-blue-300 outline-none"
                                    />
                                    <span className="text-blue-600">%</span>
                                  </div>
                                )}
                                {columnSettings.taxPercent && (
                                  <div className="flex items-center gap-0.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded px-1.5 py-0.5 text-[10px]">
                                    <span className="text-purple-700 dark:text-purple-400 font-bold">Tax:</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.gstPercentage || ''}
                                      onChange={(e) => handleUpdateItem(index, { gstPercentage: parseFloat(e.target.value) || 0 })}
                                      className="w-8 bg-transparent text-center font-bold text-purple-800 dark:text-purple-300 outline-none"
                                    />
                                    <span className="text-purple-600">%</span>
                                  </div>
                                )}
                                {columnSettings.freeQty && (
                                  <div className="flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded px-1.5 py-0.5 text-[10px]">
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Free:</span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={item.freeQuantity || ''}
                                      onChange={(e) => handleUpdateItem(index, { freeQuantity: parseFloat(e.target.value) || 0 })}
                                      className="w-8 bg-transparent text-center font-bold text-emerald-800 dark:text-emerald-300 outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="py-2.5 px-1 align-top text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity === 0 ? '0' : item.quantity}
                            placeholder="0"
                            onFocus={(e) => {
                              setActiveItemDropdownTempId(null);
                              e.target.select();
                            }}
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value);
                              handleUpdateItem(index, { quantity: isNaN(parsed) ? 0 : parsed });
                            }}
                            className="w-full max-w-[50px] mx-auto text-center font-bold text-xs py-1 px-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-2.5 px-1 align-top text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={itemRate === 0 ? '' : itemRate}
                            placeholder="0"
                            onChange={(e) => handleUpdateItem(index, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                            className="w-full max-w-[62px] ml-auto text-right font-bold text-xs py-1 px-1 rounded-lg focus:outline-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                          />
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-1 align-top text-right font-black text-slate-900 dark:text-white text-xs">
                          Rs {itemAmt.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Summary Row */}
                  <tr className="font-black text-slate-900 dark:text-white bg-slate-50/90 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300">Total</td>
                    <td className="py-2.5 px-1 text-center font-mono text-xs">{totals.totalQty}</td>
                    <td className="py-2.5 px-1"></td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs text-blue-900 dark:text-blue-300">
                      Rs {totals.subTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Add item row button */}
            <button
              type="button"
              onClick={() => handleAddNewRow(false)}
              className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-dashed border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item Row</span>
            </button>
          </div>

          {/* 12-Column Items Grid Table (Desktop View) */}
          <div className="hidden md:block border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 overflow-x-auto shadow-xs min-h-[220px]">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Table Header */}
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 select-none">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 min-w-[240px]">ITEM / MEDICINE NAME</th>
                  {columnSettings.hsnSac && <th className="p-2.5 min-w-[90px]">HSN/SAC</th>}
                  {columnSettings.batchNo && <th className="p-2.5 min-w-[100px]">BATCH NO.</th>}
                  {columnSettings.expDate && <th className="p-2.5 min-w-[110px]">EXP. DATE</th>}
                  {columnSettings.mrp && <th className="p-2.5 min-w-[80px] text-right">MRP</th>}
                  <th className="p-2.5 min-w-[70px] text-center">QTY</th>
                  {columnSettings.freeQty && <th className="p-2.5 min-w-[70px] text-center text-amber-600 dark:text-amber-400">FREE QTY</th>}
                  {columnSettings.discount && <th className="p-2.5 min-w-[70px] text-center">DISC %</th>}
                  {columnSettings.unit && <th className="p-2.5 min-w-[80px]">UNIT</th>}
                  <th className="p-2.5 min-w-[90px] text-right text-emerald-600 dark:text-emerald-400">PRICE/UNIT</th>
                  {columnSettings.taxPercent && <th className="p-2.5 min-w-[80px] text-center">TAX/GST</th>}
                  <th className="p-2.5 min-w-[100px] text-right font-black">AMOUNT</th>
                  <th className="p-2.5 w-10 text-center">ACTION</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                
                {/* Exact ⚡ Rapid Add Row #1 (Screenshot 1 Match) */}
                {rapidMode && (
                  <tr className="bg-blue-50/50 dark:bg-blue-950/30 border-b-2 border-blue-200 dark:border-blue-800/80">
                    <td className="p-2 text-center">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto" />
                    </td>
                    
                    {/* Wide Search / Barcode Input */}
                    <td className="p-1.5 min-w-[240px] relative">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 pointer-events-none" />
                        <input
                          ref={rapidInputRef}
                          type="text"
                          value={rapidQuery}
                          onChange={(e) => handleRapidSearch(e.target.value)}
                          onKeyDown={handleRapidKeyDown}
                          placeholder="Scan Barcode or Search Medicine (F2)..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 dark:text-white shadow-2xs"
                          autoFocus
                        />
                      </div>

                      {/* Live Autocomplete suggestions */}
                      {isRapidDropdownOpen && rapidSearchResults.length > 0 && (
                        <div className="absolute left-1.5 right-1.5 top-full mt-1 bg-white dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-500 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto ring-4 ring-blue-500/10">
                          {rapidSearchResults.map((med, idx) => (
                            <div
                              key={med.id}
                              onClick={() => handleSelectRapidMedicine(med)}
                              className={`px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between items-center text-xs ${
                                idx === rapidSelectedIndex ? 'bg-blue-100 dark:bg-blue-900/60 font-bold' : 'hover:bg-blue-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{med.name}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Batch: {med.batchNumber || 'N/A'} • Stock: <strong className="text-emerald-600 font-bold">{med.quantity || 0}</strong> • MRP: Rs {med.mrp || 0}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                  Cost: Rs {med.purchasePrice || (med as any).latestPurchasePrice || 0}
                                </div>
                                <span className="text-[10px] text-emerald-600 font-bold">+ Select</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* HSN */}
                    {columnSettings.hsnSac && (
                      <td className="p-1">
                        <input
                          type="text"
                          value={rapidRow.hsn}
                          onChange={(e) => setRapidRow({ ...rapidRow, hsn: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="HSN"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-center font-mono"
                        />
                      </td>
                    )}

                    {/* Batch */}
                    {columnSettings.batchNo && (
                      <td className="p-1">
                        <input
                          type="text"
                          value={rapidRow.batch}
                          onChange={(e) => setRapidRow({ ...rapidRow, batch: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="Batch"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-center font-mono font-medium"
                        />
                      </td>
                    )}

                    {/* Exp Date */}
                    {columnSettings.expDate && (
                      <td className="p-1">
                        <input
                          type="text"
                          value={rapidRow.exp}
                          onChange={(e) => setRapidRow({ ...rapidRow, exp: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="mm/dd/yyyy"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-center font-mono"
                        />
                      </td>
                    )}

                    {/* MRP */}
                    {columnSettings.mrp && (
                      <td className="p-1">
                        <input
                          type="number"
                          value={rapidRow.mrp || ''}
                          onChange={(e) => setRapidRow({ ...rapidRow, mrp: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="0"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-right font-mono"
                        />
                      </td>
                    )}

                    {/* Qty */}
                    <td className="p-1">
                      <input
                        type="number"
                        min="0"
                        value={rapidRow.qty}
                        onChange={(e) => setRapidRow({ ...rapidRow, qty: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                        className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-lg text-center font-bold"
                      />
                    </td>

                    {/* Free Qty */}
                    {columnSettings.freeQty && (
                      <td className="p-1">
                        <input
                          type="number"
                          min="0"
                          value={rapidRow.free_qty || ''}
                          onChange={(e) => setRapidRow({ ...rapidRow, free_qty: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="0"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-center text-emerald-600 font-bold"
                        />
                      </td>
                    )}

                    {/* Disc % */}
                    {columnSettings.discount && (
                      <td className="p-1">
                        <input
                          type="number"
                          value={rapidRow.disc || ''}
                          onChange={(e) => setRapidRow({ ...rapidRow, disc: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="0"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-center font-mono"
                        />
                      </td>
                    )}

                    {/* Unit */}
                    {columnSettings.unit && (
                      <td className="p-1">
                        <select
                          value={rapidRow.unit}
                          onChange={(e) => setRapidRow({ ...rapidRow, unit: e.target.value })}
                          className="w-full px-1 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg"
                        >
                          <option value="Box">Box</option>
                          <option value="Pack">Pack</option>
                          <option value="Strip">Strip</option>
                          <option value="Piece">Piece</option>
                          <option value="Bottle">Bottle</option>
                          <option value="Vial">Vial</option>
                        </select>
                      </td>
                    )}

                    {/* Price / Unit */}
                    <td className="p-1">
                      <input
                        type="number"
                        value={rapidRow.price || ''}
                        onChange={(e) => setRapidRow({ ...rapidRow, price: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                        placeholder="0"
                        className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono"
                      />
                    </td>

                    {/* Tax / GST */}
                    {columnSettings.taxPercent && (
                      <td className="p-1">
                        <input
                          type="number"
                          value={rapidRow.tax || ''}
                          onChange={(e) => setRapidRow({ ...rapidRow, tax: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRapidRow(); }}
                          placeholder="0"
                          className="w-full px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg text-center font-mono"
                        />
                      </td>
                    )}

                    {/* Computed Amount */}
                    <td className="p-2 text-right font-black text-blue-600 dark:text-blue-400 font-mono text-xs">
                      Rs. {computedRapidAmount.toFixed(2)}
                    </td>

                    {/* Commit Button */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={commitRapidRow}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all active:scale-90 cursor-pointer"
                        title="Add to Bill"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Regular Invoiced Table Rows */}
                {currentTab?.items.map((row, index) => (
                  <tr 
                    key={row.tempId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Row # */}
                    <td className="p-2.5 text-center text-slate-400 font-bold text-xs">
                      {index + 1}
                    </td>

                    {/* Item Name & Autocomplete Dropdown */}
                    <td className="p-1.5 relative">
                      <div className="relative">
                        <input
                          type="text"
                          data-pcell={`name-${index}`}
                          value={row.name}
                          onChange={(e) => {
                            handleUpdateItem(index, { name: e.target.value });
                            setItemSearchQuery(e.target.value);
                            setActiveItemDropdownTempId(row.tempId);
                          }}
                          onFocus={() => {
                            setItemSearchQuery(row.name);
                            setActiveItemDropdownTempId(row.tempId);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'name')}
                          placeholder="Type medicine name / formula..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Item Suggestions Dropdown */}
                      {activeItemDropdownTempId === row.tempId && itemSearchQuery.trim().length > 0 && (
                        <div className="absolute z-40 left-1.5 right-1.5 top-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                          <div className="p-1 space-y-0.5">
                            {medicines
                              .filter(m => m.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                              .slice(0, 6)
                              .map((med) => (
                                <div
                                  key={med.id}
                                  onClick={() => handleSelectMedicineForRow(index, med)}
                                  className="px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                                >
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-white">{med.name}</div>
                                    <div className="text-[10px] text-slate-400">
                                      Batch: {med.batchNumber || 'N/A'} • Stock: {med.quantity || 0}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                      Pur: {formatCurrency(med.purchasePrice || 0)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* HSN/SAC */}
                    {columnSettings.hsnSac && (
                      <td className="p-1">
                        <input
                          type="text"
                          data-pcell={`hsn-${index}`}
                          value={row.hsnCode || ''}
                          onChange={(e) => handleUpdateItem(index, { hsnCode: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'hsn')}
                          placeholder="3004.90"
                          className="w-full px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
                        />
                      </td>
                    )}

                    {/* Batch Number */}
                    {columnSettings.batchNo && (
                      <td className="p-1">
                        <input
                          type="text"
                          data-pcell={`batch-${index}`}
                          value={row.batchNumber}
                          onChange={(e) => handleUpdateItem(index, { batchNumber: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'batch')}
                          placeholder="BATCH-01"
                          className="w-full px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium text-center"
                        />
                      </td>
                    )}

                    {/* Exp. Date */}
                    {columnSettings.expDate && (
                      <td className="p-1">
                        <input
                          type="text"
                          data-pcell={`exp-${index}`}
                          value={row.expiryDate}
                          onChange={(e) => handleUpdateItem(index, { expiryDate: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'exp')}
                          placeholder="MM/YY"
                          className="w-full px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
                        />
                      </td>
                    )}

                    {/* MRP */}
                    {columnSettings.mrp && (
                      <td className="p-1 text-right">
                        <input
                          type="number"
                          step="any"
                          data-pcell={`mrp-${index}`}
                          value={row.mrp || ''}
                          onChange={(e) => handleUpdateItem(index, { mrp: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'mrp')}
                          placeholder="0.00"
                          className="w-full px-1.5 py-1.5 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </td>
                    )}

                    {/* Qty */}
                    <td className="p-1 text-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        data-pcell={`qty-${index}`}
                        value={row.quantity || ''}
                        onChange={(e) => handleUpdateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'qty')}
                        className="w-full px-1.5 py-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </td>

                    {/* Free Qty (Bonus Scheme Units) */}
                    {columnSettings.freeQty && (
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          data-pcell={`freeQty-${index}`}
                          value={row.freeQuantity || ''}
                          onChange={(e) => handleUpdateItem(index, { freeQuantity: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'freeQty')}
                          placeholder="0"
                          className="w-full px-1.5 py-1.5 text-center bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                          title="Bonus scheme units added to inventory at Rs 0 cost"
                        />
                      </td>
                    )}

                    {/* Discount % */}
                    {columnSettings.discount && (
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="any"
                          data-pcell={`disc-${index}`}
                          value={row.discountPercentage || ''}
                          onChange={(e) => handleUpdateItem(index, { discountPercentage: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'disc')}
                          placeholder="0%"
                          className="w-full px-1.5 py-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </td>
                    )}

                    {/* Unit */}
                    {columnSettings.unit && (
                      <td className="p-1">
                        <select
                          data-pcell={`unit-${index}`}
                          value={row.unit}
                          onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'unit')}
                          className="w-full px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {UNIT_OPTIONS.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* Price / Unit (Purchase Inward Cost) */}
                    <td className="p-1 text-right">
                      <input
                        type="number"
                        step="any"
                        data-pcell={`price-${index}`}
                        value={row.pricePerUnit || ''}
                        onChange={(e) => handleUpdateItem(index, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'price')}
                        placeholder="0.00"
                        className="w-full px-1.5 py-1.5 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </td>

                    {/* Tax % */}
                    {columnSettings.taxPercent && (
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="any"
                          data-pcell={`tax-${index}`}
                          value={row.gstPercentage || ''}
                          onChange={(e) => handleUpdateItem(index, { gstPercentage: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'tax')}
                          placeholder="0%"
                          className="w-full px-1.5 py-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </td>
                    )}

                    {/* Computed Row Amount */}
                    <td className="p-2.5 text-right font-black font-mono text-slate-900 dark:text-white text-xs">
                      {formatCurrency(row.total)}
                    </td>

                    {/* Delete Row Action */}
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Delete line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* + ADD ROW Button (Desktop) */}
          <div className="hidden md:block pt-1">
            <button
              type="button"
              onClick={() => handleAddNewRow(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ADD ROW (Enter)</span>
            </button>
          </div>

          {/* 3. ATTACHMENTS (LEFT) & SUMMARY BOX (RIGHT) - Sits cleanly BELOW table with zero overlap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            
            {/* Left: Notes & Photo Attachments */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDescription(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{showDescription ? 'Hide Notes' : '+ Add Notes / Description'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer transition"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+ Attach Invoice Photo</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => updateCurrentTab({ imageAttachment: reader.result as string });
                      reader.readAsDataURL(file);
                      emitToast('Attached invoice receipt photo', 'info');
                    }
                  }}
                />
              </div>

              {showDescription && (
                <textarea
                  rows={2}
                  value={currentTab?.description || ''}
                  onChange={(e) => updateCurrentTab({ description: e.target.value })}
                  placeholder="Enter purchase terms, supplier delivery notes, or transporter info..."
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white resize-none"
                />
              )}

              {/* Selected supplier balance card */}
              {selectedSupplier && (
                <div className="p-3 bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200/80 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSupplier.name}</span>
                    <span className="text-slate-400 ml-2">Previous Khata Balance:</span>
                  </div>
                  <div className="font-mono font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(selectedSupplier.balance || 0)}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Bill Summary Calculation Card */}
            <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              
              {/* Subtotal */}
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Subtotal ({totals.totalQty} units):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totals.subTotal)}</span>
              </div>
              
              {/* Trade Discount */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span>Trade Discount:</span>
                  <input
                    type="number"
                    step="any"
                    value={currentTab?.discountPercentage || ''}
                    onChange={(e) => updateCurrentTab({ discountPercentage: parseFloat(e.target.value) || 0, discountAmount: 0 })}
                    placeholder="0%"
                    className="w-14 px-1.5 py-0.5 text-center text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md outline-none"
                  />
                  <span>%</span>
                </div>
                <span className="font-mono text-rose-600 font-bold">- {formatCurrency(totals.discAmt)}</span>
              </div>

              {/* Tax / GST */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span>Tax / GST:</span>
                  <input
                    type="number"
                    step="any"
                    value={currentTab?.taxPercentage || ''}
                    onChange={(e) => updateCurrentTab({ taxPercentage: parseFloat(e.target.value) || 0 })}
                    placeholder="0%"
                    className="w-14 px-1.5 py-0.5 text-center text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md outline-none"
                  />
                  <span>%</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">+ {formatCurrency(totals.taxAmt)}</span>
              </div>

              {/* Auto Round Off */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={currentTab?.isRoundOff || false}
                    onChange={(e) => updateCurrentTab({ isRoundOff: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Auto Round Off</span>
                </label>
                <span className="font-mono text-slate-500">
                  {totals.roundOff >= 0 ? `+${totals.roundOff.toFixed(2)}` : totals.roundOff.toFixed(2)}
                </span>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>GRAND TOTAL:</span>
                <span className="text-base text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(totals.grandTotal)}</span>
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
                    value={currentTab?.paidAmount !== undefined && currentTab.paidAmount !== 0 ? currentTab.paidAmount : (currentTab?.paidAmount === 0 ? 0 : totals.paid)}
                    onChange={(e) => updateCurrentTab({ paidAmount: parseFloat(e.target.value) || 0 })}
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
                    Rs. {Math.max(0, totals.grandTotal - (currentTab?.paidAmount !== undefined ? currentTab.paidAmount : totals.paid)).toFixed(2)}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* 4. FIXED BOTTOM ACTION BAR (Always visible at bottom) */}
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-white">
          <button 
            type="button" 
            onClick={() => {
              clearActiveDraft();
              onClose();
            }} 
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              disabled={isSaving}
              onClick={() => handleSavePurchase('save_and_print')}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Save & Print (Ctrl+P)</span>
            </button>
            
            <button 
              type="button" 
              disabled={isSaving}
              onClick={() => handleSavePurchase('save_and_new')}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>+ Save & New</span>
            </button>
            
            <button 
              type="button" 
              disabled={isSaving}
              onClick={() => handleSavePurchase('save')}
              className="px-6 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSaving ? 'Inwarding...' : 'Save Purchase'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Auxiliary Modals */}
      {isCalculatorOpen && (
        <CalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <InvoiceSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isAddSupplierOpen && (
        <AddPartyModal
          isOpen={isAddSupplierOpen}
          onClose={() => setIsAddSupplierOpen(false)}
          initialType="Supplier"
          onSaveSuccess={async () => {
            const reloaded = await dbSuppliers.getAll();
            setSuppliers(reloaded || []);
            setIsAddSupplierOpen(false);
            emitToast('Supplier added successfully', 'success');
          }}
        />
      )}

      {isBarcodeScannerOpen && (
        <BarcodeScannerModal
          isOpen={isBarcodeScannerOpen}
          onClose={() => setIsBarcodeScannerOpen(false)}
          onScan={(scannedCode) => {
            handleRapidSearch(scannedCode);
            setIsBarcodeScannerOpen(false);
          }}
        />
      )}

      {showShortcutsModal && (
        <KeyboardShortcutsCheatSheetModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />
      )}

      {isPrintModalOpen && printOrderData && (
        <PurchasePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintOrderData(null);
            if (purchaseTabs.length > 1) {
              handleCloseTab(currentTab.id, { stopPropagation: () => {} } as any);
            } else {
              onClose();
            }
          }}
          order={printOrderData}
        />
      )}
    </div>
  );
};
