import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, AlertTriangle, ShieldAlert, HardDrive, 
  RefreshCw, CheckCircle2, Copy, Trash2, ChevronDown, ChevronRight,
  Database, Info, Terminal, Activity, FileText, Zap
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'AUTH_FAILURE' | 'DISK_IO_ERROR' | 'SYNC_CONFLICT' | 'NETWORK_API_ERROR' | 'MARIADB_ERROR' | 'GENERAL_INFO';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: Record<string, any>;
  sourceEndpoint?: string;
}

interface SearchableLogViewerProps {
  initialLogs?: LogEntry[];
  className?: string;
}

export function SearchableLogViewer({ initialLogs = [], className = '' }: SearchableLogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchServerLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sync/logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Notice: Failed to fetch server logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLogs.length > 0) {
      setLogs(initialLogs);
    } else {
      fetchServerLogs();
    }
  }, [initialLogs, fetchServerLogs]);

  const categories = [
    { key: 'ALL', label: 'All Logs', icon: Terminal },
    { key: 'AUTH_FAILURE', label: 'Auth Failures', icon: ShieldAlert, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
    { key: 'DISK_IO_ERROR', label: 'Disk I/O Errors', icon: HardDrive, color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200' },
    { key: 'SYNC_CONFLICT', label: 'Sync Conflicts', icon: Activity, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
    { key: 'NETWORK_API_ERROR', label: 'Network & API', icon: Zap, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
    { key: 'MARIADB_ERROR', label: 'MariaDB Status', icon: Database, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  ];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: logs.length };
    logs.forEach(l => {
      counts[l.category] = (counts[l.category] || 0) + 1;
    });
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'ALL' && log.severity.toUpperCase() !== selectedSeverity) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const msgMatch = log.message.toLowerCase().includes(q);
        const catMatch = log.category.toLowerCase().includes(q);
        const endpointMatch = log.sourceEndpoint?.toLowerCase().includes(q) || false;
        const detailsMatch = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
        return msgMatch || catMatch || endpointMatch || detailsMatch;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, searchQuery]);

  const handleCopyLog = (log: LogEntry) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      emitToast('Log entry copied to clipboard!', 'success');
    } catch {
      emitToast('Failed to copy log', 'error');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'AUTH_FAILURE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">AUTH FAILURE</span>;
      case 'DISK_IO_ERROR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">DISK I/O ERROR</span>;
      case 'SYNC_CONFLICT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">SYNC CONFLICT</span>;
      case 'NETWORK_API_ERROR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">NETWORK / API</span>;
      case 'MARIADB_ERROR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">MARIADB</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">GENERAL INFO</span>;
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm ${className}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500" />
            Categorized Server &amp; Sync Log Telemetry
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Searchable audit trail categorized by Authentication Failures, Disk I/O, Sync Conflicts &amp; MariaDB Status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchServerLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.key;
          const count = categoryCounts[cat.key] || 0;
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                isSelected 
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isSelected ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input & Severity Filter controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
        
        {/* Search Field */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search error logs by keyword, endpoint, or error type..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Severity Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Severities</option>
            <option value="ERROR">Errors Only</option>
            <option value="WARNING">Warnings Only</option>
            <option value="INFO">Info Only</option>
          </select>
        </div>

      </div>

      {/* Log Feed Table / List */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-950 font-mono text-xs">
        
        {/* Table Header */}
        <div className="bg-slate-900 text-slate-400 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-[11px] font-bold">
          <span>LOG EVENT MESSAGE &amp; SOURCE</span>
          <span>TIMESTAMP</span>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-800/60 max-h-[380px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2 select-none">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
              <p className="text-xs font-bold text-slate-400">No matching error logs found</p>
              <p className="text-[11px] text-slate-500">System is operating smoothly without recorded disruptions in this category.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="transition-colors hover:bg-slate-900/80">
                  <div 
                    onClick={() => toggleExpand(log.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button type="button" className="text-slate-500 hover:text-slate-300 mt-0.5 shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getCategoryBadge(log.category)}
                          {log.sourceEndpoint && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {log.sourceEndpoint}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-semibold leading-normal ${
                          log.severity === 'error' ? 'text-red-400' :
                          log.severity === 'warning' ? 'text-amber-400' : 'text-slate-200'
                        }`}>
                          {log.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-slate-500 shrink-0">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLog(log);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Log JSON"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON details view */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-slate-800/80 bg-slate-900/90 text-slate-300 font-mono text-[11px] space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Raw Event Payloads &amp; Stack:</span>
                        <span>Log ID: {log.id}</span>
                      </div>
                      <pre className="p-3 rounded bg-slate-950 border border-slate-800 overflow-x-auto text-emerald-400 font-mono">
                        {JSON.stringify(log, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-900 text-slate-400 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
          <span>Server Log Memory Buffer: Active</span>
        </div>

      </div>

    </div>
  );
}
