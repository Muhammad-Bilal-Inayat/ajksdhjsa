/**
 * MBI Inventra - Custom 'Install App' Banner
 * Detects if the app is running in a browser tab and offers 1-click standalone PWA installation.
 */

import React, { useState, useEffect } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, Laptop, X, Sparkles, Share, Globe, Info, ExternalLink } from 'lucide-react';

const PWA_BANNER_DISMISS_KEY = 'mbi_pwa_banner_dismissed_until';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showBrowserModal, setShowBrowserModal] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // Check if user previously dismissed banner within 7 days
    const dismissedUntil = localStorage.getItem(PWA_BANNER_DISMISS_KEY);
    if (dismissedUntil) {
      const expiry = parseInt(dismissedUntil, 10);
      if (Date.now() < expiry) {
        setIsDismissed(true);
        return;
      }
    }
    // Only show if not already installed as standalone app
    setIsDismissed(isInstalled);
  }, [isInstalled]);

  const handleDismiss = () => {
    // Dismiss for 7 days
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(PWA_BANNER_DISMISS_KEY, sevenDays.toString());
    setIsDismissed(true);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success) {
          setIsDismissed(true);
        }
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Fallback modal for desktop or browsers without deferred prompt
      setShowBrowserModal(true);
    }
  };

  // Do not render if app is already running in standalone PWA mode OR user dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Top Smart Install Banner (Compact & Non-intrusive) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-3 sm:px-4 py-1 border-b border-indigo-500/20 shadow-xs relative z-30 flex items-center justify-between gap-2 select-none text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-bold text-white tracking-wide truncate text-[11.5px]">
              Install MBI Inventra
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9.5px] font-bold">
              <Sparkles className="w-2.5 h-2.5" /> 100% Offline PC / Laptop Ready
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 active:scale-97 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Download className={`w-3 h-3 ${isInstalling ? 'animate-bounce' : ''}`} />
            <span>{isInstalling ? 'Installing...' : isIOS ? 'Install on iOS' : 'Install App'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss for 7 days"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm select-none overflow-y-auto"
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
                  Tap <strong className="text-slate-900 font-semibold">Add</strong> in the top right corner. Launch MBI Inventra like a native app!
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

      {/* Browser / Laptop Installation Guide Modal (Fully Visible, High Z-Index, No Clipping) */}
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
                  <li>Look at your browser's address bar (URL bar) on the right side.</li>
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
    </>
  );
};

