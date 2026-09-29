/**
 * ==============================================================================
 * MBI INVENTRA 4 - GRANULAR ROLE PERMISSIONS & SIDEBAR MENU SWITCHBOARD
 * ==============================================================================
 * Comprehensive configuration and utility functions for per-user sidebar menu
 * assignments and operational action security switches.
 */

export interface SidebarMenuDefinition {
  id: string;
  label: string;
  description: string;
  category: 'Core Operations' | 'Inventory & Stock' | 'Finance & Accounts' | 'Intelligence & Tools';
  iconName: string;
  defaultRoles: string[];
}

export const ALL_SIDEBAR_MENUS: SidebarMenuDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Executive overview, real-time metrics, counter counters & quick stats',
    category: 'Core Operations',
    iconName: 'Home',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Cashier', 'Accountant', 'Viewer']
  },
  {
    id: 'sale',
    label: 'Sales & POS Billing',
    description: 'Counter POS checkout, invoices, credit notes, estimates & delivery challans',
    category: 'Core Operations',
    iconName: 'ShoppingCart',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Cashier', 'Salesman', 'Biller', 'Biller and Salesman', 'Sales Staff']
  },
  {
    id: 'inventory',
    label: 'Items & Stock Inventory',
    description: 'Medicine catalog, batch management, FEFO expiries & formula substitutes',
    category: 'Inventory & Stock',
    iconName: 'Package',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Inventory Manager', 'Stock Keeper']
  },
  {
    id: 'purchases',
    label: 'Inward Purchases & Bills',
    description: 'Supplier invoices, purchase orders, bulk inward receiving & vendor payments',
    category: 'Inventory & Stock',
    iconName: 'FileText',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Inventory Manager', 'Accountant']
  },
  {
    id: 'parties',
    label: 'Customer & Supplier Khatas',
    description: 'Double-entry ledgers, receivable/payable balances & party statements',
    category: 'Finance & Accounts',
    iconName: 'Users',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Accountant', 'CA/Accountant', 'Cashier']
  },
  {
    id: 'shifts',
    label: 'Cashier Shifts & Cash Register',
    description: 'Shift opening/closing, physical cash tally, float management & drawer handover',
    category: 'Core Operations',
    iconName: 'Clock',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Cashier']
  },
  {
    id: 'expenses',
    label: 'Expenses Management',
    description: 'Daily operational expenses, utility bills, petty cash & category breakdown',
    category: 'Finance & Accounts',
    iconName: 'Wallet',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Accountant']
  },
  {
    id: 'bank',
    label: 'Cash & Bank Accounts',
    description: 'Bank balances, cash in hand, cheque register & inter-account fund transfers',
    category: 'Finance & Accounts',
    iconName: 'Landmark',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Accountant', 'CA/Accountant']
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    description: 'P&L statements, tax summaries, sales trends, fast-moving drugs & inventory audits',
    category: 'Finance & Accounts',
    iconName: 'BarChart2',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Accountant', 'CA/Accountant', 'Viewer']
  },
  {
    id: 'shortage',
    label: 'Shortage Register & Procurement',
    description: 'Low stock alerts, out-of-stock demands, supplier order generation & re-orders',
    category: 'Inventory & Stock',
    iconName: 'Flame',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Inventory Manager', 'Stock Keeper']
  },
  {
    id: 'barcode',
    label: 'QR & Barcode Generator',
    description: 'Custom barcode label designer, 1D/2D thermal printing & batch stickering',
    category: 'Intelligence & Tools',
    iconName: 'Wrench',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist', 'Inventory Manager']
  },
  {
    id: 'aiNotes',
    label: 'MBI AI Assistant & Notes Register',
    description: 'Clinical drug interactions, smart pharmacy advisor, reminders & sticky notes',
    category: 'Intelligence & Tools',
    iconName: 'Bot',
    defaultRoles: ['Primary Admin', 'Secondary Admin', 'Admin', 'Store Manager', 'Pharmacist']
  }
];

export interface OperationalSecuritySwitches {
  canEditInvoices: boolean;
  canDeleteInvoices: boolean;
  canRecordPaymentIn: boolean;
  canRecordPaymentOut: boolean;
  canApplyCustomDiscounts: boolean;
  canViewWholesaleRatesAndMargin: boolean;
  canExportReportsAndExcel: boolean;
  canManageStaffAndDevices: boolean;
}

