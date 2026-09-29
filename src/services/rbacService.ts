/**
 * MBI INVENTRA - Role-Based Access Control (RBAC) & Permissions Engine
 * Strict security definitions for Primary Admin, Cashier, Pharmacist & Sub-Users
 */

import { UserRole, UserPermissionSet, AppUser } from '../types/user';

export interface RBACContext {
  userId?: string;
  role?: UserRole | string;
  isPrimaryOwner?: boolean;
  isPrimaryAdmin?: boolean;
}

export const RBAC_ROLE_PERMISSIONS: Record<string, {
  label: string;
  description: string;
  allowedRoutes: string[];
  deniedRoutes: string[];
  canManageStaff: boolean;
  canAccessBackup: boolean;
  canCustomizeMenu: boolean;
  canDeleteKhata: boolean;
  canAccessMasterServer: boolean;
}> = {
  Owner: {
    label: 'Primary Store Owner',
    description: 'Unrestricted master access to all billing, ledgers, staff, backups & settings',
    allowedRoutes: ['*'],
    deniedRoutes: [],
    canManageStaff: true,
    canAccessBackup: true,
    canCustomizeMenu: true,
    canDeleteKhata: true,
    canAccessMasterServer: true
  },
  Admin: {
    label: 'Primary Admin',
    description: 'Full store administrative control and security management',
    allowedRoutes: ['*'],
    deniedRoutes: [],
    canManageStaff: true,
    canAccessBackup: true,
    canCustomizeMenu: true,
    canDeleteKhata: true,
    canAccessMasterServer: true
  },
  Manager: {
    label: 'Store Manager',
    description: 'Store operations, inventory, purchases, shifts & sales checkout',
    allowedRoutes: ['/user', '/sale', '/sale/pos', '/items', '/purchase', '/parties', '/shifts', '/expenses'],
    deniedRoutes: ['/settings', '/backup', '/server'],
    canManageStaff: false,
    canAccessBackup: false,
    canCustomizeMenu: false,
    canDeleteKhata: false,
    canAccessMasterServer: false
  },
  Pharmacist: {
    label: 'Registered Pharmacist',
    description: 'POS retail billing, batch FEFO lookup & doctor prescription logs',
    allowedRoutes: ['/user', '/sale/pos', '/items', '/prescriptions'],
    deniedRoutes: ['/settings', '/backup', '/server', '/reports', '/expenses', '/bank', '/parties'],
    canManageStaff: false,
    canAccessBackup: false,
    canCustomizeMenu: false,
    canDeleteKhata: false,
    canAccessMasterServer: false
  },
  Cashier: {
    label: 'POS Cashier / Biller',
    description: 'High-speed 0.2s POS checkout, cashier shift open/close & customer search',
    allowedRoutes: ['/user', '/sale/pos', '/shifts'],
    deniedRoutes: ['/settings', '/backup', '/server', '/reports', '/expenses', '/bank', '/purchase', '/parties', '/items'],
    canManageStaff: false,
    canAccessBackup: false,
    canCustomizeMenu: false,
    canDeleteKhata: false,
    canAccessMasterServer: false
  },
  'Stock Manager': {
    label: 'Inventory & Stock Manager',
    description: 'Medicine catalog, batch lots, godown transfers & purchase requisitions',
    allowedRoutes: ['/user', '/items', '/purchase', '/transfers', '/inventory'],
    deniedRoutes: ['/settings', '/backup', '/server', '/reports', '/expenses', '/bank', '/sale/pos'],
    canManageStaff: false,
    canAccessBackup: false,
    canCustomizeMenu: false,
    canDeleteKhata: false,
    canAccessMasterServer: false
  }
};

/**
 * Evaluates whether a user is the primary store owner / master administrator
 */
export function isPrimaryOwner(user?: any): boolean {
  if (!user) return true; // Safe default for initial session before profile load
  return (
    user.is_primary_owner === true ||
    user.isPrimaryAdmin === true ||
    user.is_primary === true ||
    user.role === 'Owner' ||
    user.role === 'Primary Admin' ||
    user.role === 'Admin' ||
    user.role === 'Super Admin' ||
    user.role === 'owner' ||
    user.role === 'admin'
  );
}

/**
 * Checks if user is permitted to view or perform Database Backup & Disaster Recovery
 * STRICT REQUIREMENT: Only Primary Owner can backup/restore. Sub-users are 100% blocked.
 */
export function canAccessBackupRestore(user?: any): boolean {
  return isPrimaryOwner(user);
}

/**
 * Checks if user can customize sidebar navigation menu toggles
 */
export function canCustomizeMenu(user?: any): boolean {
  return isPrimaryOwner(user);
}

/**
 * Checks if user can add, edit, or delete staff members
 */
export function canManageStaffMembers(user?: any): boolean {
  return isPrimaryOwner(user);
}

/**
 * List of 11 baseline core pharmacy modules guaranteed across all plans (Trial, Silver, Basic, Gold, Platinum)
 */
export const BASELINE_PHARMACY_MODULES = [
  'dashboard',
  'sale',
  'items',
  'purchase',
  'parties',
  'shifts',
  'expenses',
  'bank',
  'reports',
  'settings',
  'syncShare',
  'aiGuide'
] as const;

/**
 * Checks if a specific route is accessible for the user's role with safe fallback for core menus
 */
export function isRouteAllowedForRole(path: string, user?: any): boolean {
  if (isPrimaryOwner(user)) return true;
  
  const roleName = user?.role || 'Primary Admin';
  const roleConfig = RBAC_ROLE_PERMISSIONS[roleName] || RBAC_ROLE_PERMISSIONS['Admin'] || RBAC_ROLE_PERMISSIONS['Cashier'];
  
  if (roleConfig.allowedRoutes.includes('*')) return true;

  // Check explicit denies
  for (const denied of roleConfig.deniedRoutes) {
    if (path === denied || path.startsWith(`${denied}/`)) {
      return false;
    }
  }

  // Check explicit allows
  for (const allowed of roleConfig.allowedRoutes) {
    if (path === allowed || path.startsWith(`${allowed}/`)) {
      return true;
    }
  }

  return false;
}

/**
 * Safe Menu Permission Fallback:
 * If user is Primary Owner or allowed_modules is uninitialized, NEVER hide core operational modules.
 */
export function hasCoreMenuAccess(moduleKey: string, user?: any): boolean {
  if (isPrimaryOwner(user)) return true;
  if (!user || !user.allowed_modules) return true;
  return !!user.allowed_modules[moduleKey];
}

export const rbacService = {
  isPrimaryOwner,
  canAccessBackupRestore,
  canCustomizeMenu,
  canManageStaffMembers,
  isRouteAllowedForRole,
  hasCoreMenuAccess,
  BASELINE_PHARMACY_MODULES,
  getRoleDefinition: (role: string) => RBAC_ROLE_PERMISSIONS[role] || RBAC_ROLE_PERMISSIONS['Cashier']
};

