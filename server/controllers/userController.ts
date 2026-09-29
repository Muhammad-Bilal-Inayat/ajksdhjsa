import { Request, Response } from 'express';
import { getMariaDbPool } from '../db/mariaClient';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { broadcastTenantEvent } from '../routes/syncRoutes';
import { broadcastFleetActivity } from '../routes/adminRoutes';

const syncFile = path.resolve(process.cwd(), '.sync_data.json');
const masterUsersFile = path.resolve(process.cwd(), '.master_users.json');

// In-memory fallback / file-based storage helper
export function getFallbackUsers(tenantId?: string): any[] {
  let allUsers: any[] = [];
  try {
    if (fs.existsSync(syncFile)) {
      const data = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
      if (Array.isArray(data.mbi_users)) {
        allUsers = data.mbi_users;
      } else if (Array.isArray(data.users)) {
        allUsers = data.users;
      }
    }
  } catch (e) {}

  if (allUsers.length === 0 && fs.existsSync(masterUsersFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(masterUsersFile, 'utf-8'));
      if (Array.isArray(data)) allUsers = data;
    } catch (e) {}
  }

  if (allUsers.length === 0) {
    allUsers = [
      {
        id: 'usr_primary_owner',
        tenant_id: 'tenant_main_pharmacy',
        tenantId: 'tenant_main_pharmacy',
        name: 'Dr. Kashif Ahmed',
        username: 'owner',
        emailOrPhone: '0328-1302636',
        email: 'admin@inventra.local',
        phone: '0328-1302636',
        role: 'Owner',
        isPrimaryOwner: true,
        is_primary_owner: 1,
        status: 'Active',
        passcode: '1234',
        is_online: 1,
        isOnline: true,
        is_kill_switch_active: 0,
        isKillSwitchActive: false,
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
      },
      {
        id: 'usr_cashier_bilal',
        tenant_id: 'tenant_main_pharmacy',
        tenantId: 'tenant_main_pharmacy',
        name: 'Bilal Cashier',
        username: 'bilal_pos',
        emailOrPhone: '0300-1234567',
        email: 'bilal@inventra.local',
        phone: '0300-1234567',
        role: 'Cashier',
        isPrimaryOwner: false,
        is_primary_owner: 0,
        status: 'Active',
        passcode: '5566',
        is_online: 1,
        isOnline: true,
        is_kill_switch_active: 0,
        isKillSwitchActive: false,
        permissions: {
          canManageStaff: false,
          canAccessMasterServer: false,
          canEditInvoices: false,
          canDeleteInvoices: false,
          canReprintInvoices: true,
          canGiveDiscounts: false,
          canViewReports: false,
          canManageInventory: false,
          canManageSuppliers: false,
          canAccessSettings: false
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_pharmacist_ali',
        tenant_id: 'tenant_hassan_medicos',
        tenantId: 'tenant_hassan_medicos',
        name: 'Hassan Ali',
        username: 'hassan_owner',
        emailOrPhone: '0336-4585863',
        email: 'hassan@medicos.pk',
        phone: '0336-4585863',
        role: 'Owner',
        isPrimaryOwner: true,
        is_primary_owner: 1,
        status: 'Active',
        passcode: '7788',
        is_online: 0,
        isOnline: false,
        is_kill_switch_active: 0,
        isKillSwitchActive: false,
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
      }
    ];
  }

  if (tenantId && tenantId !== 'all' && tenantId !== 'default') {
    return allUsers.filter(u => (u.tenant_id === tenantId || u.tenantId === tenantId));
  }
  return allUsers;
}

