import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Pill, FileText, ShoppingCart, Users, LayoutDashboard, 
  Layers, Wallet, BookOpen, Clock, Settings, ShieldCheck, Sparkles, 
  Package, QrCode, AlertCircle, ChevronRight, CheckCircle2, ArrowRight
} from 'lucide-react';
import { dbInvoices, dbPurchaseOrders, dbSuppliers, dbMedicines } from '../../lib/db';
import { Invoice, PurchaseOrder, Supplier, Medicine } from '../../types';

export type SearchCategory = 'All' | 'Medicines' | 'Sales' | 'Purchases' | 'Parties' | 'Pages';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SearchCategory;
}

interface SearchItem {
  id: string;
  category: 'Medicines' | 'Sales' | 'Purchases' | 'Parties' | 'Pages';
  title: string;
  subtitle: string;
  extra?: string;
  badge?: string;
  badgeColor?: string;
  route: string;
  icon: any;
  iconBg: string;
  iconColor: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'All'
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchCategory>(initialCategory);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Live Records
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [parties, setParties] = useState<Supplier[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Application Navigation Pages
  const navigationPages: SearchItem[] = useMemo(() => [
    {
      id: 'page-pos-sale',
      category: 'Pages',
      title: 'Sales & POS Billing',
      subtitle: 'Fast retail counter checkout, barcode scanner & customer receipts',
      route: '/sale/invoices',
      icon: FileText,
      iconBg: 'bg-rose-100 dark:bg-rose-950/60',
      iconColor: 'text-rose-600 dark:text-rose-400',
      badge: 'POS Counter'
    },
    {
      id: 'page-stock-inventory',
      category: 'Pages',
      title: 'Items & Stock Inventory',
      subtitle: 'Stock balances, batch tracker, near-expiry radar & low stock alerts',
      route: '/inventory',
      icon: Package,
      iconBg: 'bg-blue-100 dark:bg-blue-950/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badge: 'Stock'
    },
    {
      id: 'page-inward-purchases',
      category: 'Pages',
      title: 'Inward Purchases & Bills',
      subtitle: 'Supplier purchase orders, inward stock bills & distributor payment tracking',
      route: '/purchase',
      icon: ShoppingCart,
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badge: 'Purchases'
    },
    {
      id: 'page-khatas',
      category: 'Pages',
      title: 'Customer & Supplier Khatas',
      subtitle: 'Receivables & payables ledgers, credit limits & payment receipts',
      route: '/parties',
      icon: Users,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'Parties & Khata'
    },
    {
      id: 'page-cashier-shifts',
      category: 'Pages',
      title: 'Cashier Shifts & Cash Register',
      subtitle: 'Shift reconciliation, expected cash vs drawer tally & daily handovers',
      route: '/shifts',
      icon: Clock,
      iconBg: 'bg-amber-100 dark:bg-amber-950/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'Shifts'
    },
    {
      id: 'page-expenses',
      category: 'Pages',
      title: 'Expenses Management',
      subtitle: 'Store petty cash, utility bills, staff tea & vendor payouts',
      route: '/expenses',
      icon: Wallet,
      iconBg: 'bg-purple-100 dark:bg-purple-950/60',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badge: 'Expenses'
    },
    {
      id: 'page-reports',
      category: 'Pages',
      title: 'Reports & Analytics',
      subtitle: 'Daybook, Profit & Loss, Item-wise sales report & tax summaries',
      route: '/reports',
      icon: BookOpen,
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/60',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      badge: 'Analytics'
    },
    {
      id: 'page-settings',
      category: 'Pages',
      title: 'System Settings & Hardware',
      subtitle: 'Thermal printer 80mm setup, company headers, tax rates & security',
      route: '/settings',
      icon: Settings,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-700 dark:text-slate-300',
      badge: 'Settings'
    },
    {
      id: 'page-audit-logs',
      category: 'Pages',
      title: 'Activity & Immutable Audit Logs',
      subtitle: 'Non-deletable chronological activity logs for compliance & staff audits',
      route: '/sync-share',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'Audit Trail'
    }
  ], []);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        dbMedicines.getAll().catch(() => []),
        dbInvoices.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => [])
      ]).then(([meds, invs, purs, sups]) => {
        setMedicines(meds || []);
        setInvoices(invs || []);
        setPurchases(purs || []);
        setParties(sups || []);
        setLoading(false);
      }).catch(() => setLoading(false));

      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Filtered live results
  const results = useMemo<SearchItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchItem[] = [];

    // 1. Medicines
    if (activeTab === 'All' || activeTab === 'Medicines') {
      medicines.forEach(m => {
        const name = (m.name || '').toLowerCase();
        const generic = (m.genericName || '').toLowerCase();
        const mfg = (m.manufacturer || '').toLowerCase();
        const barcode = (m.barcode || '').toLowerCase();
        const batch = (m.batchNumber || '').toLowerCase();

        if (!q || name.includes(q) || generic.includes(q) || mfg.includes(q) || barcode.includes(q) || batch.includes(q)) {
          items.push({
            id: `med-${m.id}`,
            category: 'Medicines',
            title: m.name,
            subtitle: `${m.genericName ? `${m.genericName} • ` : ''}${m.manufacturer || 'General'} • Batch: ${m.batchNumber || '-'}`,
            extra: `Rs ${m.sellingPrice || m.mrp || 0}`,
            badge: m.quantity <= (m.lowStockThreshold || 10) ? `Stock: ${m.quantity} (Low)` : `Stock: ${m.quantity}`,
            badgeColor: m.quantity <= (m.lowStockThreshold || 10) ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
            route: `/inventory?search=${encodeURIComponent(m.name)}`,
            icon: Pill,
            iconBg: 'bg-blue-100 dark:bg-blue-950/60',
            iconColor: 'text-blue-600 dark:text-blue-400'
          });
        }
      });
    }

    // 2. Sales / Invoices
    if (activeTab === 'All' || activeTab === 'Sales') {
      invoices.forEach((inv: any) => {
        const invNum = (inv.invoiceNumber || inv.id || '').toLowerCase();
        const cust = (inv.customerName || inv.partyName || 'Cash Customer').toLowerCase();
        const date = (inv.date || inv.createdAt || '').toLowerCase();
        const amount = String(inv.grandTotal ?? inv.totalAmount ?? 0);

        if (!q || invNum.includes(q) || cust.includes(q) || date.includes(q) || amount.includes(q)) {
          const grand = inv.grandTotal ?? inv.totalAmount ?? 0;
          items.push({
            id: `inv-${inv.id}`,
            category: 'Sales',
            title: inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : `Invoice ${inv.id?.slice(0, 8)}`,
            subtitle: `${inv.customerName || inv.partyName || 'Cash Sale'} • ${inv.date || 'Recent'}`,
            extra: `Rs ${Number(grand).toLocaleString()}`,
            badge: inv.status || (inv.balanceDue > 0 ? 'Unpaid' : 'Paid'),
            badgeColor: inv.balanceDue > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
            route: `/sale/invoices?search=${encodeURIComponent(inv.invoiceNumber || '')}`,
            icon: FileText,
            iconBg: 'bg-rose-100 dark:bg-rose-950/60',
            iconColor: 'text-rose-600 dark:text-rose-400'
          });
        }
      });
    }

    // 3. Purchases
    if (activeTab === 'All' || activeTab === 'Purchases') {
      purchases.forEach((pur: any) => {
        const billNum = (pur.billNumber || pur.poNumber || pur.orderNumber || pur.id || '').toLowerCase();
        const sup = (pur.supplierName || pur.partyName || 'Supplier').toLowerCase();
        const date = (pur.date || pur.orderDate || '').toLowerCase();
        const amount = String(pur.grandTotal ?? pur.totalAmount ?? 0);

        if (!q || billNum.includes(q) || sup.includes(q) || date.includes(q) || amount.includes(q)) {
          const grand = pur.grandTotal ?? pur.totalAmount ?? 0;
          items.push({
            id: `pur-${pur.id}`,
            category: 'Purchases',
            title: pur.billNumber ? `Supplier Bill #${pur.billNumber}` : pur.poNumber ? `PO #${pur.poNumber}` : `Purchase ${pur.id?.slice(0, 8)}`,
            subtitle: `${pur.supplierName || pur.partyName || 'Distributor'} • ${pur.date || pur.orderDate || 'Recent'}`,
            extra: `Rs ${Number(grand).toLocaleString()}`,
            badge: pur.status || 'Received',
            badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
            route: `/purchase?search=${encodeURIComponent(pur.billNumber || pur.poNumber || '')}`,
            icon: ShoppingCart,
            iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
            iconColor: 'text-indigo-600 dark:text-indigo-400'
          });
        }
      });
    }

    // 4. Parties (Customers & Suppliers)
    if (activeTab === 'All' || activeTab === 'Parties') {
      parties.forEach((p: any) => {
        const name = (p.name || '').toLowerCase();
        const phone = (p.phone || p.mobile || '').toLowerCase();
        const city = (p.city || '').toLowerCase();

        if (!q || name.includes(q) || phone.includes(q) || city.includes(q)) {
          const bal = p.balance ?? p.openingBalance ?? 0;
          items.push({
            id: `party-${p.id}`,
            category: 'Parties',
            title: p.name,
            subtitle: `${p.phone || 'No phone'} • ${p.city || 'Local'} • ${p.partyType || (p.type === 'supplier' ? 'Supplier' : 'Customer')}`,
            extra: `Bal: Rs ${Math.abs(bal).toLocaleString()}`,
            badge: bal > 0 ? 'Receivable' : bal < 0 ? 'Payable' : 'Settled',
            badgeColor: bal > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : bal < 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            route: `/parties?search=${encodeURIComponent(p.name)}`,
            icon: Users,
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
            iconColor: 'text-emerald-600 dark:text-emerald-400'
          });
        }
      });
    }

    // 5. Pages & Functions
    if (activeTab === 'All' || activeTab === 'Pages') {
      navigationPages.forEach(page => {
        const title = page.title.toLowerCase();
        const subtitle = page.subtitle.toLowerCase();

        if (!q || title.includes(q) || subtitle.includes(q)) {
          items.push(page);
        }
      });
    }

    return items.slice(0, 50);
  }, [query, activeTab, medicines, invoices, purchases, parties, navigationPages]);

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: SearchItem) => {
    onClose();
    navigate(item.route);
  };

  if (!isOpen) return null;

  const tabs: SearchCategory[] = ['All', 'Medicines', 'Sales', 'Purchases', 'Parties', 'Pages'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-6 sm:pt-14 overflow-y-auto">
      {/* 1. Backdrop Overlay: REMOVE BLUR - Use clean semi-transparent dark tint only */}
      <div 
        className="fixed inset-0 bg-slate-950/25 transition-opacity"
        onClick={onClose}
      />

      {/* 2. Search Modal Box: Sharp Crisp Shadow & Clean Top Alignment */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-100">
        
        {/* Top Search Bar */}
        <div className="relative p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search medicines, batch, invoices, parties, functions (Ctrl+K)..."
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/80'
              }`}
            >
              {tab === 'All' && '🌟 All'}
              {tab === 'Medicines' && '💊 Medicines'}
              {tab === 'Sales' && '📄 Sales'}
              {tab === 'Purchases' && '📦 Purchases'}
              {tab === 'Parties' && '👥 Parties'}
              {tab === 'Pages' && '⚡ Pages'}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {loading ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              Loading live database records...
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-l-4 border-blue-600 pl-2.5 shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl shrink-0 ${item.iconBg}`}>
                      <Icon className={`w-4 h-4 ${item.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.extra && (
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {item.extra}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'text-blue-600 translate-x-0.5' : ''}`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching records found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try searching for medicine name, invoice number, customer phone, or shortcut.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span>Found <strong className="text-slate-900 dark:text-white font-bold">{results.length}</strong> live record(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">↓</kbd> to navigate, <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">Enter</kbd> to open</span>
            <button
              type="button"
              onClick={onClose}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GlobalSearchModal;
