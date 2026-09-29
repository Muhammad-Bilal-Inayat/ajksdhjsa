import React, { useState } from 'react';
import { 
  Wifi, WifiOff, Download, Smartphone, Laptop, Sparkles, RefreshCw, 
  CheckCircle2, HardDrive, ShieldCheck, ArrowRight, Zap, CloudUpload,
  Info, ExternalLink, X, Share
} from 'lucide-react';
import { usePWAInstall } from '../pwa/usePWAInstall';
import { firebaseSyncManager, useFirebaseSyncStatus } from '../../lib/firebaseSync';

interface OfflinePWABannerProps {
  onFullSync?: () => void;
  isRefreshing?: boolean;
}

export const OfflinePWABanner: React.FC<OfflinePWABannerProps> = ({ 
  onFullSync,
  isRefreshing = false 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const syncStatus = useFirebaseSyncStatus();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isPushingQueue, setIsPushingQueue] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isOnline = syncStatus.isOnline;
  const pendingCount = syncStatus.pendingCount;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowBrowserModal(true);
    }
  };

  const handlePushOfflineQueue = async () => {
    setIsPushingQueue(true);
    setFeedbackMessage(null);
    try {
      await firebaseSyncManager.flushQueue();
      setFeedbackMessage('Offline queue successfully pushed to Firebase Cloud!');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch {
      setFeedbackMessage('Cloud upload attempted. Will retry automatically when network is stable.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setIsPushingQueue(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 text-white shadow-lg space-y-4">
      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            isOnline ? 'bg-blue-600/30 border border-blue-400/40 text-blue-300' : 'bg-amber-500/30 border border-amber-400/40 text-amber-300'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-amber-400 animate-pulse" />}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white flex items-center gap-1.5">
                <span>100% Offline Standalone POS & Cloud Synchronization</span>
              </h3>
              
              {/* Online/Offline Status Pill */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black tracking-wide uppercase border ${
                isOnline 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isOnline ? 'Cloud Realtime Active' : '100% Offline Engine Active'}
              </span>

              {/* Exponential Backoff / Flaky Connection Indicator */}
              {isOnline && !syncStatus.isConnectionStable && (syncStatus.consecutiveFailures ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                  <span>⚡ Poor Connection: Exponential Backoff Active (~{Math.round((syncStatus.backoffDelayMs || 1500) / 1000)}s delay with jitter)</span>
                </span>
              ) : isOnline ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <Zap className="w-2.5 h-2.5 text-blue-400" />
                  <span>Ultra-Fast Direct Sync (0ms delay)</span>
                </span>
              ) : null}

              {/* Standalone PWA Indicator */}
              {isInstalled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                  Standalone App Mode
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              <strong>Billing operates 100% offline with zero lag.</strong> All sales, barcode scanning, thermal printing, and cash transactions execute locally in persistent IndexedDB. All records automatically queue and sync to cloud servers seamlessly when reconnected.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Push Offline Queue */}
          <button
            type="button"
            onClick={handlePushOfflineQueue}
            disabled={isPushingQueue || pendingCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
              pendingCount > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
            title="Upload pending offline transactions to Firebase Cloud"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isPushingQueue ? 'animate-bounce' : ''}`} />
            <span>
              {isPushingQueue ? 'Pushing Records...' : `Sync Offline Queue (${pendingCount})`}
            </span>
          </button>

          {/* Install Standalone App */}
          {!isInstalled ? (
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isInstalling ? 'animate-bounce' : ''}`} />
              <span>
                {isInstalling ? 'Installing...' : isIOS ? 'Install on iPhone / iPad' : 'Install Standalone App'}
              </span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs select-none">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>App Installed</span>
            </span>
          )}

          {/* Full Cloud Pull */}
          {onFullSync && (
            <button
              type="button"
              onClick={onFullSync}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Force download of all cloud collections"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isRefreshing ? 'Pulling...' : 'Full Cloud Pull'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-2.5 px-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Value Pillars for Cashier & Operator Peace of Mind */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Speed Fast Hi Rehti Hai</span>
          </div>
          <p className="text-slate-300 leading-normal">
            Zero internet waiting. Invoices, barcode scanners, and thermal receipts work at instantaneous 0.05ms local speed without delays.
          </p>
        </div>

        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Baad Me Aaram Se Sync</span>
          </div>
          <p className="text-slate-300 leading-normal">
            Every transaction is queued safely in IndexedDB and commits seamlessly to Firebase Cloud whenever internet resumes or on manual push.
          </p>
        </div>

        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-purple-400">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Smart Exponential Backoff</span>
          </div>
          <p className="text-slate-300 leading-normal">
            Halts redundant API spam during poor connectivity. Retries with smart jitter (1.5s–60s) and only syncs final necessary changes.
          </p>
        </div>

        <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Data Preservation</span>
          </div>
          <p className="text-slate-300 leading-normal">
            Offline sales remain completely safe across system restarts and browser closures. No transaction is ever dropped or lost.
          </p>
        </div>
      </div>

      {/* iOS Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm select-none"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-white p-4 sm:p-5 shadow-2xl text-slate-900 border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Install on iPhone / iPad</h3>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 py-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  Tap the <strong className="text-slate-900 font-semibold inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 inline text-blue-600" /> Share</strong> button in Safari toolbar.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  Scroll down and select <strong className="text-slate-900 font-semibold">Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  Tap <strong className="text-slate-900 font-semibold">Add</strong> in the top right corner. Launch MBI Inventra like a native standalone app!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Browser / Laptop Installation Guide Modal */}
      {showBrowserModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm select-none overflow-y-auto"
          onClick={() => setShowBrowserModal(false)}
        >
          <div 
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-5 shadow-2xl text-slate-900 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Install on Laptop / Desktop PC</h3>
              </div>
              <button 
                onClick={() => setShowBrowserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-blue-900 space-y-1.5">
                <p className="font-bold text-blue-950 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Quick Installation (Google Chrome / Microsoft Edge / Brave):
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11.5px] text-blue-900">
                  <li>Look at your browser's address bar (URL bar) on the top right side.</li>
                  <li>Click the <strong className="text-blue-700 font-bold">Install App (⊕ or 💻)</strong> icon.</li>
                  <li>Click <strong className="text-blue-700 font-bold">Install</strong> in the confirmation popup. A standalone app icon will be created on your Desktop!</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1 text-[11px]">
                <p className="font-semibold text-slate-900">Alternative Method:</p>
                <p>Click your browser menu <strong className="font-mono bg-slate-200 px-1 rounded">⋮</strong> &rarr; <strong className="text-slate-900 font-semibold">Save and Share</strong> &rarr; <strong className="text-blue-600 font-semibold">Install MBI INVENTRA...</strong></p>
              </div>

              {typeof window !== 'undefined' && window.self !== window.top && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                  <span>Running inside an embedded view? Open in a direct tab to enable instant 1-click install:</span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const newWin = window.open(window.location.href, '_blank');
                        if (!newWin) {
                          window.location.href = window.location.href;
                        }
                      } catch {
                        window.location.href = window.location.href;
                      }
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer text-[10.5px] flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Tab</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBrowserModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