export function saveFallbackUsers(users: any[]) {
  try {
    let data: any = {};
    if (fs.existsSync(syncFile)) {
      data = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
    }
    data.mbi_users = users;
    fs.writeFileSync(syncFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save fallback users to sync data:', e);
  }
}

/**
 * Controller: Get all staff members for a tenant
 */
export async function getUsersController(req: Request, res: Response) {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string) || 'default';

    // 1. Attempt MariaDB query
    try {
      const pool = getMariaDbPool();
      let query = 'SELECT * FROM mbi_users ORDER BY is_primary_owner DESC, created_at ASC';
      let params: any[] = [];

      if (tenantId && tenantId !== 'all' && tenantId !== 'default') {
        query = 'SELECT * FROM mbi_users WHERE tenant_id = ? OR tenant_id IS NULL OR tenant_id = "default" ORDER BY is_primary_owner DESC, created_at ASC';
        params = [tenantId];
      }

      const rows: any = await pool.query(query, params);

      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map((u: any) => ({
          id: u.id,
          tenantId: u.tenant_id,
          tenant_id: u.tenant_id,
          name: u.name,
          username: u.username || u.name.toLowerCase().replace(/\s+/g, '_'),
          emailOrPhone: u.email || u.phone || u.email_or_phone,
          email: u.email,
          phone: u.phone,
          role: u.role || 'Cashier',
          isPrimaryOwner: Boolean(u.is_primary_owner === 1 || u.is_primary_owner === true || u.role === 'Owner'),
          is_primary_owner: u.is_primary_owner === 1 || u.is_primary_owner === true || u.role === 'Owner' ? 1 : 0,
          status: u.status || 'Active',
          passcode: u.passcode || u.pin || '1234',
          isOnline: Boolean(u.is_online === 1 || u.is_online === true),
          is_online: u.is_online === 1 ? 1 : 0,
          lastLoginAt: u.last_login_at || u.updated_at,
          isKillSwitchActive: Boolean(u.is_kill_switch_active === 1 || u.is_kill_switch_active === true),
          is_kill_switch_active: u.is_kill_switch_active === 1 ? 1 : 0,
          permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || {}),
          createdAt: u.created_at,
          updatedAt: u.updated_at
        }));
        return res.json({ success: true, users: mapped });
      }
    } catch (dbErr) {
      // Fall through to file fallback
    }

    const fallback = getFallbackUsers(tenantId);
    return res.json({ success: true, users: fallback });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch users' });
  }
}

/**
 * Controller: Create new staff / sub-user and emit SSE mutation
 */
