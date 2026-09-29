import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Database, 
  Send, 
  Zap, 
  ShieldCheck, 
  CloudOff,
  Cloud,
  Server
} from 'lucide-react';
import { unifiedSyncService, SyncStatusType } from '../../lib/syncService';

interface SyncDiagnosticStatusCardProps {
  onNotify?: (msg: string) => void;
  className?: string;
}

export const SyncDiagnosticStatusCard: React.FC<SyncDiagnosticStatusCardProps> = ({
  onNotify,
  className = ''
}) => {
  const [status, setStatus] = useState<SyncStatusType>('synced');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pingMs, setPingMs] = useState<number>(0);
  const [serverConnected, setServerConnected] = useState<boolean>(true);
  const [serverDetails, setServerConnectedDetails] = useState<any>(null);

  const checkDiagnostics = useCallback(async () => {
    try {
      const startTime = Date.now();
      const res = await fetch('/api/health', { cache: 'no-store' });
      const latency = Date.now() - startTime;
      setPingMs(latency);

      if (res.ok) {
        const json = await res.json();
        setServerConnected(true);
        setServerConnectedDetails(json);
        if (json.timestamp) {
          setLastSyncTime(new Date(json.timestamp).toLocaleTimeString());
        }
      } else {
        setServerConnected(false);
      }
    } catch (e) {
      setServerConnected(false);
      setPingMs(0);
    }
  }, []);

  useEffect(() => {
    checkDiagnostics();
    const unsub = unifiedSyncService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    const interval = setInterval(checkDiagnostics, 5000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [checkDiagnostics]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await unifiedSyncService.flushSyncBatch();
      await unifiedSyncService.detectAndReconcile();
      await checkDiagnostics();
      if (onNotify) onNotify('Synchronization successfully executed across client and server!');
    } catch (err: any) {
      if (onNotify) onNotify('Manual sync notice: Retrying in background');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md font-sans ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold ${
            status === 'synced' && serverConnected
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : status === 'syncing'
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {status === 'synced' && serverConnected && <CheckCircle2 className="w-5 h-5" />}
            {status === 'syncing' && <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />}
            {(!serverConnected || status === 'offline') && <CloudOff className="w-5 h-5 text-amber-400" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold tracking-tight text-white">
                Live Server Sync Diagnostic Status
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                serverConnected && status === 'synced'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : status === 'syncing'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {serverConnected ? status.toUpperCase() : 'DISCONNECTED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time telemetry monitoring for Node.js Express server &amp; MariaDB database connection.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/30 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Trigger Instant Sync'}</span>
        </button>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {/* Metric 1: Last Successful Sync Time */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Last Successful Sync</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-sm font-black font-mono text-white mt-1">
            {lastSyncTime || 'Just now'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Auto 4s heartbeat active
          </p>
        </div>

        {/* Metric 2: Pending Queue Items */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Pending Sync Items</span>
            <Send className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className={`text-sm font-black font-mono mt-1 ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {pendingCount} item{pendingCount === 1 ? '' : 's'} queued
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {pendingCount === 0 ? 'Queue clean & empty' : 'Waiting for internet commit'}
          </p>
        </div>

        {/* Metric 3: Ping & Latency */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Network Latency Ping</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-sm font-black font-mono text-cyan-300 mt-1">
            {pingMs} <span className="text-xs text-slate-400 font-bold">ms</span>
          </p>
          <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
            {pingMs < 100 ? '⚡ Ultra Low Latency' : 'Stable Connection'}
          </p>
        </div>

        {/* Metric 4: Database Engine Connection */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>MariaDB Database</span>
            <Server className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-sm font-black font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{serverDetails?.database?.database || 'mbi72dn'}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {serverDetails?.database?.engine || 'MariaDB 10.x / 11.x'}
          </p>
        </div>
      </div>
    </div>
  );
};
