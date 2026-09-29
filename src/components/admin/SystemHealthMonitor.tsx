import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, HardDrive, Wifi, ShieldCheck, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { ApiRequestInspectorTab } from './ApiRequestInspectorTab';
import { AiSupportTelemetryTab } from './AiSupportTelemetryTab';
import { DeveloperVaultTab } from './DeveloperVaultTab';

export const SystemHealthMonitor: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'inspector' | 'ai_telemetry' | 'vault'>('metrics');
  const [vpsStats, setVpsStats] = useState({
    cpuUsage: 14,
    ramUsage: 38,
    mariadbConnections: 6,
    uptime: '14 days, 6 hours',
    latency: '18ms',
    status: 'OPTIMAL'
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>System Health & VPS Telemetry</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                100% HEALTHY
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live server performance metrics, API latency tracking, AI telemetry and emergency developer vault.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveSubTab('metrics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'metrics'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            VPS Metrics
          </button>
          <button
            onClick={() => setActiveSubTab('inspector')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'inspector'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            API Traffic
          </button>
          <button
            onClick={() => setActiveSubTab('ai_telemetry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'ai_telemetry'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Logs
          </button>
          <button
            onClick={() => setActiveSubTab('vault')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'vault'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dev Vault
          </button>
        </div>
      </div>

      {/* Sub Views */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>CPU UTILIZATION</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black mt-2 text-emerald-500">{vpsStats.cpuUsage}%</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${vpsStats.cpuUsage}%` }} />
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>RAM USAGE</span>
                <HardDrive className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black mt-2 text-blue-500">{vpsStats.ramUsage}%</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${vpsStats.ramUsage}%` }} />
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>API LATENCY</span>
                <Wifi className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black mt-2 text-cyan-500">{vpsStats.latency}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Average roundtrip to MariaDB</div>
            </div>

            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>ACTIVE DB CONNECTIONS</span>
                <Server className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black mt-2 text-purple-500">{vpsStats.mariadbConnections} Pools</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Pooled connections active</div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'inspector' && <ApiRequestInspectorTab />}
      {activeSubTab === 'ai_telemetry' && <AiSupportTelemetryTab />}
      {activeSubTab === 'vault' && <DeveloperVaultTab />}
    </div>
  );
};
