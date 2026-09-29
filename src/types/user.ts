export type UserRole = 
  | 'Owner' 
  | 'Admin' 
  | 'Super Admin' 
  | 'Manager' 
  | 'Pharmacist' 
  | 'Cashier' 
  | 'Stock Manager'
  | 'Accountant' 
  | 'Auditor' 
  | 'Viewer';

export interface UserPermissionSet {
  canManageStaff?: boolean;
  canAccessMasterServer?: boolean;
  canEditInvoices?: boolean;
  canDeleteInvoices?: boolean;
  canReprintInvoices?: boolean;
  canGiveDiscounts?: boolean;
  canViewReports?: boolean;
  canManageInventory?: boolean;
  canManageSuppliers?: boolean;
  canAccessSettings?: boolean;
}

export interface AppUser {
  id: string;
  tenantId?: string;
  businessId?: string;
  name: string;
  username?: string;
  emailOrPhone: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isPrimaryOwner: boolean;
  is_primary_owner?: boolean | number;
  status: 'Active' | 'Inactive' | 'Pending' | 'Suspended';
  passcode?: string;
  pin?: string;
  permissions?: UserPermissionSet;
  lastActive?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface CreateUserInput {
  name: string;
  username?: string;
  emailOrPhone: string;
  phone?: string;
  role: UserRole;
  passcode: string;
  status?: 'Active' | 'Inactive';
  permissions?: UserPermissionSet;
  notes?: string;
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  emailOrPhone?: string;
  phone?: string;
  role?: UserRole;
  passcode?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
  permissions?: UserPermissionSet;
  notes?: string;
}
