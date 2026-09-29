import React, { useState } from 'react';
import { 
  Terminal, Upload, Check, Radio, Building2, Layers, 
  RefreshCw, Power, Cloud, ShieldCheck, History, 
  RotateCcw, Sparkles, FileCode, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { TenantTelemetryRecord } from '../../services/adminService';
import { developerVaultService, JsonPatchRecord } from '../../services/developerVaultService';
import { backupService, GoogleDriveMasterConfig } from '../../services/backupService';
import { emitToast } from '../../contexts/ToastContext';

interface DeveloperVaultTabProps {
  tenants: TenantTelemetryRecord[];
}

export const DeveloperVaultTab: React.FC<DeveloperVaultTabProps> = ({ tenants }) => {
  // Target Mode: 'all' | 'specific'
  const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || 'tenant_hassan_medicos');
  const [patchTitle, setPatchTitle] = useState('Core Engine Hotfix v4.2.1');
  const [patchJsonInput, setPatchJsonInput] = useState(`{\n  "engineVersion": "4.2.1",\n  "highSpeedPosEnabled": true,\n  "offlineReplicationIntervalMs": 5000,\n  "fefoStrictEnforcement": true\n}`);
  const [patchHistory, setPatchHistory] = useState<JsonPatchRecord[]>(() => developerVaultService.getPatchHistory());
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);

  // Google Drive Cloud Sync State
  const [googleDriveConfig, setGoogleDriveConfig] = useState<GoogleDriveMasterConfig>(() => 
    backupService.getGoogleDriveMasterConfig()
  );
  const [isSavingGoogleConfig, setIsSavingGoogleConfig] = useState(false);

  const handleApplyPatch = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(patchJsonInput);
    } catch {
      emitToast('Invalid JSON format! Please fix syntax errors.', 'error');
      return;
    }

    setIsApplyingPatch(true);
    const targetId = targetMode === 'all' ? 'all' : selectedTenantId;
    const targetTenant = tenants.find(t => t.id === targetId);
    const targetName = targetMode === 'all' ? 'All Registered Stores (Fleetwide)' : (targetTenant?.name || targetId);

    try {
      const res = await developerVaultService.applyJsonPatch({
        patchTitle,
        targetTenantId: targetId,
        targetTenantName: targetName,
        patchJson: parsed
      });

      if (res.success) {
        setPatchHistory(developerVaultService.getPatchHistory());
        emitToast(`🚀 Hotfix patch "${patchTitle}" dispatched to ${targetName}!`, 'success');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Failed to dispatch patch', 'error');
    } finally {
      setIsApplyingPatch(false);
    }
  };

  const handleToggleGoogleDrive = async () => {
    const nextState = !googleDriveConfig.enabled;
    const updated = await backupService.saveGoogleDriveMasterConfig({ enabled: nextState });
    setGoogleDriveConfig(updated);
  };

  const handleSaveGoogleDriveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoogleConfig(true);
    try {
      const updated = await backupService.saveGoogleDriveMasterConfig(googleDriveConfig);
      setGoogleDriveConfig(updated);
    } finally {
      setIsSavingGoogleConfig(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900 dark:text-slate-100">
      
      {/* 1. GOOGLE DRIVE MASTER CLOUD SYNC CARD */}
      <div className="bg-white dark:bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Google Drive Cloud Sync Master Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                  Hidden from Client by Default
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Centralized Google Workspace OAuth configuration. When enabled, client apps receive activation via SSE.
              </p>
            </div>
          </div>

          {/* Master Feature Toggle */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Google Drive Cloud Sync:
            </span>
            <button
              type="button"
              onClick={handleToggleGoogleDrive}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all border ${
                googleDriveConfig.enabled
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{googleDriveConfig.enabled ? '🟢 MASTER: ON' : '🔴 MASTER: OFF'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveGoogleDriveConfig} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                value={googleDriveConfig.clientId}
                onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="e.g. 567085834923-xxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Google Client Secret
              </label>
              <input
                type="password"
                value={googleDriveConfig.clientSecret}
                onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="GOCSPX-xxxxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Authorized Redirect URI
              </label>
              <input
                type="text"
                value={googleDriveConfig.redirectUri}
                onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
                placeholder="https://your-domain.com/oauth/google/callback"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {googleDriveConfig.lastUpdated ? `Last updated: ${new Date(googleDriveConfig.lastUpdated).toLocaleString()}` : 'Default state: Inactive'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSavingGoogleConfig}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingGoogleConfig ? 'Saving & Broadcasting...' : 'Save & Broadcast Config'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. TARGETED UPDATE RELEASE ENGINE & HOTFIX DISPATCHER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: Hotfix Dispatcher */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Targeted System Update &amp; Hotfix Dispatcher</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pushes real-time JSON patches across fleet via SSE without requiring cashier logout
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Target Radio Selector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Target Release Scope
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  targetMode === 'all'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="all"
                    checked={targetMode === 'all'}
                    onChange={() => setTargetMode('all')}
                    className="text-blue-600"
                  />
                  <span>🔘 Option A: ALL Active Stores</span>
                </label>

                <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  targetMode === 'specific'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="specific"
                    checked={targetMode === 'specific'}
                    onChange={() => setTargetMode('specific')}
                    className="text-blue-600"
                  />
                  <span>🔘 Option B: Specific Store Only</span>
                </label>
              </div>

              {/* Specific Store Dropdown */}
              {targetMode === 'specific' && (
                <div className="pt-2 animate-in fade-in">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Select Target Pharmacy (e.g. Test Patch on Store)
                  </label>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city}) - {t.ownerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Patch Title */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Patch Title / Release Note
              </label>
              <input
                type="text"
                value={patchTitle}
                onChange={(e) => setPatchTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* JSON Payload */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                JSON Configuration Payload
              </label>
              <textarea
                rows={8}
                value={patchJsonInput}
                onChange={(e) => setPatchJsonInput(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-blue-700 dark:text-blue-300 outline-hidden focus:ring-2 focus:ring-blue-500 custom-scrollbar"
              />
            </div>

            <button
              type="button"
              disabled={isApplyingPatch}
              onClick={handleApplyPatch}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              <span>{isApplyingPatch ? 'Broadcasting Hotfix...' : 'Deploy & Broadcast Hotfix Patch'}</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Deployed Patch History */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Deployed Patch History</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {patchHistory.length} Releases
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {patchHistory.map(patch => (
              <div key={patch.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{patch.patchTitle}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-bold">
                    {patch.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Target: <strong className="text-blue-600 dark:text-blue-400">{patch.targetTenantName}</strong> • {new Date(patch.appliedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DeveloperVaultTab;
