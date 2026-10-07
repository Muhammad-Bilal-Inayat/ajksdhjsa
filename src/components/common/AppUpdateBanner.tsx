import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { 
  subscribeToAppUpdates, 
  triggerSeamlessHotUpdate, 
  isUpdateDismissedForSession, 
  dismissUpdateForSession,
  AppVersionInfo 
} from '../../lib/pwaService';

export const AppUpdateBanner: React.FC = () => {
  const location = useLocation();
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAppUpdates((info) => {
      if (info.isUpdateAvailable) {
        // Check if user already dismissed this specific version in this session
        const dismissed = isUpdateDismissedForSession(info.version);
        setUpdateInfo(info);
        setIsDismissed(dismissed);
      } else {
        setUpdateInfo(null);
      }
    });

    return unsubscribe;
  }, []);

  // 1. ROUTE SCOPE RULE:
  // Completely HIDE on public Landing / Home page ('/'), Features, Pricing, and Checkout
  const isPublicPage = 
    location.pathname === '/' || 
    location.pathname === '/home' || 
    location.pathname === '/site' || 
    location.pathname === '/landing' || 
    location.pathname === '/plans' || 
    location.pathname === '/pricing' || 
    location.pathname === '/checkout' || 
    location.pathname === '/blog' ||
    location.pathname.startsWith('/blog/') ||
    location.pathname === '/blogs' ||
    location.pathname.startsWith('/blogs/') ||
    location.pathname.startsWith('/auth') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/pending-approval' ||
    location.pathname.startsWith('/store');

  if (isPublicPage) return null;

  // Master Admin Route (/server) is reserved for infrastructure administration; hide user update prompt on /server
  if (location.pathname.startsWith('/server') || location.pathname.startsWith('/master')) {
    return null;
  }

  // Render ONLY when the user is inside an authenticated store workspace
  // User App Routes: /dashboard, /pos, /sale/*, /billing, /items, /purchase, /reports, /settings, /user/*
  const isAllowedWorkspaceRoute =
    location.pathname.startsWith('/user') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/pos') ||
    location.pathname.startsWith('/sale') ||
    location.pathname.startsWith('/billing') ||
    location.pathname.startsWith('/items') ||
    location.pathname.startsWith('/inventory') ||
    location.pathname.startsWith('/purchase') ||
    location.pathname.startsWith('/purchases') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/expenses') ||
    location.pathname.startsWith('/bank') ||
    location.pathname.startsWith('/parties') ||
    location.pathname.startsWith('/bookers') ||
    location.pathname.startsWith('/shortage') ||
    location.pathname.startsWith('/top-products') ||
    location.pathname.startsWith('/shift') ||
    location.pathname.startsWith('/notes') ||
    location.pathname.startsWith('/daily-notes') ||
    location.pathname.startsWith('/sync') ||
    location.pathname.startsWith('/utilities') ||
    location.pathname.startsWith('/online-store') ||
    location.pathname.startsWith('/seo');

  if (!isAllowedWorkspaceRoute) {
    return null;
  }

  if (!updateInfo || !updateInfo.isUpdateAvailable || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (updateInfo?.version) {
      dismissUpdateForSession(updateInfo.version);
    }
    setIsDismissed(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    if (updateInfo?.version) {
      dismissUpdateForSession(updateInfo.version);
    }
    await triggerSeamlessHotUpdate();
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] animate-in slide-in-from-bottom-5 duration-300 select-none">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-blue-500/40 dark:border-blue-500/50 rounded-2xl p-4 shadow-2xl shadow-blue-900/20 text-slate-800 dark:text-slate-100 flex flex-col gap-3">
        
        {/* Banner Header with Logo & Version Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src="/mbi-favicon.png" 
              alt="MBI INVENTRA" 
              className="h-10 w-10 rounded-xl object-contain shadow-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  🚀 MBI INVENTRA Update Ready!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-[10px]">
                  v{updateInfo.version}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {updateInfo.releaseNotes || 'Click Update to load the latest features & optimizations.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Dismiss for current session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Zero-Logout Guarantee */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Zero-Logout • Instant Resume</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Update & Restart Now</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AppUpdateBanner;

