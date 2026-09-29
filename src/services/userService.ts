import { AppUser, CreateUserInput, UpdateUserInput, UserRole } from '../types/user';
import { emitToast } from '../contexts/ToastContext';

class UserService {
  private cache: AppUser[] = [];

  /**
   * Fetch all staff members / users
   */
  async getAllUsers(tenantId?: string): Promise<AppUser[]> {
    try {
      const response = await fetch(`/api/users${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId ? { 'x-tenant-id': tenantId } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.users)) {
          this.cache = data.users;
          return data.users;
        }
      }
    } catch (err) {
      console.warn('Network request failed for getAllUsers, using cached/local users:', err);
    }

    if (this.cache.length > 0) {
      return this.cache;
    }

    // Default primary owner fallback
    const defaultOwner: AppUser = {
      id: 'usr_primary_owner',
      name: 'Primary Administrator',
      username: 'owner',
      emailOrPhone: 'owner@inventra.local',
      role: 'Owner',
      isPrimaryOwner: true,
      is_primary_owner: 1,
      status: 'Active',
      passcode: '1234',
      permissions: {
        canManageStaff: true,
        canAccessMasterServer: true,
        canEditInvoices: true,
        canDeleteInvoices: true,
        canReprintInvoices: true,
        canGiveDiscounts: true,
        canViewReports: true,
        canManageInventory: true,
        canManageSuppliers: true,
        canAccessSettings: true
      },
      createdAt: new Date().toISOString()
    };

    return [defaultOwner];
  }

  /**
   * Create a new sub-user (Cashier, Pharmacist, Manager, Accountant)
   */
  async createUser(input: CreateUserInput): Promise<AppUser> {
    const payload = {
      ...input,
      isPrimaryOwner: false,
      is_primary_owner: 0
    };

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create user');
    }

    return data.user;
  }

  /**
   * Update sub-user details
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<AppUser> {
    const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to update user');
    }

    return data.user;
  }

  /**
   * Toggle Active / Inactive Status with Primary Owner Immunity Guard
   */
  async toggleUserStatus(user: AppUser): Promise<string> {
    if (this.isPrimaryOwner(user)) {
      emitToast('Root Primary Store Owner account cannot be deactivated', 'warning');
      throw new Error('Primary Store Owner account cannot be deleted or deactivated');
    }

    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const response = await fetch(`/api/users/${encodeURIComponent(user.id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to change status');
    }

    return nextStatus;
  }

  /**
   * Delete Sub-User with Primary Owner Immunity Guard
   */
  async deleteUser(user: AppUser): Promise<void> {
    if (this.isPrimaryOwner(user)) {
      emitToast('Root Primary Store Owner account cannot be deleted', 'error');
      throw new Error('Primary Store Owner account cannot be deleted or deactivated');
    }

    const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to delete user');
    }
  }

  /**
   * Primary Store Owner Immunity Check
   */
  isPrimaryOwner(user?: AppUser | null): boolean {
    if (!user) return false;
    return Boolean(
      user.isPrimaryOwner === true ||
      user.is_primary_owner === 1 ||
      user.is_primary_owner === true ||
      user.role === 'Owner' ||
      user.id === 'usr_primary_owner'
    );
  }

  /**
   * Role Permission Check for Staff Management Access
   */
  canManageStaff(role?: UserRole | string): boolean {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'owner' || r === 'admin' || r === 'super admin';
  }

  /**
   * Role Permission Check for Master Server Settings
   */
  canAccessMasterServer(role?: UserRole | string): boolean {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === 'owner' || r === 'super admin';
  }
}

export const userService = new UserService();
