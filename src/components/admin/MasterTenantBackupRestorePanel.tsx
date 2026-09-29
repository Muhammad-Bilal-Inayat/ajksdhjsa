import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Upload, Download, RefreshCw, CheckCircle2, 
  AlertTriangle, ShieldCheck, HardDrive, FileText, Search,
  Check, X, Eye, Trash2, ArrowRight, Shield, Layers, Lock,
  Building2, Cpu, Calendar, Clock, Sparkles
} from 'lucide-react';
import { 
  decryptBackupContainer, 
  verifyBackupSnapshot, 
  executeVerifiedRestore,
  generateChecksum,
  BackupSnapshot,
  VerificationResult
} from '../../lib/backupManager';
import { adminService, TenantTelemetryRecord } from '../../services/adminService';
import { logAuditEvent } from '../../lib/auditLogger';
import { emitToast } from '../../contexts/ToastContext';
import { syncEngine } from '../../lib/syncEngine';

export const MasterTenantBackupRestorePanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tenants list state
  const [tenants, setTenants] = useState<TenantTelemetryRecord[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // File Upload & Decryption State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('replace');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreOutcome, setRestoreOutcome] = useState<{ success: boolean; message: string; recordCount: number } | null>(null);

  // Server Stored Vault Backups State
  const [serverBackups, setServerBackups] = useState<any[]>([]);
  const [isLoadingServerBackups, setIsLoadingServerBackups] = useState(false);

  // Load tenants and server backups
  const loadData = async () => {
    setIsLoadingTenants(true);
    setIsLoadingServerBackups(true);
    try {
      const tenantList = await adminService.getTenantsTelemetry();
      setTenants(tenantList || []);
      if (tenantList && tenantList.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenantList[0].id);
      }

      const res = await fetch('/api/master/backups');
      if (res.ok) {
        const data = await res.json();
        setServerBackups(data.backups || []);
      }
    } catch (e) {
      console.warn('Failed to load backup vault data:', e);
    } finally {
      setIsLoadingTenants(false);
      setIsLoadingServerBackups(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
    (t.ownerName && t.ownerName.toLowerCase().includes(tenantSearchQuery.toLowerCase()))
  );

  const activeTenant = tenants.find(t => t.id === selectedTenantId) || (tenants.length > 0 ? tenants[0] : null);

  // Handle Drag & Drop / File Pick
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVerificationResult(null);
    setRestoreOutcome(null);
    handleInspectAndDecrypt(file);
  };

  const handleInspectAndDecrypt = async (file: File) => {
    setIsVerifying(true);
    try {
      const text = await file.text();
      const verified = verifyBackupSnapshot(text);
      setVerificationResult(verified);

      if (verified.isValid) {
        emitToast(`✅ File decrypted & verified: ${verified.stats.totalRecords} records found!`, 'success');
      } else {
        emitToast(`⚠️ Verification warning: ${verified.errors.join(', ')}`, 'error');
      }
    } catch (err: any) {
      console.error('Decryption failed:', err);
      emitToast(`Decryption error: ${err?.message || 'Invalid encrypted file format'}`, 'error');
      setVerificationResult({
        isValid: false,
        integrityPassed: false,
        errors: [err?.message || 'Decryption failed: Unsupported or corrupted backup file'],
        warnings: [],
        stats: {
          medicinesCount: 0,
          invoicesCount: 0,
          partiesCount: 0,
          purchaseOrdersCount: 0,
          expensesCount: 0,
          paymentsCount: 0,
          bankAccountsCount: 0,
          bankTransactionsCount: 0,
          chequesCount: 0,
          loanAccountsCount: 0,
          usersCount: 0,
          shiftsCount: 0,
          onlineOrdersCount: 0,
          narcoticsLogsCount: 0,
          auditLogsCount: 0,
          totalRecords: 0
        },
        tenantInfo: { tenantId: 'unknown', businessName: 'Unknown' },
        timestamp: new Date().toISOString(),
        version: 'unknown'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Execute Master Restore to Tenant Database
  const handleExecuteRestore = async () => {
    if (!verificationResult || !verificationResult.parsedSnapshot) {
      emitToast('Please upload and verify a valid backup file first.', 'warning');
      return;
    }

    const targetTenantId = selectedTenantId || activeTenant?.id || 'tenant_main';
    const targetTenantName = activeTenant?.name || targetTenantId;

    const confirmMsg = `Are you sure you want to restore ${verificationResult.stats.totalRecords} records to pharmacy "${targetTenantName}" in [${restoreMode.toUpperCase()}] mode?`;
    if (!window.confirm(confirmMsg)) return;

    setIsRestoring(true);
    setRestoreProgress(20);

    try {
      const snapshot = verificationResult.parsedSnapshot;
      
      // Override tenantId in snapshot to target tenant
      if (snapshot.tenantInfo) {
        snapshot.tenantInfo.tenantId = targetTenantId;
        snapshot.tenantInfo.businessName = targetTenantName;
      }

      setRestoreProgress(50);

      // 1. Execute verified IndexedDB restore
      const outcome = await executeVerifiedRestore(snapshot, {
        mode: restoreMode,
        restoreSettings: true
      });

      setRestoreProgress(80);

      // 2. Push snapshot data to cloud sync endpoint for this tenant
      try {
        await syncEngine.syncTenantNow(targetTenantId);
      } catch (e) {}

      // 3. Log master audit event
      await logAuditEvent({
        category: 'TENANT_DEVICE_MANAGEMENT',
        action: `Master Admin Restored Database (${restoreMode.toUpperCase()})`,
        entity: 'BACKUP_RESTORE_VAULT',
        details: `Restored ${outcome.recordCount} records for tenant ${targetTenantName} (${targetTenantId}). Mode: ${restoreMode}`
      });

      setRestoreProgress(100);
      setRestoreOutcome(outcome);
      emitToast(`🎉 Successfully restored ${outcome.recordCount} records to ${targetTenantName}!`, 'success');
      loadData();
    } catch (err: any) {
      console.error('Master restore failed:', err);
      setRestoreOutcome({
        success: false,
        message: err?.message || 'Restore failed',
        recordCount: 0
      });
      emitToast(`Restore failed: ${err?.message}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Download Server Stored Backup
  const handleDownloadServerBackup = (filename: string) => {
    window.open(`/api/master/backup/download/${filename}`, '_blank');
  };

  // Delete Server Stored Backup
  const handleDeleteServerBackup = async (filename: string) => {
    if (!window.confirm(`Delete backup "${filename}" from server storage?`)) return;
    try {
      const res = await fetch(`/api/master/backup/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        emitToast('Backup file removed from vault', 'success');
        loadData();
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <HardDrive className="w-7 h-7 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-white">Master Tenant Backup &amp; Disaster Recovery Vault</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Master Admin Protocol
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Centrally decrypt, inspect, and execute 1-click database restorations for any client pharmacy terminal.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoadingTenants || isLoadingServerBackups}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-sm transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingTenants ? 'animate-spin' : ''}`} />
          <span>Refresh Vault</span>
        </button>
      </div>

      {/* Main 2-Column Working Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tenant Selection & File Upload Decryptor (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Step 1 - Select Target Pharmacy Tenant */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Step 1: Select Target Pharmacy / Tenant</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {tenants.length} Registered Stores
              </span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search pharmacy name, ID, or owner..."
                  value={tenantSearchQuery}
                  onChange={(e) => setTenantSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {filteredTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id}) — {t.ownerName || 'Owner'} [{t.plan || 'Active'}]
                  </option>
                ))}
              </select>

              {activeTenant && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-black text-indigo-950 dark:text-indigo-200 text-sm">{activeTenant.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ID: <span className="font-mono">{activeTenant.id}</span> • City: {activeTenant.city || 'N/A'} • Plan: {activeTenant.plan || 'Basic'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                    Target Selected
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Step 2 - Upload & Decrypt Client Backup */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Step 2: Upload Client Encrypted Backup Archive</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">.mbibackup / .enc / .json</span>
            </div>

            {/* Hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.enc,.mbibackup"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/80 rounded-2xl p-6 text-center hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to Browse or Drag Encrypted Client Backup Here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports MBI proprietary AES-256 encrypted archives (.mbibackup)
                </p>
              </div>
            </div>

            {/* Decryption & Verification Breakdown */}
            {isVerifying && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Decrypting AES-256 payload &amp; validating checksum...</span>
              </div>
            )}

            {verificationResult && (
              <div className="space-y-4 pt-2">
                <div className={`p-4 rounded-2xl border text-xs ${
                  verificationResult.isValid 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit/30">
                    <div className="flex items-center gap-2 font-black text-sm">
                      {verificationResult.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span>{verificationResult.isValid ? 'Decryption & Verification Successful' : 'Decryption Failed'}</span>
                    </div>
                    <span className="font-mono text-[11px]">
                      {verificationResult.stats.totalRecords} Total Records
                    </span>
                  </div>

                  {verificationResult.isValid && (
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                        <span className="text-slate-500">Medicines:</span> <strong>{verificationResult.stats.medicinesCount}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                        <span className="text-slate-500">Invoices:</span> <strong>{verificationResult.stats.invoicesCount}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                        <span className="text-slate-500">Suppliers:</span> <strong>{verificationResult.stats.partiesCount}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                        <span className="text-slate-500">Expenses:</span> <strong>{verificationResult.stats.expensesCount}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                        <span className="text-slate-500">Bank Accts:</span> <strong>{verificationResult.stats.bankAccountsCount}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                        <span className="text-slate-500">App Users:</span> <strong>{verificationResult.stats.usersCount}</strong>
                      </div>
                    </div>
                  )}

                  {verificationResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] list-disc list-inside">
                      {verificationResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Step 3: Restore Execution Mode & Trigger */}
                {verificationResult.isValid && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-900 dark:text-white">Restore Mode:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRestoreMode('replace')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            restoreMode === 'replace'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          Fresh Overwrite (Clean Replace)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestoreMode('merge')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            restoreMode === 'merge'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          Safe Merge
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      disabled={isRestoring}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Restoring ({restoreProgress}%)...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Execute 1-Click Restore to {activeTenant?.name || selectedTenantId}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Server Backup Vault Snapshots List (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Server Stored Vault Archives</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {serverBackups.length} Snapshots
              </span>
            </div>

            {isLoadingServerBackups ? (
              <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Loading vault archives...</span>
              </div>
            ) : serverBackups.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                <HardDrive className="w-6 h-6 mx-auto text-slate-400" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No Server Archives Yet</p>
                <p className="text-[11px]">When clients trigger instant or 24-hour auto-backups, copies will be indexed here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {serverBackups.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate" title={b.filename}>
                        {b.filename}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Tenant: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{b.tenantId}</strong></span>
                        <span>•</span>
                        <span>{b.sizeFormatted || `${b.sizeBytes} B`}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadServerBackup(b.filename)}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
                        title="Download Encrypted Backup File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteServerBackup(b.filename)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                        title="Delete from Vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default MasterTenantBackupRestorePanel;
