import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, Upload, Download, RefreshCw, CheckCircle2, 
  AlertTriangle, ShieldCheck, Database, HardDrive, FileText, 
  Search, Lock, Sparkles, ArrowRight, Eye, Check, ExternalLink,
  Package, ShoppingCart, Users, Truck, DollarSign, Wallet,
  Calendar, Clock, ShieldAlert, Archive, Laptop, Play
} from 'lucide-react';
import { getAllTenants, Tenant } from '../../lib/masterServerService';
import { 
  BackupSnapshot, 
  decryptBackupContainer, 
  decryptDataString, 
  verifyBackupSnapshot, 
  executeVerifiedRestore, 
  downloadBackupSnapshot,
  generateFullDatabaseSnapshot,
  MBI_SYSTEM_KEY,
  MBI_ENCRYPTED_HEADER
} from '../../lib/backupManager';
import { backupService } from '../../services/backupService';
import { encryptionService, MBI_DEFAULT_MASTER_KEY } from '../../services/encryptionService';
import { emitToast } from '../../contexts/ToastContext';
import { invalidateStoreCache, initDB } from '../../lib/db';
import { useNavigate } from 'react-router-dom';

interface RestoredRecordSummary {
  medicines: number;
  invoices: number;
  suppliers: number;
  purchaseOrders: number;
  expenses: number;
  partyPayments: number;
  bankAccounts: number;
  appUsers: number;
  other: number;
  total: number;
}

