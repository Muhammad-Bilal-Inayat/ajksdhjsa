import { AppUser, CreateUserInput, UpdateUserInput, UserRole } from '../types/user';
import { emitToast } from '../contexts/ToastContext';

class UserService {
  // Tenant-scoped in-memory cache
  private tenantCache = new Map<string, AppUser[]>();

  private getAuthHeaders(tenantId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_auth_token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    return headers;
  }

  /**
   * Fetch all staff members / users strictly for the active tenant
   */
  async getAllUsers(tenantId?: string): Promise<AppUser[]> {
    const effectiveTenantId = tenantId || (typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('mbi_user') || '{}').tenantId || 'tenant_main_pharmacy') : 'tenant_main_pharmacy');

    try {
      const response = await fetch(`/api/users?tenantId=${encodeURIComponent(effectiveTenantId)}`, {
        headers: this.getAuthHeaders(effectiveTenantId)
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.users)) {
          this.tenantCache.set(effectiveTenantId, data.users);
          return data.users;
        }
      }
    } catch (err) {
      console.warn('Network request failed for getAllUsers, using cached/local users:', err);
    }

    if (this.tenantCache.has(effectiveTenantId)) {
      return this.tenantCache.get(effectiveTenantId)!;
    }

    return [];
  }

  /**
   * Create a new sub-user (Cashier, Pharmacist, Manager, Accountant)
   */
  async createUser(input: CreateUserInput, tenantId?: string): Promise<AppUser> {
    const effectiveTenantId = tenantId || (typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('mbi_user') || '{}').tenantId || 'tenant_main_pharmacy') : 'tenant_main_pharmacy');

    const payload = {
      ...input,
      tenantId: effectiveTenantId,
      isPrimaryOwner: false,
      is_primary_owner: 0
    };

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: this.getAuthHeaders(effectiveTenantId),
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create user');
    }

    // Invalidate local cache for this tenant
    this.tenantCache.delete(effectiveTenantId);

    return data.user;
  }

  /**
   * Update sub-user details
   */
  async updateUser(id: string, input: UpdateUserInput, tenantId?: string): Promise<AppUser> {
    const effectiveTenantId = tenantId || (typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('mbi_user') || '{}').tenantId || 'tenant_main_pharmacy') : 'tenant_main_pharmacy');

    const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(effectiveTenantId),
      body: JSON.stringify(input)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to update user');
    }

    this.tenantCache.delete(effectiveTenantId);
    return data.user;
  }

  /**
   * Toggle Active / Inactive Status with Primary Owner Immunity Guard
   */
  async toggleUserStatus(user: AppUser, tenantId?: string): Promise<string> {
    if (this.isPrimaryOwner(user)) {
      emitToast('Root Primary Store Owner account cannot be deactivated', 'warning');
      throw new Error('Primary Store Owner account cannot be deleted or deactivated');
    }

    const effectiveTenantId = tenantId || user.tenantId || (typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('mbi_user') || '{}').tenantId || 'tenant_main_pharmacy') : 'tenant_main_pharmacy');
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';

    const response = await fetch(`/api/users/${encodeURIComponent(user.id)}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(effectiveTenantId),
      body: JSON.stringify({ status: nextStatus })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to change status');
    }

    this.tenantCache.delete(effectiveTenantId);
    return nextStatus;
  }

  /**
   * Delete Sub-User with Primary Owner Immunity Guard
   */
  async deleteUser(user: AppUser, tenantId?: string): Promise<void> {
    if (this.isPrimaryOwner(user)) {
      emitToast('Root Primary Store Owner account cannot be deleted', 'error');
      throw new Error('Primary Store Owner account cannot be deleted or deactivated');
    }

    const effectiveTenantId = tenantId || user.tenantId || (typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('mbi_user') || '{}').tenantId || 'tenant_main_pharmacy') : 'tenant_main_pharmacy');

    const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(effectiveTenantId)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to delete user');
    }

    this.tenantCache.delete(effectiveTenantId);
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
