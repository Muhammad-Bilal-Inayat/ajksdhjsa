/**
 * MBI Inventra - Global Toast Notification System
 * Provides non-intrusive feedback for actions like 'Data Synced', 'Sale Saved', 'Sync Error'.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Info, X, 
  Cloud, RefreshCw, Database
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: { title?: string; duration?: number }) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Global helper to emit toast from outside React components (e.g. sync services, database operations)
 */
export function emitToast(
  message: string, 
  type: ToastType = 'info', 
  options?: { title?: string; duration?: number }
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('mbi-toast-event', {
      detail: { message, type, ...options },
    })
  );
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    options?: { title?: string; duration?: number }
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duration = options?.duration !== undefined ? options.duration : (type === 'error' ? 5000 : 3500);

    const newToast: ToastItem = {
      id,
      type,
      title: options?.title,
      message,
      duration,
    };

    // Keep only 2 concurrent toasts on mobile / 3 on desktop for clean, non-intrusive UI
    setToasts(prev => [...prev.slice(-2), newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const success = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'success', { title, duration: duration || 2800 });
  }, [showToast]);

  const error = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'error', { title, duration: duration || 4500 });
  }, [showToast]);

  const warning = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'warning', { title, duration: duration || 3500 });
  }, [showToast]);

  const info = useCallback((msg: string, title?: string, duration?: number) => {
    showToast(msg, 'info', { title, duration: duration || 2800 });
  }, [showToast]);

  // Listen to window-level custom events
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.message) {
        showToast(detail.message, detail.type || 'info', {
          title: detail.title,
          duration: detail.duration,
        });
      }
    };

    window.addEventListener('mbi-toast-event', handleCustomToast);
    return () => window.removeEventListener('mbi-toast-event', handleCustomToast);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, dismissToast }}>
      {children}

      {/* Floating Toasts Viewport (Sleek & Positioned Above Mobile Bottom Navigation) */}
      <div 
        aria-live="polite" 
        className="fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 z-50 flex flex-col gap-2 max-w-sm md:w-full pointer-events-none select-none"
      >
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in ${
                isSuccess
                  ? 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/20'
                  : isError
                  ? 'bg-red-950/95 text-white border-red-500/50 shadow-red-950/40 ring-1 ring-red-500/20'
                  : isWarning
                  ? 'bg-amber-950/95 text-white border-amber-500/50 shadow-amber-950/40 ring-1 ring-amber-500/20'
                  : 'bg-slate-900/95 text-white border-blue-500/50 shadow-blue-950/40 ring-1 ring-blue-500/20'
              }`}
            >
              {/* Left: Icon & Text in One Compact Row */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="shrink-0 flex items-center justify-center">
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {toast.title && (
                    <h4 className="text-[11px] font-bold leading-tight tracking-wide text-slate-100 truncate">
                      {toast.title}
                    </h4>
                  )}
                  <p className="text-[11.5px] font-semibold leading-tight text-slate-200 truncate">
                    {toast.message}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