export const ManualTenantBackupRestoreHub: React.FC<{ onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void }> = ({ onNotify }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tenant state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // File Upload & Parsing state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedSnapshot, setParsedSnapshot] = useState<BackupSnapshot | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Restore Execution state
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreSuccessResult, setRestoreSuccessResult] = useState<{
    tenantName: string;
    tenantId: string;
    counts: RestoredRecordSummary;
    timestamp: string;
  } | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load all tenants on mount
  useEffect(() => {
    try {
      const list = getAllTenants();
      setTenants(list);
      if (list.length > 0 && !selectedTenantId) {
        setSelectedTenantId(list[0].tenantId || list[0].id);
      }
    } catch (e) {
      console.error('Failed to load tenants:', e);
    }
  }, []);

  const selectedTenant = useMemo(() => {
    return tenants.find(t => (t.tenantId || t.id) === selectedTenantId) || tenants[0] || null;
  }, [tenants, selectedTenantId]);

  const filteredTenants = useMemo(() => {
    if (!searchTerm.trim()) return tenants;
    const q = searchTerm.toLowerCase();
    return tenants.filter(t => 
      (t.name || '').toLowerCase().includes(q) ||
      (t.tenantId || t.id || '').toLowerCase().includes(q) ||
      (t.ownerName || '').toLowerCase().includes(q) ||
      (t.phone || '').toLowerCase().includes(q)
    );
  }, [tenants, searchTerm]);

  // Handle Backup File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParsedSnapshot(null);
    setRestoreSuccessResult(null);

    try {
      const text = await file.text();
      setRawFileContent(text);
      await parseAndValidateFile(text, passphrase);
    } catch (err: any) {
      console.error('File read error:', err);
      setParseError(err?.message || 'Failed to read backup file.');
    } finally {
      setIsParsing(false);
    }
  };

  // Parse and decrypt backup payload
  const parseAndValidateFile = async (content: string, keyToUse?: string) => {
    try {
      let snapshot: BackupSnapshot | null = null;
      const key = keyToUse || MBI_DEFAULT_MASTER_KEY;

      // 1. Try standard JSON parse
      try {
        const parsed = JSON.parse(content);
        if (parsed.mbiEncrypted === true || parsed.version?.includes('AES256') || parsed.encryptedData) {
          // Encrypted container
          if (parsed.encryptedData) {
            const decStr = decryptDataString(parsed.encryptedData, key);
            snapshot = JSON.parse(decStr);
          } else if (parsed.ciphertext || parsed.data) {
            const dec = await encryptionService.decryptPayload(content, key);
            snapshot = typeof dec === 'string' ? JSON.parse(dec) : dec;
          }
        } else if (parsed.data || parsed.backupPayload?.data) {
          snapshot = parsed.data ? parsed : parsed.backupPayload;
        }
      } catch (jsonErr) {
        // 2. Try raw decrypt if encrypted header exists
        if (content.includes(MBI_ENCRYPTED_HEADER)) {
          const dec = decryptDataString(content, key);
          snapshot = JSON.parse(dec);
        } else {
          // Try standard AES-256 decrypt
          const dec = await encryptionService.decryptPayload(content, key);
          snapshot = typeof dec === 'string' ? JSON.parse(dec) : dec;
        }
      }

      if (!snapshot || !snapshot.data) {
        throw new Error('Invalid backup structure: No valid medicines, invoices, or company data found.');
      }

      // Fill in safe defaults if missing
      if (!snapshot.stats) {
        const medCount = Array.isArray(snapshot.data?.medicines) ? snapshot.data.medicines.length : 0;
        const invCount = Array.isArray(snapshot.data?.invoices) ? snapshot.data.invoices.length : 0;
        const supCount = Array.isArray(snapshot.data?.suppliers) ? snapshot.data.suppliers.length : 0;
        snapshot.stats = {
          medicinesCount: medCount,
          invoicesCount: invCount,
          partiesCount: supCount,
          purchaseOrdersCount: Array.isArray(snapshot.data?.purchaseOrders) ? snapshot.data.purchaseOrders.length : 0,
          expensesCount: Array.isArray(snapshot.data?.expenses) ? snapshot.data.expenses.length : 0,
          paymentsCount: Array.isArray(snapshot.data?.partyPayments) ? snapshot.data.partyPayments.length : 0,
          bankAccountsCount: Array.isArray(snapshot.data?.bankAccounts) ? snapshot.data.bankAccounts.length : 0,
          bankTransactionsCount: Array.isArray(snapshot.data?.bankTransactions) ? snapshot.data.bankTransactions.length : 0,
          chequesCount: Array.isArray(snapshot.data?.cheques) ? snapshot.data.cheques.length : 0,
          loanAccountsCount: Array.isArray(snapshot.data?.loanAccounts) ? snapshot.data.loanAccounts.length : 0,
          usersCount: Array.isArray(snapshot.data?.appUsers) ? snapshot.data.appUsers.length : 0,
          shiftsCount: Array.isArray(snapshot.data?.cashierShifts) ? snapshot.data.cashierShifts.length : 0,
          onlineOrdersCount: Array.isArray(snapshot.data?.onlineOrders) ? snapshot.data.onlineOrders.length : 0,
          narcoticsLogsCount: Array.isArray(snapshot.data?.narcoticsLogs) ? snapshot.data.narcoticsLogs.length : 0,
          auditLogsCount: Array.isArray(snapshot.data?.auditLogs) ? snapshot.data.auditLogs.length : 0,
          totalRecords: medCount + invCount + supCount
        };
      }

      setParsedSnapshot(snapshot);
      setParseError(null);
      emitToast(`✅ Backup file verified: ${snapshot.stats.totalRecords} records detected`, 'success');
    } catch (err: any) {
      console.error('Parse verification failed:', err);
      setParsedSnapshot(null);
      setParseError(err?.message || 'Could not decrypt or verify backup. If protected by custom password, enter it below.');
    }
  };

  // Re-attempt decrypt when custom password changes
  const handlePasswordRetry = async () => {
    if (!rawFileContent) return;
    setIsParsing(true);
    await parseAndValidateFile(rawFileContent, passphrase);
    setIsParsing(false);
  };

  // Execute 1-Click Restore to Selected Tenant
  const handleExecuteRestore = async () => {
    if (!parsedSnapshot || !selectedTenant) {
      emitToast('Please select a tenant and upload a valid backup file first.', 'error');
      return;
    }

    const confirmMsg = `Are you sure you want to restore this backup into [${selectedTenant.name}] (${selectedTenant.tenantId || selectedTenant.id})?\n\n` +
      `Mode: ${restoreMode.toUpperCase()}\n` +
      `Records to import: ${parsedSnapshot.stats?.totalRecords || 'All available'}\n\n` +
      `This will immediately update this company's database and session data.`;

    if (!window.confirm(confirmMsg)) return;

    setIsRestoring(true);
    try {
      const targetTenantId = selectedTenant.tenantId || selectedTenant.id;
      const targetBusinessName = selectedTenant.name;

      // 1. Tag and sanitize records for the target tenant
      const db = await initDB();
      const payloadData = parsedSnapshot.data || {};
      
      const counts: RestoredRecordSummary = {
        medicines: 0,
        invoices: 0,
        suppliers: 0,
        purchaseOrders: 0,
        expenses: 0,
        partyPayments: 0,
        bankAccounts: 0,
        appUsers: 0,
        other: 0,
        total: 0
      };

      const stores = [
        'medicines', 'invoices', 'users', 'appUsers', 'userActivities', 'suppliers', 
        'purchaseOrders', 'auditLogs', 'expenses', 'partyPayments',
        'bankAccounts', 'bankTransactions', 'cheques', 'loanAccounts', 'cashierShifts',
        'onlineOrders', 'onlinePromotions', 'storeSettings',
        'shortageItems', 'narcoticsLogs', 'chronicRefills', 'supplierReturns', 'loyaltyCustomers'
      ] as const;

      for (const storeName of stores) {
        const items = payloadData[storeName];
        if (Array.isArray(items) && items.length > 0) {
          if (restoreMode === 'replace') {
            try {
              await db.clear(storeName);
            } catch (e) {}
          }

          const tx = db.transaction(storeName, 'readwrite');
          let storeCount = 0;
          for (const item of items) {
            if (item && (item.id || item.key)) {
              // Ensure item is tagged with the target tenant ID
              const taggedItem = {
                ...item,
                id: item.id || item.key,
                tenantId: targetTenantId,
                tenant_id: targetTenantId,
                companyId: targetTenantId
              };
              await tx.store.put(taggedItem);
              storeCount++;
              counts.total++;
            }
          }
          await tx.done;

          if (storeName === 'medicines') counts.medicines = storeCount;
          else if (storeName === 'invoices') counts.invoices = storeCount;
          else if (storeName === 'suppliers') counts.suppliers = storeCount;
          else if (storeName === 'purchaseOrders') counts.purchaseOrders = storeCount;
          else if (storeName === 'expenses') counts.expenses = storeCount;
          else if (storeName === 'partyPayments') counts.partyPayments = storeCount;
          else if (storeName === 'bankAccounts') counts.bankAccounts = storeCount;
          else if (storeName === 'appUsers' || storeName === 'users') counts.appUsers += storeCount;
          else counts.other += storeCount;
        }
      }

      // 2. Set business configuration & tenant state
      const restoredBusiness = parsedSnapshot.tenantInfo || (parsedSnapshot as any).business || {
        id: targetTenantId,
        name: targetBusinessName,
        ownerName: selectedTenant.ownerName,
        phone: selectedTenant.phone,
        plan: selectedTenant.plan
      };

      localStorage.setItem('mbi_active_tenant_id', targetTenantId);
      localStorage.setItem('mbi_active_tenant_name', targetBusinessName);
      localStorage.setItem('mock_business', JSON.stringify(restoredBusiness));
      
      // Update tenant timestamp in registry
      const updatedTenants = tenants.map(t => {
        if ((t.tenantId || t.id) === targetTenantId) {
          return {
            ...t,
            lastBackup: new Date().toISOString(),
            lastRestored: new Date().toISOString(),
            totalRecords: counts.total
          };
        }
        return t;
      });
      setTenants(updatedTenants);
      localStorage.setItem('mbi_master_tenants_v1', JSON.stringify(updatedTenants));

      // Invalidate memory cache so UI updates instantly
      invalidateStoreCache();

      // Broadcast reload event
      window.dispatchEvent(new CustomEvent('mbi-database-restored', {
        detail: {
          tenantId: targetTenantId,
          businessName: targetBusinessName,
          totalRestored: counts.total,
          counts,
          timestamp: new Date().toISOString()
        }
      }));

      setRestoreSuccessResult({
        tenantName: targetBusinessName,
        tenantId: targetTenantId,
        counts,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });

      const successMsg = `🎉 Successfully restored ${counts.total} records into [${targetBusinessName}]!`;
      emitToast(successMsg, 'success');
      if (onNotify) onNotify(successMsg, 'success');
    } catch (err: any) {
      console.error('Tenant restore execution failed:', err);
      const errMsg = `Restore Failed: ${err?.message || 'Unknown database error'}`;
      emitToast(errMsg, 'error');
      if (onNotify) onNotify(errMsg, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Export encrypted backup for the currently selected tenant
  const handleExportTenantBackup = async () => {
    if (!selectedTenant) return;
    setIsExporting(true);
    try {
      const snapshot = await generateFullDatabaseSnapshot({
        name: `Master Admin (${selectedTenant.name})`,
        role: 'Master Superadmin'
      });

      snapshot.tenantInfo = {
        tenantId: selectedTenant.tenantId || selectedTenant.id,
        businessName: selectedTenant.name,
        branchName: 'Main Branch',
        operatorName: selectedTenant.ownerName || 'Master Admin',
        operatorRole: 'Super Admin'
      };

      downloadBackupSnapshot(snapshot);
      emitToast(`🔒 Encrypted backup downloaded for [${selectedTenant.name}]`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      emitToast(`Export failed: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 1-Click Login & Access Verification for the Restored Company
  const handleLoginAsTenant = (tenant: Tenant) => {
    const tid = tenant.tenantId || tenant.id;
    localStorage.setItem('mbi_active_tenant_id', tid);
    localStorage.setItem('mbi_active_tenant_name', tenant.name);
    
    // Set active business session
    const businessObj = {
      id: tid,
      name: tenant.name,
      ownerName: tenant.ownerName,
      phone: tenant.phone,
      plan: tenant.plan || 'Standard POS',
      currency: 'PKR',
      city: tenant.city || 'Pakistan'
    };
    localStorage.setItem('mock_business', JSON.stringify(businessObj));

    // Set active user session
    const userObj = {
      id: `owner_${tid}`,
      name: tenant.ownerName || 'Store Owner',
      email: tenant.ownerEmail || tenant.primaryAdminEmail || (tenant as any).email || `${tid}@mbiinventra.com`,
      role: 'Owner',
      activeRole: 'Owner',
      tenantId: tid,
      companyName: tenant.name
    };
    localStorage.setItem('mock_user_profile', JSON.stringify(userObj));
    localStorage.setItem('currentUser', JSON.stringify(userObj));

    invalidateStoreCache();
    emitToast(`🚀 Switching session to [${tenant.name}]... Opening POS Dashboard`, 'success');
    
    setTimeout(() => {
      navigate('/user');
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/30 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">
                Tenant Database Backup & Manual Restore Hub
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MASTER ISOLATED VAULTS
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Centrally upload and 1-click restore encrypted backups (<code className="text-emerald-400 font-mono">.mbibackup</code> / <code className="text-emerald-400 font-mono">.mbi.enc</code>) for any company. Store-side restore is disabled for safety — Master Admin has 100% control over tenant vault restoration.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportTenantBackup}
              disabled={isExporting || !selectedTenant}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all hover:border-slate-500"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : 'text-indigo-400'}`} />
              <span>{isExporting ? 'Exporting...' : 'Export Selected Tenant'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Tenant Selector (Left) & Restore Action Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tenant Selection List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Target Company ({filteredTenants.length})
                </h3>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company, ID, owner..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Tenant Cards List */}
            <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1 scrollbar-thin">
              {filteredTenants.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No registered companies matching "{searchTerm}"
                </div>
              ) : (
                filteredTenants.map((t) => {
                  const tid = t.tenantId || t.id;
                  const isSelected = tid === (selectedTenant?.tenantId || selectedTenant?.id);

                  return (
                    <div
                      key={tid}
                      onClick={() => setSelectedTenantId(tid)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative ${
                        isSelected 
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-500/10' 
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {t.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono">
                            <span>ID: {tid}</span>
                            <span>•</span>
                            <span>{t.ownerName}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
                          t.plan === 'Enterprise Multi-Branch' 
                            ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                            : t.plan === 'Pharmacy Pro'
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}>
                          {t.plan || 'Standard'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upload, Decrypt & Execute Restore (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
            
            {/* Active Target Banner */}
            {selectedTenant && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Active Target for Restoration:
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedTenant.name}</span>
                    <span className="font-mono text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {selectedTenant.tenantId || selectedTenant.id}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoginAsTenant(selectedTenant)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Test / Open Company Login</span>
                </button>
              </div>
            )}

            {/* File Upload Drop Area */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Upload Company Backup Archive (.mbibackup / .mbi.enc / .json)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mbibackup,.enc,.mbi.enc,.json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                  uploadedFile 
                    ? 'border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Upload className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  {uploadedFile ? uploadedFile.name : 'Click to Browse or Drag & Drop Backup File'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Supports AES-256 encrypted snapshots (<code className="text-emerald-500 font-mono">.mbibackup</code>, <code className="text-emerald-500 font-mono">.mbi.enc</code>) & raw exports
                </p>
                {uploadedFile && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    <span>{(uploadedFile.size / 1024).toFixed(1)} KB loaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Password Decryption Field (If Required) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Backup Passphrase (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Leave blank for default Master System Key</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Enter store owner custom backup passphrase if required..."
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {rawFileContent && (
                  <button
                    type="button"
                    onClick={handlePasswordRetry}
                    disabled={isParsing}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    {isParsing ? 'Verifying...' : 'Re-verify'}
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Verified Payload Preview Card */}
            {parsedSnapshot && (
              <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Backup Verified & Ready for Vault Injection</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Timestamp: {parsedSnapshot.timestamp ? new Date(parsedSnapshot.timestamp).toLocaleString() : 'Recent'}
                  </div>
                </div>

                {/* Breakdown Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Medicines / Stock</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {Array.isArray(parsedSnapshot.data?.medicines) ? parsedSnapshot.data.medicines.length : 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Invoices & Sales</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {Array.isArray(parsedSnapshot.data?.invoices) ? parsedSnapshot.data.invoices.length : 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Suppliers & Khatas</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {Array.isArray(parsedSnapshot.data?.suppliers) ? parsedSnapshot.data.suppliers.length : 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Records</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {parsedSnapshot.stats?.totalRecords || 'Verified'}
                    </div>
                  </div>
                </div>

                {/* Restore Mode Toggle */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Restore Strategy:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        restoreMode === 'replace'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Clean Replace (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        restoreMode === 'merge'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Merge & Append
                    </button>
                  </div>
                </div>

                {/* Execute Button */}
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || !selectedTenant}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>
                    {isRestoring 
                      ? `Restoring records into [${selectedTenant?.name}]...` 
                      : `Execute 1-Click Restore to [${selectedTenant?.name}] Vault`
                    }
                  </span>
                </button>
              </div>
            )}

            {/* Post-Restore Success Card */}
            {restoreSuccessResult && (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 text-white space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-400">
                      Restoration Complete & 100% Operational!
                    </h4>
                    <p className="text-xs text-slate-300 font-mono">
                      Target Company: {restoreSuccessResult.tenantName} ({restoreSuccessResult.tenantId}) • {restoreSuccessResult.timestamp}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Medicines</div>
                    <div className="font-bold text-white">{restoreSuccessResult.counts.medicines}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Invoices</div>
                    <div className="font-bold text-white">{restoreSuccessResult.counts.invoices}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Suppliers</div>
                    <div className="font-bold text-white">{restoreSuccessResult.counts.suppliers}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Purchases</div>
                    <div className="font-bold text-white">{restoreSuccessResult.counts.purchaseOrders}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Expenses</div>
                    <div className="font-bold text-white">{restoreSuccessResult.counts.expenses}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Records</div>
                    <div className="font-bold text-emerald-400">{restoreSuccessResult.counts.total}</div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-300">
                    Data is stored and ready. When the company logs in, all restored records will be immediately accessible.
                  </div>
                  <button
                    type="button"
                    onClick={() => selectedTenant && handleLoginAsTenant(selectedTenant)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
                  >
                    <span>⚡ Launch & Verify Store POS Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