export async function createUserController(req: Request, res: Response) {
  try {
    const { name, username, emailOrPhone, phone, email, role, passcode, status, permissions, notes, tenantId: bodyTenantId } = req.body;
    const tenantId = bodyTenantId || (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'tenant_main_pharmacy';

    if (!name || !role) {
      return res.status(400).json({ success: false, error: 'Name and role are required' });
    }

    const newUser = {
      id: `usr_${uuidv4().slice(0, 8)}`,
      tenant_id: tenantId,
      tenantId: tenantId,
      name,
      username: username || name.toLowerCase().replace(/\s+/g, '_'),
      emailOrPhone: emailOrPhone || phone || email || '',
      email: email || (emailOrPhone?.includes('@') ? emailOrPhone : ''),
      phone: phone || (!emailOrPhone?.includes('@') ? emailOrPhone : ''),
      role: role || 'Cashier',
      isPrimaryOwner: role === 'Owner',
      is_primary_owner: role === 'Owner' ? 1 : 0,
      status: status || 'Active',
      passcode: passcode || '1234',
      is_online: 0,
      isOnline: false,
      is_kill_switch_active: 0,
      isKillSwitchActive: false,
      permissions: permissions || {
        canManageStaff: role === 'Owner' || role === 'Manager',
        canAccessMasterServer: role === 'Owner',
        canEditInvoices: role === 'Manager' || role === 'Pharmacist',
        canDeleteInvoices: role === 'Owner',
        canReprintInvoices: true,
        canGiveDiscounts: role === 'Manager' || role === 'Owner',
        canViewReports: role === 'Manager' || role === 'Accountant' || role === 'Owner',
        canManageInventory: role === 'Pharmacist' || role === 'Manager' || role === 'Owner',
        canManageSuppliers: role === 'Manager' || role === 'Accountant' || role === 'Owner',
        canAccessSettings: role === 'Owner'
      },
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // MariaDB write
    try {
      const pool = getMariaDbPool();
      await pool.query(
        `INSERT INTO mbi_users (id, tenant_id, name, username, email, phone, role, is_primary_owner, status, passcode, is_online, is_kill_switch_active, permissions, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), passcode=VALUES(passcode), role=VALUES(role), status=VALUES(status);`,
        [
          newUser.id,
          newUser.tenant_id,
          newUser.name,
          newUser.username,
          newUser.email,
          newUser.phone,
          newUser.role,
          newUser.is_primary_owner,
          newUser.status,
          newUser.passcode,
          0,
          0,
          JSON.stringify(newUser.permissions),
          newUser.createdAt,
          newUser.updatedAt
        ]
      );
    } catch (dbErr) {}

    // Fallback sync
    const allUsers = getFallbackUsers();
    allUsers.push(newUser);
    saveFallbackUsers(allUsers);

    // Broadcast SSE event to client & Master Hub
    try {
      broadcastTenantEvent(tenantId, {
        type: 'STAFF_LIST_MUTATED',
        entity: 'mbi_users',
        payload: {
          action: 'CREATE',
          tenantId,
          user: newUser,
          timestamp: new Date().toISOString()
        }
      });

      broadcastFleetActivity({
        id: `act_${Date.now()}`,
        tenantId,
        storeName: tenantId,
        userName: newUser.name,
        userRole: newUser.role,
        actionType: 'STAFF_MUTATION',
        actionDetails: `New staff sub-user registered: ${newUser.name} (${newUser.role})`,
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: 'Web Dispatch',
        timestamp: new Date().toISOString(),
        relativeTime: 'Just now'
      });
    } catch (e) {}

    return res.status(201).json({ success: true, user: newUser });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create user' });
  }
}

/**
 * Controller: Update staff / sub-user details
 */
export async function updateUserController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, username, emailOrPhone, phone, email, role, passcode, status, permissions, notes, is_kill_switch_active } = req.body;

    const allUsers = getFallbackUsers();
    const existingIndex = allUsers.findIndex(u => u.id === id);
    const existing = existingIndex >= 0 ? allUsers[existingIndex] : null;

    if (existing && (existing.isPrimaryOwner || existing.is_primary_owner === 1 || existing.role === 'Owner')) {
      if (role && role !== 'Owner') {
        return res.status(403).json({ success: false, error: 'Primary Store Owner account cannot have its Owner role altered' });
      }
      if (status && status !== 'Active') {
        return res.status(403).json({ success: false, error: 'Primary Store Owner account cannot be deactivated' });
      }
    }

    const updatedUser = {
      ...(existing || { id }),
      name: name !== undefined ? name : existing?.name,
      username: username !== undefined ? username : existing?.username,
      emailOrPhone: emailOrPhone !== undefined ? emailOrPhone : existing?.emailOrPhone,
      phone: phone !== undefined ? phone : existing?.phone,
      email: email !== undefined ? email : existing?.email,
      role: (existing?.isPrimaryOwner || existing?.is_primary_owner === 1) ? 'Owner' : (role !== undefined ? role : existing?.role),
      passcode: passcode !== undefined ? passcode : existing?.passcode,
      status: (existing?.isPrimaryOwner || existing?.is_primary_owner === 1) ? 'Active' : (status !== undefined ? status : existing?.status),
      is_kill_switch_active: is_kill_switch_active !== undefined ? (is_kill_switch_active ? 1 : 0) : existing?.is_kill_switch_active,
      isKillSwitchActive: is_kill_switch_active !== undefined ? Boolean(is_kill_switch_active) : existing?.isKillSwitchActive,
      permissions: permissions !== undefined ? permissions : existing?.permissions,
      notes: notes !== undefined ? notes : existing?.notes,
      updatedAt: new Date().toISOString()
    };

    try {
      const pool = getMariaDbPool();
      await pool.query(
        `UPDATE mbi_users SET name = ?, username = ?, email = ?, phone = ?, role = ?, passcode = ?, status = ?, is_kill_switch_active = ?, permissions = ?, updated_at = ? WHERE id = ?`,
        [
          updatedUser.name,
          updatedUser.username,
          updatedUser.email,
          updatedUser.phone,
          updatedUser.role,
          updatedUser.passcode,
          updatedUser.status,
          updatedUser.is_kill_switch_active ? 1 : 0,
          JSON.stringify(updatedUser.permissions || {}),
          updatedUser.updatedAt,
          id
        ]
      );
    } catch (dbErr) {}

    if (existingIndex >= 0) {
      allUsers[existingIndex] = updatedUser;
    } else {
      allUsers.push(updatedUser);
    }
    saveFallbackUsers(allUsers);

    // Broadcast SSE
    const tenantId = updatedUser.tenant_id || updatedUser.tenantId || 'tenant_main_pharmacy';
    try {
      broadcastTenantEvent(tenantId, {
        type: 'STAFF_LIST_MUTATED',
        entity: 'mbi_users',
        payload: { action: 'UPDATE', tenantId, user: updatedUser, timestamp: new Date().toISOString() }
      });
    } catch (e) {}

    return res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to update user' });
  }
}

