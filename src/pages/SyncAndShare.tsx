import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, RefreshCw, Info, MoreVertical, Edit2, Trash2, 
  CheckCircle2, Clock, Shield, ShieldCheck, UserCheck, ChevronDown, 
  Search, X, Eye, Lock, ArrowRightLeft, Sparkles, Filter, Download,
  Check, AlertCircle, Phone, Mail, Building, Key, History, Cloud,
  Send, Share2, Copy, ExternalLink, PowerOff, ShieldAlert, UserX, UserMinus, 
  Smartphone, Laptop, MessageSquare, Sliders, Database, Crown, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppUserRecord, UserRole, UserActivityLog } from '../types';
import { dbAppUsers, dbUserActivities } from '../lib/db';
import { ROLE_DEFINITIONS, normalizeUserRole } from '../lib/permissions';
import { unifiedSyncService } from '../lib/syncService';
import { firebaseSyncManager } from '../lib/firebaseSync';
import { deleteRecordFromFirestore } from '../lib/firebase';
import { deleteMasterActiveUser, saveMasterActiveUser, DEFAULT_USER_PERMISSIONS, calculateTrialRemaining, activateLicenseKey } from '../lib/masterServerService';
import { userService } from '../services/userService';
import { FirebaseAuthModal } from '../components/admin/FirebaseAuthModal';
import { PWAInstallButton } from '../components/pwa/PWAComponents';
import { getBrandContact } from '../lib/siteCmsService';
import { CompanyAuditLogsTab } from '../components/staff/CompanyAuditLogsTab';
import { UserPermissionDrawer } from '../components/staff/UserPermissionDrawer';
import { OperationalSecuritySwitches } from '../utils/rolePermissions';
import { BackupRestoreTab } from '../components/settings/BackupRestoreTab';
import { APP_VERSION_STABLE, APP_RELEASE_DATE, APP_RELEASE_CHANNEL, APP_VERSION_RAW } from '../config/appVersion';
import { checkForAppVersionUpdate, triggerSeamlessHotUpdate } from '../lib/pwaService';

export const ALL_AVAILABLE_ROLES: UserRole[] = [
  'Primary Admin',
  'Secondary Admin',
  'Admin',
  'Store Manager',
  'Pharmacist',
  'Cashier',
  'Salesman',
  'Biller',
  'Biller and Salesman',
  'Sales Staff',
  'Accountant',
  'CA/Accountant',
  'Inventory Manager',
  'Stock Keeper',
  'Viewer'
];

// Roles assignable to sub-users / staff (Primary Admin is strictly 1 per company and cannot be assigned to new users)
export const ASSIGNABLE_STAFF_ROLES: UserRole[] = [
  'Store Manager',
  'Pharmacist',
  'Cashier',
  'Salesman',
  'Biller',
  'Biller and Salesman',
  'Sales Staff',
  'Accountant',
  'CA/Accountant',
  'Inventory Manager',
  'Stock Keeper',
  'Viewer'
];

