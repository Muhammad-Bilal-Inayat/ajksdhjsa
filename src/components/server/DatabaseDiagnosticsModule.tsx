import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, CheckCircle2, AlertCircle, 
  Server, HardDrive, Download, Play, Layers, Activity 
} from 'lucide-react';

export function DatabaseDiagnosticsModule() {
  const [diagnostics, setDiagnostics] = useState<{
    database: string;
    status: string;
    pingMs: number;
    host: string;
    port: number;
    tables: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/database/diagnostics', {
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data);
      }
    } catch (e) {
      console.warn('Diagnostics fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleRunMigration = async () => {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/db/init-mariadb', { method: 'POST' });
      const data = await res.json();
      setMigrationResult(data.message || 'DDL Migration completed');
      fetchDiagnostics();
    } catch (err: any) {
      setMigrationResult('Migration trigger failed: ' + err?.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleDownloadSchema = () => {
    window.open('/api/db/schema-download', '_blank');
  };

  const isOnline = diagnostics?.status === 'ONLINE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Master MariaDB Diagnostics (<code className="text-emerald-600 font-mono">mbi72dn</code>)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Single enterprise SQL database connection pool, latency & 23-table statistics
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchDiagnostics}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
            title="Refresh Diagnostics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleDownloadSchema}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download SQL</span>
          </button>
          <button
            type="button"
            disabled={migrating}
            onClick={handleRunMigration}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${migrating ? 'animate-spin' : ''}`} />
            <span>{migrating ? 'Provisioning...' : 'Run DDL Sync'}</span>
          </button>
        </div>
      </div>

      {migrationResult && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
          {migrationResult}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase">Database Status</span>
            {isOnline ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
            {isOnline ? 'Online & Connected' : 'Offline / Reconnecting'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">DB: {diagnostics?.database || 'mbi72dn'}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase">Query Ping Latency</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
            {diagnostics?.pingMs ? `${diagnostics.pingMs} ms` : 'Local < 2ms'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Direct Pool Keep-Alive</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase">Master Server Host</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono text-sm truncate">
            {diagnostics?.host || 'localhost'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Port: {diagnostics?.port || 3306}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase">Registered Tables</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
            {diagnostics?.tables ? Object.keys(diagnostics.tables).length : 23} Tables
          </div>
          <div className="text-[11px] text-slate-500 mt-1">mbi_ schema partition</div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Master Enterprise Tables & Row Counts
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {diagnostics?.tables && Object.entries(diagnostics.tables).map(([tableName, count]) => (
            <div 
              key={tableName}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate" title={tableName}>
                {tableName}
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                {count.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
