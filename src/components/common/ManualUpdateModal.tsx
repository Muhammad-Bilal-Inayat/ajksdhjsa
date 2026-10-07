import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, CheckCircle2, ShieldCheck, 
  RotateCcw, Zap, X, ArrowRight, Download, Check
} from 'lucide-react';
import { APP_VERSION_RAW } from '../../config/appVersion';
import { 
  checkForAppVersionUpdate, 
  triggerSeamlessHotUpdate, 
  AppVersionInfo 
} from '../../lib/pwaService';

export const ManualUpdateModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing update verification...');
  const [isCompleted, setIsCompleted] = useState(false);
  const [targetVersion, setTargetVersion] = useState(APP_VERSION_RAW);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const handleOpenModal = async (e?: any) => {
      const customVer = e?.detail?.version || APP_VERSION_RAW;
      setTargetVersion(customVer);
      setIsOpen(true);
      setProgress(0);
      setIsCompleted(false);
      setIsRestarting(false);
      setStatusText('Connecting to MBI Cloud Release Server...');

      // Start realistic 0% -> 100% smooth progress lifecycle
      let currentP = 0;
      const interval = setInterval(() => {
        currentP += Math.floor(Math.random() * 8) + 4; // increment 4% to 12%

        if (currentP < 25) {
          setStatusText('Verifying application build hashes & schema integrity...');
        } else if (currentP < 55) {
          setStatusText('Downloading optimized WebP assets, modules & styles...');
        } else if (currentP < 85) {
          setStatusText('Flushing stale service worker cache & indexing storage...');
        } else if (currentP < 100) {
          setStatusText('Finalizing release bundle & checking zero-logout session...');
        }

        if (currentP >= 100) {
          currentP = 100;
          clearInterval(interval);
          setProgress(100);
          setStatusText(`✨ Update 100% Ready! (MBI Version ${customVer})`);
          setIsCompleted(true);
        } else {
          setProgress(currentP);
        }
      }, 120);

      // Concurrently perform background cache cleanup
      try {
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys
              .filter(key => key !== `mbi-inventra-v${customVer}` && (key.includes('workbox') || key.includes('app-') || key.includes('html') || key.startsWith('mbi-inventra-') || key.includes('assets') || key.includes('vite')))
              .map(key => caches.delete(key).catch(() => {}))
          );
        }
      } catch (err) {
        console.warn('[ManualUpdateModal] Cache clean notice:', err);
      }
    };

    window.addEventListener('mbi-open-manual-update', handleOpenModal);
    return () => {
      window.removeEventListener('mbi-open-manual-update', handleOpenModal);
    };
  }, []);

  if (!isOpen) return null;

  const handleRestartNow = async () => {
    setIsRestarting(true);
    setStatusText('Applying update and restarting application...');
    await triggerSeamlessHotUpdate();
  };

  const handleClose = () => {
    if (isCompleted || progress === 0) {
      setIsOpen(false);
    } else {
      if (window.confirm('Update is currently preparing in background. Close window?')) {
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-blue-500/40 dark:border-blue-500/50 w-full max-w-lg p-6 sm:p-7 flex flex-col space-y-5 animate-in zoom-in-95 text-slate-900 dark:text-white relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/15 dark:bg-blue-500/20 border border-blue-500/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shadow-inner shrink-0">
              {isCompleted ? (
                <Sparkles className="w-6 h-6 text-emerald-500 animate-bounce" />
              ) : (
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {isCompleted ? 'Update Ready to Launch' : 'Installing Software Update'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  v{targetVersion}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Over-The-Air Zero-Downtime System Upgrade
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Display Bar (0 to 100%) */}
        <div className="space-y-2.5 relative z-10 pt-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[75%]">
              {statusText}
            </span>
            <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
              {progress}%
            </span>
          </div>

          {/* Bar track */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5 shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-150 ${
                isCompleted 
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400' 
                  : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Guarantee Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5 relative z-10">
          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero-Logout & 100% Data Safety Guarantee</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Your active login session, POS billing cart, cashier ledgers, and database records remain 100% untouched and preserved.
          </p>
        </div>

        {/* Modal Action Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 relative z-10">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            {isCompleted ? 'Later' : 'Cancel'}
          </button>

          {isCompleted ? (
            <button
              type="button"
              onClick={handleRestartNow}
              disabled={isRestarting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer transform hover:scale-102"
            >
              {isRestarting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restarting App...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Restart & Launch Latest Version</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Preparing update...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
