import React, { useState, useEffect } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle2, Wifi, Zap, Building2, 
  Layers, ArrowRight, ShieldCheck, Activity, Database, 
  Send, Sparkles, Server, HardDrive, Check, Radio
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

interface BranchNode {
  id: string;
  name: string;
  city: string;
  role: string;
  status: 'online' | 'synced' | 'syncing';
  pingMs: number;
  pendingTransactions: number;
  lastEvent: string;
}

const INITIAL_BRANCHES: BranchNode[] = [
  {
    id: 'hq-1',
    name: 'Sargodha Central Headquarters',
    city: 'Sargodha HQ & Warehouse',
    role: 'Master Primary Server',
    status: 'synced',
    pingMs: 8,
    pendingTransactions: 0,
    lastEvent: 'Central Medicine Master Catalog Catalog v4.9 Broadcasted'
  },
  {
    id: 'br-1',
    name: 'Liberty Commercial Terminal',
    city: 'Lahore Branch #1',
    role: 'High-Volume POS Counter',
    status: 'synced',
    pingMs: 14,
    pendingTransactions: 0,
    lastEvent: 'Invoice #9041 FEFO batch deduction replicated'
  },
  {
    id: 'br-2',
    name: 'Clifton Mega Pharmacy',
    city: 'Karachi Branch #2',
    role: '24/7 Retail Counter',
    status: 'synced',
    pingMs: 22,
    pendingTransactions: 0,
    lastEvent: 'Cashier shift #38 handover balance synced'
  },
  {
    id: 'br-3',
    name: 'Blue Area Healthcare Hub',
    city: 'Islamabad Branch #3',
    role: 'Wholesale & Retail Counter',
    status: 'synced',
    pingMs: 18,
    pendingTransactions: 0,
    lastEvent: 'Supplier Debit Return Note #DR-440 recorded'
  }
];

interface LogEntry {
  time: string;
  text: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { time: '01:48:12', text: 'Cloud Synapse Mesh verified: 4 nodes connected with 0 conflict locks.' },
  { time: '01:48:40', text: 'Sargodha HQ dispatched real-time pricing matrix update.' },
  { time: '01:49:05', text: 'Lahore Liberty synced 42 sales transactions with zero latency.' },
  { time: '01:49:50', text: 'Karachi Clifton cashier handover ledger mirrored successfully.' }
];

export const CloudSynapseVisualWidget: React.FC = () => {
  const [branches, setBranches] = useState<BranchNode[]>(INITIAL_BRANCHES);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [pulseCount, setPulseCount] = useState(1);
  const [activeLog, setActiveLog] = useState<LogEntry[]>(INITIAL_LOGS);

  const triggerSynapsePulse = () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setPulseCount(p => p + 1);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setBranches(prev => prev.map(b => ({ ...b, status: 'syncing', pingMs: Math.max(6, b.pingMs - 2) })));

    setTimeout(() => {
      setBranches(prev => prev.map(b => ({ ...b, status: 'synced' })));
      setIsSyncingAll(false);
      setActiveLog(prev => [
        { time: now, text: `Cloud Synapse Pulse #${pulseCount + 1}: Replicated 18 records across Sargodha, Lahore, Karachi & Islamabad.` },
        ...prev.slice(0, 4)
      ]);
      emitToast('✨ Cloud Synapse Sync Complete: All 4 branches in 100% harmony!', 'success');
    }, 1200);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-white relative overflow-hidden shadow-xl transition-colors">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span>☁️ Real-Time Multi-Branch Data Synapse</span>
          </div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Distributed Multi-Branch Cloud Synapse Mesh
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Automated bidirectional live replication between Sargodha Headquarters and all counter branches with zero conflict write locks.
          </p>
        </div>

        {/* Global Latency Pill & Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={triggerSynapsePulse}
            disabled={isSyncingAll}
            className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Transmitting Synapse...' : '⚡ Trigger Synapse Sync'}</span>
          </button>
        </div>
      </div>

      {/* Synapse Network Nodes Grid & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 relative z-10">
        
        {/* ================================================================= */}
        {/* LEFT: 4 Branch Nodes Display (7 cols)                             */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-3.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Connected Mesh Nodes (4 Active Terminals):
          </span>

          <div className="space-y-3">
            {branches.map((b, idx) => {
              const isHQ = idx === 0;
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isHQ
                      ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 shadow-md ring-2 ring-indigo-500/10'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        isHQ 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {isHQ ? <Server className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {b.name}
                          </h4>
                          {isHQ && (
                            <span className="px-2 py-0.2 rounded-md bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider">
                              MASTER HQ
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {b.city} • <span className="font-mono">{b.role}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block font-mono">
                          PING LATENCY
                        </span>
                        <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {b.pingMs} ms
                        </span>
                      </div>

                      <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 ${
                        b.status === 'syncing'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                        <span>{b.status === 'syncing' ? 'SYNCING' : 'HARMONIZED'}</span>
                      </div>
                    </div>

                  </div>

                  {/* Telemetry Activity Note */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono truncate">
                    <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{b.lastEvent}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ================================================================= */}
        {/* RIGHT: Live Synapse Activity Stream & Architecture (5 cols)       */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Live Activity Terminal Stream */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-300">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Live Synapse Activity Feed</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>

            <div className="space-y-2 text-xs leading-relaxed max-h-56 overflow-y-auto pr-1">
              {activeLog.map((log, i) => (
                <p key={i} className="text-slate-700 dark:text-slate-300 font-mono text-xs border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5 flex items-start gap-1.5">
                  <span className="text-blue-600 dark:text-emerald-400 font-semibold shrink-0">● [{log.time}]</span>
                  <span>{log.text}</span>
                </p>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Replication: <strong>Bidirectional Delta</strong></span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">CRC32 Verified</span>
            </div>
          </div>

          {/* Offline Resilience Guarantee Box */}
          <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                100% Offline Resilience (Zero Lost Bills)
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              If an internet connection drops in Karachi or Lahore, cashiers continue scanning and printing bills offline. As soon as connectivity restores, all transactions replicate instantly without duplicates.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CloudSynapseVisualWidget;
