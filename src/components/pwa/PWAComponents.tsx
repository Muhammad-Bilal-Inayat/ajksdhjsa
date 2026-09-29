import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall';
import { Download, Laptop, Share, X, CheckCircle2, WifiOff, ShieldCheck, HardDrive } from 'lucide-react';

export const PWAInstallButton: React.FC<{ 
  className?: string; 
  label?: string;
  showWhenInstalled?: boolean;
}> = ({ 
  className = '', 
  label = 'Install App',
  showWhenInstalled = false
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled && !showWhenInstalled) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">100% Offline Ready</span>
      </span>
    );
  }

  const handleClick = async () => {
    if (isInstalled) {
      setShowBrowserGuide(true);
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
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
      setShowBrowserGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isInstalling}
        className={className || "flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer select-none"}
      >
        <Download className={`w-3.5 h-3.5 ${isInstalling ? 'animate-bounce' : ''}`} />
        <span>{isInstalling ? 'Installing...' : isIOS ? 'Install on iOS' : label}</span>
      </button>

      {/* iOS Install Instructions Modal */}
      {showIOSGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs select-none"
          onClick={() => setShowIOSGuide(false)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm">Install on iPhone / iPad</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>1. Tap the <strong className="text-blue-600 dark:text-blue-400"><Share className="w-3.5 h-3.5 inline" /> Share</strong> button in Safari toolbar.</p>
              <p>2. Scroll down and select <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.</p>
              <p>3. Tap <strong className="text-slate-900 dark:text-white">Add</strong> in the top right corner.</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                ✨ Once installed, the app works 100% offline even without cellular or Wi-Fi data!
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Android Browser Guide Modal */}
      {showBrowserGuide && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm select-none overflow-y-auto"
          onClick={() => setShowBrowserGuide(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 my-auto animate-fade-scale"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm">
                  {isInstalled ? 'App Already Installed & Offline-Ready' : 'Desktop / Laptop Installation'}
                </h3>
              </div>
              <button onClick={() => setShowBrowserGuide(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {isInstalled ? (
              <div className="py-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">100% Offline Persistence Active</div>
                    <div className="text-[11px] mt-0.5 leading-relaxed">
                      Your software is installed as a native standalone app. Even when your PC is turned off and rebooted tomorrow without internet, all billing, inventory, and purchases function instantly with zero delays.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 py-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
                  <p className="font-bold mb-1">To install on your Laptop / PC:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                    <li>In Google Chrome or Microsoft Edge, look at the address bar for the <strong className="text-blue-600 dark:text-blue-400">Install icon (⊕ or 💻)</strong> and click it.</li>
                    <li>Or click the 3-dots menu <strong className="text-slate-900 dark:text-white">(⋮)</strong> &rarr; <strong className="text-slate-900 dark:text-white">Save and share &rarr; Install MBI INVENTRA...</strong></li>
                    <li>Click <strong className="text-blue-600 dark:text-blue-400">Install</strong>. A desktop shortcut will be placed on your PC home screen!</li>
                  </ol>
                </div>

                {typeof window !== 'undefined' && window.self !== window.top && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between gap-2">
                    <span>Opening inside an embedded view? Launch in dedicated window to trigger native install prompt:</span>
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
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer text-[10.5px]"
                    >
                      Open New Tab
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-[10.5px]">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Full IndexedDB persistence activated for zero-latency offline POS.</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowBrowserGuide(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer mt-1"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10.5px] font-bold shadow-xs select-none">
      <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
      <span>100% Offline Mode (Ready)</span>
    </div>
  );
};