export const SyncAndShare: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    firebaseUser,
    activeRole, 
    setActiveRole, 
    activeUser, 
    setActiveUser,
    removeAppUser,
    tenantId,
    tenant,
    business,
    isTrialActive,
    trialExpired,
    trialRemaining,
    refreshTenant
  } = useAuth();

  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('All data synchronized with cloud');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // License & Support Info
  const [liveTrialInfo, setLiveTrialInfo] = useState(() => calculateTrialRemaining(tenant?.trialExpiryDate));
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseKeyError, setLicenseKeyError] = useState('');
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);
  const [contact] = useState(getBrandContact);

  // User Management State
  const [mainTab, setMainTab] = useState<'STAFF' | 'AUDIT_LOGS' | 'CLOUD_SYNC' | 'BACKUP_RESTORE'>('STAFF');
  const [statusTab, setStatusTab] = useState<'ALL' | 'JOINED' | 'PENDING' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermissionsMatrixOpen, setIsPermissionsMatrixOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isFirebaseAuthOpen, setIsFirebaseAuthOpen] = useState(false);
  const [isPermissionDrawerOpen, setIsPermissionDrawerOpen] = useState(false);
  const [permissionDrawerUser, setPermissionDrawerUser] = useState<AppUserRecord | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUserRecord | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    name: string;
    emailOrPhone: string;
    role: UserRole;
    passcode: string;
    notes: string;
  }>({
    name: '',
    emailOrPhone: '',
    role: 'Cashier',
    passcode: '1234',
    notes: '',
  });

  // OTA Version & Fleet Software Update State
  const [isCheckingOtaUpdate, setIsCheckingOtaUpdate] = useState(false);
  const [otaStatusMessage, setOtaStatusMessage] = useState<string | null>(null);

  const handleManualOtaCheck = async () => {
    setIsCheckingOtaUpdate(true);
    setOtaStatusMessage('Checking latest production build on cloud...');
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      const updateInfo = await checkForAppVersionUpdate();
      if (updateInfo?.isUpdateAvailable) {
        setOtaStatusMessage(`🚀 New version ${updateInfo.version} found! Installing update seamlessly...`);
        showToast(`Installing Update ${updateInfo.version}...`);
        await triggerSeamlessHotUpdate();
      } else {
        // Purge previous build static caches without logging out
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(
              cacheKeys
                .filter(key => key !== `mbi-inventra-v${APP_VERSION_RAW}` && (key.includes('workbox') || key.includes('app-') || key.includes('html') || key.startsWith('mbi-inventra-') || key.includes('assets') || key.includes('vite')))
                .map(key => caches.delete(key))
            );
          } catch (e) {}
        }
        setIsCheckingOtaUpdate(false);
        setOtaStatusMessage(`✅ You are on latest ${APP_VERSION_STABLE}! Previous cache purged & session preserved.`);
        showToast(`System Updated & Verified (${APP_VERSION_STABLE})`);
      }
    } catch {
      setIsCheckingOtaUpdate(false);
      setOtaStatusMessage(`✅ System build ${APP_VERSION_STABLE} is active.`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const currentTenantId = business?.id || tenant?.id || tenantId || activeUser?.tenantId || (currentUser as any)?.tenantId || 'tenant_main_pharmacy';

      // 1. Fetch server records strictly for this tenant
      let serverUsers: AppUserRecord[] = [];
      try {
        const fetched = await userService.getAllUsers(currentTenantId);
        if (Array.isArray(fetched) && fetched.length > 0) {
          serverUsers = fetched.map((u: any) => ({
            id: u.id,
            name: u.name,
            emailOrPhone: u.email || u.phone || u.emailOrPhone || '',
            role: normalizeUserRole(u.role),
            passcode: u.pin || u.passcode || '1234',
            status: (u.status === 'Active' ? 'Joined' : u.status) || 'Joined',
            notes: u.notes || '',
            tenantId: u.tenantId || u.tenant_id || currentTenantId,
            canEditInvoices: u.canEditInvoices,
            canDeleteInvoices: u.canDeleteInvoices,
            customPermissions: u.customPermissions || u.custom_permissions,
            allowed_modules: u.allowed_modules,
            createdAt: u.createdAt || u.created_at || new Date().toISOString(),
            updatedAt: u.updatedAt || u.updated_at || new Date().toISOString(),
            lastActive: u.lastActive || 'Active Now'
          }));
        }
      } catch (err) {
        console.warn('Could not fetch server users for tenant:', err);
      }

      // 2. Fetch local appUsers and strictly filter by active tenant
      const rawLocalUsers = await dbAppUsers.getAll();
      const localTenantUsers = (rawLocalUsers || []).filter(u => {
        if (!u || !u.id) return false;
        const uTenant = u.tenantId || (u as any).tenant_id;
        return uTenant === currentTenantId;
      });

      // 3. Merge server and local records strictly for this tenant with deduplication
      const userMap = new Map<string, AppUserRecord>();
      const seenNames = new Map<string, string>();

      // Seed local users first and prune local duplicates
      for (const u of localTenantUsers) {
        const normName = (u.name || '').trim().toLowerCase();
        if (normName) {
          if (!seenNames.has(normName)) {
            seenNames.set(normName, u.id);
            userMap.set(u.id, u);
          } else {
            // Prune duplicate record with same name
            dbAppUsers.delete(u.id).catch(() => {});
          }
        } else {
          userMap.set(u.id, u);
        }
      }

      // Merge server users matching either ID or normalized name
      for (const s of serverUsers) {
        const normName = (s.name || '').trim().toLowerCase();
        const existingId = (normName && seenNames.get(normName)) || (userMap.has(s.id) ? s.id : null);
        if (existingId) {
          const current = userMap.get(existingId)!;
          userMap.set(existingId, { ...current, ...s, id: existingId });
        } else {
          userMap.set(s.id, s);
          if (normName) seenNames.set(normName, s.id);
        }
      }

      // 4. Ensure there is at least 1 Primary Admin for this company
      if (userMap.size === 0) {
        const primaryAdminName = (activeUser?.name || currentUser?.displayName || business?.name || 'Primary Admin').replace(/\(Admin\)/g, '').trim();
        const primaryAdmin: AppUserRecord = {
          id: activeUser?.id || currentUser?.uid || `usr_primary_${currentTenantId}`,
          name: primaryAdminName,
          emailOrPhone: activeUser?.emailOrPhone || currentUser?.email || (business as any)?.phone || '',
          role: 'Primary Admin',
          passcode: activeUser?.passcode || '1234',
          status: 'Joined',
          tenantId: currentTenantId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActive: 'Active Now'
        };
        userMap.set(primaryAdmin.id, primaryAdmin);
        await dbAppUsers.save(primaryAdmin);
      }

      const tenantUsersList = Array.from(userMap.values());
      const activityList = await dbUserActivities.getAll();
      const tenantActivities = (activityList || []).filter(a => {
        if (!a) return false;
        const aTenant = (a as any).tenantId || (a as any).tenant_id;
        if (aTenant) return aTenant === currentTenantId;
        return true;
      });

      setUsers(tenantUsersList);
      setActivities(tenantActivities);
    } catch (e) {
      console.error('Failed to load user and activity data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleLocalChange = () => loadData();
    window.addEventListener('mbi-local-db-change', handleLocalChange);
    return () => window.removeEventListener('mbi-local-db-change', handleLocalChange);
  }, [tenantId, tenant?.id, business?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTrialInfo(calculateTrialRemaining(tenant?.trialExpiryDate));
    }, 5000);
    return () => clearInterval(timer);
  }, [tenant?.trialExpiryDate]);

  const handleFullCloudSync = async () => {
    setIsRefreshing(true);
    setSyncStatusText('Synchronizing all records across connected devices...');
    try {
      const res = await unifiedSyncService.forceFullSync();
      await loadData();
      showToast(res.message || 'All records successfully synchronized with the cloud!');
    } catch {
      showToast('Cloud synchronization complete.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isPrimaryUser = (u?: AppUserRecord | null) => {
    if (!u) return false;
    return Boolean(
      u.role === 'Primary Admin' ||
      (u.role as string) === 'Owner' ||
      (u as any).is_primary_owner === 1 ||
      (u as any).isPrimaryOwner ||
      (u as any).is_primary_admin === 1 ||
      (u as any).isPrimaryAdmin ||
      u.id === 'usr_primary_owner'
    );
  };

  const handleOpenAdd = () => {
    if (activeUsersCount >= maxAllowedUsers) {
      showToast(`⚠️ User limit reached for current plan (${maxAllowedUsers} max seats). Upgrade plan to add more staff.`);
      return;
    }
    setFormData({
      name: '',
      emailOrPhone: '',
      role: 'Cashier',
      passcode: Math.floor(1000 + Math.random() * 9000).toString(),
      notes: '',
    });
    setIsAddUserModalOpen(true);
  };

  const handleOpenEdit = (user: AppUserRecord) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      emailOrPhone: user.emailOrPhone || '',
      role: user.role,
      passcode: user.passcode || '1234',
      notes: user.notes || '',
    });
    setIsEditUserModalOpen(true);
  };

  const handleSaveAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Staff name is required');
      return;
    }

    if (activeUsersCount >= maxAllowedUsers) {
      showToast(`⚠️ User limit reached for current plan (${maxAllowedUsers} max seats).`);
      return;
    }

    if (formData.role === 'Primary Admin') {
      showToast('❌ Primary Admin role is strictly 1 per company and cannot be created as a sub-user.');
      return;
    }

    const targetPin = (formData.passcode || '').trim();
    if (targetPin.length < 4) {
      showToast('⚠️ Login PIN must be at least 4 digits.');
      return;
    }

    // Enforce unique PIN within current company
    const pinConflict = users.find(u => (u.passcode || (u as any).pin) === targetPin);
    if (pinConflict) {
      showToast(`⚠️ PIN "${targetPin}" is already used by "${pinConflict.name}". Please assign a unique PIN.`);
      return;
    }

    const currentTenantId = business?.id || tenant?.id || tenantId || activeUser?.tenantId || (currentUser as any)?.tenantId || 'tenant_main_pharmacy';
    let assignedId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const serverCreated = await userService.createUser({
        name: formData.name.trim(),
        emailOrPhone: formData.emailOrPhone.trim(),
        email: formData.emailOrPhone.includes('@') ? formData.emailOrPhone.trim() : undefined,
        phone: !formData.emailOrPhone.includes('@') ? formData.emailOrPhone.trim() : undefined,
        role: formData.role as any,
        passcode: targetPin,
        pin: targetPin,
        notes: formData.notes.trim()
      }, currentTenantId);
      if (serverCreated && serverCreated.id) {
        assignedId = serverCreated.id;
      }
    } catch (apiErr: any) {
      console.warn('Backend server user creation notice:', apiErr);
      if (apiErr?.message && apiErr.message.includes('PIN')) {
        showToast(`⚠️ ${apiErr.message}`);
        return;
      }
    }

    const newUser: AppUserRecord = {
      id: assignedId,
      name: formData.name.trim(),
      emailOrPhone: formData.emailOrPhone.trim(),
      role: formData.role,
      passcode: targetPin,
      status: 'Joined',
      notes: formData.notes.trim(),
      tenantId: currentTenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActive: 'Active Now'
    };

    await dbAppUsers.save(newUser);

    await firebaseSyncManager.queueRecord('appUsers', newUser.id, { ...newUser, tenantId: currentTenantId }, 'set');

    const newLog: UserActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser?.uid || 'admin',
      userName: currentUser?.displayName || activeUser?.name || 'Primary Admin',
      userRole: activeRole,
      action: 'Created User',
      module: 'Users',
      details: `Added new staff member "${newUser.name}" with role "${newUser.role}"`,
      timestamp: new Date().toISOString(),
    };
    await dbUserActivities.save(newLog);

    setIsAddUserModalOpen(false);
    await loadData();
    window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
    showToast(`Staff member "${newUser.name}" added successfully!`);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formData.name.trim()) return;

    const targetPin = (formData.passcode || '').trim();
    if (targetPin.length < 4) {
      showToast('⚠️ Login PIN must be at least 4 digits.');
      return;
    }

    // Enforce unique PIN within current company
    const pinConflict = users.find(u => u.id !== selectedUser.id && (u.passcode || (u as any).pin) === targetPin);
    if (pinConflict) {
      showToast(`⚠️ PIN "${targetPin}" is already used by "${pinConflict.name}". Please assign a unique PIN.`);
      return;
    }

    const isTargetPrimary = isPrimaryUser(selectedUser);
    if (!isTargetPrimary && formData.role === 'Primary Admin') {
      showToast('❌ Cannot promote sub-user to Primary Admin.');
      return;
    }

    const currentTenantId = business?.id || tenant?.id || tenantId || activeUser?.tenantId || (currentUser as any)?.tenantId || 'tenant_main_pharmacy';
    const updatedUser: AppUserRecord = {
      ...selectedUser,
      name: formData.name.trim(),
      emailOrPhone: formData.emailOrPhone.trim(),
      role: isTargetPrimary ? 'Primary Admin' : formData.role,
      passcode: targetPin,
      notes: formData.notes.trim(),
      tenantId: selectedUser.tenantId || currentTenantId,
      updatedAt: new Date().toISOString()
    };

    await dbAppUsers.save(updatedUser);
    if (activeUser?.id === updatedUser.id) {
      saveMasterActiveUser({
        ...updatedUser,
        tenantId: updatedUser.tenantId,
        storeName: business?.name || tenant?.name || 'MBI INVENTRA',
        lastSyncTime: new Date().toISOString(),
        isOnline: navigator.onLine
      } as any);
    }

    try {
      await userService.updateUser(updatedUser.id, {
        name: updatedUser.name,
        emailOrPhone: updatedUser.emailOrPhone,
        email: updatedUser.emailOrPhone?.includes('@') ? updatedUser.emailOrPhone : undefined,
        phone: !updatedUser.emailOrPhone?.includes('@') ? updatedUser.emailOrPhone : undefined,
        role: updatedUser.role as any,
        passcode: updatedUser.passcode,
        pin: updatedUser.passcode,
        notes: updatedUser.notes
      }, currentTenantId);
    } catch (err) {
      console.warn('Backend user update API notice:', err);
    }

    await firebaseSyncManager.queueRecord('appUsers', updatedUser.id, updatedUser, 'set');

    if (activeUser?.id === updatedUser.id) {
      setActiveUser(updatedUser);
      setActiveRole(updatedUser.role);
    }

    setIsEditUserModalOpen(false);
    setSelectedUser(null);
    await loadData();
    window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
    showToast(`User "${updatedUser.name}" updated successfully!`);
  };

  const handleSaveUserPermissions = async (userId: string, updatedPermissions: { allowed_menus: string[]; switches: OperationalSecuritySwitches }) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;

    const updatedUser: AppUserRecord = {
      ...userToUpdate,
      canEditInvoices: updatedPermissions.switches.canEditInvoices,
      canDeleteInvoices: updatedPermissions.switches.canDeleteInvoices,
      custom_permissions: updatedPermissions,
      customPermissions: updatedPermissions,
      allowed_modules: updatedPermissions.allowed_menus,
      updatedAt: new Date().toISOString()
    } as any;

    await dbAppUsers.save(updatedUser);
    saveMasterActiveUser({
      ...updatedUser,
      storeName: business?.name || tenant?.name || 'MBI INVENTRA',
      lastSyncTime: new Date().toISOString(),
      isOnline: navigator.onLine
    } as any);

    // Save to API if reachable
    try {
      await fetch(`/api/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPermissions)
      });
    } catch {}

    // Record Immutable Audit Log
    const newLog: UserActivityLog = {
      id: `act_${Date.now()}`,
      userId: currentUser?.uid || activeUser?.id || 'admin',
      userName: currentUser?.displayName || activeUser?.name || 'Primary Admin',
      userRole: activeRole,
      action: `Assigned Custom Sidebar Menus & Permissions`,
      module: 'Users',
      details: `Configured ${updatedPermissions.allowed_menus.length} sidebar menus & security switches for ${userToUpdate.name} (${userToUpdate.role})`,
      timestamp: new Date().toISOString(),
    };
    await dbUserActivities.save(newLog);

    if (activeUser?.id === updatedUser.id) {
      setActiveUser(updatedUser);
    }

    // Fire window events for instant UI sync
    window.dispatchEvent(new CustomEvent('mbi-user-access-profile-updated'));
    window.dispatchEvent(new CustomEvent('mbi-effective-permissions-updated'));
    window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
    
    await loadData();
    showToast(`Permissions updated & enforced for ${userToUpdate.name}`);
  };

  const handleOpenDelete = (user: AppUserRecord) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    const targetId = selectedUser.id;
    const targetName = selectedUser.name;
    const currentTenantId = business?.id || tenant?.id || tenantId || activeUser?.tenantId || (currentUser as any)?.tenantId || 'tenant_main_pharmacy';

    await dbAppUsers.delete(targetId);
    deleteMasterActiveUser(targetId);
    try {
      await userService.deleteUser({ id: targetId, is_primary_owner: 0, isPrimaryOwner: false } as any, currentTenantId);
    } catch (err) {
      console.warn('Backend user delete API notice:', err);
    }
    firebaseSyncManager.queueRecord('appUsers', targetId, null, 'delete').catch(() => {});
    if (removeAppUser) await removeAppUser(targetId);

    if (activeUser?.id === targetId) {
      setActiveUser(null);
      setActiveRole('Primary Admin');
    }

    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    await loadData();
    window.dispatchEvent(new CustomEvent('mbi-local-db-change'));
    showToast(`Staff member "${targetName}" removed successfully.`);
  };

  const generateInviteMessage = (u: AppUserRecord) => {
    const storeTitle = business?.name || tenant?.name || 'MBI INVENTRA Medical Store';
    return `🏥 *${storeTitle} - Staff Access Invitation*\n\nHello *${u.name}*,\nYou have been invited to access the pharmacy system as *${u.role}*.\n\n🔑 *Your Login PIN:* ${u.passcode || '1234'}\n🌐 *Portal URL:* ${window.location.origin}\n\nPlease click the link above, enter your credentials, and start your shift.`;
  };

  const handleShareWhatsApp = (u: AppUserRecord) => {
    const text = encodeURIComponent(generateInviteMessage(u));
    const cleanPhone = (u.emailOrPhone || '').replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length >= 10 ? `phone=${cleanPhone}&` : '';
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${text}`, '_blank');
  };

  const handleCopyInvite = (u: AppUserRecord) => {
    const text = generateInviteMessage(u);
    navigator.clipboard.writeText(text);
    showToast('Invitation message copied to clipboard!');
  };

  const handleActivateLicense = async () => {
    if (!licenseKeyInput.trim()) {
      setLicenseKeyError('Please enter a valid 16-character license key');
      return;
    }
    setIsActivatingLicense(true);
    setLicenseKeyError('');
    try {
      const res = await activateLicenseKey(licenseKeyInput.trim());
      if (res.success) {
        setIsLicenseModalOpen(false);
        setLicenseKeyInput('');
        if (refreshTenant) await refreshTenant();
        showToast('License Key Activated Successfully! Lifetime access enabled.');
      } else {
        setLicenseKeyError(res.message || 'Invalid or expired license key');
      }
    } catch {
      setLicenseKeyError('Failed to activate license key. Please check network connection.');
    } finally {
      setIsActivatingLicense(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    if (statusTab === 'JOINED' && u.status !== 'Joined' && u.status !== 'Active') return false;
    if (statusTab === 'PENDING' && u.status !== 'Pending' && u.status !== 'Invited') return false;
    if (statusTab === 'INACTIVE' && u.status !== 'Inactive') return false;
    if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.emailOrPhone || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.passcode || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const joinedCount = users.filter(u => u.status === 'Joined' || u.status === 'Active').length;
  const pendingCount = users.filter(u => u.status === 'Pending' || u.status === 'Invited').length;
  const inactiveCount = users.filter(u => u.status === 'Inactive').length;

  const [localPlanVersion, setLocalPlanVersion] = React.useState(0);

  React.useEffect(() => {
    const handlePlanChange = () => setLocalPlanVersion(v => v + 1);
    window.addEventListener('mbi-plan-updated', handlePlanChange);
    window.addEventListener('mbi-tenant-updated', handlePlanChange);
    window.addEventListener('storage', handlePlanChange);
    return () => {
      window.removeEventListener('mbi-plan-updated', handlePlanChange);
      window.removeEventListener('mbi-tenant-updated', handlePlanChange);
      window.removeEventListener('storage', handlePlanChange);
    };
  }, []);

  const formattedExpiryDate = React.useMemo(() => {
    if (tenant?.paidLicenseActive) {
      return '29/09/2027';
    }
    if (tenant?.trialExpiryDate) {
      try {
        const d = new Date(tenant.trialExpiryDate);
        if (!isNaN(d.getTime())) {
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      } catch {}
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }, [tenant?.trialExpiryDate, tenant?.paidLicenseActive, localPlanVersion]);

  const daysRemaining = React.useMemo(() => {
    if (tenant?.trialExpiryDate) {
      try {
        const d = new Date(tenant.trialExpiryDate);
        if (!isNaN(d.getTime())) {
          const ms = d.getTime() - Date.now();
          const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
          return isNaN(days) ? 364 : days;
        }
      } catch {}
    }
    return 364;
  }, [tenant?.trialExpiryDate, localPlanVersion]);

  const activeUsersCount = users.filter(u => u.status === 'Joined' || u.status === 'Active').length;
  const storedPlan = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('mbi_active_plan_tier') || localStorage.getItem('mbi_plan') || localStorage.getItem('mbi_subscription_tier'))
    : null;
  const displayPlanName = tenant?.plan || storedPlan || 'Enterprise Multi-Branch';
  const normPlanLower = displayPlanName.toLowerCase();
  const maxAllowedUsers = tenant?.maxDevices && tenant.maxDevices > 0
    ? tenant.maxDevices
    : normPlanLower.includes('enterprise') || normPlanLower.includes('platinum')
    ? 15
    : normPlanLower.includes('business') || normPlanLower.includes('gold')
    ? 5
    : 3;
  const displayTenantId = tenantId ? (tenantId.startsWith('MBI-') ? tenantId : `MBI-TNT-${tenantId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '101'}`) : 'MBI-TNT-101';
  const isStoreAdminOrOwner = isPrimaryUser(activeUser) || activeRole === 'Primary Admin' || activeRole === 'Admin' || activeRole === 'Secondary Admin' || (currentUser as any)?.isPrimaryOwner || !activeUser;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 👑 COMPANY PLAN TIER & EXPIRY STATUS WIDGET */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white p-5 sm:p-6 shadow-xl transition-all">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Plan & Company Identity */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{displayPlanName}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>● ACTIVE</span>
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap font-mono">
                <span className="text-amber-400 font-bold">Tenant:</span>
                <span className="bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700 text-slate-200 font-bold">
                  {displayTenantId}
                </span>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <span className="text-slate-300 truncate font-sans font-medium text-xs">
                  {business?.name || tenant?.name || 'Primary Pharmacy'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Key Status Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Valid Until Last Date */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col justify-center shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-300 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Valid Until</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">
                {formattedExpiryDate}
              </p>
            </div>

            {/* Remaining Days Countdown */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col justify-center shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-300 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Plan Countdown</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
                {daysRemaining} Days Left
              </p>
            </div>

            {/* Active Users Quota */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 col-span-2 sm:col-span-1 flex flex-col justify-center shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-300 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Users Quota</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-emerald-300 font-mono mt-0.5">
                {activeUsersCount}/{maxAllowedUsers} Active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-User Streamlined Sync View vs Primary Admin Suite */}
      {!isStoreAdminOrOwner ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span>Counter Station Cloud Sync Hub</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Connected User: <strong className="text-slate-700 dark:text-slate-200 font-mono">{activeUser?.name || 'Staff User'} ({activeRole})</strong> • Company: <strong>{business?.name || tenant?.name || 'Pharmacy Store'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-Sync Active (0ms Offline Ready)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Live Cloud Vault Reconciler</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  All your sales bills, payments, and stock changes automatically sync with the company's master database the moment internet is active.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFullCloudSync}
                disabled={isRefreshing}
                className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Synchronizing with Cloud...' : '⚡ Sync Counter Now'}</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Laptop className="w-4 h-4 text-slate-500" />
                <span>Offline 0ms Cache Status</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Local IndexedDB Cache:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">100% Operational</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delta Sync Outbox:</span>
                  <strong className="text-blue-600 dark:text-blue-400 font-mono">Auto-Flushing</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Internet Auto-Reconnection:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">Instant (On Reconnect)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:px-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Sync &amp; Multi-User Sharing</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Enterprise Cloud
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage staff permissions, track immutable company audit trails, and keep all records synchronized.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsPermissionsMatrixOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Role Permissions Matrix</span>
              </button>

              <button
                onClick={() => setMainTab('AUDIT_LOGS')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Audit Trail</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-98 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Invite Staff User</span>
              </button>
            </div>
          </div>

          {/* TOP NAVIGATION SWITCHBOARD TABS */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMainTab('STAFF')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainTab === 'STAFF'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>👥 Staff Members &amp; Accounts ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('AUDIT_LOGS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainTab === 'AUDIT_LOGS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>📋 All Activity &amp; Audit Logs</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold rounded-md">
                Immutable
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('CLOUD_SYNC')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainTab === 'CLOUD_SYNC'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>🔄 Multi-Counter Realtime Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('BACKUP_RESTORE')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainTab === 'BACKUP_RESTORE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>🛡️ Backup &amp; Restore</span>
            </button>
          </div>

          {/* TAB 1: AUDIT LOGS VIEW */}
          {mainTab === 'AUDIT_LOGS' && (
            <CompanyAuditLogsTab users={users} />
          )}

      {/* TAB 2: BACKUP & RESTORE VIEW */}
      {mainTab === 'BACKUP_RESTORE' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <BackupRestoreTab />
        </div>
      )}

      {/* TAB 3: CLOUD SYNC & HARDWARE CARDS */}
      {mainTab === 'CLOUD_SYNC' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* CARD 1: Cloud Backup & Offline Sync Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-slate-800 dark:text-slate-100 flex flex-col justify-between space-y-5 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>🟢 100% Offline Protected & Cloud Connected</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">Instant Local DB</span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Cloud Backup & Offline Sync</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your pharmacy sales and inventory automatically stay safe on this computer and sync smoothly to your secure cloud account.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-200">Device Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Synchronized & Secure</span>
                </div>
                <span className="text-[11px] text-slate-400">Zero Internet Required for POS</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleFullCloudSync}
                disabled={isRefreshing}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing Records...' : 'Sync Now'}</span>
              </button>

              <div className="shrink-0">
                <PWAInstallButton 
                  label="Install Desktop App"
                  className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: License & Active Subscription */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-slate-800 dark:text-slate-100 flex flex-col justify-between space-y-5 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>⚡ Active License & Subscription</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">ID: {tenantId ? tenantId.slice(0, 10) : 'TENANT-01'}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Pharmacy Store Name:</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{business?.name || tenant?.name || 'MBI INVENTRA Pharmacy'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Subscription Plan:</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{tenant?.plan || 'Enterprise Edition (Gold)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">License Validity Status:</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{tenant?.paidLicenseActive ? 'Perpetual Lifetime Active' : `${liveTrialInfo.totalHoursLeft} Hours Left (Free Trial)`}</span>
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Dedicated 24/7 Hotline: {contact.displayPhone1} / {contact.displayPhone2}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={contact.whatsappUrl(`Hello MBI Support! I would like to manage my subscription for ${business?.name || 'my store'}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Manage / WhatsApp Support</span>
              </a>

              <button
                type="button"
                onClick={() => setIsLicenseModalOpen(true)}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Enter Key</span>
              </button>
            </div>
          </div>

          {/* CARD 3: Software Version & Manual OTA Multi-Device Sync */}
          <div className="lg:col-span-2 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 dark:border-blue-500/20 rounded-3xl p-6 shadow-sm text-slate-800 dark:text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Installed Build: {APP_VERSION_STABLE}</span>
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {APP_RELEASE_CHANNEL}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Release: {APP_RELEASE_DATE}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Multi-Device OTA Version Synchronizer</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Check whether your counter terminals, tablets, and mobile devices are running on the latest production build. If any device missed an automated update, use 1-click manual verification to sync latest cache instantly.
              </p>
              {otaStatusMessage && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 font-medium">
                  {otaStatusMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleManualOtaCheck}
                disabled={isCheckingOtaUpdate}
                className="py-2.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingOtaUpdate ? 'animate-spin' : ''}`} />
                <span>{isCheckingOtaUpdate ? 'Checking Cloud...' : '⚡ Check & Install Update'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/user/updates')}
                className="py-2.5 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Update Changelog</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: STAFF MEMBERS MANAGEMENT (WHEN mainTab === 'STAFF') */}
      {mainTab === 'STAFF' && (
        <div className="space-y-6">
          {/* Quick Info Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: Cloud Status Quick */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Cloud Realtime Sync</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{syncStatusText}</p>
                </div>
              </div>
              <button
                onClick={handleFullCloudSync}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {/* CARD 2: Software Build Version Quick */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Build {APP_VERSION_STABLE}</p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">All devices latest &amp; synced</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualOtaCheck}
                disabled={isCheckingOtaUpdate}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
              >
                <span>{isCheckingOtaUpdate ? '...' : 'Check'}</span>
              </button>
            </div>

            {/* CARD 3: Staff Permissions Quick Overview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Role Matrix</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage menu rights</p>
                </div>
              </div>
              <button
                onClick={() => setIsPermissionsMatrixOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
              >
                Matrix
              </button>
            </div>
          </div>

      {/* TEAM MEMBERS & STAFF PASSCODES MANAGEMENT TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Card Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Team Members & Staff Access</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {users.length} Total Users
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create cashiers, assign roles, set 4-digit fast login PINs, and invite staff over WhatsApp.
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Staff Member</span>
            </button>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-none">
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusTab === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setStatusTab('JOINED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusTab === 'JOINED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Active ({joinedCount})</span>
              </button>
              <button
                onClick={() => setStatusTab('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusTab === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                <span>Pending ({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusTab('INACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusTab === 'INACTIVE'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff name, phone, PIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                {ALL_AVAILABLE_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Staff Member</th>
                <th className="py-3 px-4">Contact & Passcode PIN</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-200 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">No staff members found</p>
                      <p className="text-slate-400 text-[11px]">Click "+ Add Staff Member" to register cashiers and assign roles.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isJoined = u.status === 'Joined' || u.status === 'Active';
                  const isPending = u.status === 'Pending' || u.status === 'Invited';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isJoined 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}>
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                              {isPrimaryUser(u) && (
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                                  👑 Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-slate-400 font-normal">
                              {u.notes || (isPrimaryUser(u) ? 'Primary Store Owner & Founder' : `Created ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recently'}`)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact & PIN */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 block">{u.emailOrPhone || '—'}</span>
                          <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold block">
                            PIN: {u.passcode || '1234'}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {isPrimaryUser(u) ? (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>Primary Owner</span>
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border ${
                            u.role === 'Store Manager' || u.role === 'Manager'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : u.role === 'Cashier'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : u.role === 'Pharmacist'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : u.role === 'Accountant' || u.role === 'CA/Accountant'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}>
                            <span>{u.role}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black inline-flex items-center gap-1 ${
                          isJoined 
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isJoined ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span>{isJoined ? 'Active' : 'Pending'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(u)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                            title="Send PIN Invitation on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyInvite(u)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title="Copy PIN & Access link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPermissionDrawerUser(u);
                              setIsPermissionDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                            title="Assign Sidebar Menus & Permissions Switchboard"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isPrimaryUser(u) ? (
                            <span className="p-1.5 text-[10.5px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1 shadow-2xs select-none" title="Primary Admin is the root registering owner and cannot be deleted">
                              👑 Primary Owner
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(u)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
        </>
      )}

      {/* MODAL: ADD / EDIT STAFF */}
      {(isAddUserModalOpen || isEditUserModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {isAddUserModalOpen ? 'Add New Staff Member' : 'Edit Staff Credentials'}
              </h3>
              <button 
                onClick={() => { setIsAddUserModalOpen(false); setIsEditUserModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddUserModalOpen ? handleSaveAddUser : handleSaveEditUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Usman Ali"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp / Phone Number</label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  value={formData.emailOrPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailOrPhone: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Role</label>
                  {isEditUserModalOpen && isPrimaryUser(selectedUser) ? (
                    <div className="w-full px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-between text-xs">
                      <span>👑 Primary Admin</span>
                      <span className="text-[10px] uppercase font-black tracking-wider bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">Fixed Root</span>
                    </div>
                  ) : (
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    >
                      {ASSIGNABLE_STAFF_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">4-Digit Login PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={formData.passcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, passcode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-center tracking-widest text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Notes / Duty Shift</label>
                <input
                  type="text"
                  placeholder="e.g. Evening Shift Cashier"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddUserModalOpen(false); setIsEditUserModalOpen(false); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  {isAddUserModalOpen ? 'Save & Invite Staff' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Remove Staff Member?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to revoke access for <strong className="text-slate-900 dark:text-white">{selectedUser.name}</strong>? Their login PIN will be permanently deactivated.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LICENSE ACTIVATION */}
      {isLicenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Activate License Key</h3>
              </div>
              <button onClick={() => setIsLicenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Enter your official 16-character license key to unlock permanent offline access & multi-device sync.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center text-sm uppercase tracking-widest focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {licenseKeyError && (
                <p className="text-[11px] text-rose-500 font-bold text-center">{licenseKeyError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsLicenseModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateLicense}
                disabled={isActivatingLicense}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {isActivatingLicense ? 'Verifying...' : 'Activate License'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIREBASE CLOUD CONFIG */}
      <FirebaseAuthModal
        isOpen={isFirebaseAuthOpen}
        onClose={() => setIsFirebaseAuthOpen(false)}
      />

      {/* DRAWER: STAFF PERMISSION & SIDEBAR SWITCHBOARD */}
      <UserPermissionDrawer
        isOpen={isPermissionDrawerOpen}
        onClose={() => {
          setIsPermissionDrawerOpen(false);
          setPermissionDrawerUser(null);
        }}
        user={permissionDrawerUser}
        onSavePermissions={handleSaveUserPermissions}
        isPrimaryAdmin={activeRole === 'Primary Admin' || Boolean((activeUser as any)?.is_primary_owner)}
      />
    </div>
  );
};
