import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Table, HardDrive, RefreshCw, Download, Search, 
  Filter, Eye, ChevronLeft, ChevronRight, Copy, Check, 
  Sparkles, Zap, Layers, Server, ShieldCheck, X, FileSpreadsheet,
  FileCode, Terminal, AlertCircle
} from 'lucide-react';
import { 
  adminService, 
  MasterDbOverview, 
  MasterDbTableSummary, 
  TableDataResponse, 
  TenantTelemetryRecord 
} from '../../services/adminService';
import { emitToast } from '../../contexts/ToastContext';

interface MasterDbExplorerTabProps {
  tenants?: TenantTelemetryRecord[];
}

export const MasterDbExplorerTab: React.FC<MasterDbExplorerTabProps> = ({ tenants = [] }) => {
  const [overview, setOverview] = useState<MasterDbOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('mbi_tenants');
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Table Data Grid State
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [tenantFilter, setTenantFilter] = useState('all');
  const [dataSearchQuery, setDataSearchQuery] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Row Inspector Modal
  const [inspectedRow, setInspectedRow] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDumpingSql, setIsDumpingSql] = useState(false);

  // Load Database Overview Stats
  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const data = await adminService.getDatabaseOverview();
      setOverview(data);
      if (data.tables.length > 0 && !selectedTable) {
        setSelectedTable(data.tables[0].tableName);
      }
    } catch (e) {
      console.warn('Failed to load overview:', e);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  // Load Table Data
  const loadTableData = async (tableName = selectedTable, page = currentPage, limit = pageSize, tenant = tenantFilter, search = dataSearchQuery) => {
    setIsLoadingTable(true);
    try {
      const data = await adminService.getTableData({
        tableName,
        page,
        limit,
        tenantId: tenant,
        search,
        sortBy: sortField,
        sortOrder
      });
      setTableData(data);
    } catch (e) {
      console.warn('Failed to load table data:', e);
    } finally {
      setIsLoadingTable(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setCurrentPage(1);
      loadTableData(selectedTable, 1, pageSize, tenantFilter, dataSearchQuery);
    }
  }, [selectedTable, tenantFilter, pageSize, sortField, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadTableData(selectedTable, 1, pageSize, tenantFilter, dataSearchQuery);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadTableData(selectedTable, newPage, pageSize, tenantFilter, dataSearchQuery);
  };

  // 1-Click Export table
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      await adminService.exportTable(selectedTable, format, tenantFilter);
      emitToast(`✅ Exported ${selectedTable} as ${format.toUpperCase()}`, 'success');
    } catch (e: any) {
      emitToast(e?.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 1-Click SQL Dump
  const handleDownloadSqlDump = async () => {
    setIsDumpingSql(true);
    try {
      await adminService.downloadFullSqlDump();
      emitToast('✅ Full MariaDB SQL Backup generated & downloaded!', 'success');
    } catch (e: any) {
      emitToast(e?.message || 'SQL backup failed', 'error');
    } finally {
      setIsDumpingSql(false);
    }
  };

  const copyToClipboard = (text: string, label = 'Content') => {
    navigator.clipboard.writeText(text);
    emitToast(`📋 ${label} copied to clipboard!`, 'info');
  };

  // Filtered tables for left sidebar
  const filteredTables = useMemo(() => {
    if (!overview?.tables) return [];
    if (!tableSearchQuery.trim()) return overview.tables;
    const q = tableSearchQuery.toLowerCase();
    return overview.tables.filter(t => 
      t.tableName.toLowerCase().includes(q) || 
      t.displayName.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [overview, tableSearchQuery]);

  // Group tables by category
  const categories = useMemo(() => {
    const map = new Map<string, MasterDbTableSummary[]>();
    filteredTables.forEach(t => {
      const list = map.get(t.category) || [];
      list.push(t);
      map.set(t.category, list);
    });
    return Array.from(map.entries());
  }, [filteredTables]);

  const activeTableMeta = overview?.tables.find(t => t.tableName === selectedTable);

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-slate-900 dark:text-slate-100">
      
      {/* 23-TABLE METRICS BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Live Database</span>
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {overview?.database || 'mbi72dn'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>MariaDB 10.11 / InnoDB</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Master Tables</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-300 font-mono">
            23 Tables
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Multi-Tenant Isolated
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Records</span>
            <Table className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </span>
          <div className="text-xl font-black text-purple-600 dark:text-purple-300 font-mono">
            {(overview?.totalRows || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Across 23 Schemes
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Allocated Storage</span>
            <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-300 font-mono">
            {overview?.totalSizeMb || '14.20'} MB
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Data &amp; B-Tree Indexes
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-tr from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/80 dark:via-indigo-950/80 dark:to-purple-950/80 border border-blue-200 dark:border-blue-800/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-4 lg:col-span-1">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            ⚡ 1-Click Disaster Recovery
          </span>
          <button
            type="button"
            disabled={isDumpingSql}
            onClick={handleDownloadSqlDump}
            className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
          >
            <Download className={`w-3.5 h-3.5 ${isDumpingSql ? 'animate-bounce' : ''}`} />
            <span>{isDumpingSql ? 'Dumping SQL...' : 'Download Full SQL'}</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT PANE: 23-TABLE DIRECTORY SELECTOR */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>23 Master Tables Directory</span>
            </h3>
            <button
              type="button"
              onClick={loadOverview}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Refresh table metrics"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingOverview ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearchQuery}
              onChange={e => setTableSearchQuery(e.target.value)}
              placeholder="Search 23 tables..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="space-y-4 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
            {categories.map(([categoryName, tables]) => (
              <div key={categoryName} className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  {categoryName}
                </div>
                <div className="space-y-1">
                  {tables.map(tbl => {
                    const isSelected = selectedTable === tbl.tableName;

                    return (
                      <button
                        key={tbl.tableName}
                        type="button"
                        onClick={() => setSelectedTable(tbl.tableName)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-mono truncate">{tbl.tableName}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {tbl.displayName}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {tbl.rowCount.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE: LIVE DATA GRID STUDIO */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
          
          {/* Table Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                  `{selectedTable}`
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                  {activeTableMeta?.displayName || selectedTable}
                </span>
                {tableData && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    ({tableData.pagination.totalRows.toLocaleString()} rows • {tableData.executionTimeMs}ms)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap text-xs">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport('csv')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Export as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport('json')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Export as JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>JSON</span>
              </button>

              <button
                type="button"
                onClick={() => loadTableData()}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Reload table"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTable ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Filters Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            {/* Multi-Tenant Filter */}
            <div className="sm:col-span-5">
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={tenantFilter}
                  onChange={e => setTenantFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">🌐 All Pharmacy Tenants (Global Fleet)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword Search inside table */}
            <form onSubmit={handleSearchSubmit} className="sm:col-span-5 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dataSearchQuery}
                  onChange={e => setDataSearchQuery(e.target.value)}
                  placeholder={`Search in ${selectedTable}...`}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Rows Per Page */}
            <div className="sm:col-span-2">
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={250}>250 rows</option>
              </select>
            </div>
          </div>

          {/* Table Data Grid */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  {tableData?.columns.map(col => (
                    <th
                      key={col.name}
                      onClick={() => {
                        if (sortField === col.name) {
                          setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
                        } else {
                          setSortField(col.name);
                          setSortOrder('ASC');
                        }
                      }}
                      className="py-2.5 px-3 font-mono cursor-pointer hover:text-blue-600 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{col.name}</span>
                        {col.isKey && <span title="Primary Key">🔑</span>}
                        {sortField === col.name && (
                          <span className="text-blue-600 dark:text-blue-400">{sortOrder === 'ASC' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableData?.rows.map((row, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={row.id || idx}
                      onClick={() => setInspectedRow(row)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                        {rowNumber}
                      </td>

                      {tableData.columns.map(col => {
                        const val = row[col.name];
                        let rendered = String(val !== undefined && val !== null ? val : '');
                        if (typeof val === 'object') rendered = JSON.stringify(val);

                        return (
                          <td
                            key={col.name}
                            className={`py-2.5 px-3 font-mono max-w-[200px] truncate ${
                              col.isKey ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {rendered}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedRow(row);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Inspect full row JSON"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {tableData && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing <strong className="text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(currentPage * pageSize, tableData.pagination.totalRows)}
                </strong>{' '}
                of <strong className="text-slate-900 dark:text-white">{tableData.pagination.totalRows.toLocaleString()}</strong> rows
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="font-mono text-slate-700 dark:text-slate-300 px-2">
                  {currentPage} / {tableData.pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= tableData.pagination.totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ROW INSPECTOR MODAL */}
      {inspectedRow && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Record Inspector: `{selectedTable}`
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(inspectedRow, null, 2), 'JSON Record')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedRow(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-blue-700 dark:text-blue-300">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(inspectedRow, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectedRow(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
