import React, { useState, useEffect } from 'react';
import { 
  Database, Download, ShieldCheck, RefreshCw, 
  CheckCircle2, AlertTriangle, Clock, HardDrive, 
  Lock, Sparkles, Headphones, Shield, FileCheck, Check
} from 'lucide-react';
import { 
  generateFullDatabaseSnapshot, 
  downloadBackupSnapshot, 
  pushBackupToServer,
  startAutomatedBackupService,
  BackupSnapshot
} from '../../lib/backupManager';
import { useAuth } from '../../contexts/AuthContext';
import { logAuditEvent } from '../../lib/auditLogger';
import { emitToast } from '../../contexts/ToastContext';

export const BackupRestoreTab: React.FC = () => {
  const { business, activeRole, currentUser } = useAuth();

  // Instant Backup State
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [instantBackupMsg, setInstantBackupMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('mbi_last_backup_timestamp') || '';
  });
  const [lastBackupRecords, setLastBackupRecords] = useState<string>(() => {
    return localStorage.getItem('mbi_last_backup_records') || '0';
  });

  // Automated 24-Hour (Daily) Backup Config
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mbi_auto_backup_enabled') !== 'false';
  });
  const [autoBackupInterval, setAutoBackupInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('mbi_auto_backup_interval') || '1440', 10);
  });

  const handleToggleAutoBackup = () => {
    const next = !autoBackupEnabled;
    setAutoBackupEnabled(next);
    localStorage.setItem('mbi_auto_backup_enabled', next ? 'true' : 'false');
    if (next) {
      startAutomatedBackupService(autoBackupInterval);
      emitToast('Daily 24-Hour Automated Backup Enabled', 'success');
    } else {
      emitToast('Automated Backup Paused', 'info');
    }
  };

  const handleIntervalChange = (mins: number) => {
    setAutoBackupInterval(mins);
    localStorage.setItem('mbi_auto_backup_interval', mins.toString());
    startAutomatedBackupService(mins);
    emitToast(`Auto-backup frequency set to ${mins === 1440 ? 'Daily 24 Hours' : `${mins} minutes`}`, 'success');
  };

  // Handle Instant Backup Creation & Local Download
  const handleCreateInstantBackup = async () => {
    setIsGeneratingBackup(true);
    setInstantBackupMsg(null);
    try {
      const snapshot = await generateFullDatabaseSnapshot({
        name: currentUser?.name || (currentUser as any)?.displayName || 'Admin',
        role: activeRole || 'Primary Admin'
      });

      // 1. Download encrypted file to local device (.mbi.enc / .mbibackup)
      downloadBackupSnapshot(snapshot);

      // 2. Push copy to local/server backup vault
      await pushBackupToServer(snapshot);

      setLastBackupTime(snapshot.timestamp);
      setLastBackupRecords(snapshot.stats.totalRecords.toString());

      await logAuditEvent({
        category: 'SETTINGS_FEATURE_FLAGS',
        action: 'Generated Full Verified Encrypted Database Backup',
        entity: 'BACKUP_ARCHIVE',
        details: `Operator created encrypted backup (${snapshot.stats.totalRecords} records) downloaded to device.`
      });

      setInstantBackupMsg({
        text: `Encrypted backup successfully created! ${snapshot.stats.totalRecords} records downloaded to your device as .mbibackup archive.`,
        isError: false
      });
      emitToast('Encrypted backup downloaded to your computer', 'success');
    } catch (err: any) {
      console.error('Instant backup failed:', err);
      setInstantBackupMsg({
        text: `Backup failed: ${err?.message || 'Unknown storage error'}`,
        isError: true
      });
      emitToast('Backup generation failed', 'error');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Multi-Tier Instant &amp; Automated Backup Center</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified Safe
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Multi-Layer Redundancy: <strong>1. Local IndexedDB</strong> → <strong>2. Encrypted Secure Storage</strong> → <strong>3. Auto 24-Hour Device Snapshot</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateInstantBackup}
          disabled={isGeneratingBackup}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isGeneratingBackup ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating Snapshot...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Instant Backup Now</span>
            </>
          )}
        </button>
      </div>

      {instantBackupMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2 border ${
          instantBackupMsg.isError 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {instantBackupMsg.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{instantBackupMsg.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Automated Background 24-Hour Snapshots (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Automated Background Snapshots</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                autoBackupEnabled ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${autoBackupEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                {autoBackupEnabled ? 'Active Running (24h)' : 'Disabled'}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">24-Hour Auto-Backup Engine</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically takes a complete database snapshot every 24 hours and secures it directly to your device
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoBackup}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    autoBackupEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    autoBackupEnabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">Backup Frequency Interval</label>
                <select
                  value={autoBackupInterval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  disabled={!autoBackupEnabled}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1440}>Daily 24-Hours (Recommended Midnight Auto-Snapshot)</option>
                  <option value={720}>Every 12 Hours (Twice Daily)</option>
                  <option value={360}>Every 6 Hours</option>
                  <option value={60}>Every 1 Hour</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-slate-700 dark:text-slate-300">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Last Recorded Snapshot</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-1">
                    {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'Not taken yet in this session'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-slate-700 dark:text-slate-300">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Records Secured</p>
                  <p className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-base mt-1">
                    {lastBackupRecords} Records
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Format &amp; Encryption Standard</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">MBI-AES256 Encrypted (.mbibackup)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cryptographic Security & Disaster Recovery Vault Information (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Lock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cryptographic Security Guarantee</h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>100% Anti-Tamper Protection:</strong> All generated backups are cryptographically sealed with the MBI Inventra proprietary AES-256 signature. Files cannot be inspected or altered in third-party text editors.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>How Disaster Recovery Works:</span>
                </h4>
                <ul className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400 pl-1">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Daily Auto-Save:</strong> Your machine automatically saves full inventory, sales invoices, parties, and ledger snapshots every 24 hours.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Centralized Master Restore:</strong> To prevent accidental data loss or unauthorized overwrites, database restoration is centrally managed by Master Admin.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Hardware Replacement:</strong> If replacing a PC or laptop, send your <code>.mbibackup</code> file to Master Admin for 1-click cloud restoration.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-[11px]">Master Support Hotline</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">+92 328 1302636 / 0336-4585863</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.open('https://wa.me/923281302636?text=Assalam-o-Alaikum%20Master%20Admin!%20Need%20assistance%20for%20database%20restoration.', '_blank')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                >
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default BackupRestoreTab;
