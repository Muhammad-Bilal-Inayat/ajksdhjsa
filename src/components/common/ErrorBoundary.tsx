import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, AlertCircle, ShieldCheck } from 'lucide-react';
import { errorReporter } from '../../lib/errorReporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCategory: 'chunk_reload' | 'firestore_connection' | 'runtime_crash';
  isAutoReloading: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCategory: 'runtime_crash',
    isAutoReloading: false,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const msg = error?.message || '';
    let errorCategory: State['errorCategory'] = 'runtime_crash';

    const isChunkError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      errorCategory = 'chunk_reload';
    } else if (
      msg.includes('unavailable') || 
      msg.includes('offline') || 
      (msg.includes('Failed to fetch') && !msg.includes('module')) ||
      msg.includes('network') ||
      (error as any)?.code === 'unavailable'
    ) {
      errorCategory = 'firestore_connection';
    }

    let isAutoReloading = false;
    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('mbi_boundary_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('mbi_boundary_chunk_reload', String(now));
        isAutoReloading = true;
      }
    }

    return { hasError: true, error, errorCategory, isAutoReloading };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMsg = error?.message || 'Application Error';

    // Auto-recovery for chunk loading (seamless update without showing error screen)
    const isChunkError =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('error loading dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError';

    if (isChunkError && typeof window !== 'undefined') {
      if ('caches' in window) {
        try {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        } catch (e) {}
      }
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }

    // Silent background logging without alarming the end user
    errorReporter.logError({
      type: 'runtime_error',
      message: errorMsg,
      stack: error?.stack,
      source: 'ReactErrorBoundary',
      metadata: {
        url: window.location.href,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      },
    });

    this.setState({ errorInfo });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
      } catch (e) {}
    }
    window.location.reload();
  };

  private handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      localStorage.setItem('mbi_last_active_route', '/dashboard');
      window.location.href = '/dashboard';
    }
  };

  private handleSelfRepair = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('mbi_dashboard_widgets_v2');
        localStorage.removeItem('mbi_dashboard_main_order_v3');
        localStorage.removeItem('mbi_dashboard_sidebar_order_v3');
        localStorage.removeItem('mbi_last_active_route');
        localStorage.removeItem('active_simulated_user');
        if ('caches' in window) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        }
      } catch (e) {}
      window.location.href = '/billing';
    }
  };

  public override render() {
    if (this.state.hasError) {
      // If auto-reloading after new deployment chunk change
      if (this.state.isAutoReloading) {
        return (
          <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none">
            <div className="flex flex-col items-center space-y-4 text-center max-w-md">
              <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <h2 className="text-lg font-bold">سسٹم اپ ڈیٹ ہو رہا ہے...</h2>
              <p className="text-xs text-slate-400">Loading latest version updates...</p>
            </div>
          </div>
        );
      }

      const errorDetails = this.state.error?.message || 'Unknown runtime exception';

      return (
        <div className="min-h-screen bg-slate-950/95 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-xs select-none">
          <div className="max-w-md w-full bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-center p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Friendly Minimal Icon */}
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs border border-blue-100">
              <AlertCircle className="w-7 h-7 text-blue-600" />
            </div>

            {/* Title */}
            <h1 className="text-lg sm:text-xl font-black text-slate-900 mb-2 tracking-tight">
              MBI INVENTRA
            </h1>

            {/* Reassuring user-facing description */}
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              صفحہ کھولنے میں عارضی رکاوٹ پیش آئی ہے۔ برائے مہربانی صفحہ ریلوڈ کریں یا ڈیش بورڈ پر واپس جائیں۔
              <br />
              <span className="text-[11px] text-slate-400 block mt-1">
                Your data is safe. Please reload the page or return to dashboard.
              </span>
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300"
              >
                <RefreshCw className="w-4 h-4 text-slate-700" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Home className="w-4 h-4 text-white" />
                <span>Back to Dashboard</span>
              </button>
            </div>

            {/* 1-Click Self-Repair Button */}
            <button
              type="button"
              onClick={this.handleSelfRepair}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mb-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Auto-Repair Session & Go to POS Billing</span>
            </button>

            {/* Collapsible Error Info */}
            <details className="text-left mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600">
              <summary className="cursor-pointer font-bold text-slate-700 select-none">
                Technical Details (کلک کریں تفصیل کے لیے)
              </summary>
              <div className="mt-2 font-mono text-[10px] text-red-600 break-words max-h-24 overflow-y-auto bg-white p-2 rounded border border-slate-200">
                {errorDetails}
              </div>
            </details>

            {/* Discreet Safe System Status */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] font-semibold text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Offline Auto-Save Engine Active</span>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
