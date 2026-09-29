import { 
  Home, Users, Package, FileText, ShoppingCart, Wallet, Landmark, 
  BarChart2, Building2, Settings, Database, MessageSquare, RotateCcw,
  CheckCircle2, Download, TrendingUp, DollarSign, ShoppingBag, Store, 
  Lock, AlertTriangle, Zap, User, CreditCard, Globe, Sparkles, HardDrive, 
  BookOpen, ShieldAlert, Shield, Sliders, Key, Smartphone, BarChart3, 
  Activity, Phone, Laptop, UserCheck, Bot, Layers, Check
} from 'lucide-react';
import { PlanTier, isModuleAllowed, isReportAllowed, isPlanSufficient } from '../../utils/planPermissions';
import { NavItem, NavSubItem } from '../../types/navigation';

export interface ReportCategoryGroup {
  id: string;
  categoryLabel: string;
  categoryIcon: any;
  requiredPlan?: 'silver' | 'gold' | 'platinum';
  reports: {
    id: string;
    label: string;
    path: string;
    requiredPlan?: 'silver' | 'gold' | 'platinum';
    description?: string;
  }[];
}

export const CATEGORIZED_REPORTS: ReportCategoryGroup[] = [
  {
    id: 'sales_pos',
    categoryLabel: 'Sales ',
    categoryIcon: BarChart3,
    requiredPlan: 'silver',
    reports: [
      { id: 'sale', label: 'Daily Sales Summary', path: '/reports?report=sale', requiredPlan: 'silver' },
      { id: 'day_book', label: 'Cashier-wise Shift Report', path: '/reports?report=day_book', requiredPlan: 'silver' },
      { id: 'item_profit_loss', label: 'Item-wise Sales & Profit Margin', path: '/reports?report=item_profit_loss', requiredPlan: 'silver' },
      { id: 'bill_wise_profit', label: 'Bill-wise Profit & Loss', path: '/reports?report=bill_wise_profit', requiredPlan: 'gold' },
      { id: 'all_transactions', label: 'All Transactions Register', path: '/reports?report=all_transactions', requiredPlan: 'silver' },
    ]
  },
  {
    id: 'stock_inventory',
    categoryLabel: 'Stock & Inventory Reports',
    categoryIcon: Package,
    requiredPlan: 'silver',
    reports: [
      { id: 'fefo_expiry_report', label: 'Near-Expiry & Expired Stock (FEFO)', path: '/reports?report=fefo_expiry_report', requiredPlan: 'silver' },
      { id: 'low_stock_summary', label: 'Low Stock & Reorder Alert', path: '/reports?report=low_stock_summary', requiredPlan: 'silver' },
      { id: 'stock_summary', label: 'Stock Valuation & Batch Audit', path: '/reports?report=stock_summary', requiredPlan: 'silver' },
      { id: 'item_batch_report', label: 'Item Batch & Expiry Traceability', path: '/reports?report=item_batch_report', requiredPlan: 'gold' },
      { id: 'fifo_allocation_report', label: 'FIFO Stock Allocation Ledger', path: '/reports?report=fifo_allocation_report', requiredPlan: 'gold' },
      { id: 'controlled_register', label: 'Controlled Items Register (Form-7)', path: '/reports?report=controlled_register', requiredPlan: 'gold' },
    ]
  },
  {
    id: 'financial_accounts',
    categoryLabel: 'Financial & Accounts Reports',
    categoryIcon: DollarSign,
    requiredPlan: 'silver',
    reports: [
      { id: 'expense_category', label: 'Expense Category Analysis', path: '/reports?report=expense_category', requiredPlan: 'silver' },
      { id: 'cash_flow', label: 'Cash & Bank Transaction Register', path: '/reports?report=cash_flow', requiredPlan: 'silver' },
      { id: 'profit_loss', label: 'Daily Profit & Loss Summary', path: '/reports?report=profit_loss', requiredPlan: 'gold' },
      { id: 'bank_statement', label: 'Bank Statement & Ledger', path: '/reports?report=bank_statement', requiredPlan: 'silver' },
      { id: 'balance_sheet', label: 'Comprehensive Balance Sheet', path: '/reports?report=balance_sheet', requiredPlan: 'gold' },
    ]
  },
  {
    id: 'khata_parties',
    categoryLabel: 'Khata & Party Reports',
    categoryIcon: Users,
    requiredPlan: 'silver',
    reports: [
      { id: 'party_statement', label: 'Customer Udhar Ledger & Aging', path: '/reports?report=party_statement', requiredPlan: 'silver' },
      { id: 'all_parties', label: 'All Customer & Supplier Khatas', path: '/reports?report=all_parties', requiredPlan: 'silver' },
      { id: 'sale_purchase_party', label: 'Supplier Payable & Claims Khata', path: '/reports?report=sale_purchase_party', requiredPlan: 'gold' },
    ]
  }
];

