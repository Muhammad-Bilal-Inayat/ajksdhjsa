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
      { id: 'fefo_expiry_report', label: 'Near-Expiry & Expired Stock (FEFO)', path: '/reports?report=fefo_expiry_report', requiredPlan: 'gold' },
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
  },
  {
    id: 'enterprise_suite',
    categoryLabel: 'Enterprise Audits & Multi-Branch',
    categoryIcon: Building2,
    requiredPlan: 'platinum',
    reports: [
      { id: 'fbr_tax_audit', label: 'FBR Fiscal Tax Audit Report', path: '/reports?report=fbr_tax_audit', requiredPlan: 'platinum' },
      { id: 'journal_voucher_report', label: 'Journal Voucher & Trial Balance Report', path: '/reports?report=journal_voucher_report', requiredPlan: 'platinum' },
      { id: 'multi_branch_consolidated_report', label: 'Multi-Branch Consolidated Stock & Sales', path: '/reports?report=multi_branch_consolidated_report', requiredPlan: 'platinum' },
      { id: 'online_store_performance_report', label: 'Online Store Sales & Order Performance', path: '/reports?report=online_store_performance_report', requiredPlan: 'platinum' },
      { id: 'narcotics_dispensing_report', label: 'Narcotics & Controlled Drug Dispensing', path: '/reports?report=narcotics_dispensing_report', requiredPlan: 'platinum' },
      { id: 'drap_form8_regulatory_report', label: 'DRAP Form-8 Regulatory Report', path: '/reports?report=drap_form8_regulatory_report', requiredPlan: 'platinum' },
      { id: 'booker_commission_report', label: 'Booker Commission & Sales Performance', path: '/reports?report=booker_commission_report', requiredPlan: 'platinum' },
      { id: 'master_user_activity_audit_export', label: 'Master User Activity & Security Audit Export', path: '/reports?report=master_user_activity_audit_export', requiredPlan: 'platinum' },
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
      { label: 'Credit Notes', path: '/sale/return', hasAdd: false },
      { label: 'Estimate / Quotation', path: '/sale/quotation', hasAdd: false },
      { label: 'Sale Order', path: '/sale/order', hasAdd: false },
      { label: 'Delivery Challan', path: '/sale/challan', hasAdd: false },
    ]
  },
  { 
    id: 'items',
    icon: Package, 
    label: 'Items', 
    path: '/items', 
    moduleKey: 'items',
    addPath: '/items?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Stock Inventory', path: '/inventory', addPath: '/items?action=add', hasAdd: false },
      { label: 'Top Selling Medicines', path: '/top-products', hasAdd: false },
      { label: 'QR Code Generator', path: '/settings?tab=QR%20CODE%20GENERATOR', hasAdd: false },
      { label: 'Shortage Register', path: '/shortage-registry', addPath: '/shortage-registry?action=add', hasAdd: false },
    ]
  },
  { 
    id: 'purchase',
    icon: ShoppingCart, 
    label: 'Purchases', 
    path: '/purchase', 
    moduleKey: 'purchase',
    addPath: '/purchase?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Purchase Bills', path: '/purchase', hasAdd: false },
      { label: 'Supplier Returns', path: '/purchase/return', hasAdd: false },
      { label: 'Payment Out', path: '/purchase/payment-out', hasAdd: false },
      { label: 'Purchase Orders', path: '/purchase/order', hasAdd: false },
    ]
  },
  { 
    id: 'parties',
    icon: Users, 
    label: 'Parties', 
    path: '/parties', 
    moduleKey: 'parties',
    addPath: '/parties?action=add',
    isCore: true,
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Customer Khatas', path: '/parties/customers', addPath: '/parties/customers?action=add', hasAdd: false },
      { label: 'Supplier Khatas', path: '/parties/suppliers', addPath: '/parties/suppliers?action=add', hasAdd: false },
      { label: 'All Ledgers & Statements', path: '/accounts/ledgers', hasAdd: false },
    ]
  },
  { 
    id: 'shifts',
    icon: DollarSign, 
    label: 'Shifts', 
    path: '/shift-management', 
    moduleKey: 'shifts',
    addPath: '/shift-management?action=start',
    isCore: true,
    hasDropdown: false, 
    hasAdd: true 
  },
  { 
    id: 'expenses',
    icon: Wallet, 
    label: 'Expenses', 
    path: '/expenses', 
    moduleKey: 'expenses',
    addPath: '/expenses?action=add',
    isCore: true,
    hasDropdown: false, 
    hasAdd: true 
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
      { label: 'Bank Accounts', path: '/bank', addPath: '/bank?action=add-bank', hasAdd: false },
      { label: 'Cash In Hand', path: '/cash-in-hand', addPath: '/cash-in-hand?action=adjust', hasAdd: false },
      { label: 'Shift Reconciliation', path: '/shift-management', hasAdd: false },
      { label: 'Cheques', path: '/bank/cheques', hasAdd: false },
      { label: 'Loan Accounts', path: '/bank/loan-accounts', addPath: '/bank/loan-accounts?action=add', hasAdd: false },
    ]
  },
  { 
    id: 'reports',
    icon: BarChart2, 
    label: 'Reports', 
    path: '/reports', 
    moduleKey: 'reports',
    isCore: true,
    hasDropdown: true, 
    hasAdd: false,
    subItems: [
      { label: 'Daily Sales Summary', path: '/reports?report=sale', requiredPlan: 'silver', hasAdd: false },
      { label: 'Cashier Shift Daybook', path: '/reports?report=day_book', requiredPlan: 'silver', hasAdd: false },
      { label: 'Stock Valuation & FEFO Expiry', path: '/reports?report=fefo_expiry_report', requiredPlan: 'silver', hasAdd: false },
      { label: 'Low Stock & Reorder Alert', path: '/reports?report=low_stock_summary', requiredPlan: 'silver', hasAdd: false },
      { label: 'Item Sales & Profit Margin', path: '/reports?report=item_profit_loss', requiredPlan: 'silver', hasAdd: false },
      { label: 'Customer Udhar Ledger & Aging', path: '/reports?report=party_statement', requiredPlan: 'silver', hasAdd: false },
      { label: 'Cash & Bank Register', path: '/reports?report=cash_flow', requiredPlan: 'silver', hasAdd: false },
      { label: 'Expense Category Analysis', path: '/reports?report=expense_category', requiredPlan: 'silver', hasAdd: false },
      { label: 'Daily Profit & Loss Summary', path: '/reports?report=profit_loss', requiredPlan: 'gold', hasAdd: false },
      { label: 'Comprehensive Balance Sheet', path: '/reports?report=balance_sheet', requiredPlan: 'gold', hasAdd: false },
      { label: 'Supplier Payable & Claims Khata', path: '/reports?report=sale_purchase_party', requiredPlan: 'gold', hasAdd: false },
      { label: 'FBR Fiscal Tax Audit', path: '/reports?report=fbr_tax_audit', requiredPlan: 'platinum', hasAdd: false },
      { label: 'Multi-Branch Consolidated Report', path: '/reports?report=multi_branch_consolidated_report', requiredPlan: 'platinum', hasAdd: false },
    ]
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