export interface UserCustomPermissions {
  allowed_menus: string[];
  switches: OperationalSecuritySwitches;
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_SECURITY_SWITCHES: OperationalSecuritySwitches = {
  canEditInvoices: false,
  canDeleteInvoices: false,
  canRecordPaymentIn: true,
  canRecordPaymentOut: false,
  canApplyCustomDiscounts: false,
  canViewWholesaleRatesAndMargin: false,
  canExportReportsAndExcel: false,
  canManageStaffAndDevices: false
};

export const ADMIN_SECURITY_SWITCHES: OperationalSecuritySwitches = {
  canEditInvoices: true,
  canDeleteInvoices: true,
  canRecordPaymentIn: true,
  canRecordPaymentOut: true,
  canApplyCustomDiscounts: true,
  canViewWholesaleRatesAndMargin: true,
  canExportReportsAndExcel: true,
  canManageStaffAndDevices: true
};

export const ROLE_PRESET_PERMISSIONS: Record<string, { menus: string[]; switches: OperationalSecuritySwitches }> = {
  'Primary Admin': {
    menus: ALL_SIDEBAR_MENUS.map(m => m.id),
    switches: { ...ADMIN_SECURITY_SWITCHES }
  },
  'Secondary Admin': {
    menus: ALL_SIDEBAR_MENUS.map(m => m.id),
    switches: { ...ADMIN_SECURITY_SWITCHES }
  },
  'Admin': {
    menus: ALL_SIDEBAR_MENUS.map(m => m.id),
    switches: { ...ADMIN_SECURITY_SWITCHES }
  },
  'Store Manager': {
    menus: ALL_SIDEBAR_MENUS.map(m => m.id),
    switches: {
      canEditInvoices: true,
      canDeleteInvoices: false,
      canRecordPaymentIn: true,
      canRecordPaymentOut: true,
      canApplyCustomDiscounts: true,
      canViewWholesaleRatesAndMargin: true,
      canExportReportsAndExcel: true,
      canManageStaffAndDevices: false
    }
  },
  'Pharmacist': {
    menus: ['dashboard', 'sale', 'inventory', 'purchases', 'parties', 'shortage', 'barcode', 'aiNotes'],
    switches: {
      canEditInvoices: false,
      canDeleteInvoices: false,
      canRecordPaymentIn: true,
      canRecordPaymentOut: false,
      canApplyCustomDiscounts: true,
      canViewWholesaleRatesAndMargin: true,
      canExportReportsAndExcel: false,
      canManageStaffAndDevices: false
    }
  },
  'Cashier': {
    menus: ['dashboard', 'sale', 'parties', 'shifts'],
    switches: {
      canEditInvoices: false,
      canDeleteInvoices: false,
      canRecordPaymentIn: true,
      canRecordPaymentOut: false,
      canApplyCustomDiscounts: false,
      canViewWholesaleRatesAndMargin: false,
      canExportReportsAndExcel: false,
      canManageStaffAndDevices: false
    }
  },
  'Accountant': {
    menus: ['dashboard', 'sale', 'purchases', 'parties', 'expenses', 'bank', 'reports'],
    switches: {
      canEditInvoices: true,
      canDeleteInvoices: false,
      canRecordPaymentIn: true,
      canRecordPaymentOut: true,
      canApplyCustomDiscounts: false,
      canViewWholesaleRatesAndMargin: true,
      canExportReportsAndExcel: true,
      canManageStaffAndDevices: false
    }
  },
  'Inventory Manager': {
    menus: ['dashboard', 'inventory', 'purchases', 'shortage', 'barcode'],
    switches: {
      canEditInvoices: false,
      canDeleteInvoices: false,
      canRecordPaymentIn: false,
      canRecordPaymentOut: false,
      canApplyCustomDiscounts: false,
      canViewWholesaleRatesAndMargin: true,
      canExportReportsAndExcel: true,
      canManageStaffAndDevices: false
    }
  },
  'Stock Keeper': {
    menus: ['dashboard', 'inventory', 'purchases', 'shortage', 'barcode'],
    switches: {
      canEditInvoices: false,
      canDeleteInvoices: false,
      canRecordPaymentIn: false,
      canRecordPaymentOut: false,
      canApplyCustomDiscounts: false,
      canViewWholesaleRatesAndMargin: false,
      canExportReportsAndExcel: false,
      canManageStaffAndDevices: false
    }
  },
  'Viewer': {
    menus: ['dashboard', 'reports'],
    switches: {
      canEditInvoices: false,
      canDeleteInvoices: false,
      canRecordPaymentIn: false,
      canRecordPaymentOut: false,
      canApplyCustomDiscounts: false,
      canViewWholesaleRatesAndMargin: false,
      canExportReportsAndExcel: false,
      canManageStaffAndDevices: false
    }
  }
};

/**
 * Returns effective allowed menus for a given user or role
 */
export function getEffectiveAllowedMenus(user: any): string[] {
  if (!user) return ALL_SIDEBAR_MENUS.map(m => m.id);
  
  // Primary owners always have all menus enabled
  if (user.isPrimaryOwner || user.is_primary_owner === 1 || user.is_primary_owner === true || user.role === 'Primary Admin' || user.role === 'Owner') {
    return ALL_SIDEBAR_MENUS.map(m => m.id);
  }

  // Check explicit custom permissions
  const customPerms = user.custom_permissions || user.customPermissions;
  if (customPerms && Array.isArray(customPerms.allowed_menus) && customPerms.allowed_menus.length > 0) {
    return customPerms.allowed_menus;
  }

  // Check allowed_modules array if present
  if (Array.isArray(user.allowed_modules) && user.allowed_modules.length > 0) {
    return user.allowed_modules;
  }

  // Check role preset fallback
  const roleName = user.role || 'Cashier';
  if (ROLE_PRESET_PERMISSIONS[roleName]) {
    return ROLE_PRESET_PERMISSIONS[roleName].menus;
  }

  // Safe baseline fallback
  return ['dashboard', 'sale', 'parties', 'shifts'];
}

/**
 * Returns effective operational security switches for a user
 */
export function getEffectiveSecuritySwitches(user: any): OperationalSecuritySwitches {
  if (!user) return { ...DEFAULT_SECURITY_SWITCHES };

  if (user.isPrimaryOwner || user.is_primary_owner === 1 || user.is_primary_owner === true || user.role === 'Primary Admin' || user.role === 'Owner') {
    return { ...ADMIN_SECURITY_SWITCHES };
  }

  const customPerms = user.custom_permissions || user.customPermissions;
  if (customPerms && customPerms.switches) {
    return {
      ...DEFAULT_SECURITY_SWITCHES,
      ...customPerms.switches
    };
  }

  const roleName = user.role || 'Cashier';
  if (ROLE_PRESET_PERMISSIONS[roleName]) {
    return { ...ROLE_PRESET_PERMISSIONS[roleName].switches };
  }

  return { ...DEFAULT_SECURITY_SWITCHES };
}

/**
 * Determines if the current user is permitted to edit inventory transactions/vouchers.
 * Strictly gated by user role / custom permissions AND /server tenant switchboard.
 */
export function canUserEditTransaction(user: any, tenant?: any): boolean {
  if (!user) return false;

  // 1. Gated by /server tenant feature switch (if explicitly disabled, block all)
  const customFeatures = tenant?.custom_features || tenant?.customFeatures || tenant?.features;
  if (customFeatures) {
    if (customFeatures.allow_transaction_editing === false || customFeatures.allowTransactionEditing === false) {
      return false;
    }
  }

  try {
    const serverFlags = localStorage.getItem('mbi_server_feature_flags');
    if (serverFlags) {
      const parsed = JSON.parse(serverFlags);
      if (parsed.allow_transaction_editing === false || parsed.allowTransactionEditing === false) {
        return false;
      }
    }
  } catch (e) {}

  // 2. Check Role (primary_admin, secondary_admin, owner, etc.)
  const rawRole = String(user.role || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
  const isPrimary = user.isPrimaryOwner === true || 
                    user.is_primary_owner === 1 || 
                    user.is_primary_owner === true || 
                    rawRole === 'primary_admin' || 
                    rawRole === 'primary_owner' || 
                    rawRole === 'owner';
                    
  const isSecondary = rawRole === 'secondary_admin' || rawRole === 'admin';

  if (isPrimary || isSecondary) {
    return true;
  }

  // 3. Check custom user permissions
  const customPerms = user.custom_permissions || user.customPermissions;
  if (customPerms) {
    if (customPerms.can_edit_invoices === true || customPerms.canEditInvoices === true) {
      return true;
    }
    if (customPerms.switches?.canEditInvoices === true) {
      return true;
    }
  }

  // 4. Fallback to operational switches
  const switches = getEffectiveSecuritySwitches(user);
  return Boolean(switches.canEditInvoices);
}

/**
 * Determines if the current user is permitted to delete inventory transactions/vouchers.
 * Strictly gated by user role / custom permissions AND /server tenant switchboard.
 */
export function canUserDeleteTransaction(user: any, tenant?: any): boolean {
  if (!user) return false;

  // 1. Gated by /server tenant feature switch (if explicitly disabled, block all)
  const customFeatures = tenant?.custom_features || tenant?.customFeatures || tenant?.features;
  if (customFeatures) {
    if (customFeatures.allow_transaction_deletion === false || customFeatures.allowTransactionDeletion === false) {
      return false;
    }
  }

  try {
    const serverFlags = localStorage.getItem('mbi_server_feature_flags');
    if (serverFlags) {
      const parsed = JSON.parse(serverFlags);
      if (parsed.allow_transaction_deletion === false || parsed.allowTransactionDeletion === false) {
        return false;
      }
    }
  } catch (e) {}

  // 2. Check Role (primary_admin, secondary_admin, owner, etc.)
  const rawRole = String(user.role || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
  const isPrimary = user.isPrimaryOwner === true || 
                    user.is_primary_owner === 1 || 
                    user.is_primary_owner === true || 
                    rawRole === 'primary_admin' || 
                    rawRole === 'primary_owner' || 
                    rawRole === 'owner';
                    
  const isSecondary = rawRole === 'secondary_admin' || rawRole === 'admin';

  if (isPrimary || isSecondary) {
    return true;
  }

  // 3. Check custom user permissions
  const customPerms = user.custom_permissions || user.customPermissions;
  if (customPerms) {
    if (customPerms.can_delete_invoices === true || customPerms.canDeleteInvoices === true) {
      return true;
    }
    if (customPerms.switches?.canDeleteInvoices === true) {
      return true;
    }
  }

  // 4. Fallback to operational switches
  const switches = getEffectiveSecuritySwitches(user);
  return Boolean(switches.canDeleteInvoices);
}