export const RAW_NAVIGATION_ITEMS: NavItem[] = [
  { 
    id: 'dashboard',
    icon: Home, 
    label: 'Dashboard', 
    path: '/user', 
    moduleKey: 'dashboard',
    isCore: true,
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'sale',
    icon: FileText, 
    label: 'Sales', 
    path: '/sale/invoices', 
    moduleKey: 'sale',
    addPath: '/sale/invoices?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Sale Invoices', path: '/sale/invoices', hasAdd: false },
      { label: 'Payment In', path: '/sale/payment-in', hasAdd: false },
      { label: 'Credit Notes / Returns', path: '/sale/return', hasAdd: false },
      { label: 'Estimate / Quotation', path: '/sale/quotation', hasAdd: false },
      { label: 'Sale Order', path: '/sale/order', hasAdd: false },
      { label: 'Delivery Challan', path: '/sale/challan', hasAdd: false },
    ]
  },
  { 
    id: 'items',
    icon: Package, 
    label: 'Items ', 
    path: '/items', 
    moduleKey: 'items',
    addPath: '/items?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Stock Inventory', path: '/inventory', addPath: '/items?action=add', hasAdd: true },
      { label: 'Top Selling Medicines', path: '/top-products', hasAdd: false },
      { label: 'Shortage Register', path: '/shortage-registry', addPath: '/shortage-registry?action=add', hasAdd: false },
      { label: 'QR & Barcode Generator', path: '/settings?tab=QR%20CODE%20GENERATOR', hasAdd: false },
    ]
  },
  { 
    id: 'purchase',
    icon: ShoppingCart, 
    label: 'Purchases ', 
    path: '/purchase', 
    moduleKey: 'purchase',
    addPath: '/purchase?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Purchase Bills', path: '/purchase', hasAdd: false },
      { label: 'Purchase Orders (PO)', path: '/purchase/order', hasAdd: false },
      { label: 'Supplier Returns / Dr. Note', path: '/purchase/return', hasAdd: false },
      { label: 'Payment Out', path: '/purchase/payment-out', hasAdd: false },
    ]
  },
  { 
    id: 'parties',
    icon: Users, 
    label: 'Parties ', 
    path: '/parties', 
    moduleKey: 'parties',
    addPath: '/parties?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Customer Khatas', path: '/parties/customers', addPath: '/parties/customers?action=add', hasAdd: true },
      { label: 'Supplier Khatas', path: '/parties/suppliers', addPath: '/parties/suppliers?action=add', hasAdd: true },
      { label: 'All Ledgers & Statements', path: '/accounts/ledgers', hasAdd: false },
    ]
  },
  { 
    id: 'shifts',
    icon: DollarSign, 
    label: 'Shifts', 
    path: '/shift-management', 
    moduleKey: 'shifts',
    isCore: true,
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'expenses',
    icon: Wallet, 
    label: 'Expenses', 
    path: '/expenses', 
    moduleKey: 'expenses',
    isCore: true,
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'bank',
    icon: Landmark, 
    label: 'Bank Accounts', 
    path: '/bank', 
    moduleKey: 'bank',
    isCore: true,
    hasDropdown: true, 
    hasAdd: false,
    subItems: [
      { label: 'Bank Accounts', path: '/bank', addPath: '/bank?action=add-bank', hasAdd: true },
      { label: 'Cash In Hand', path: '/cash-in-hand', addPath: '/cash-in-hand?action=adjust', hasAdd: true },
      { label: 'Shift Reconciliation', path: '/shift-management', hasAdd: false },
      { label: 'Cheques', path: '/bank/cheques', hasAdd: false },
      { label: 'Loan Accounts', path: '/bank/loan-accounts', addPath: '/bank/loan-accounts?action=add', hasAdd: true },
    ]
  },
  { 
    id: 'reports',
    icon: BarChart2, 
    label: 'Reports ', 
    path: '/reports', 
    moduleKey: 'reports',
    isCore: true,
    hasDropdown: true, 
    hasAdd: false,
    // Sub-items generated dynamically from categorized reports based on active plan
    subItems: []
  },
  { 
    id: 'aiGuide',
    icon: Sparkles, 
    label: 'MBI AI Assistant', 
    path: '/user/ai-guide', 
    moduleKey: 'dashboard',
    isCore: true,
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'onlineStore',
    icon: ShoppingBag, 
    label: 'Online Store', 
    path: '/online-store', 
    moduleKey: 'onlineStore',
    requiredTier: 'ENTERPRISE',
    isCore: false,
    hasDropdown: true, 
    hasAdd: false,
    subItems: [
      { label: 'Orders & Overview', path: '/online-store', hasAdd: false },
      { label: 'Products & Pricing', path: '/online-store?tab=products', hasAdd: false },
      { label: 'Coupons & Deals', path: '/online-store?tab=promotions', hasAdd: false },
      { label: 'Store Settings', path: '/online-store?tab=settings', hasAdd: false },
    ]
  },
  { 
    id: 'bookers',
    icon: UserCheck, 
    label: 'Bookers & Billers', 
    path: '/bookers', 
    moduleKey: 'bookers',
    requiredTier: 'ENTERPRISE',
    isCore: false,
    addPath: '/bookers?action=add',
    hasDropdown: false, 
    hasAdd: true 
  },
  { 
    id: 'notes',
    icon: FileText, 
    label: 'Notes Register', 
    path: '/notes', 
    moduleKey: 'reports',
    isCore: true,
    hasDropdown: false, 
    hasAdd: false 
  },
];

/**
 * Filter navigation items strictly based on plan permissions
 */
export function getFilteredNavigation(plan: PlanTier, tenantId?: string): NavItem[] {
  return RAW_NAVIGATION_ITEMS
    .filter(item => {
      // Enterprise only modules
      if (item.id === 'onlineStore' || item.id === 'bookers') {
        return isModuleAllowed(item.id, tenantId, plan);
      }
      return isModuleAllowed(item.moduleKey || item.id, tenantId, plan);
    })
    .map(item => {
      if (!item.subItems) return item;
      const filteredSubs = item.subItems.filter(sub => {
        if (sub.requiredPlan && !isPlanSufficient(plan, sub.requiredPlan)) {
          return false;
        }
        return true;
      });
      return { ...item, subItems: filteredSubs };
    });
}

/**
 * Get categorized reports filtered by plan permissions
 */
export function getFilteredCategorizedReports(plan: PlanTier, tenantId?: string): ReportCategoryGroup[] {
  return CATEGORIZED_REPORTS.map(cat => ({
    ...cat,
    reports: cat.reports.filter(r => isReportAllowed(r.id, tenantId, plan))
  })).filter(cat => cat.reports.length > 0);
}
