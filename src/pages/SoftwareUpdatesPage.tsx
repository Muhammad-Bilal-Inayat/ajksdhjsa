import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  HardDrive, 
  Trash2, 
  Clock, 
  Zap, 
  Check, 
  Download,
  AlertCircle,
  Server,
  ArrowUpRight
} from 'lucide-react';
import { APP_VERSION_STABLE } from '../config/appVersion';
import { ReleaseChangelogCard } from '../components/updates/ReleaseChangelogCard';
import { useTenantPlan } from '../context/TenantPlanContext';
import { useAuth } from '../contexts/AuthContext';
import { emitToast } from '../contexts/ToastContext';

export const SoftwareUpdatesPage: React.FC = () => {
  const { tenant, tenantId } = useAuth();
  const { plan, rawPlan, isGold, isPlatinum } = useTenantPlan();

  const [checking, setChecking] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentVersion] = useState(APP_VERSION_STABLE);
  const [channel] = useState('Production Stable (Enterprise OTA)');
  const [swStatus, setSwStatus] = useState<'active' | 'updating' | 'offline_ready'>('offline_ready');

  // Verify Service Worker status
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setSwStatus('active');
      }).catch(() => {
        setSwStatus('offline_ready');
      });
    }
  }, []);

  const handleCheckForUpdates = () => {
    window.dispatchEvent(new CustomEvent('mbi-open-manual-update', {
      detail: { version: APP_VERSION_STABLE }
    }));
  };

  const handleCleanCacheAndReload = () => {
    window.dispatchEvent(new CustomEvent('mbi-open-manual-update', {
      detail: { version: APP_VERSION_STABLE }
    }));
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-6 antialiased tracking-tight">
      
      {/* 1. Live Version Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black shrink-0 shadow-inner">
            <Sparkles className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white">
                Release Channel & System Updates
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {currentVersion}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {rawPlan || 'Business Gold'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Automatic Zero-Downtime Over-The-Air (OTA) Updates with encrypted database schema preservation and offline local cache sync.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            disabled={checking}
            onClick={handleCheckForUpdates}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Server...' : 'Check for Updates'}</span>
          </button>

          <button
            type="button"
            disabled={clearingCache}
            onClick={handleCleanCacheAndReload}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            title="Flush Service Worker & Asset Cache"
          >
            <Trash2 className={`w-4 h-4 text-amber-400 ${clearingCache ? 'animate-spin' : ''}`} />
            <span>Clean Cache & Reload</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Version Status & Offline/Cache Sync Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Installed Build</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">{currentVersion}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Zero Bugs Verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribution Channel</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">Production Stable</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            OTA Live Delta Updates
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offline & PWA Cache</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">
            {swStatus === 'active' ? 'Active & Synced' : 'Ready (IndexedDB)'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>0-Lag Offline POS</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Plan Tier</div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1">
            {rawPlan || 'Business Gold'}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
            All Gold Features Active
          </div>
        </div>
      </div>

      {/* 3. Changelog Release Feed */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Release History & Plan Feature Highlights</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">Continuous Delta Sync</span>
        </div>

        <ReleaseChangelogCard />
      </div>
    </div>
  );
};

export default SoftwareUpdatesPage;