/**
 * Controller: Toggle user status or kill-switch
 */
export async function toggleUserStatusController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, killSwitch } = req.body;

    const allUsers = getFallbackUsers();
    const existing = allUsers.find(u => u.id === id);

    if (id === 'usr_primary_owner' || (existing && (existing.isPrimaryOwner || existing.is_primary_owner === 1 || existing.role === 'Owner'))) {
      return res.status(403).json({ success: false, error: 'Primary Store Owner account cannot be disabled or killed' });
    }

    const newStatus = status || (existing?.status === 'Active' ? 'Inactive' : 'Active');
    const isKillActive = killSwitch !== undefined ? (killSwitch ? 1 : 0) : (existing?.is_kill_switch_active ? 1 : 0);

    try {
      const pool = getMariaDbPool();
      await pool.query('UPDATE mbi_users SET status = ?, is_kill_switch_active = ?, updated_at = ? WHERE id = ?', [
        newStatus,
        isKillActive,
        new Date().toISOString(),
        id
      ]);
    } catch (dbErr) {}

    if (existing) {
      existing.status = newStatus;
      existing.is_kill_switch_active = isKillActive;
      existing.isKillSwitchActive = Boolean(isKillActive);
      existing.updatedAt = new Date().toISOString();
      saveFallbackUsers(allUsers);
    }

    const tenantId = existing?.tenant_id || existing?.tenantId || 'tenant_main_pharmacy';
    try {
      broadcastTenantEvent(tenantId, {
        type: 'STAFF_LIST_MUTATED',
        entity: 'mbi_users',
        payload: { action: 'STATUS_CHANGE', tenantId, userId: id, status: newStatus, killSwitch: Boolean(isKillActive), timestamp: new Date().toISOString() }
      });
    } catch (e) {}

    return res.json({ success: true, status: newStatus, killSwitch: Boolean(isKillActive) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to change status' });
  }
}

/**
 * Controller: Reset staff passcode
 */
export async function resetPasscodeController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { passcode } = req.body;

    if (!passcode) {
      return res.status(400).json({ success: false, error: 'New passcode is required' });
    }

    const allUsers = getFallbackUsers();
    const existing = allUsers.find(u => u.id === id);

    try {
      const pool = getMariaDbPool();
      await pool.query('UPDATE mbi_users SET passcode = ?, updated_at = ? WHERE id = ?', [
        passcode,
        new Date().toISOString(),
        id
      ]);
    } catch (dbErr) {}

    if (existing) {
      existing.passcode = passcode;
      existing.updatedAt = new Date().toISOString();
      saveFallbackUsers(allUsers);
    }

    const tenantId = existing?.tenant_id || existing?.tenantId || 'tenant_main_pharmacy';
    try {
      broadcastTenantEvent(tenantId, {
        type: 'STAFF_LIST_MUTATED',
        entity: 'mbi_users',
        payload: { action: 'PASSCODE_RESET', tenantId, userId: id, timestamp: new Date().toISOString() }
      });
    } catch (e) {}

    return res.json({ success: true, message: 'Passcode successfully reset', passcode });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to reset passcode' });
  }
}

/**
 * Controller: Delete user
 */
export async function deleteUserController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const allUsers = getFallbackUsers();
    const target = allUsers.find(u => u.id === id);

    if (id === 'usr_primary_owner' || (target && (target.isPrimaryOwner || target.is_primary_owner === 1 || target.role === 'Owner'))) {
      return res.status(403).json({ success: false, error: 'Primary Store Owner account cannot be deleted' });
    }

    try {
      const pool = getMariaDbPool();
      await pool.query('DELETE FROM mbi_users WHERE id = ? AND (is_primary_owner = 0 OR is_primary_owner IS NULL)', [id]);
    } catch (dbErr) {}

    const filtered = allUsers.filter(u => u.id !== id);
    saveFallbackUsers(filtered);

    const tenantId = target?.tenant_id || target?.tenantId || 'tenant_main_pharmacy';
    try {
      broadcastTenantEvent(tenantId, {
        type: 'STAFF_LIST_MUTATED',
        entity: 'mbi_users',
        payload: { action: 'DELETE', tenantId, userId: id, timestamp: new Date().toISOString() }
      });
    } catch (e) {}

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to delete user' });
  }
}
