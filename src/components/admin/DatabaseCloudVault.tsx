import React, { useState } from 'react';
import { Database, Download, Upload, ShieldCheck, HardDrive, FileCode, CheckCircle2, RefreshCw } from 'lucide-react';
import { MasterDbExplorerTab } from './MasterDbExplorerTab';
import { MasterTenantBackupRestorePanel } from './MasterTenantBackupRestorePanel';
import { emitToast } from '../../contexts/ToastContext';

export const DatabaseCloudVault: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'backups'>('tables');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>MariaDB Database Studio & Cloud Vault</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                mbi72dn Connected
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              23-table live schema browser, SQL dump exports, and instant per-tenant automated backups.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveSubTab('tables')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'tables'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            23-Table Studio
          </button>
          <button
            onClick={() => setActiveSubTab('backups')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'backups'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tenant Backup & Restore
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      {activeSubTab === 'tables' && (
        <MasterDbExplorerTab />
      )}

      {activeSubTab === 'backups' && (
        <MasterTenantBackupRestorePanel />
      )}
    </div>
  );
};
