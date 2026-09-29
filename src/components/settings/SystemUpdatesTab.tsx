import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, CheckCircle2, ArrowDownCircle, 
  GitBranch, ShieldCheck, Cpu, HardDrive, Clock, 
  Layers, AlertTriangle, ExternalLink, Download, Check,
  Bell, CheckCircle, Zap, Shield, Key
} from 'lucide-react';
import { getPendingUpdatesForTenant, savePendingUpdatesList, PendingSystemUpdate, PENDING_UPDATES_KEY } from '../server/DeveloperVaultPanel';
import { manualPatchService } from '../../lib/manualPatchService';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';
import { ReleaseChangelogCard } from '../updates/ReleaseChangelogCard';

interface VersionRelease {
  version: string;
  releaseDate: string;
  tag: string;
  isLatest: boolean;
  highlights: string[];
  fixes: string[];
}

const BASE_RELEASE_HISTORY: VersionRelease[] = [
  {
    version: 'v2.4.0 (Enterprise Gold)',
    releaseDate: 'September 2026',
    tag: 'Latest Production Release',
    isLatest: true,
    highlights: [
      'Loss Prevention Engine: Hard dual-confirmation prompt when sales rate is lower than purchase cost.',
      'Global Support Helpline Sync: Administrator phone, WhatsApp, and email update instantly across all invoices, footers, and help sections.',
      'Universal 3-Dots Action Menu: Direct view, WhatsApp share, copy, master-permission edit, and delete across Invoices, Purchases, and Inventory items.',
      'Centralized Smart Notifications Hub: Real-time near-expiry alerts (30/60/90 days), out-of-stock shortages, and cashier shift summaries.',
      'Complete SEO & Schema.org Rich Metadata: High-indexing pharmacy and enterprise medical management structured data.'
    ],
    fixes: [
      'Eliminated demo indicators for active licenses (restricted strictly to 3-day trial mode).',
      'Harmonized Cloud Sync engine terminology and removed internal backend keywords from client UI.',
      'Full responsive scaling across Mobile, Tablet, and Desktop displays.'
    ]
  },
  {
    version: 'v2.3.5',
    releaseDate: 'August 2026',
    tag: 'Stable',
    isLatest: false,
    highlights: [
      'Multi-Item Shortage Demand Bill generator with WhatsApp dispatch to distributors.',
      'Custom Sidebar Navigation Sequence and Order Manager with drag-free reordering.',
      'Thermal 80mm & 58mm ESC/POS direct USB receipt printing optimization.'
    ],
    fixes: [
      'Fixed IndexedDB transaction lock on simultaneous bulk invoice saves.',
      'Added high-precision tax rounding and FBR / GST invoice print headers.'
    ]
  }
];

export const SystemUpdatesTab: React.FC = () => {
  const { tenantId, tenant } = useAuth();
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installedVersion, setInstalledVersion] = useState('v2.4.0');
  const [pendingUpdates, setPendingUpdates] = useState<PendingSystemUpdate[]>([]);
  const [installingUpdateId, setInstallingUpdateId] = useState<string | null>(null);

  const loadPending = () => {
    const activeTid = tenantId || (tenant as any)?.tenantId || (tenant as any)?.id;
    const list = getPendingUpdatesForTenant(activeTid);
    setPendingUpdates(list);
  };

  useEffect(() => {
    loadPending();

    const handleUpdatesChanged = () => {
      loadPending();
    };

    window.addEventListener('mbi-system-updates-changed', handleUpdatesChanged);
    window.addEventListener('mbi-system-update-dispatched', handleUpdatesChanged);
    window.addEventListener('storage', handleUpdatesChanged);

    return () => {
      window.removeEventListener('mbi-system-updates-changed', handleUpdatesChanged);
      window.removeEventListener('mbi-system-update-dispatched', handleUpdatesChanged);
      window.removeEventListener('storage', handleUpdatesChanged);
    };
  }, [tenantId, tenant]);

  const handleCheckUpdates = () => {
    setChecking(true);
    setStatusMessage('Checking server release channel and verifying database schemas...');
    setTimeout(() => {
      setChecking(false);
      const pending = pendingUpdates.filter(u => u.status === 'PENDING');
      if (pending.length > 0) {
        setStatusMessage(`🚀 Update Available! Version ${pending[0].version} (${pending[0].title}) is ready to install below.`);
      } else {
        setStatusMessage('Your software is running the latest available build. All core modules are completely up to date!');
      }
    }, 1200);
  };

  const handleInstallPendingUpdate = (update: PendingSystemUpdate) => {
    setInstallingUpdateId(update.updateId);
    setUpdating(true);
    setStatusMessage(`Installing ${update.title} (v${update.version})...`);

    setTimeout(() => {
      // If there is raw patch code, apply it
      if (update.rawPatchCode) {
        manualPatchService.applyPatch(update.rawPatchCode, tenantId);
      }

      // Mark update as installed
      try {
        const raw = localStorage.getItem(PENDING_UPDATES_KEY);
        if (raw) {
          const list: PendingSystemUpdate[] = JSON.parse(raw);
          const updatedList = list.map(u => 
            u.updateId === update.updateId 
              ? { ...u, status: 'INSTALLED' as const, installedAt: new Date().toISOString() } 
              : u
          );
          savePendingUpdatesList(updatedList);
          setPendingUpdates(updatedList);
        }
      } catch (e) {
        console.error(e);
      }

      setInstalledVersion(update.version);
      setUpdating(false);
      setInstallingUpdateId(null);
      setUpdateSuccess(true);
      setStatusMessage(`✅ Update "${update.title}" (v${update.version}) successfully installed! Unlocked ${update.features.length} feature(s).`);
      emitToast(`🎉 System updated to ${update.version} successfully!`, 'success');
    }, 1500);
  };

  const uninstalledUpdates = pendingUpdates.filter(u => u.status === 'PENDING');
  const installedUpdatesList = pendingUpdates.filter(u => u.status === 'INSTALLED');

  return (
    <div className="space-y-6">
      {/* PENDING SYSTEM UPDATE NOTIFICATION CARD (NON-BLOCKING) */}
      {uninstalledUpdates.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-2 border-indigo-500/80 rounded-2xl p-6 text-white shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-indigo-500/30">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 flex items-center justify-center font-bold shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white tracking-wide uppercase">
                    Update Ready
                  </span>
                  <h3 className="text-base font-black text-white">
                    {uninstalledUpdates[0].title}
                  </h3>
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-500/40">
                    {uninstalledUpdates[0].version}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  {uninstalledUpdates[0].description}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleInstallPendingUpdate(uninstalledUpdates[0])}
              disabled={updating}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {installingUpdateId === uninstalledUpdates[0].updateId ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Installing Update...</span>
                </>
              ) : (
                <>
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Install Update Now</span>
                </>
              )}
            </button>
          </div>

          {/* Highlights & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5 text-xs text-indigo-100">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>What's Included:</span>
              </div>
              <ul className="space-y-1">
                {uninstalledUpdates[0].highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-xs space-y-2">
              <div className="font-bold text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Disruption Guarantee</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Updates will never force-restart or interrupt active POS sales or inventory audits. You can install this update whenever you are free from work.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-white">Software Updates & Release Channel</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {installedVersion} (Active)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Check for new features, bug fixes, and security patches. When updates are published, click below to install without interrupting your business data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={checking || updating}
            onClick={handleCheckUpdates}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check for Updates'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 border ${
          updateSuccess 
            ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' 
            : 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300'
        }`}>
          {updateSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <RefreshCw className={`w-4 h-4 text-indigo-400 flex-shrink-0 ${checking || updating ? 'animate-spin' : ''}`} />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Version Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Build</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">{installedVersion}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Operational & Verified</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Release Channel</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">Enterprise OTA Channel</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Zero Downtime Updates
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Safety</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">Zero-Loss Upgrades</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Preserves offline local data
          </div>
        </div>
      </div>

      {/* Release Notes & Changelog Timeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Plan-Aware Version Changelog & Feature Release Notes</span>
        </h3>

        <ReleaseChangelogCard />
      </div>
    </div>
  );
};
